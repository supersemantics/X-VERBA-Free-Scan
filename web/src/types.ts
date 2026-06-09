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
}

export interface DriftClassSummary {
  [code: string]: number;
}

export interface ScanResult {
  scan_id: string;
  repo: string;
  repo_name: string;
  gamma: number;
  gamma_status: 'BELOW_THRESHOLD' | 'PARTIAL_COVERAGE' | 'ABOVE_THRESHOLD';
  files_scanned: number;
  files_affected: number;
  ungoverned_nodes: UngovernedNode[];
  drift_class_summary: DriftClassSummary;
  contract_size_kb: number;
  test_cases_count: number;
  pre_nodes_count: number;
  stabilisation_operators_count: number;
  scan_date: string;
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
