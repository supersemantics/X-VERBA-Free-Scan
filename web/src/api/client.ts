import type { ExportFormat, ScanResult, ScanHistoryEntry } from '../types';

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/$/, '');

export async function startScan(repoUrl: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scan failed' }));
    throw new Error(err.error || `Scan failed (${res.status})`);
  }
  return res.json();
}

export async function getContract(scanId: string, format: ExportFormat = 'yaml'): Promise<string> {
  const res = await fetch(`${API_BASE}/contract/${encodeURIComponent(scanId)}?format=${format}`);
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.text();
}

export async function getScanHistory(repo: string): Promise<ScanHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/scans/${encodeURIComponent(repo)}`);
  if (!res.ok) throw new Error('Failed to fetch scan history');
  return res.json();
}

// Seeds the server's in-memory store with a pre-computed result (used for
// the home page's featured scans) so contract export and history behave
// exactly like a live scan, rather than needing a separate code path.
export async function registerScan(result: ScanResult): Promise<void> {
  const res = await fetch(`${API_BASE}/scan/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error('Failed to register scan');
}
