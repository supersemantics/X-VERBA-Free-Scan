#!/usr/bin/env node
// Re-scan the home page's featured repos through a running Free Scan API and
// write the results:
//   api/data/featured-scans.json     full results, loaded by the API at startup
//   web/src/data/featuredScans.json  small summaries for the home page cards
//
// Usage (run the API first, ideally the Docker image, which matches Railway):
//   node api/scripts/refresh-featured.mjs [http://localhost:3001]
//
// Each featured scan keeps its scan_id, so links to it keep working.

import { readFileSync, writeFileSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '');
const fullPath = new URL('../data/featured-scans.json', import.meta.url);
const summaryPath = new URL('../../web/src/data/featuredScans.json', import.meta.url);

const featured = JSON.parse(readFileSync(fullPath, 'utf-8'));

for (const f of featured) {
  process.stdout.write(`${f.slug}: scanning ${f.result.repo} … `);
  const started = Date.now();
  const res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: f.result.repo }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${f.slug}: ${res.status} ${body.error}`);
  f.result = { ...body, scan_id: f.result.scan_id };
  console.log(`Γ ${body.gamma} in ${Math.round((Date.now() - started) / 1000)} s (x-verba ${body.engine_version})`);
}

writeFileSync(fullPath, JSON.stringify(featured, null, 2) + '\n');
writeFileSync(
  summaryPath,
  JSON.stringify(
    featured.map(({ slug, blurb, result: r }) => ({
      slug,
      blurb,
      result: {
        scan_id: r.scan_id,
        repo_name: r.repo_name,
        gamma: r.gamma,
        files_scanned: r.files_scanned,
        severity_breakdown: r.severity_breakdown,
        agent_actions: r.agent_actions,
        engine_version: r.engine_version,
      },
    })),
    null,
    2,
  ) + '\n',
);
console.log('Wrote api/data/featured-scans.json and web/src/data/featuredScans.json');
