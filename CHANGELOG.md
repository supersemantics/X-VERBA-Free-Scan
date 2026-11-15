# Changelog

All notable changes to X-VERBA Free Scan. Versions follow [semantic versioning](https://semver.org/); the API and web packages share one version.

## 0.4.1: x-verba 0.7.1

**Engine:** x-verba 0.7.1 (pinned in the Dockerfile; was 0.7.0).

0.7.1 fixes scoring noise found on these same repos. Decorators like `@tool` are no longer read as checkpoints. Comments and docstrings no longer count as evidence. Adding to a function's own working list is no longer consequential. Model calls through an `llm` object (`llm.invoke`, `(prompt | llm).invoke`) are now counted. Caller guards no longer match a function's own `def` line or another object's method of the same name. See the engine's CHANGELOG for details.

Featured scans refreshed with 0.7.1 (scan IDs kept):

| Repo | 0.7.0 | 0.7.1 |
|---|---|---|
| TradingAgents | Γ 0.13 (11/83), 0/12 agent actions, 21 fixes | Γ 0.05 (4/77), 0/23 agent actions (11 model calls now found), 23 fixes |
| TaskWeaver | Γ 0.19 (45/237), 0/16, 25 fixes | Γ 0.18 (44/239), 0/18, 28 fixes |
| AutoGPT | Γ 0.22 (517/2368), 0/59, 486 fixes | Γ 0.22 (512/2313), 0/59, 494 fixes |

Checked against the Docker image: `/api/health` reports engine 0.7.1, and the TradingAgents report lists its model calls first in "Not governed", with every card agreeing with the verdict.

## 0.4.0: one consistent verdict, featured scans on x-verba 0.7.0

### The report no longer contradicts itself

- **Before:** the report mixed two separate engine outputs without saying so. The Governance Score (Γ) and the status come from the *decision points* the engine counts. "Findings", "Files affected", Severity and Drift classes come from a separate list of *gaps*, and the two lists don't overlap. So a repo whose gap list was empty showed "No Governance Gaps Found" at the top, next to "Significant gaps" and Γ 0.17.
- **After:** one verdict at the top, worked out from the same numbers as the score: the status, "N of M decision points have a governance check, so Γ = …", how many of the agent's own actions are governed, and how many recommended fixes there are. "No governance gaps found" now appears only when Γ is 0.9 or more, nothing is ungoverned, and there are no fixes. The two lists are named for what they are: **Not governed** (decision points, which make up the score) and **Recommended fixes** (the gap list, previously "Findings"). Severity and drift-class cards now say they count fixes. The status card explains its bands.
- **Breakdown:** the agent's own actions come first, then what isn't governed. Long lists show 100 rows with a "Show all" button (AutoGPT has 2,368). "See what isn't governed" now scrolls to the list's heading instead of the middle of it.
- A tool's registering decorator (e.g. `@tool`) is no longer described as a checkpoint "that does not count". It says there's no checkpoint, and what the decorator does.
- On an empty Recommended fixes tab, the page now explains that this doesn't mean the code is governed, when decision points are still ungoverned.
- Home page cards lead with how many agent actions are governed.

### Featured scans re-scanned with x-verba 0.7.0

| Repo | Before (August, older engine) | Now (0.7.0) |
|---|---|---|
| TradingAgents | Γ 0.17, 10 findings | Γ 0.13 (11 of 83), 0 of 12 agent tools governed, 21 recommended fixes |
| AutoGPT | Γ 0.06, 252 findings | Γ 0.22 (517 of 2,368), 0 of 59 model calls governed, 486 recommended fixes |
| TaskWeaver | Γ 0.40, 12 findings | Γ 0.19 (45 of 237), 0 of 16 model calls governed, 25 recommended fixes |

Each keeps its scan ID, so existing links still work. The full results (2.4 MB, mostly AutoGPT) moved to `api/data/featured-scans.json`, which the API loads at startup. The page bundles only a 2 KB summary for the home page cards, and the report fetches the rest. `node api/scripts/refresh-featured.mjs <api-url>` re-scans all three and rewrites both files.

### Also

- Removed a line in the report that pointed to a separate commercial product.
- Removed the "Test cases" figure: it was an estimate (`gaps × 1.5 + drift classes`), not a count. `test_cases_count` is no longer produced.
- Clones use `core.longpaths`, so Free Scan running on Windows can check out repos with deep paths (AutoGPT failed before). Gap descriptions from Windows scans show paths with `/`.

### Tests

- `npm test` in `api/`: 10 pass. `tsc` is clean in both packages.
- Checked in the browser against the Docker image: the TradingAgents, TaskWeaver and AutoGPT reports, including the ungoverned list and "Show all". AutoGPT opens in about 0.1 s. A Γ 1.00 repo shows green "No governance gaps found" with every card agreeing, and a Γ 0.89 one shows "Partial coverage" with 1 fix and 1 ungoverned item.

## 0.3.1: scan private repos when running locally

- **Before:** 0.3.0 turned off git's stored credentials everywhere, so a public deployment never waits on a login. That also stopped a locally run Free Scan from scanning private repos the machine's own GitHub login can reach, which used to work.
- **After:** setting `GIT_USE_LOCAL_CREDENTIALS=1` lets git use the stored login (for example Git Credential Manager) again. git still never prompts. Off by default, so the public site is unchanged, and the API logs a warning at startup when it's on.
- **Tested:** a private repo scans with the setting on (Γ 0, 0 of 8 actions governed on its test branch) and gets "Repository not found, or it's private" with it off. The 10 API tests pass.

## 0.3.0: links people paste, plain errors, real versions, limits for a public site

**Engine:** x-verba 0.7.0, now pinned in the Dockerfile.

### GitHub links

- **Before:** only `https://github.com/org/repo` and `…/tree/<branch>` worked. `org/repo` passed the page's check, then failed at the API. `github.com/org/repo` without `https://`, links with `?tab=…`, and file links were rejected. Folder links (`…/tree/main/api`) failed because the folder was read as part of the branch name.
- **After:** all of these work, plus `git@github.com:` links and links ending in `/pulls` or `/issues`. A folder link scans just that folder, and its source links point into it. A file link scans its branch. Branch names with `/` are resolved against the repository's real branches and tags (`git ls-remote`), taking the longest match, as GitHub does.
- **Why:** these are the shapes people copy from GitHub. Seven of them failed in a test of 15 shapes.

### Error messages

- **Before:** a private or missing repo, an unknown branch, or an engine failure returned raw `git` or CLI output, including server file paths.
- **After:** each gets a plain message: "Repository not found, or it's private…", "Branch or tag … wasn't found", "Folder … wasn't found", "took too long", "the scan engine couldn't analyse…". The full detail goes to the server log only. Status codes say what happened (400, 404, 429, 503, 504) instead of always 500. Git never waits for credentials, so a private repo fails at once instead of hanging.

### Versions

- **Before:** the health check said 0.1.0, the footer said v0.2.0, and the contract said `verba_version: "0.2.0"`. None of them was the engine version (0.7.0).
- **After:** `/api/health` reports the app version and the engine version (`x-verba --version`). Every new result records `engine_version` and `app_version`, and these appear in the report header, the footer and all four contract formats. The featured scans predate this, so they say "not recorded".

### Things that looked like features but weren't

- Removed the **Sign In** and **GitHub OAuth** buttons, which did nothing. The page now says public repositories only, no sign-in needed, and links to the x-verba CLI for private code. The header links to this repository.

### A public site that stays up

- **Rate limits:** each visitor (by IP, read behind Railway's proxy) can start 8 scans per 10 minutes and run one at a time. At most 2 scans run across the site, with 6 waiting behind them; beyond that, visitors are asked to retry. All tunable by environment variable (see README).
- **Removed `POST /api/scan/register`.** Anyone could store a made-up result and get a shareable link for it. The featured scans now live in `web/src/data/featuredScans.json`, which the API loads at startup.
- **Bounded store:** at most 500 results (`MAX_STORED_SCANS`) and 20 history entries per repo. Before, memory grew without limit.
- **Request body limit** cut from 2 MB to 16 KB. The scan request is one URL.
- **The container runs as the `node` user**, not root, since it clones untrusted repositories.
- **Contract YAML:** values are now escaped, so a finding containing a quote no longer breaks the file.

### Shareable report links

- **Before:** `/results/<id>` showed "No scan data found" on refresh or when shared, because the page read only in-browser state.
- **After:** the page loads the result from the new `GET /api/scan/:id`. Once a result has been cleared (oldest first, and on every redeploy), the link says so and explains why.

### Tests

- New: `npm test` in `api/`, 10 tests covering URL shapes, branch and folder resolution, `ls-remote` parsing, and the limiter.
- Checked end to end against the Docker image Railway builds: 13 URL shapes (7 scan; 2 not-found, 2 missing branch or folder, and 2 invalid each return the right message), the folder source links, the result-by-ID and expired links, the featured contract, the removed register endpoint, both rate limits, the non-root user, and a scan run through the page.

## 0.2.0 and earlier

Before this changelog: branch URLs and VSL gate reporting (PR #1), Railway deployment, and the move to the real x-verba CLI.
