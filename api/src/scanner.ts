import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, extname } from 'node:path';
import type { ScanResult, UngovernedNode } from './types.js';

const execFileAsync = promisify(execFile);

// ── Drift class metadata ─────────────────────────────────────────────────────

const DC_NAMES: Record<string, string> = {
  'DC-E1': 'Threshold Assault',
  'DC-E2': 'Contradiction Injection',
  'DC-E5': 'Dominance Forcing',
  'DC-E13': 'Chained AI Propagation',
  'DC-E14': 'Irreversible Action Risk',
  'DC-I6': 'Structural Cascade Rupture',
  'DC-I11': 'Evaluative Decoupling',
  'DC-L2': 'Prompt Boundary Violation',
  'DC-P4': 'Parameter Drift',
  'DC-S3': 'Flash Crash Cluster',
  'DC-S7': 'Semantic Shift',
};

const RECOMMENDATIONS: Record<string, string> = {
  'DC-E5': 'Add a Pre-Node validator to sanitize user input before it reaches the AI prompt.',
  'DC-I6': 'Set temperature bounds and add a threshold check before the AI call.',
  'DC-I11': 'Add a Pre-Node validator to check output against contract before use.',
  'DC-L2': 'Add boundary validation for dynamic prompt assembly.',
  'DC-E13': 'Add output validation between chained AI calls.',
  'DC-E14': 'Add an authorisation gate before this irreversible action.',
  'DC-S3': 'Implement cluster-level governance coordination.',
  'DC-P4': 'Lock AI parameters (temperature, max_tokens) and validate before calls.',
  'DC-S7': 'Add semantic consistency checks on AI outputs.',
};

const ISSUES: Record<string, string> = {
  'DC-E5': 'User input flows into AI prompt with no sanitisation checkpoint.',
  'DC-I6': 'High temperature setting creates structural cascade rupture risk.',
  'DC-I11': 'Output from LLM used directly without validation. No Pre-Node governance.',
  'DC-L2': 'Dynamic prompt assembled from external input with no boundary check.',
  'DC-E13': 'Output of one AI call may seed the next without validation.',
  'DC-E14': 'Irreversible action with no authorisation gate.',
  'DC-S3': 'Multi-service architecture with no cluster-level governance.',
  'DC-P4': 'AI parameters not locked — may drift at runtime.',
  'DC-S7': 'Semantic meaning may shift without detection.',
};

// ── Supported file extensions & skip dirs ────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rb', '.cs', '.php',
]);

const SKIP_DIRS = new Set([
  '.git', '.verba', 'node_modules', '__pycache__', '.venv', 'venv', 'env',
  'dist', 'build', '.next', 'coverage', '.pytest_cache', '.mypy_cache',
  'test', 'tests', 'spec', 'specs', '__tests__', 'docs', 'examples',
  'fixtures', 'mocks', 'notebooks', 'tutorials', 'demo', 'demos', 'samples',
  'benchmark', 'benchmarks', 'eval', 'evals', 'cookbook',
]);

// ── AI call detection patterns ───────────────────────────────────────────────

interface AiPattern { regex: RegExp; provider: string }

const AI_CALL_PATTERNS: AiPattern[] = [
  // OpenAI
  { regex: /openai\.(chat|completions?)\./, provider: 'openai' },
  { regex: /new\s+OpenAI\s*\(/, provider: 'openai' },
  { regex: /client\.chat\.completions\.create/, provider: 'openai' },
  { regex: /ChatCompletion\.create/, provider: 'openai' },
  { regex: /openai\.ChatCompletion/, provider: 'openai' },
  // Anthropic
  { regex: /anthropic\.messages\.create/, provider: 'anthropic' },
  { regex: /client\.messages\.create/, provider: 'anthropic' },
  { regex: /new\s+Anthropic\s*\(/, provider: 'anthropic' },
  { regex: /AsyncAnthropic\s*\(/, provider: 'anthropic' },
  // Google
  { regex: /generativeai\.GenerativeModel/, provider: 'google' },
  { regex: /genai\.GenerativeModel/, provider: 'google' },
  { regex: /model\.generate_content/, provider: 'google' },
  // LangChain
  { regex: /new\s+ChatOpenAI\s*\(/, provider: 'langchain' },
  { regex: /new\s+ChatAnthropic\s*\(/, provider: 'langchain' },
  { regex: /ChatGoogleGenerativeAI\s*\(/, provider: 'langchain' },
  { regex: /chain\.(invoke|run|stream)\s*\(/, provider: 'langchain' },
  { regex: /agent\.(invoke|run)\s*\(/, provider: 'langchain' },
  { regex: /LLMChain\s*\(/, provider: 'langchain' },
  { regex: /AgentExecutor\s*\(/, provider: 'langchain' },
  // Vercel AI SDK
  { regex: /generateText\s*\(/, provider: 'vercel_ai' },
  { regex: /streamText\s*\(/, provider: 'vercel_ai' },
  // Groq
  { regex: /groq\.chat\.completions\.create/, provider: 'groq' },
  { regex: /new\s+Groq\s*\(/, provider: 'groq' },
  // Cohere
  { regex: /cohere\.chat\s*\(/, provider: 'cohere' },
  { regex: /cohere\.generate\s*\(/, provider: 'cohere' },
  // HuggingFace
  { regex: /pipeline\s*\(\s*["']text-generation/, provider: 'huggingface' },
  { regex: /AutoModelForCausalLM/, provider: 'huggingface' },
  // AWS Bedrock
  { regex: /invoke_model\s*\(/, provider: 'aws_bedrock' },
  { regex: /invoke_model_with_response_stream\s*\(/, provider: 'aws_bedrock' },
  // Generic AI-like calls (lower confidence)
  { regex: /\.generate\s*\(\s*\{/, provider: 'ai_framework' },
  { regex: /\.complete\s*\(/, provider: 'ai_framework' },
  { regex: /\.predict\s*\(/, provider: 'ai_framework' },
];

// Python import-level AI detection
const PY_AI_IMPORTS = [
  { regex: /^\s*(import|from)\s+openai/, provider: 'openai' },
  { regex: /^\s*(import|from)\s+anthropic/, provider: 'anthropic' },
  { regex: /^\s*(import|from)\s+google\.generativeai/, provider: 'google' },
  { regex: /^\s*(import|from)\s+cohere/, provider: 'cohere' },
  { regex: /^\s*(import|from)\s+langchain/, provider: 'langchain' },
  { regex: /^\s*(import|from)\s+llama_index/, provider: 'llama_index' },
  { regex: /^\s*(import|from)\s+transformers/, provider: 'huggingface' },
];

// ── Irreversible action patterns ─────────────────────────────────────────────

const IRREVERSIBLE_PATTERNS: { type: string; regex: RegExp }[] = [
  // Email / messaging
  { type: 'email_send', regex: /send_mail|send_message|smtp\.sendmail|ses\.send_email|sendgrid|mailgun/i },
  // Database deletes
  { type: 'database_delete', regex: /\.delete_many|\.drop_collection|\.drop\s*\(|DELETE\s+FROM|session\.delete/i },
  // Database writes
  { type: 'database_write', regex: /\.insert_one|\.insert_many|\.updateOne|\.updateMany|\.save\s*\(|\.commit\s*\(/i },
  // Destructive external API
  { type: 'external_api', regex: /requests\.(post|put|delete)\s*\(|httpx\.(post|put|delete)\s*\(|fetch\s*\([^)]*method:\s*['"]?(POST|PUT|DELETE)/i },
  // File system
  { type: 'file_system', regex: /os\.remove|os\.unlink|shutil\.rmtree|fs\.unlink|fs\.rm/i },
  // System commands
  { type: 'system_command', regex: /os\.system\s*\(|subprocess\.(run|call|Popen)\s*\(|child_process\.exec/i },
  // Payments
  { type: 'payment', regex: /stripe\.(charge|PaymentIntent)|payment\.create|transaction\.create/i },
];

// ── Guard / governance detection ─────────────────────────────────────────────

const GUARD_SIGNALS = [
  'validate_', 'is_valid', 'check_', 'verify_', 'sanitize', 'sanitise',
  'allowed_', 'permitted_', 'authorized', 'authorised', 'authenticated',
  'raise ', 'throw new', 'throw error',
  'pre_node', 'invariant', 'governance', 'eligibility',
  'allow_list', 'allowlist', 'blocklist',
  'if not allowed', 'if not valid', 'if not auth',
];

const HUMAN_REVIEW_SIGNALS = [
  'review', 'approve', 'confirm', 'human_in_loop', 'human_review',
  'manual_check', 'oversight', 'require_approval', 'awaiting_approval',
];

const AUTH_GATE_SIGNALS = [
  'approve', 'confirm', 'authoris', 'authoriz', 'permission',
  'has_permission', 'can_', 'require_approval', 'user_confirmed',
];

function hasGuardBefore(lines: string[], lineNum: number, window = 15): boolean {
  const start = Math.max(0, lineNum - window - 1);
  const searchLines = lines.slice(start, lineNum - 1);
  for (const line of searchLines) {
    const lower = line.toLowerCase().trim();
    if (!lower || lower.startsWith('#') || lower.startsWith('//')) continue;
    if (GUARD_SIGNALS.some(s => lower.includes(s))) return true;
  }
  return false;
}

function hasHumanReview(lines: string[], lineNum: number): boolean {
  const searchLines = lines.slice(lineNum, Math.min(lines.length, lineNum + 20));
  return searchLines.some(line =>
    HUMAN_REVIEW_SIGNALS.some(s => line.toLowerCase().includes(s)),
  );
}

function hasAuthGate(lines: string[], lineNum: number): boolean {
  const searchLines = lines.slice(Math.max(0, lineNum - 21), lineNum - 1);
  return searchLines.some(line =>
    AUTH_GATE_SIGNALS.some(s => line.toLowerCase().includes(s)),
  );
}

// ── File collection ──────────────────────────────────────────────────────────

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(join(current, entry.name));
        }
      } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
        results.push(join(current, entry.name));
      }
    }
  }

  await walk(dir);
  return results;
}

// ── Per-file analysis ────────────────────────────────────────────────────────

interface AICall {
  line: number;
  lineContent: string;
  provider: string;
  hasGuard: boolean;
  hasHumanReview: boolean;
  temperature: number | null;
  maxTokens: number | null;
}

interface IrreversibleAction {
  line: number;
  lineContent: string;
  actionType: string;
  hasAuthGate: boolean;
}

interface FileAnalysis {
  relPath: string;
  aiCalls: AICall[];
  irreversibleActions: IrreversibleAction[];
  hasAiImports: boolean;
}

function extractParam(lines: string[], lineNum: number, param: string): number | null {
  const context = lines.slice(Math.max(0, lineNum - 1), Math.min(lines.length, lineNum + 10)).join('\n');
  const match = context.match(new RegExp(`${param}\\s*[:=]\\s*([0-9.]+)`));
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val)) return val;
  }
  return null;
}

function analyseFile(content: string, relPath: string): FileAnalysis {
  const lines = content.split('\n');
  const aiCalls: AICall[] = [];
  const irreversibleActions: IrreversibleAction[] = [];
  let hasAiImports = false;

  // Check Python AI imports
  if (relPath.endsWith('.py')) {
    hasAiImports = lines.some(line =>
      PY_AI_IMPORTS.some(p => p.regex.test(line)),
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    const lineNum = i + 1;

    // Skip comments
    if (stripped.startsWith('#') || stripped.startsWith('//') ||
        stripped.startsWith('*') || stripped.startsWith('/*')) {
      continue;
    }

    // Skip import-only lines (unless they contain a call)
    if (/^\s*(import|from)\s+/.test(stripped) && !stripped.includes('(')) {
      // Still check for AI imports in JS/TS
      if (!relPath.endsWith('.py')) {
        for (const p of AI_CALL_PATTERNS) {
          if (p.regex.test(stripped) && stripped.includes('(')) {
            break;
          }
        }
      }
      continue;
    }

    // Detect AI calls
    for (const pattern of AI_CALL_PATTERNS) {
      if (pattern.regex.test(line)) {
        // Skip if inside a string context (very basic heuristic)
        const quotesBefore = (line.substring(0, line.search(pattern.regex)).match(/['"]/g) || []).length;
        if (quotesBefore % 2 !== 0) continue;

        aiCalls.push({
          line: lineNum,
          lineContent: stripped.substring(0, 120),
          provider: pattern.provider,
          hasGuard: hasGuardBefore(lines, lineNum),
          hasHumanReview: hasHumanReview(lines, lineNum),
          temperature: extractParam(lines, lineNum, 'temperature'),
          maxTokens: extractParam(lines, lineNum, 'max_tokens|maxTokens|max_new_tokens'),
        });
        break; // one finding per line
      }
    }

    // Detect irreversible actions
    for (const pattern of IRREVERSIBLE_PATTERNS) {
      if (pattern.regex.test(line)) {
        irreversibleActions.push({
          line: lineNum,
          lineContent: stripped.substring(0, 120),
          actionType: pattern.type,
          hasAuthGate: hasAuthGate(lines, lineNum),
        });
        break;
      }
    }
  }

  return { relPath, aiCalls, irreversibleActions, hasAiImports };
}

// ── Drift class classification ───────────────────────────────────────────────

interface DriftFinding {
  dcCode: string;
  dcName: string;
  location: string;
  severity: 'critical' | 'high' | 'medium';
  evidence: string;
  issue: string;
  recommendation: string;
  provider: string;
}

function classifyFindings(analyses: FileAnalysis[]): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const aiFileSet = new Set(
    analyses.filter(a => a.aiCalls.length > 0 || a.hasAiImports).map(a => a.relPath),
  );

  for (const file of analyses) {
    // DC-I11: Evaluative Decoupling — AI call with no guard
    for (const call of file.aiCalls) {
      if (!call.hasGuard) {
        findings.push({
          dcCode: 'DC-I11',
          dcName: DC_NAMES['DC-I11'],
          location: `${file.relPath}:${call.line}`,
          severity: 'critical',
          evidence: call.lineContent,
          issue: call.hasHumanReview
            ? 'AI output used without pre-call validation. Human review exists post-call but no input governance.'
            : 'Output from LLM used directly without validation. No Pre-Node governance.',
          recommendation: RECOMMENDATIONS['DC-I11'],
          provider: call.provider,
        });
      }
    }

    // DC-P4: Parameter Drift — temperature or max_tokens from variable/config
    for (const call of file.aiCalls) {
      if (call.temperature !== null && call.temperature > 0.7) {
        findings.push({
          dcCode: 'DC-P4',
          dcName: DC_NAMES['DC-P4'],
          location: `${file.relPath}:${call.line}`,
          severity: 'high',
          evidence: call.lineContent,
          issue: `High temperature setting (${call.temperature}) creates output instability risk.`,
          recommendation: RECOMMENDATIONS['DC-P4'],
          provider: call.provider,
        });
      }
      // Check if temperature comes from a variable (not a literal)
      if (call.temperature === null && /temperature\s*[:=]\s*[a-zA-Z]/.test(call.lineContent)) {
        findings.push({
          dcCode: 'DC-P4',
          dcName: DC_NAMES['DC-P4'],
          location: `${file.relPath}:${call.line}`,
          severity: 'high',
          evidence: call.lineContent,
          issue: 'AI parameters not locked — temperature flows from external input.',
          recommendation: RECOMMENDATIONS['DC-P4'],
          provider: call.provider,
        });
      }
    }

    // DC-S7: Semantic Shift — AI output used without semantic check
    for (const call of file.aiCalls) {
      if (!call.hasGuard && !call.hasHumanReview) {
        findings.push({
          dcCode: 'DC-S7',
          dcName: DC_NAMES['DC-S7'],
          location: `${file.relPath}:${call.line}`,
          severity: 'medium',
          evidence: call.lineContent,
          issue: 'AI output used for downstream decisions without semantic consistency check.',
          recommendation: RECOMMENDATIONS['DC-S7'],
          provider: call.provider,
        });
      }
    }

    // DC-E14: Irreversible Action Risk — in AI-adjacent files
    const isAiAdjacent = aiFileSet.has(file.relPath) || file.aiCalls.length > 0;
    if (isAiAdjacent) {
      for (const action of file.irreversibleActions) {
        if (!action.hasAuthGate) {
          findings.push({
            dcCode: 'DC-E14',
            dcName: DC_NAMES['DC-E14'],
            location: `${file.relPath}:${action.line}`,
            severity: 'critical',
            evidence: action.lineContent,
            issue: `Irreversible action (${action.actionType}) with no authorisation gate in AI-adjacent code.`,
            recommendation: RECOMMENDATIONS['DC-E14'],
            provider: '',
          });
        }
      }
    }

    // DC-L2: Prompt Boundary Violation — dynamic prompt with user input
    for (const call of file.aiCalls) {
      if (/f['"]|\.format\s*\(|\$\{|`.*\$\{|\+\s*(req|input|user|body|params|query)/.test(call.lineContent)) {
        findings.push({
          dcCode: 'DC-L2',
          dcName: DC_NAMES['DC-L2'],
          location: `${file.relPath}:${call.line}`,
          severity: 'high',
          evidence: call.lineContent,
          issue: 'Dynamic prompt assembled from external input with no boundary check.',
          recommendation: RECOMMENDATIONS['DC-L2'],
          provider: call.provider,
        });
      }
    }
  }

  // DC-E13: Chained AI Propagation — multiple AI calls in same file, no validation between
  for (const file of analyses) {
    if (file.aiCalls.length >= 2) {
      const ungoverned = file.aiCalls.filter(c => !c.hasGuard);
      if (ungoverned.length >= 2) {
        findings.push({
          dcCode: 'DC-E13',
          dcName: DC_NAMES['DC-E13'],
          location: `${file.relPath}:${ungoverned[1].line}`,
          severity: 'critical',
          evidence: ungoverned[1].lineContent,
          issue: `${ungoverned.length} chained AI calls detected with no validation between them.`,
          recommendation: RECOMMENDATIONS['DC-E13'],
          provider: ungoverned[1].provider,
        });
      }
    }
  }

  return findings;
}

// ── Gamma computation ────────────────────────────────────────────────────────

function computeGamma(analyses: FileAnalysis[]): { gamma: number; status: string } {
  let totalDecisionPoints = 0;
  let governedPoints = 0;

  for (const file of analyses) {
    for (const call of file.aiCalls) {
      totalDecisionPoints++;
      if (call.hasGuard) governedPoints++;
    }
    const isAiFile = file.aiCalls.length > 0;
    if (isAiFile) {
      for (const action of file.irreversibleActions) {
        totalDecisionPoints++;
        if (action.hasAuthGate) governedPoints++;
      }
    }
  }

  if (totalDecisionPoints === 0) {
    return { gamma: 0, status: 'NO_AI_INTEGRATIONS' };
  }

  const gamma = Math.round((governedPoints / totalDecisionPoints) * 100) / 100;
  let status: string;
  if (gamma >= 0.9) status = 'ABOVE_THRESHOLD';
  else if (gamma >= 0.3) status = 'PARTIAL_COVERAGE';
  else status = 'BELOW_THRESHOLD';

  return { gamma, status };
}

// ── Main scan entry point ────────────────────────────────────────────────────

export async function runScan(repoUrl: string): Promise<ScanResult> {
  const scanId = randomUUID();
  const repoName = extractRepoName(repoUrl);
  const tempDir = await mkdtemp(join(tmpdir(), 'xverba-'));

  try {
    // Clone repo to temp dir
    await execFileAsync('git', ['clone', '--depth', '1', repoUrl, tempDir], {
      timeout: 60000,
    });

    // Collect and analyse files
    const files = await collectFiles(tempDir);
    const analyses: FileAnalysis[] = [];

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const relPath = relative(tempDir, filePath).replace(/\\/g, '/');
        analyses.push(analyseFile(content, relPath));
      } catch {
        // skip unreadable files
      }
    }

    // Classify drift findings
    const driftFindings = classifyFindings(analyses);

    // Compute Gamma
    const { gamma, status: gammaStatus } = computeGamma(analyses);

    // Build ungoverned nodes for frontend
    const nodes: UngovernedNode[] = driftFindings.map((f) => {
      const [file, lineStr] = f.location.split(':');
      return {
        file: file || 'unknown',
        line: parseInt(lineStr || '0', 10),
        code: f.evidence,
        drift_class: f.dcCode,
        drift_class_name: f.dcName,
        severity: f.severity,
        recommendation: f.recommendation,
        issue: f.issue,
        provider: f.provider,
      };
    });

    // Build drift class summary
    const dcSummary: Record<string, number> = {};
    for (const node of nodes) {
      dcSummary[node.drift_class] = (dcSummary[node.drift_class] || 0) + 1;
    }

    const uniqueFiles = new Set(nodes.map(n => n.file));
    const totalAiCalls = analyses.reduce((sum, a) => sum + a.aiCalls.length, 0);
    const soCount = Object.keys(dcSummary).length;
    const testCasesCount = nodes.length + soCount + Math.ceil(nodes.length * 0.5);

    return {
      scan_id: scanId,
      repo: repoUrl,
      repo_name: repoName,
      gamma,
      gamma_status: gammaStatus,
      files_scanned: files.length,
      files_affected: uniqueFiles.size,
      ungoverned_nodes: nodes,
      drift_class_summary: dcSummary,
      contract_size_kb: Math.round((JSON.stringify(driftFindings).length / 1024) * 10) / 10,
      test_cases_count: testCasesCount,
      pre_nodes_count: totalAiCalls,
      stabilisation_operators_count: soCount,
      scan_date: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Scan failed: ${message}`);
  } finally {
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function extractRepoName(url: string): string {
  const parts = url.replace(/\.git$/, '').split('/');
  return parts[parts.length - 1] || 'unknown';
}
