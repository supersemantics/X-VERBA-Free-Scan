// ── Errors a visitor can read ───────────────────────────────────────────────
// Raw git / CLI output carries server paths and internals, so it is logged
// server-side only. What goes back to the browser is one of these.

export class ScanError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
    public readonly detail?: string,
  ) {
    super(publicMessage);
  }
}

export const MESSAGES = {
  invalidUrl:
    'That doesn’t look like a GitHub repository link. Paste something like https://github.com/org/repo, or a branch link (…/tree/<branch>).',
  notFound:
    'Repository not found, or it’s private. Free Scan can only scan public GitHub repositories. To scan a private repo, run the x-verba CLI locally.',
  branchNotFound: (ref: string) => `Branch or tag “${ref}” wasn’t found in this repository.`,
  folderNotFound: (dir: string) => `Folder “${dir}” wasn’t found on that branch.`,
  timeout: 'The repository took too long to download or scan. Very large repositories may not finish on Free Scan; try a branch or folder link, or run the x-verba CLI locally.',
  engine: 'The scan engine couldn’t analyse this repository. Please try again, or run the x-verba CLI locally to see the full error.',
  generic: 'The scan failed. Please try again in a moment.',
} as const;

interface ExecError {
  killed?: boolean;
  signal?: string | null;
  code?: number | string;
  stderr?: string | Buffer;
  message?: string;
}

function stderrOf(err: unknown): string {
  const e = err as ExecError;
  return `${e?.stderr ?? ''}\n${e?.message ?? ''}`;
}

export function isTimeout(err: unknown): boolean {
  const e = err as ExecError;
  return Boolean(e?.killed) || e?.signal === 'SIGTERM' || e?.code === 'ETIMEDOUT';
}

/** Turn a failed `git ls-remote` / `git clone` into a ScanError. */
export function gitError(err: unknown, ref?: string): ScanError {
  const text = stderrOf(err);
  if (isTimeout(err)) return new ScanError(504, MESSAGES.timeout, text);
  if (/Remote branch .* not found|couldn't find remote ref/i.test(text) && ref) {
    return new ScanError(404, MESSAGES.branchNotFound(ref), text);
  }
  if (
    /Repository not found|could not read Username|Authentication failed|terminal prompts disabled|returned error: 40[134]|not found/i.test(
      text,
    )
  ) {
    return new ScanError(404, MESSAGES.notFound, text);
  }
  return new ScanError(502, MESSAGES.generic, text);
}
