// ── X-VERBA MVP1 Types ──────────────────────────────────────────────────────

export interface UngovernedNode {
  file: string;
  line: number;
  code: string;
  drift_class: string;
  drift_class_name: string;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
  issue: string;
  provider: string;
  confidence: 'high' | 'medium';
  /** Link to the line on GitHub. */
  source_url?: string;
}

/** One decision point Structural Gamma counts (CLI 0.7.0+). */
export interface BreakdownItem {
  /** "agent_tool", "model_call", or the decision type of other code (e.g. "conditional_branch"). */
  kind: string;
  name: string;
  file: string;
  line: number;
  consequence_types: string[];
  governed: boolean;
  checkpoint: { type: string | null; strength: number | null; evidence: string | null } | null;
  source_url?: string;
}

export interface DriftClassSummary {
  [code: string]: number;
}

export interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
}

export type ExportFormat = 'yaml' | 'json' | 'txt' | 'md';

export interface AgentActionCount {
  governed: number;
  total: number;
}

export interface AgentActions {
  tools: AgentActionCount;
  model_calls: AgentActionCount;
  total: AgentActionCount;
}

export interface VslGate {
  kind: string;
  name: string | null;
  location: string;
  source_url?: string;
}

/** A human-approval mechanism found in the code (CLI 0.7.0+). */
export interface HumanAuthorisation {
  kind: string;
  location: string;
  evidence: string;
  source_url?: string;
}

export interface VslSummary {
  detected: boolean;
  gates_total: number;
  gates_by_kind: Record<string, number>;
  gates: VslGate[];
}

export interface ScanResult {
  scan_id: string;
  repo: string;
  repo_name: string;
  branch?: string;
  gamma: number;
  gamma_status: 'BELOW_THRESHOLD' | 'PARTIAL_COVERAGE' | 'ABOVE_THRESHOLD' | 'NO_AI_INTEGRATIONS';
  files_scanned: number;
  files_affected: number;
  ungoverned_nodes: UngovernedNode[];
  drift_class_summary: DriftClassSummary;
  severity_breakdown: SeverityBreakdown;
  frameworks_detected: string[];
  contract_size_kb: number;
  test_cases_count: number;
  pre_nodes_count: number;
  stabilisation_operators_count: number;
  scan_date: string;
  scan_duration_ms: number;
  agent_actions?: AgentActions;
  vsl?: VslSummary;
  /** Human-approval mechanisms the CLI recognised (CLI 0.7.0+). */
  human_authorisations?: HumanAuthorisation[];
  /** Every decision point behind the Governance Score, governed or not (CLI 0.7.0+). */
  breakdown?: BreakdownItem[];
}

export interface ScanHistoryEntry {
  scan_id: string;
  date: string;
  gamma: number;
  node_count: number;
}

export interface ScanProgress {
  status: 'connecting' | 'cloning' | 'scanning' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
  files_found?: number;
  ai_nodes_found?: number;
}
