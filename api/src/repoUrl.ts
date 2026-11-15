// ── GitHub repository links, in the shapes people actually paste ────────────
// Accepts, with or without https://, www. or a trailing slash:
//   org/repo
//   github.com/org/repo                        (and http(s)://, www.)
//   https://github.com/org/repo.git
//   git@github.com:org/repo.git
//   https://github.com/org/repo/tree/<branch>             a branch
//   https://github.com/org/repo/tree/<branch>/<folder>    a folder on a branch
//   https://github.com/org/repo/blob/<branch>/<file>      a file: scans its branch
//   https://github.com/org/repo/pulls, /issues, ?tab=…, #readme   the repo itself
//
// Branch names may contain "/", so ".../tree/a/b/c" could be branch "a" with
// folder "b/c", or branch "a/b" with folder "c". The URL alone can't say
// which, so parseRepoUrl keeps the segments and resolveRef picks the longest
// prefix that is a real branch or tag on the remote.

export interface ParsedRepo {
  owner: string;
  repo: string;
  /** Path segments after /tree/ or /blob/: a branch or tag, then maybe a folder or file. */
  refSegments: string[];
  /** "blob" when the link pointed at a file (we scan its branch, not the file alone). */
  refKind?: 'tree' | 'blob';
}

export interface RepoTarget {
  /** What to pass to `git clone`. */
  cloneUrl: string;
  /** Branch or tag to clone, or undefined for the repository's default branch. */
  branch?: string;
  /** Folder inside the repo to scan, or undefined for the whole repo. */
  subdir?: string;
  /** Repository name, e.g. "my-agent". */
  name: string;
  /** Name shown in reports and used for scan history, e.g. "my-agent (feature/x)". */
  displayName: string;
  /** Base for links to a scanned file at a line: `${sourceBase}/<path>#L<line>`. */
  sourceBase: string;
}

const NAME_RE = /^[A-Za-z0-9_.-]+$/;
// Conservative ref/folder segment check: git allows more, but this is what
// real branch and folder names use, and it rules out option injection ("-…")
// and path tricks ("..").
const SEGMENT_RE = /^[A-Za-z0-9._@+-]+$/;

function safeSegment(s: string): boolean {
  return SEGMENT_RE.test(s) && !s.startsWith('-') && s !== '.' && !s.includes('..');
}

export function parseRepoUrl(input: string): ParsedRepo | null {
  let text = input.trim();
  if (!text) return null;

  // git@github.com:org/repo(.git)
  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(text);
  if (ssh) text = `https://github.com/${ssh[1]}/${ssh[2]}`;

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    if (/^(?:www\.)?github\.com\//i.test(text)) text = `https://${text}`;
    else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(text)) text = `https://github.com/${text}`;
    else return null;
  }

  // URL() would silently resolve "a/../b"; refuse dot segments instead.
  if (/\/\.{1,2}(?:[/?#]|$)|%2e%2e/i.test(text.replace(/^[a-z]+:\/\//i, ''))) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!/^(?:www\.)?github\.com$/i.test(url.hostname)) return null;
  if (url.username || url.password || url.port) return null;

  let segments: string[];
  try {
    // Decode first, then split, so "feature%2Fx" reads as the branch feature/x.
    segments = url.pathname
      .split('/')
      .flatMap((s) => decodeURIComponent(s).split('/'))
      .filter(Boolean);
  } catch {
    return null;
  }
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  if (!NAME_RE.test(owner) || !NAME_RE.test(repo) || repo === '.' || repo === '..') return null;

  const kind = segments[2]?.toLowerCase();
  if ((kind === 'tree' || kind === 'blob') && segments.length > 3) {
    const refSegments = segments.slice(3);
    if (!refSegments.every(safeSegment)) return null;
    return { owner, repo, refSegments, refKind: kind };
  }
  // /pulls, /issues, /actions, /commits, … or nothing: the repo itself.
  return { owner, repo, refSegments: [] };
}

/**
 * Split ".../tree/<segments>" into a ref and a folder, given the remote's
 * branch and tag names. The longest matching prefix wins, as GitHub does.
 * Returns null when no prefix is a branch or tag.
 */
export function resolveRef(
  parsed: ParsedRepo,
  remoteRefs: Set<string>,
): { branch?: string; subdir?: string } | null {
  const segs = parsed.refSegments;
  if (segs.length === 0) return {};
  for (let k = segs.length; k >= 1; k--) {
    const ref = segs.slice(0, k).join('/');
    if (!remoteRefs.has(ref)) continue;
    let rest = segs.slice(k);
    // A file link scans the file's branch; we don't scan single files.
    if (parsed.refKind === 'blob') rest = [];
    return { branch: ref, subdir: rest.length ? rest.join('/') : undefined };
  }
  return null;
}

export function buildTarget(parsed: ParsedRepo, branch?: string, subdir?: string): RepoTarget {
  const { owner, repo } = parsed;
  const ref = branch ? encodeURI(branch) : 'HEAD';
  const sub = subdir ? `/${subdir.split('/').map(encodeURIComponent).join('/')}` : '';
  const label = [branch, subdir].filter(Boolean).join(': ');
  return {
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    branch,
    subdir,
    name: repo,
    displayName: label ? `${repo} (${label})` : repo,
    sourceBase: `https://github.com/${owner}/${repo}/blob/${ref}${sub}`,
  };
}

/** Branch and tag names from `git ls-remote --heads --tags` output. */
export function parseLsRemote(stdout: string): Set<string> {
  const refs = new Set<string>();
  for (const line of stdout.split('\n')) {
    const m = /\trefs\/(?:heads|tags)\/(.+?)(?:\^\{\})?\s*$/.exec(line);
    if (m) refs.add(m[1]);
  }
  return refs;
}
