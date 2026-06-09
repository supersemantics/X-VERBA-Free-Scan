import type { ScanResult, ScanHistoryEntry } from './types.js';

// ── In-memory store (replace with Supabase in production) ────────────────────

const scanStore = new Map<string, ScanResult>();
const historyStore = new Map<string, ScanHistoryEntry[]>();

export function saveScan(result: ScanResult): void {
  scanStore.set(result.scan_id, result);

  const repo = result.repo_name;
  const history = historyStore.get(repo) || [];
  history.push({
    scan_id: result.scan_id,
    date: result.scan_date,
    gamma: result.gamma,
    node_count: result.ungoverned_nodes.length,
  });
  historyStore.set(repo, history);
}

export function getScan(scanId: string): ScanResult | undefined {
  return scanStore.get(scanId);
}

export function getHistory(repo: string): ScanHistoryEntry[] {
  return historyStore.get(repo) || [];
}
