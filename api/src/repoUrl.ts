// ── GitHub repository URLs, with an optional branch ─────────────────────────
// Accepts:
//   https://github.com/org/repo
//   https://github.com/org/repo.git
//   https://github.com/org/repo/tree/<branch>      (branch may contain "/")
// The /tree/<branch> form is the URL GitHub itself shows for a branch, so a
// user can paste it straight from the branch picker.

export interface RepoTarget {
  /** What to pass to `git clone`. */
  cloneUrl: string;
  /** Branch to clone, or undefined for the repository's default branch. */
  branch?: string;
  /** Repository name, e.g. "CareAssist". */
  name: string;
  /** Name shown in reports and used for scan history, e.g. "CareAssist" or "CareAssist (demo/without-vsl)". */
  displayName: string;
}

const REPO_RE = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/tree\/(.+?))?\/?$/i;

// Conservative branch-name check: git allows more, but this is everything
// real branch names use, and it rules out option injection ("-…") and path
// tricks ("..").
const BRANCH_RE = /^[A-Za-z0-9._/-]+$/;

export function parseRepoUrl(url: string): RepoTarget | null {
  const match = REPO_RE.exec(url.trim());
  if (!match) return null;
  const [, owner, repo, rawBranch] = match;
  let branch: string | undefined;
  if (rawBranch !== undefined) {
    try {
      branch = decodeURIComponent(rawBranch);
    } catch {
      return null;
    }
    if (!BRANCH_RE.test(branch) || branch.startsWith('-') || branch.includes('..') || branch.startsWith('/')) {
      return null;
    }
  }
  return {
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    branch,
    name: repo,
    displayName: branch ? `${repo} (${branch})` : repo,
  };
}
