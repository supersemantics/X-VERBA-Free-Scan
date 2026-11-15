import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScanLimiter } from './limits.js';

const opts = { perIpWindowMs: 60_000, perIpMax: 3, maxConcurrent: 1, maxQueued: 1 };

test('one scan at a time per visitor', () => {
  const l = new ScanLimiter(opts, () => 0);
  const a = l.admit('1.1.1.1');
  assert.ok(a.ok);
  const b = l.admit('1.1.1.1');
  assert.ok(!b.ok && b.status === 429);
  if (a.ok) a.release();
  assert.ok(l.admit('1.1.1.1').ok);
});

test('per-visitor window limit, then it resets', () => {
  let now = 0;
  const l = new ScanLimiter({ ...opts, maxConcurrent: 10 }, () => now);
  for (let i = 0; i < 3; i++) {
    const a = l.admit('ip');
    assert.ok(a.ok);
    if (a.ok) a.release();
  }
  const blocked = l.admit('ip');
  assert.ok(!blocked.ok && blocked.status === 429 && blocked.retryAfterSec === 60);
  now = 60_001;
  assert.ok(l.admit('ip').ok);
});

test('site-wide concurrency with a short queue, then 503', async () => {
  const l = new ScanLimiter(opts, () => 0);
  const a = l.admit('a');
  const b = l.admit('b');
  const c = l.admit('c');
  assert.ok(a.ok && b.ok);
  assert.ok(!c.ok && c.status === 503);
  let bStarted = false;
  if (b.ok) b.wait.then(() => { bStarted = true; });
  await Promise.resolve();
  assert.equal(bStarted, false);
  if (a.ok) a.release();
  await new Promise((r) => setImmediate(r));
  assert.equal(bStarted, true);
  assert.deepEqual(l.stats, { running: 1, queued: 0 });
});

test('release is idempotent', () => {
  const l = new ScanLimiter(opts, () => 0);
  const a = l.admit('a');
  assert.ok(a.ok);
  if (a.ok) { a.release(); a.release(); }
  assert.deepEqual(l.stats, { running: 0, queued: 0 });
});
