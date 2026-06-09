import type { ScanResult, ScanHistoryEntry } from '../types';

const API_BASE = '/api';

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

export async function getContract(scanId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/contract/${encodeURIComponent(scanId)}`);
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.text();
}

export async function getScanHistory(repo: string): Promise<ScanHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/scans/${encodeURIComponent(repo)}`);
  if (!res.ok) throw new Error('Failed to fetch scan history');
  return res.json();
}
