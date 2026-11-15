// Pre-computed X-VERBA scans against real, public AI agent applications —
// not framework source repos themselves, but real code built on top of them.
// Curated so the home page always shows fast, honest, non-empty results
// instead of depending on a live scan of an arbitrary repo. Regenerate by
// re-running these three through POST /api/scan if the scanner logic changes.
//
// The data lives in featuredScans.json so the API can load the same results
// at startup (for contract export and shareable links) without the browser
// having to upload them.

import type { ScanResult } from '../types';
import data from './featuredScans.json';

export interface FeaturedScan {
  slug: string;
  blurb: string;
  result: ScanResult;
}

export const FEATURED_SCANS = data as unknown as FeaturedScan[];
