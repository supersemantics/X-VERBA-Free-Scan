// Pre-computed X-VERBA scans against real, public AI agent applications —
// not framework source repos themselves, but real code built on top of them.
// Curated so the home page always shows fast, honest, non-empty results
// instead of depending on a live scan of an arbitrary repo.
//
// Only a small summary per scan is bundled here, for the home page cards.
// The full results (AutoGPT's alone is ~1.7 MB) live in
// api/data/featured-scans.json; the API loads them at startup and the report
// page fetches one by its scan_id. Regenerate both files with
// `node api/scripts/refresh-featured.mjs` against a running API.

import type { ScanResult } from '../types';
import data from './featuredScans.json';

export type FeaturedSummary = Pick<
  ScanResult,
  'scan_id' | 'repo_name' | 'gamma' | 'files_scanned' | 'severity_breakdown' | 'agent_actions' | 'engine_version'
>;

export interface FeaturedScan {
  slug: string;
  blurb: string;
  result: FeaturedSummary;
}

export const FEATURED_SCANS = data as unknown as FeaturedScan[];
