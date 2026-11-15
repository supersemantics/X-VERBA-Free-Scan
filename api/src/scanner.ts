import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentActions, BreakdownItem, HumanAuthorisation, ScanResult, UngovernedNode, VslSummary } from './types.js';
import { buildTarget, parseLsRemote, parseRepoUrl, resolveRef, type ParsedRepo, type RepoTarget } from './repoUrl.js';
import { MESSAGES, ScanError, gitError, isTimeout } from './errors.js';
import { APP_VERSION } from './version.js';

const execFileAsync = promisify(execFile);

// Never let git wait for credentials: a private or missing repo must fail
// fast with "not found", not hang or pop up a credential manager.
//
// Running Free Scan on your own machine, you can let git use the GitHub login
// it already has stored (e.g. Git Credential Manager), so private repos you
// can access scan too: set GIT_USE_LOCAL_CREDENTIALS=1. Leave it off on any
// shared or public deployment. git still never prompts either way.
export const USE_LOCAL_CREDENTIALS = process.env.GIT_USE_LOCAL_CREDENTIALS === '1';

const GIT_ENV = USE_LOCAL_CREDENTIALS
  ? { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
  : { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_ASKPASS: '', SSH_ASKPASS: '' };
const GIT_NO_CREDENTIALS = USE_LOCAL_CREDENTIALS ? [] : ['-c', 'credential.helper=', '-c', 'core.askPass='];

function git(args: string[], timeout: number) {
  return execFileAsync('git', [...GIT_NO_CREDENTIALS, ...args], {
    timeout,
    env: GIT_ENV,
    maxBuffer: 1024 * 1024 * 16,
  });
}

// The real scan engine — github.com/supersemantics/X-verba-CLI (`pip install
// x-verba`). This API is a thin wrapper around it, not a reimplementation:
// it clones the target repo, shells out to `x-verba scan --format json`,
// and reshapes the CLI's rich output into the smaller shape the frontend
// renders. Override X_VERBA_BIN if the CLI isn't on PATH as `x-verba`
// (e.g. `py -m x_verba.cli` in a venv that hasn't installed the console
// script entry point).
const XVERBA_BIN = process.env.X_VERBA_BIN || 'x-verba';

// The engine's own version (`x-verba --version`), read once and recorded on
// every report so a result always says which engine produced it.
let engineVersionPromise: Promise<string | undefined> | undefined;
export function engineVersion(): Promise<string | undefined> {
  engineVersionPromise ??= execFileAsync(XVERBA_BIN, ['--version'], { timeout: 30000 })
    .then(({ stdout }) => /version\s+(\S+)/i.exec(stdout)?.[1] ?? (stdout.trim() || undefined))
    .catch((err) => {
      console.error('Could not read x-verba version:', err instanceof Error ? err.message : err);
      engineVersionPromise = undefined; // retry next time
      return undefined;
    });
  return engineVersionPromise;
}

/** Check the repo is public and work out which branch and folder the link means. */
export async function resolveTarget(parsed: ParsedRepo): Promise<RepoTarget> {
  const cloneUrl = buildTarget(parsed).cloneUrl;
  if (parsed.refSegments.length === 0) {
    try {
      await git(['ls-remote', '--', cloneUrl, 'HEAD'], 30000);
    } catch (err) {
      throw gitError(err);
    }
    return buildTarget(parsed);
  }
  let refs: Set<string>;
  try {
    const { stdout } = await git(['ls-remote', '--heads', '--tags', '--', cloneUrl], 30000);
    refs = parseLsRemote(stdout);
  } catch (err) {
    throw gitError(err);
  }
  const resolved = resolveRef(parsed, refs);
  if (!resolved) throw new ScanError(404, MESSAGES.branchNotFound(parsed.refSegments.join('/')));
  return buildTarget(parsed, resolved.branch, resolved.subdir);
}

// ── Shapes we read out of the CLI's `--format json` report ──────────────────
// Deliberately partial/loose — we only declare the fields we actually use.
// The CLI's full schema is much larger (decision graphs, PageRank, tendency
// analysis, etc.) and evolves independently of this API; `any` at the edges
// here is intentional so a CLI version bump doesn't require a matching
// change on this side unless a field we depend on is renamed.

interface CliAiIntegration {
  location: string;
  line_content?: string;
  provider?: string;
  pre_node_detected?: boolean;
}

interface CliIrreversibleAction {
  filepath: string;
  line: number;
  line_content?: string;
}

interface CliConstraint {
  location: string;
  line_content?: string;
}

interface CliGap {
  id: string;
  type: string;
  location: string;
  severity: 'critical' | 'high' | 'medium';
  plain_english: string;
  recommended_action: string;
  verba_term: string;
}

interface CliLegionMatch {
  dc_code: string;
  dc_name: string;
  location: string;
  confidence: string;
  evidence?: string;
}

interface CliScanResult {
  scan_date?: string;
  vsl?: {
    detected?: boolean;
    gates_total?: number;
    gates_by_kind?: Record<string, number>;
    gates?: { kind: string; name: string | null; location: string }[];
  };
  primitives?: {
    ai_integrations?: CliAiIntegration[];
    irreversible_actions?: CliIrreversibleAction[];
    constraints?: CliConstraint[];
  };
  gaps?: CliGap[];
  legion_matches?: CliLegionMatch[];
  decision_points?: { framework?: string }[];
  gamma_breakdown?: Omit<BreakdownItem, 'source_url'>[];
  summary?: {
    files_scanned?: number;
    ai_integrations_detected?: number;
    decision_points_detected?: number;
    structural_gamma?: number | null;
    governance_status?: string;
    agent_actions?: AgentActions;
    vsl?: { human_authorisations?: HumanAuthorisation[] };
  };
}

// Display names for the agent frameworks this tool is scoped to. Anything
// else the CLI reports is shown under its own name.
const FRAMEWORK_LABELS: Record<string, string> = {
  langchain: 'LangChain',
  langgraph: 'LangGraph',
  openai: 'OpenAI',
  openai_agents_sdk: 'OpenAI Agents SDK',
};

// ── Reshape helpers ───────────────────────────────────────────────────────

// The CLI's `gaps[]` (missing Pre-Node, missing human gate, ungated
// irreversible action, informal invariant) map directly onto the
// frontend's UngovernedNode — but gaps don't carry the source line or a
// drift-class code, so we enrich each one from `primitives` (for the code
// snippet + provider) and `legion_matches` (for a real DC code/name, when
// the CLI's drift-class matcher fired at the same location).
function findEvidence(
  primitives: CliScanResult['primitives'],
  location: string,
): { code: string; provider: string } {
  for (const ai of primitives?.ai_integrations ?? []) {
    if (ai.location === location) {
      return { code: ai.line_content ?? '', provider: ai.provider ?? 'ai_framework' };
    }
  }
  for (const action of primitives?.irreversible_actions ?? []) {
    if (`${action.filepath}:${action.line}` === location) {
      return { code: action.line_content ?? '', provider: '' };
    }
  }
  for (const c of primitives?.constraints ?? []) {
    if (c.location === location) {
      return { code: c.line_content ?? '', provider: '' };
    }
  }
  return { code: '', provider: '' };
}

// "backend\\app\\x.py:12" → { file: "backend/app/x.py", line: 12 }
function splitLocation(location: string): { file: string; line: number } {
  const i = location.lastIndexOf(':');
  const file = (i > 0 ? location.slice(0, i) : location).replace(/\\/g, '/');
  const line = i > 0 ? parseInt(location.slice(i + 1), 10) || 0 : 0;
  return { file, line };
}

function sourceUrl(sourceBase: string, file: string, line: number): string {
  const path = file.split('/').map(encodeURIComponent).join('/');
  return line > 0 ? `${sourceBase}/${path}#L${line}` : `${sourceBase}/${path}`;
}

function mapGapToNode(
  gap: CliGap,
  primitives: CliScanResult['primitives'],
  legionByLocation: Map<string, CliLegionMatch>,
  sourceBase: string,
): UngovernedNode {
  const { file, line } = splitLocation(gap.location);
  const legion = legionByLocation.get(gap.location);
  const { code, provider } = findEvidence(primitives, gap.location);

  return {
    file: file || 'unknown',
    line,
    source_url: file ? sourceUrl(sourceBase, file, line) : undefined,
    code: code || gap.plain_english,
    drift_class: legion?.dc_code || gap.type.toUpperCase(),
    drift_class_name: legion?.dc_name || gap.verba_term,
    severity: gap.severity,
    recommendation: gap.recommended_action,
    // Windows scans report paths with backslashes; show them as GitHub does.
    issue: gap.plain_english.replace(/([\w.-])\\(?=[\w.-])/g, '$1/'),
    provider,
    confidence: legion ? (legion.confidence === 'HIGH' ? 'high' : 'medium') : 'high',
  };
}

// ── Main scan entry point ────────────────────────────────────────────────

export async function runScan(repoUrl: string): Promise<ScanResult> {
  const startedAt = Date.now();
  const scanId = randomUUID();
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new ScanError(400, MESSAGES.invalidUrl);
  const target = await resolveTarget(parsed);
  const tempDir = await mkdtemp(join(tmpdir(), 'xverba-'));
  const cloneDir = join(tempDir, 'repo');
  const reportPath = join(tempDir, 'report.json');

  try {
    // Clone the repo (the named branch or tag, if the link had one).
    const branchArgs = target.branch ? ['--branch', target.branch] : [];
    try {
      // core.longpaths: on Windows, deep paths (e.g. in large JS monorepos)
      // otherwise fail the checkout. No effect elsewhere.
      await git(
        ['-c', 'core.longpaths=true', 'clone', '--depth', '1', '--single-branch', ...branchArgs, '--', target.cloneUrl, cloneDir],
        90000,
      );
    } catch (err) {
      throw gitError(err, target.branch);
    }

    // A folder link scans just that folder; its report paths are then
    // relative to it, which sourceBase already accounts for.
    const scanDir = target.subdir ? join(cloneDir, ...target.subdir.split('/')) : cloneDir;
    if (target.subdir) {
      const info = await stat(scanDir).catch(() => undefined);
      if (!info?.isDirectory()) throw new ScanError(404, MESSAGES.folderNotFound(target.subdir));
    }

    // Run the real X-Verba CLI against the clone. context-profile ai-app
    // (the CLI's own default) matches this tool's story: governance gaps
    // in AI-integrated agent code, not every file op in the repo.
    try {
      await execFileAsync(
        XVERBA_BIN,
        ['scan', scanDir, '--format', 'json', '--context-profile', 'ai-app', '-o', reportPath],
        { timeout: 150000, maxBuffer: 1024 * 1024 * 32 },
      );
    } catch (err) {
      const detail = `${(err as { stderr?: string }).stderr ?? ''}\n${err instanceof Error ? err.message : ''}`;
      throw new ScanError(isTimeout(err) ? 504 : 500, isTimeout(err) ? MESSAGES.timeout : MESSAGES.engine, detail);
    }

    const raw = await readFile(reportPath, 'utf-8');
    const cli: CliScanResult = JSON.parse(raw);

    const legionByLocation = new Map<string, CliLegionMatch>();
    for (const m of cli.legion_matches ?? []) legionByLocation.set(m.location, m);

    const nodes = (cli.gaps ?? []).map((g) => mapGapToNode(g, cli.primitives, legionByLocation, target.sourceBase));

    const dcSummary: Record<string, number> = {};
    for (const n of nodes) dcSummary[n.drift_class] = (dcSummary[n.drift_class] || 0) + 1;

    const severityBreakdown = { critical: 0, high: 0, medium: 0 };
    for (const n of nodes) severityBreakdown[n.severity]++;

    // Frameworks from the AI calls (provider) and from the decision points
    // the CLI attributes to a framework (e.g. LangGraph graph wiring).
    const frameworkKeys = [
      ...(cli.primitives?.ai_integrations ?? []).map((a) => a.provider),
      ...(cli.decision_points ?? []).map((d) => d.framework),
    ].filter((f): f is string => Boolean(f) && f !== 'unknown' && f !== 'ai_framework');
    const frameworksDetected = Array.from(new Set(frameworkKeys.map((f) => FRAMEWORK_LABELS[f] ?? f)));

    const uniqueFiles = new Set(nodes.map((n) => n.file));
    const preNodesCount = (cli.primitives?.ai_integrations ?? []).filter((a) => a.pre_node_detected).length;
    const soCount = Object.keys(dcSummary).length;

    // The CLI's own "no AI integrations" status was dropped between v0.2
    // and v0.6 (it now scores everything against the broader decision-point
    // graph, so a plain-code repo just scores gamma 0 like an ungoverned
    // one). Re-derive it here so the frontend's dedicated empty-state
    // message still fires for repos with no AI code at all.
    const aiCount = cli.summary?.ai_integrations_detected ?? 0;
    const decisionPoints = cli.summary?.decision_points_detected ?? 0;
    const gammaStatus: ScanResult['gamma_status'] =
      aiCount === 0 && decisionPoints === 0
        ? 'NO_AI_INTEGRATIONS'
        : ((cli.summary?.governance_status as ScanResult['gamma_status']) ?? 'BELOW_THRESHOLD');

    const vsl: VslSummary | undefined = cli.vsl?.detected
      ? {
          detected: true,
          gates_total: cli.vsl.gates_total ?? 0,
          gates_by_kind: cli.vsl.gates_by_kind ?? {},
          gates: (cli.vsl.gates ?? []).map((g) => {
            const { file, line } = splitLocation(g.location);
            return { ...g, location: `${file}:${line}`, source_url: sourceUrl(target.sourceBase, file, line) };
          }),
        }
      : undefined;

    return {
      scan_id: scanId,
      repo: repoUrl,
      repo_name: target.displayName,
      branch: target.branch,
      gamma: typeof cli.summary?.structural_gamma === 'number' ? cli.summary.structural_gamma : 0,
      gamma_status: gammaStatus,
      files_scanned: cli.summary?.files_scanned ?? 0,
      files_affected: uniqueFiles.size,
      ungoverned_nodes: nodes,
      drift_class_summary: dcSummary,
      severity_breakdown: severityBreakdown,
      frameworks_detected: frameworksDetected,
      contract_size_kb: Math.round((raw.length / 1024) * 10) / 10,
      pre_nodes_count: preNodesCount,
      stabilisation_operators_count: soCount,
      scan_date: cli.scan_date ?? new Date().toISOString(),
      scan_duration_ms: Date.now() - startedAt,
      agent_actions: cli.summary?.agent_actions,
      vsl,
      human_authorisations: (cli.summary?.vsl?.human_authorisations ?? []).map((h) => {
        const { file, line } = splitLocation(h.location);
        return { ...h, location: `${file}:${line}`, source_url: sourceUrl(target.sourceBase, file, line) };
      }),
      breakdown: (cli.gamma_breakdown ?? []).map((item) => ({
        ...item,
        file: item.file.replace(/\\/g, '/'),
        source_url: sourceUrl(target.sourceBase, item.file.replace(/\\/g, '/'), item.line),
      })),
      subdir: target.subdir,
      engine_version: await engineVersion(),
      app_version: APP_VERSION,
    };
  } catch (err: unknown) {
    if (err instanceof ScanError) throw err;
    throw new ScanError(500, MESSAGES.generic, err instanceof Error ? err.stack : String(err));
  } finally {
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
