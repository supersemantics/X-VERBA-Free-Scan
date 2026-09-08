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

export interface ScanResult {
  scan_id: string;
  repo: string;
  repo_name: string;
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
}

export interface ScanHistoryEntry {
  scan_id: string;
  date: string;
  gamma: number;
  node_count: number;
}
