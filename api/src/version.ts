import { readFileSync } from 'node:fs';

// The app's version, from api/package.json (one place to bump). Works from
// both src/ (tsx) and dist/ (compiled), which sit at the same depth.
export const APP_VERSION: string = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
).version;
