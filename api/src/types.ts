// ── X-VERBA API Types ──────────────────────────────────────────────────────

export interface ScanRequest {
  repo_url: string;
}

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
}

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
}

/** A human-approval mechanism found in the code (CLI 0.7.0+). */
export interface HumanAuthorisation {
  kind: string;
  location: string;
  evidence: string;
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
  /** Branch scanned, when the URL named one (…/tree/<branch>). */
  branch?: string;
  gamma: number;
  gamma_status: string;
  files_scanned: number;
  files_affected: number;
  ungoverned_nodes: UngovernedNode[];
  drift_class_summary: Record<string, number>;
  severity_breakdown: Record<string, number>;
  frameworks_detected: string[];
  contract_size_kb: number;
  test_cases_count: number;
  pre_nodes_count: number;
  stabilisation_operators_count: number;
  scan_date: string;
  scan_duration_ms: number;
  contract_yaml?: string;
  /** Tools the agent's model can call, and model calls: governed / total (CLI 0.7.0+). */
  agent_actions?: AgentActions;
  /** VSL gates the CLI recognised (CLI 0.7.0+). */
  vsl?: VslSummary;
  /** Human-approval mechanisms the CLI recognised (CLI 0.7.0+). */
  human_authorisations?: HumanAuthorisation[];
}

export interface ScanHistoryEntry {
  scan_id: string;
  date: string;
  gamma: number;
  node_count: number;
}
