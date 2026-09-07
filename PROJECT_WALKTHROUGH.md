# Project Walkthrough — Evinced Playwright JS SDK Home Exercise

A full, self-contained explanation of this project: what the exercise asked for,
what was built, how to install and configure it, the exact process that was
followed, the problems hit along the way, and how to present it.

Written to be readable without deep Playwright knowledge. The terse reference
version lives in [`README.md`](README.md).

---

## 1. The exercise, in one paragraph

Evinced ships an accessibility-testing SDK that plugs into Playwright test
suites. The task: get that SDK from Evinced's private JFrog registry, write two
Playwright tests against the demo shop **https://a11y-audits.com/**, wire the
Evinced SDK into those tests using the right scan mode for each, produce an HTML
report **with screenshots**, show how the same integration would scale to a
whole test suite, and write a submission email describing the work.

### What was delivered

| # | Exercise item | Where it lives | Status |
|---|---|---|---|
| 1 | Obtain the Playwright JS SDK from JFrog | [`.npmrc.example`](.npmrc.example) (scoped `@evinced` registry + auth token) | ✅ `@evinced/js-playwright-sdk@2.56.0` installed via lockfile |
| 2a | Simple test — navigate to the home page | [`tests/home-navigation.spec.ts`](tests/home-navigation.spec.ts) | ✅ passes |
| 2b | Complex flow with validations | [`tests/complex-flow.spec.ts`](tests/complex-flow.spec.ts) | ✅ passes, 6 page states |
| 3 | Integrate the SDK with the relevant mode per test | Single-run `evAnalyze` in 2a; continuous `evStart`/`evStop` in 2b | ✅ each choice justified below |
| 4 | Run and save an HTML report with screenshots | [`evinced-reports/`](evinced-reports/) — screenshots enabled in [`evConfig.json`](evConfig.json) | ✅ every test also asserts its report contains screenshots |
| 5 | Integrate Evinced at scale — with an example | [`fixtures/evinced.fixture.ts`](fixtures/evinced.fixture.ts) + [`examples/scale-with-fixture.spec.ts`](examples/scale-with-fixture.spec.ts), **and** the aggregated reporter in [`playwright.config.ts`](playwright.config.ts) | ✅ two complementary approaches |
| 6 | Submission email | [`EMAIL_DRAFT.md`](EMAIL_DRAFT.md) | ✅ |

---

## 2. Background concepts (useful for the presentation)

**Evinced SDK.** A library that runs an accessibility engine (built on top of
axe-core plus Evinced's own analysis) against whatever the browser is currently
showing during a Playwright test. It returns a list of *issues* (WCAG / ARIA
violations) and can render them as an HTML / JSON / CSV / SARIF report.

**Two scan modes — this is the core of item 3:**

- **Single-run (`evAnalyze()`)** — takes one snapshot of the page in its current
  state and analyses it. Best when the thing under test is essentially one static
  screen.
- **Continuous (`evStart()` … interactions … `evStop()`)** — opens a recording
  session, watches the DOM as the test clicks and navigates, and returns the
  issues found across *every* state the page passed through. Best for multi-step
  flows.

**Screenshots in the report.** When `scan.screenshots.enabled` is `true` in
`evConfig.json`, each issue in the HTML report carries a highlighted screenshot
of the offending element. The exercise requires this, so both tests additionally
assert the saved HTML actually contains embedded image data.

**"At scale".** Wiring `evStart`/`evStop` and report-saving into every spec by
hand does not scale. Two better options are used here — a Playwright *auto
fixture* (every test opts in with one import line) and the Evinced *aggregated
reporter* (one combined report for the whole run, configured once).

---

## 3. Repository structure

```
.npmrc.example          # template: scoped @evinced registry + JFrog auth token
.env.example            # template: EVINCED_SERVICE_ID / EVINCED_API_KEY
.nvmrc                  # Node version used (20)
package.json            # scripts + deps (@evinced/js-playwright-sdk, @playwright/test)
tsconfig.json           # strict TypeScript, Node16 module resolution
playwright.config.ts    # projects, globalSetup, list + html + Evinced reporters
global.setup.ts         # reads credentials from env, calls setCredentials() once
evConfig.json           # Evinced config: screenshots on + report.* for the aggregated reporter
evincedReportDir.ts     # single source of truth for the report output directory

tests/
  home-navigation.spec.ts   # item 2a — single-run mode
  complex-flow.spec.ts      # item 2b — continuous mode

fixtures/
  evinced.fixture.ts        # item 5, approach (a): { auto: true } wrapper

examples/
  scale-with-fixture.spec.ts # item 5 demo: a spec that only imports the fixture

evinced-reports/        # generated HTML reports (committed so a reviewer can open them)
EMAIL_DRAFT.md          # item 6
README.md               # short reference
PROJECT_WALKTHROUGH.md  # this document
```

---

## 4. Prerequisites

- **Node.js 20** (see `.nvmrc`). Node 18+ works.
- **npm** (comes with Node).
- The two secrets from the exercise brief:
  - Evinced **Service ID** and **API key** (for the SDK to authenticate at runtime).
  - The **JFrog JSON Web Token** (for `npm install` to download the package).

Nothing is hard-coded; all three are supplied through local files that are
git-ignored.

---

## 5. Installation — step by step

### 5.1 Configure JFrog access (so `npm install` can find the package)

The SDK is not on the public npm registry. npm needs to be told that anything
scoped `@evinced/*` comes from Evinced's JFrog Artifactory, with a bearer token.

```bash
cp .npmrc.example .npmrc
```

Then edit `.npmrc` and replace `<JFROG_JSON_WEB_TOKEN>` with the token from the
brief:

```
@evinced:registry=https://evinced.jfrog.io/artifactory/api/npm/restricted-npm/
//evinced.jfrog.io/artifactory/api/npm/restricted-npm/:_authToken=<JFROG_JSON_WEB_TOKEN>
```

`.npmrc` is git-ignored — the token never gets committed.

### 5.2 Configure the Evinced runtime credentials

```bash
cp .env.example .env
```

Edit `.env`:

```
EVINCED_SERVICE_ID=<Service ID from the exercise brief>
EVINCED_API_KEY=<API key from the exercise brief>
```

These are read in `global.setup.ts` and passed to `setCredentials()` once,
before any test runs. `.env` is git-ignored, so the real values never enter the
repository — that is also why they are not reproduced in this document.

### 5.3 Install packages and the browser

```bash
npm install
npx playwright install chromium
```

`npm install` resolves `@evinced/js-playwright-sdk` to the version pinned in
`package-lock.json` (**2.56.0**). `playwright install` downloads the Chromium
build that the installed Playwright version needs.

### 5.4 Verify

```bash
npm test
```

Expected: **3 passed** (the two main specs run on the `chromium` project; the
scale example runs on the `scale-example` project when you use `npm run
test:all`). Four HTML files appear under `evinced-reports/`.

---

## 6. Running the tests

| Command | What it runs |
|---|---|
| `npm test` | The two main specs (`chromium` project) + the aggregated report |
| `npm run test:scale` | Only the scale-fixture example (`scale-example` project) |
| `npm run test:all` | Both projects — the full picture, including the aggregated report |
| `npm run test:headed` | Same as `npm test` but with a visible browser (for debugging) |
| `npm run report` | Opens Playwright's own last HTML report |

The suite runs **single-worker, no parallelism** (`workers: 1`,
`fullyParallel: false`). Evinced continuous sessions and the shared credential
state are process-global, so serial execution keeps them from stepping on each
other.

> Note: passing your own `--reporter=...` on the command line replaces the
> reporter list from `playwright.config.ts`, which drops the Evinced aggregated
> reporter. Use the npm scripts (or don't override `--reporter`) to get
> `aggregatedReport.html`.

---

## 7. The reports

After `npm run test:all`, `evinced-reports/` contains:

| File | Produced by | Contents |
|---|---|---|
| `home-navigation.html` | `evSaveFile` in spec 2a | Issues from the home page, two states merged |
| `complex-flow.html` | `evSaveFile` in spec 2b (`finally` block) | Issues recorded continuously across 6 states |
| `scale-home_page_covered_by_shared_continuous_fixture.html` | the auto fixture | Issues from the scale-example spec |
| `aggregatedReport.html` | the Evinced Playwright reporter | One combined report for the **entire run** |

Every report embeds highlighted **screenshots** for each issue (config:
`scan.screenshots.enabled`). Open any of them in a browser:

```bash
open evinced-reports/aggregatedReport.html
```

### What the current run finds (illustrative numbers)

| Scan | Issue count |
|---|---|
| Home page, as loaded | 17 |
| Home page, after switching a feature tab | 17 (1 net-new unique → 18 after merge) |
| Complex flow, continuous across 6 states | 37 |
| Scale example (home + search) | 19 |

The demo site is intentionally full of accessibility problems. Recurring
categories in the reports: **colour contrast**, **form controls without
programmatic labels**, **buttons/links without an accessible name**, **missing
list semantics**, **`html` element without `lang`**, and **tab controls with no
`aria-selected` / focus-state** (the last one is discussed below — the tests hit
it directly).

---

## 8. The full process that was followed

1. **Set up the repo skeleton.** `package.json`, `tsconfig.json` (strict),
   `playwright.config.ts` with `baseURL: https://a11y-audits.com`, a `chromium`
   project, and `list` + `html` reporters.

2. **Get the SDK from JFrog.** Created `.npmrc` scoped to `@evinced` with the
   JFrog token, added `@evinced/js-playwright-sdk` to `package.json`, ran
   `npm install`. First attempt failed with **403** (token not yet wired to the
   scoped registry line); fixed the `.npmrc` and the install resolved to 2.56.0.

3. **Authenticate the SDK.** Added `global.setup.ts`: load `.env` with `dotenv`,
   read `EVINCED_SERVICE_ID` / `EVINCED_API_KEY`, throw a clear error if either is
   missing, otherwise call `setCredentials({ serviceId, secret })`. Registered it
   as `globalSetup` in the Playwright config so it runs once before all tests and
   before any `EvincedSDK` instance is constructed (the SDK requires that order).

4. **Wrote spec 2a — home navigation (single-run).** Navigate to `/`, assert two
   real elements from the accessibility tree (the "Love & Minter" brand link, the
   "Book a Consultation" button), then `evAnalyze()`. To honour the brief's
   "interact so the analysis runs on all page states", the test then switches a
   feature tab, asserts the tabpanel copy changed, and runs a **second**
   `evAnalyze()`. The two snapshots are combined with `evMergeIssues()` (semantic
   de-duplication) before the report is saved. It also asserts the saved HTML
   contains `data:image` (screenshot proof) and attaches the report to the
   Playwright run.

5. **Wrote spec 2b — complex flow (continuous).** `evStart()`, then a sequence
   that deliberately crosses many *kinds* of state change:
   - home, then two **feature tabs** toggled (DOM mutation, no navigation);
   - **catalog** reached by clicking the "Catalog" nav link;
   - a **product page** reached by *clicking the first product tile* in the grid
     (a real user path — not a hard-coded URL), asserting the resulting URL
     matches the tile's `href`;
   - the **add-to-cart drawer** (click "Add to cart", assert a `dialog` appears);
   - the **contact form** — fill Name / E-mail / Message and assert each value
     (`toHaveValue`);
   - the **cart** page, asserting its title and that the product added earlier is
     listed.

   `evStop()` + `evSaveFile()` run in a `finally` block, so even if an assertion
   in the middle fails, the scan is stopped and a report is still written.

6. **Enabled screenshots.** Set `scan.screenshots.enabled: true` in
   `evConfig.json` (project-wide, configured once rather than per call).

7. **Answered item 5 (scale) two ways:**
   - **Auto fixture** — `fixtures/evinced.fixture.ts` extends Playwright's `test`
     with a `{ auto: true }` fixture that runs `evStart` before every test and
     `evStop` + report-save after (in `finally`). Any spec that imports
     `{ test, expect }` from this module instead of `@playwright/test` gets
     continuous scanning with zero Evinced code in the spec.
     `examples/scale-with-fixture.spec.ts` demonstrates it.
   - **Aggregated reporter** — registered `@evinced/js-playwright-sdk/reporter`
     in `playwright.config.ts` and added a `report.*` section to `evConfig.json`
     (`format`, `outputDir`, `fileName`). Any test that constructs an
     `EvincedSDK` feeds it, and a single `aggregatedReport.html` is written for
     the whole run.

8. **Wrote the submission email** (`EMAIL_DRAFT.md`): what was done, how to run,
   issues encountered and their fixes.

9. **Verification.** Ran the full suite repeatedly — 3/3 stable across multiple
   runs, `tsc --noEmit` clean, all four reports generated with screenshots.

---

## 9. Problems encountered and how they were solved

| Problem | Cause | Fix |
|---|---|---|
| `npm install` returned **403** | JFrog token not associated with the scoped `@evinced` registry line | Corrected `.npmrc` to the exact `@evinced:registry=` + `//…:_authToken=` pair from the brief |
| Playwright launch failed: "Executable doesn't exist" | A Playwright minor bump pulled a newer Chromium build number | Re-ran `npx playwright install chromium` |
| Assertions couldn't find headings/buttons by their marketing text | The site's visible copy doesn't map to semantic roles (e.g. "Book a Consultation" is a `button`; "Do you have any question?" is a `<p>`) | Rebuilt every locator from the **actual accessibility tree** (`getByRole`, real names) |
| `toHaveAttribute('aria-selected', 'true')` on the feature tabs **failed** | The demo tab widget sets **no** `aria-selected` and no active-state class — a genuine accessibility defect | Asserted on the **tabpanel text** that swaps in instead; noted the defect as a finding |
| Playwright strict-mode error on the E-mail field | Two `E-mail` textboxes on the contact page (contact form + newsletter footer) | Scoped the contact-form field with `.first()` |
| Cart assertions found almost nothing | The cart page exposes very little accessible heading content even when populated (itself an a11y smell) | Validated via `document.title` (`/shopping cart/i`) + the product line-item text |
| Continuous session could leak across tests | If a test throws between `evStart` and `evStop`, the session stays open and the next test's `evStart` throws | `evStop` moved into `finally` in **both** the spec and the scale fixture |
| Aggregated report silently not generated | The Evinced reporter only activates when `evConfig.json` has a valid `report.*` block; also, overriding `--reporter` on the CLI drops it | Added `report.format` / `outputDir` / `fileName`; documented the `--reporter` caveat |

---

## 10. Design decisions and trade-offs

- **Two scans in the "simple" test.** The brief stresses interacting "so the
  analysis will run on all page states". A single static `evAnalyze` wouldn't do
  that. Scanning load-state + one interacted state and merging keeps the test
  simple while honouring that requirement — and it demonstrates `evMergeIssues`.
  Trade-off: slightly more than the absolute minimum for "navigate to the home
  page".

- **Continuous mode for the complex flow.** The flow crosses six states; a
  session recording is exactly what continuous mode is for, and it needs only one
  `evStart`/`evStop` pair instead of six `evAnalyze` calls.

- **The contact form is filled but not submitted.** "Send message" sends a real
  email to the demo-site owner. The filled field states are what Evinced needs to
  scan; submitting adds third-party side effects with no analysis benefit.

- **Reports are committed to the repo.** The brief asks for the *obtained* report
  to be shareable and presented. For a one-off exercise, committing the HTML is
  the pragmatic choice; in a long-lived codebase they'd be CI artifacts instead.

- **Serial execution.** Evinced's continuous session and credential state are
  process-global, so `workers: 1` avoids cross-test interference. Accessibility
  suites are also usually I/O-bound on analysis, not CPU-bound on parallelism.

- **`evincedReportDir.ts` as a shared constant.** One place defines the output
  directory; specs, the fixture, and the config all point at it.

---

## 11. Presenting it — likely questions

- **"Why `evAnalyze` in one test and `evStart`/`evStop` in the other?"** →
  Static screen vs multi-step flow; see §2 and §10.
- **"How do screenshots get into the report?"** → `scan.screenshots.enabled` in
  `evConfig.json`; the tests also assert the HTML contains embedded images.
- **"How would this scale to hundreds of specs?"** → Import `test` from the auto
  fixture (per-test coverage, no boilerplate) and keep the aggregated reporter on
  (one run-level report). Credentials and scan defaults stay centralised in
  `global.setup.ts` and `evConfig.json`.
- **"What did Evinced actually find?"** → Open `aggregatedReport.html`; contrast,
  missing labels, unnamed controls, list semantics, missing `lang`, and the
  broken tab widget (which the test itself had to work around).
- **"What if a test fails mid-flow?"** → `evStop` + report save are in `finally`,
  so the partial scan is still saved.

---

## 12. Possible next steps (not required by the exercise)

- **CI** — a GitHub Actions workflow running `npm run test:all` on push, with
  `evinced-reports/` uploaded as a build artifact.
- **Gating** — use Evinced's baseline comparison to fail CI only on *new* issues
  above a severity threshold, rather than on the site's existing debt.
- **More flows** — checkout, search results, account pages — each added simply by
  importing the fixture.
