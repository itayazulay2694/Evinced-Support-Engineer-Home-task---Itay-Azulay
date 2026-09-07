/**
 * @file Evinced scale fixture — continuous a11y scan for every test that imports
 * `{ test }` from this module instead of `@playwright/test`.
 *
 * `_evincedAuto` uses `{ auto: true }`. `evStop` + report save run in `finally` so a
 * failing test still closes the session (an unclosed session makes the next
 * test's `evStart` throw) and still writes its report.
 */

import { test as base, expect } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { EvincedSDK } from '@evinced/js-playwright-sdk';
import { EVINCED_REPORT_DIR } from '../evincedReportDir';

type EvincedFixtures = {
  _evincedAuto: void;
};

/** Playwright `test` extended with automatic continuous Evinced scanning. */
export const test = base.extend<EvincedFixtures>({
  _evincedAuto: [
    async ({ page }, use, testInfo) => {
      const evinced = new EvincedSDK(page);
      await evinced.evStart();

      try {
        await use();
      } finally {
        const issues = await evinced.evStop();
        mkdirSync(EVINCED_REPORT_DIR, { recursive: true });
        const safeTitle = testInfo.title.replace(/[^\w.-]+/g, '_');
        const reportPath = `${EVINCED_REPORT_DIR}/scale-${safeTitle}.html`;
        await evinced.evSaveFile(issues, 'html', reportPath);
        if (existsSync(reportPath)) {
          await testInfo.attach(`evinced-${safeTitle}`, {
            path: reportPath,
            contentType: 'text/html',
          });
        }
        testInfo.annotations.push({
          type: 'a11y-issues',
          description: `${issues.length} issues`,
        });
      }
    },
    { auto: true },
  ],
});

export { expect };
