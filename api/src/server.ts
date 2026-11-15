import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineVersion, runScan } from './scanner.js';
import { parseRepoUrl } from './repoUrl.js';
import { saveScan, getScan, getHistory, loadFeaturedScans } from './db.js';
import { MESSAGES, ScanError } from './errors.js';
import { ScanLimiter } from './limits.js';
import { APP_VERSION } from './version.js';

const app = express();
const api = express.Router();
const PORT = parseInt(process.env.PORT || '3001', 10);
const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const webIndex = join(webDist, 'index.html');
const limiter = new ScanLimiter();
setInterval(() => limiter.prune(), 60_000).unref();

const featuredCount = loadFeaturedScans(new URL('../../web/src/data/featuredScans.json', import.meta.url));

// Behind Railway's proxy, req.ip must come from X-Forwarded-For, or every
// visitor would share one rate limit. TRUST_PROXY = number of proxy hops.
app.set('trust proxy', parseInt(process.env.TRUST_PROXY ?? '1', 10) || false);
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '16kb' }));

// Keep the scan UI and its API under /scan when hosted alongside the main site.
app.use('/api', api);
app.use('/scan/api', api);

// ── POST /api/scan ───────────────────────────────────────────────────────────
api.post('/scan', async (req, res) => {
  const repo_url = req.body?.repo_url;

  if (!repo_url || typeof repo_url !== 'string' || repo_url.length > 500) {
    res.status(400).json({ error: 'Paste a GitHub repository link to scan.' });
    return;
  }
  if (!parseRepoUrl(repo_url)) {
    res.status(400).json({ error: MESSAGES.invalidUrl });
    return;
  }

  const admission = limiter.admit(req.ip ?? 'unknown');
  if (!admission.ok) {
    res.set('Retry-After', String(admission.retryAfterSec));
    res.status(admission.status).json({ error: admission.message });
    return;
  }

  try {
    await admission.wait;
    const result = await runScan(repo_url);
    saveScan(result);
    res.json(result);
  } catch (err: unknown) {
    const scanErr = err instanceof ScanError ? err : new ScanError(500, MESSAGES.generic, String(err));
    // Full detail stays in the server log; the visitor gets the plain message.
    console.error(`Scan failed (${scanErr.status}) for ${repo_url}: ${scanErr.publicMessage}\n${scanErr.detail ?? ''}`);
    res.status(scanErr.status).json({ error: scanErr.publicMessage });
  } finally {
    admission.release();
  }
});

// ── GET /api/scan/:scan_id ───────────────────────────────────────────────────
// Lets a results link be refreshed or shared while the server still holds it.
api.get('/scan/:scan_id', (req, res) => {
  const scan = getScan(req.params.scan_id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(scan);
});

// ── GET /api/contract/:scan_id?format=yaml|json|txt|md ───────────────────────
api.get('/contract/:scan_id', (req, res) => {
  const scan = getScan(req.params.scan_id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'yaml';

  switch (format) {
    case 'json':
      res.type('application/json').send(generateContractJson(scan));
      return;
    case 'txt':
      res.type('text/plain').send(generateContractTxt(scan));
      return;
    case 'md':
      res.type('text/markdown').send(generateContractMd(scan));
      return;
    case 'yaml':
      res.type('text/yaml').send(generateContractYaml(scan));
      return;
    default:
      res.status(400).json({ error: `Unknown format '${format}'. Use yaml, json, txt, or md.` });
  }
});

// ── GET /api/scans/:repo ─────────────────────────────────────────────────────
api.get('/scans/:repo', (req, res) => {
  const history = getHistory(decodeURIComponent(req.params.repo));
  res.json(history);
});

// ── Health check ─────────────────────────────────────────────────────────────
api.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    engine: { name: 'x-verba', version: (await engineVersion()) ?? null },
    scans: limiter.stats,
    featured_scans: featuredCount,
  });
});

if (existsSync(webIndex)) {
  app.use(express.static(webDist));
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path === '/api' ||
      req.path.startsWith('/api/') ||
      req.path === '/scan/api' ||
      req.path.startsWith('/scan/api/') ||
      /\.[^/]+$/.test(req.path)
    ) {
      next();
      return;
    }
    res.sendFile(webIndex, (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`X-VERBA Free Scan ${APP_VERSION} API running on port ${PORT}`);
  console.log(`Scan engine: x-verba ${(await engineVersion()) ?? '(not found — set X_VERBA_BIN)'}; featured scans: ${featuredCount}`);
});

// ── YAML contract generator ──────────────────────────────────────────────────

// A double-quoted YAML scalar. JSON string escaping is valid YAML, so quotes,
// backslashes and newlines in findings can't break the file.
function q(value: string): string {
  return JSON.stringify(value);
}

function generateContractYaml(scan: ReturnType<typeof getScan>): string {
  if (!scan) return '# No scan data';

  const lines: string[] = [
    '# ═══════════════════════════════════════════════════════════════',
    '# X-VERBA GOVERNANCE CONTRACT',
    '# Generated by Super Semantics — supersemantics.org',
    '#',
    '# HOW TO USE THIS FILE',
    '#',
    '# This is your system\'s governance contract.',
    '# X-Verba scanned your code and found the decision points.',
    '# Your job is to fill in every field marked: null',
    '# ═══════════════════════════════════════════════════════════════',
    '',
    'system_identity:',
    `  identity_key: ${q(scan.scan_id)}`,
    `  system_name: ${q(scan.repo_name)}`,
    `  scan_date: ${q(scan.scan_date)}`,
    `  verba_version: ${scan.engine_version ? q(scan.engine_version) : 'null  # not recorded for this scan'}`,
    `  free_scan_version: ${scan.app_version ? q(scan.app_version) : 'null'}`,
    '  reviewed: false',
    '  approved: false',
    '',
    'governance_score:',
    `  structural_gamma: ${scan.gamma}`,
    `  status: "${scan.gamma_status}"`,
    `  total_ungoverned_nodes: ${scan.ungoverned_nodes.length}`,
    `  files_affected: ${scan.files_affected}`,
    '',
    '# ── NODES ──────────────────────────────────────────────────────',
    '# Each node is a point where your system makes a consequential decision.',
    '',
    'nodes:',
  ];

  for (const node of scan.ungoverned_nodes) {
    lines.push(`  - id: ${q(`${node.drift_class}-${node.line}`)}`);
    lines.push(`    location: ${q(`${node.file}:${node.line}`)}`);
    lines.push(`    drift_class: ${q(node.drift_class)}`);
    lines.push(`    severity: ${q(node.severity)}`);
    lines.push(`    issue: ${q(node.issue)}`);
    lines.push(`    recommendation: ${q(node.recommendation)}`);
    lines.push('    pre_node:');
    lines.push('      conditions_for_execution: null  # Fill: what must be TRUE to proceed');
    lines.push('      conditions_to_block: null       # Fill: what must BLOCK execution');
    lines.push('      fallback: null                   # Fill: what happens if blocked');
    lines.push('');
  }

  lines.push('# ── DRIFT CLASS SUMMARY ─────────────────────────────────────────');
  lines.push('drift_classes:');
  for (const [code, count] of Object.entries(scan.drift_class_summary)) {
    lines.push(`  ${code}: ${count}`);
  }

  return lines.join('\n');
}

// ── JSON contract generator ──────────────────────────────────────────────────
// Same underlying data as the YAML contract, structured for CI/tooling
// consumption rather than human editing.

function generateContractJson(scan: ReturnType<typeof getScan>): string {
  if (!scan) return JSON.stringify({ error: 'No scan data' });

  return JSON.stringify(
    {
      system_identity: {
        identity_key: scan.scan_id,
        system_name: scan.repo_name,
        scan_date: scan.scan_date,
        verba_version: scan.engine_version ?? null,
        free_scan_version: scan.app_version ?? null,
        reviewed: false,
        approved: false,
      },
      governance_score: {
        structural_gamma: scan.gamma,
        status: scan.gamma_status,
        total_ungoverned_nodes: scan.ungoverned_nodes.length,
        files_affected: scan.files_affected,
      },
      severity_breakdown: scan.severity_breakdown,
      frameworks_detected: scan.frameworks_detected,
      nodes: scan.ungoverned_nodes.map((node) => ({
        id: `${node.drift_class}-${node.line}`,
        location: `${node.file}:${node.line}`,
        drift_class: node.drift_class,
        severity: node.severity,
        confidence: node.confidence,
        issue: node.issue,
        recommendation: node.recommendation,
        pre_node: {
          conditions_for_execution: null,
          conditions_to_block: null,
          fallback: null,
        },
      })),
      drift_classes: scan.drift_class_summary,
    },
    null,
    2,
  );
}

// ── Plain-text contract generator ────────────────────────────────────────────
// Closest to what a terminal scan report looks like — for CI logs or piping
// into other tools, not for editing.

function generateContractTxt(scan: ReturnType<typeof getScan>): string {
  if (!scan) return 'No scan data';

  const lines: string[] = [
    'X-VERBA GOVERNANCE REPORT',
    `Repo: ${scan.repo_name}`,
    `Scanned: ${scan.scan_date}`,
    `Engine: x-verba ${scan.engine_version ?? '(version not recorded)'}`,
    '',
    `Gamma:${scan.gamma} (${scan.gamma_status})`,
    `Files scanned: ${scan.files_scanned}  Files affected: ${scan.files_affected}`,
    `Severity: critical=${scan.severity_breakdown.critical || 0} high=${scan.severity_breakdown.high || 0} medium=${scan.severity_breakdown.medium || 0}`,
    '',
    'FINDINGS',
    '--------',
  ];

  for (const node of scan.ungoverned_nodes) {
    lines.push(`[${node.severity.toUpperCase()}] ${node.drift_class} ${node.file}:${node.line}`);
    lines.push(`  ${node.code}`);
    lines.push(`  Issue: ${node.issue}`);
    lines.push(`  Fix: ${node.recommendation}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Markdown report generator ────────────────────────────────────────────────
// The shareable format — meant to be pasted into Slack/email or attached to
// a follow-up, not compiled into anything.

function generateContractMd(scan: ReturnType<typeof getScan>): string {
  if (!scan) return '# No scan data';

  const lines: string[] = [
    `# X-VERBA governance report: ${scan.repo_name}`,
    '',
    `Scanned ${scan.files_scanned} files on ${new Date(scan.scan_date).toLocaleDateString()}${scan.engine_version ? ` with x-verba ${scan.engine_version}` : ''}.`,
    '',
    `**Gamma score: ${scan.gamma}** (${scan.gamma_status})`,
    '',
    `- Files affected: ${scan.files_affected}`,
    `- Critical findings: ${scan.severity_breakdown.critical || 0}`,
    `- High findings: ${scan.severity_breakdown.high || 0}`,
    `- Medium findings: ${scan.severity_breakdown.medium || 0}`,
  ];

  if (scan.frameworks_detected.length > 0) {
    lines.push(`- Frameworks detected: ${scan.frameworks_detected.join(', ')}`);
  }

  lines.push('', '## Findings', '', '| Severity | Drift class | Location | Issue |', '|---|---|---|---|');

  for (const node of scan.ungoverned_nodes) {
    lines.push(`| ${node.severity} | ${node.drift_class} | \`${node.file}:${node.line}\` | ${node.issue} |`);
  }

  lines.push('', '---', '_Generated by X-VERBA Scan — Super Semantics_');

  return lines.join('\n');
}
