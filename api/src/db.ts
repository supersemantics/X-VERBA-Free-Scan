import { readFileSync } from 'node:fs';
import type { ScanResult, ScanHistoryEntry } from './types.js';

// ── In-memory store, bounded ─────────────────────────────────────────────────
// Free Scan keeps results only in memory: they are cleared on every redeploy,
// and the oldest are dropped once MAX_STORED_SCANS is reached, so a public
// site can't grow without limit. Featured scans are loaded from the bundled
// JSON at startup and are never evicted.

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAX_SCANS = envInt('MAX_STORED_SCANS', 500);
const MAX_HISTORY_PER_REPO = 20;
const MAX_REPOS = 2000;

const scanStore = new Map<string, ScanResult>(); // insertion order = age
const featuredStore = new Map<string, ScanResult>();
const historyStore = new Map<string, ScanHistoryEntry[]>();

export function saveScan(result: ScanResult): void {
  scanStore.delete(result.scan_id);
  scanStore.set(result.scan_id, result);
  while (scanStore.size > MAX_SCANS) {
    const oldest = scanStore.keys().next().value;
    if (oldest === undefined) break;
    scanStore.delete(oldest);
  }

  const repo = result.repo_name;
  const history = historyStore.get(repo) ?? [];
  history.push({
    scan_id: result.scan_id,
    date: result.scan_date,
    gamma: result.gamma,
    node_count: result.ungoverned_nodes.length,
  });
  historyStore.delete(repo);
  historyStore.set(repo, history.slice(-MAX_HISTORY_PER_REPO));
  while (historyStore.size > MAX_REPOS) {
    const oldest = historyStore.keys().next().value;
    if (oldest === undefined) break;
    historyStore.delete(oldest);
  }
}

export function getScan(scanId: string): ScanResult | undefined {
  return featuredStore.get(scanId) ?? scanStore.get(scanId);
}

export function getHistory(repo: string): ScanHistoryEntry[] {
  return historyStore.get(repo) ?? [];
}

/** Load the home page's featured scans (api/data/featured-scans.json). Returns how many loaded. */
export function loadFeaturedScans(path: URL): number {
  try {
    const featured = JSON.parse(readFileSync(path, 'utf-8')) as { result: ScanResult }[];
    for (const f of featured) featuredStore.set(f.result.scan_id, f.result);
    return featured.length;
  } catch (err) {
    console.error('Could not load featured scans:', err instanceof Error ? err.message : err);
    return 0;
  }
}
