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

/** A stored result by ID, or null if the server no longer has it. */
export async function getScan(scanId: string): Promise<ScanResult | null> {
  const res = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load scan (${res.status})`);
  return res.json();
}

export interface HealthInfo {
  status: string;
  version: string;
  engine?: { name: string; version: string | null };
}

export async function getHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
