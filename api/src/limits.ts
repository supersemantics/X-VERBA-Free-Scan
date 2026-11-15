// ── Keeping a public scan endpoint usable for everyone ──────────────────────
// Each scan clones a repo and runs the engine, so the site caps:
//   - scans per visitor (IP) in a time window,
//   - one scan at a time per visitor,
//   - scans running at once across the site, with a short queue behind them.
// All limits are environment-tunable; defaults suit one small container.

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const LIMITS = {
  perIpWindowMs: envInt('SCAN_RATE_WINDOW_MS', 10 * 60 * 1000),
  perIpMax: envInt('SCAN_RATE_MAX', 8),
  maxConcurrent: envInt('SCAN_MAX_CONCURRENT', 2),
  maxQueued: envInt('SCAN_MAX_QUEUED', 6),
};

export type Admission =
  | { ok: true; release: () => void; wait: Promise<void> }
  | { ok: false; status: 429 | 503; message: string; retryAfterSec: number };

export class ScanLimiter {
  private recent = new Map<string, number[]>();
  private inFlight = new Set<string>();
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(
    private readonly opts = LIMITS,
    private readonly now: () => number = Date.now,
  ) {}

  /** Ask to start a scan for this visitor. On success, await `wait`, then call `release` when done. */
  admit(ip: string): Admission {
    const t = this.now();
    const times = (this.recent.get(ip) ?? []).filter((x) => t - x < this.opts.perIpWindowMs);

    if (this.inFlight.has(ip)) {
      return { ok: false, status: 429, message: 'You already have a scan running. Wait for it to finish, then try again.', retryAfterSec: 30 };
    }
    if (times.length >= this.opts.perIpMax) {
      const retryAfterSec = Math.max(1, Math.ceil((times[0] + this.opts.perIpWindowMs - t) / 1000));
      return {
        ok: false,
        status: 429,
        message: `You’ve reached the Free Scan limit of ${this.opts.perIpMax} scans in ${Math.round(this.opts.perIpWindowMs / 60000)} minutes. Try again in about ${Math.ceil(retryAfterSec / 60)} min, or run the x-verba CLI locally for unlimited scans.`,
        retryAfterSec,
      };
    }
    if (this.running >= this.opts.maxConcurrent && this.queue.length >= this.opts.maxQueued) {
      return { ok: false, status: 503, message: 'Free Scan is busy right now. Please try again in a minute.', retryAfterSec: 60 };
    }

    times.push(t);
    this.recent.set(ip, times);
    this.inFlight.add(ip);

    let wait: Promise<void>;
    if (this.running < this.opts.maxConcurrent) {
      this.running++;
      wait = Promise.resolve();
    } else {
      wait = new Promise<void>((resolve) => this.queue.push(() => { this.running++; resolve(); }));
    }

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.inFlight.delete(ip);
      this.running--;
      this.queue.shift()?.();
    };
    return { ok: true, release, wait };
  }

  /** Drop visitors whose window has passed, so the map doesn't grow forever. */
  prune(): void {
    const t = this.now();
    for (const [ip, times] of this.recent) {
      if (times.every((x) => t - x >= this.opts.perIpWindowMs)) this.recent.delete(ip);
    }
  }

  get stats() {
    return { running: this.running, queued: this.queue.length };
  }
}
