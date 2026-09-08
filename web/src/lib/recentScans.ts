// Real, locally-remembered scan history for this browser only — replaces a
// previous hardcoded "Recent scans" list that showed fake shared activity.
// No backend involved; this is per-visitor convenience, not a claim that
// other people have scanned these repos.

const STORAGE_KEY = 'xverba_recent_scans';
const MAX_ENTRIES = 5;

export interface RecentScan {
  repoName: string;
  repoUrl: string;
  gamma: number;
  scannedAt: string;
}

export function getRecentScans(): RecentScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentScan[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentScan(repoName: string, repoUrl: string, gamma: number): void {
  try {
    const existing = getRecentScans().filter((s) => s.repoUrl !== repoUrl);
    const updated = [{ repoName, repoUrl, gamma, scannedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing, etc.) — silently skip.
  }
}
