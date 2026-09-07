# Submission email draft

**Subject:** Evinced Playwright JS SDK – Home Exercise submission

---

Hi,

Please find my Evinced Playwright JS SDK home exercise below.
https://github.com/itayazulay2694/Evinced-Support-Engineer-Home-task---Itay-Azulay

The repo's `PROJECT_WALKTHROUGH.md` documents the whole thing end to end — setup,
the process I followed, every problem I hit, and the design trade-offs. `README.md`
is the short reference.

### What I did

1. Configured JFrog Artifactory access via a scoped `@evinced` `.npmrc` and installed `@evinced/js-playwright-sdk`
2. Authenticated the SDK in Playwright `globalSetup` using `setCredentials` with the Service ID / API key from environment variables (never hard-coded).
3. Wrote two Playwright tests against https://a11y-audits.com/:
   - **Home navigation** — single-run mode. Scans the home page as loaded, switches a feature tab, scans again, and merges the two snapshots with `evMergeIssues` so the "simple" test still covers more than one DOM state.
   - **Complex flow** — continuous mode (`evStart` / `evStop`, teardown in `finally`). Six states: home feature tabs, catalog grid, a product page reached by _clicking_ a grid item, the add-to-cart drawer, contact-form fill + value validations, and the cart holding the product that was added.
4. Enabled screenshots once in `evConfig.json` (`scan.screenshots.enabled`) and saved HTML reports under `evinced-reports/`. Each test also asserts its report actually contains screenshots and attaches it to the Playwright HTML report.
5. Answered "integrate at scale" two ways:
   - **Auto fixture** (`fixtures/evinced.fixture.ts`, `{ auto: true }`) — importing `{ test }` from it wraps every test with continuous scanning + a per-test report, no per-spec Evinced calls. `evStop` is in `finally` so a failing test can't leave the session open.
   - **Aggregated reporter** — `@evinced/js-playwright-sdk/reporter` registered in `playwright.config.ts`, configured through `evConfig.json` (`report.*`). Produces one `evinced-reports/aggregatedReport.html` for the whole run.

### How to run

```bash
cp .env.example .env      # add Service ID + API key
cp .npmrc.example .npmrc  # add JFrog token
npm install && npx playwright install chromium
npm run test:all
open evinced-reports/aggregatedReport.html
```

### Issues encountered and how I resolved them

- **JFrog install returned 403** until the project `.npmrc` used the exercise JWT against the scoped `@evinced` registry; after that `npm install` resolved the SDK via the lockfile.
- **Playwright browser version drift** — `npx playwright install chromium` had to be re-run after a Playwright minor bump pulled a newer Chromium build.
- **Locators didn't match marketing copy** as semantic roles (e.g. "Book a Consultation" is a button; "Do you have any question?" is a paragraph). I aligned assertions with the actual accessibility tree.
- **Feature tabs have no `aria-selected`** and no active-state class (an accessibility gap on the demo site), so I assert on the swapped tabpanel text instead of tab state.
- **Duplicate "E-mail" fields** (contact form + footer) caused strict-mode failures — scoped with `.first()`.
- **Cart exposes almost no accessible headings** even when populated, so I validate via `document.title` plus the product line-item text.
- **Contact form is not submitted on purpose** — "Send message" sends a real email to the demo-site owner; the filled field states are what the scan needs.
- **Continuous-mode teardown** — `evStop` + report save are in `finally` (both in the spec and in the scale fixture) so a mid-test failure still stops the scan and writes the report, and an unclosed session can't break the next test.
- **Aggregated reporter was silent at first** — it only emits when `evConfig.json` has a valid `report.*` section; adding `format` / `outputDir` / `fileName` fixed it.

Happy to walk through the reports and both scale approaches on a call.

Best regards,
Itay Azulay
