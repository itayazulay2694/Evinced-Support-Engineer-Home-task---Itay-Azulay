# Evinced Playwright Home Exercise

Playwright + [@evinced/js-playwright-sdk](https://developer.evinced.com/sdks-for-web-apps/playwright-js-sdk) against [https://a11y-audits.com/](https://a11y-audits.com/).

> **New here?** [`PROJECT_WALKTHROUGH.md`](PROJECT_WALKTHROUGH.md) explains the whole project end to end — concepts, setup, the process that was followed, problems hit, and presentation notes.

## What this covers

| Exercise item | Implementation |
|---|---|
| SDK from JFrog | Local `.npmrc` scoped to `@evinced` (`.npmrc.example` template) |
| Simple home navigation | `tests/home-navigation.spec.ts` — **`evAnalyze`** (single-run), two page states merged with `evMergeIssues` |
| Complex flow + validations | `tests/complex-flow.spec.ts` — **`evStart` / `evStop`** (continuous), 6 states |
| HTML report with screenshots | `evinced-reports/*.html` — `scan.screenshots.enabled` in `evConfig.json`; each test also asserts the report contains screenshots and attaches it to the Playwright report |
| Scale to all tests | Two options: (a) `fixtures/evinced.fixture.ts` (`{ auto: true }`) + `examples/scale-with-fixture.spec.ts`; (b) the Evinced **aggregated reporter** registered in `playwright.config.ts` → `evinced-reports/aggregatedReport.html` |

## Setup

1. Copy env and npm auth templates:

```bash
cp .env.example .env
cp .npmrc.example .npmrc
```

2. Fill `.env` with the Evinced Service ID and API key from the exercise brief.

3. Put the JFrog JWT into `.npmrc` (`_authToken=...`).

4. Install:

```bash
npm install
npx playwright install chromium
```

`.env` and `.npmrc` are gitignored — do not commit credentials.

## Run

```bash
# Main exercise tests (single-run + continuous)
npm test

# Scale fixture example
npm run test:scale

# Everything (both projects) — also produces the aggregated report
npm run test:all

# Headed debugging
npm run test:headed
```

Open reports:

```bash
open evinced-reports/home-navigation.html
open evinced-reports/complex-flow.html
open evinced-reports/aggregatedReport.html
```

## Modes (why each test uses which)

- **Single-run (`evAnalyze`)** — `home-navigation.spec.ts`. The home page is essentially one static state, so a discrete scan is the right tool. To honour the brief's "interact so the analysis runs on all page states", the test scans twice (as loaded, then after switching a feature tab) and deduplicates with `evMergeIssues`.
- **Continuous (`evStart` → interact → `evStop`)** — `complex-flow.spec.ts`. The flow crosses many states — home feature tabs, catalog grid, a product page reached by *clicking* a grid item, the add-to-cart drawer, the contact form, and the cart holding that product. Continuous mode records issues across all of them in one session. `evStop` + report save run in `finally`, so a mid-test failure still stops the scan and writes the report.

Screenshots are enabled once in `evConfig.json` (`scan.screenshots.enabled`).

## Scale integration (item 5)

Two complementary approaches are included:

### a) Auto fixture — zero per-spec boilerplate

Import `{ test, expect }` from the Evinced fixture instead of `@playwright/test`. The `_evincedAuto` fixture uses `{ auto: true }`, so every test gets continuous scanning + an HTML report with no Evinced calls in the spec. `evStop` runs in `finally` so a failing test still closes the session (an unclosed continuous session makes the next test's `evStart` throw) and still writes its report.

```ts
import { test, expect } from '../fixtures/evinced.fixture';

test('any existing UI test', async ({ page }) => {
  await page.goto('/');
});
```

### b) Aggregated reporter — one combined report for the whole run

`playwright.config.ts` registers `@evinced/js-playwright-sdk/reporter`; its settings come from `evConfig.json` (`report.*`). Any test that constructs an `EvincedSDK` feeds it, and a single `evinced-reports/aggregatedReport.html` is written at the end of the run covering every test.

Org-wide pattern: point specs at the fixture import for per-test coverage, keep the aggregated reporter on for a run-level dashboard, keep credentials in `global.setup.ts`, and keep scan/screenshot/report defaults in `evConfig.json`.

See `examples/scale-with-fixture.spec.ts`.

## Project layout

```
global.setup.ts          # setCredentials from env
evConfig.json            # screenshots on + report.* for the aggregated reporter
evincedReportDir.ts      # shared report output dir
playwright.config.ts     # globalSetup + list/html/evinced reporters
tests/
  home-navigation.spec.ts
  complex-flow.spec.ts
fixtures/
  evinced.fixture.ts
examples/
  scale-with-fixture.spec.ts
evinced-reports/         # generated HTML (committed for review)
```

## Notes from running this exercise

- **JFrog install** returned 403 until the project `.npmrc` used the exercise JWT against the scoped `@evinced` registry; after that `npm install` resolved `@evinced/js-playwright-sdk@2.56.0` via the lockfile.
- **Locators** on a11y-audits.com don't follow the marketing copy — "Book a Consultation" is a button, "Do you have any question?" is a paragraph, not a heading. Assertions follow the real accessibility tree.
- **Feature tabs** (`One day delivery` / `Secured checkout` / `Premium products`) expose **no `aria-selected`** and no active-state class — an a11y smell in itself — so the tests assert on the swapped tabpanel copy instead.
- **Duplicate `E-mail` fields** (contact form + footer) trip Playwright strict mode — scoped with `.first()`.
- **Cart** has almost no accessible heading content even when populated (`document.title` is "Your Shopping Cart"); validated via title + the product line-item text.
- The contact form is filled and its values validated but **not submitted** — "Send message" delivers a real email to the demo-site owner; the filled states are what Evinced needs to scan.
- **Continuous-mode teardown** is in `finally` (both the spec and the fixture) so a failing test still stops the scan and writes a report.
- **Aggregated reporter** only emits when `evConfig.json` has a valid `report.*` section and a test constructs an `EvincedSDK` during the run.
