/**
 * @file Home navigation — single-run Evinced mode (`evAnalyze`).
 *
 * Scans two DOM states on the home page, merges issues with `evMergeIssues`,
 * and writes an HTML report (with screenshots) under `EVINCED_REPORT_DIR`.
 */

import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { EvincedSDK } from '@evinced/js-playwright-sdk';
import { EVINCED_REPORT_DIR } from '../evincedReportDir';

const REPORT_PATH = `${EVINCED_REPORT_DIR}/home-navigation.html`;

test.describe('Home navigation — single-run mode (evAnalyze)', () => {
  test('navigates to home, scans two states, and generates an Evinced HTML report', async ({
    page,
  }, testInfo) => {
    mkdirSync(EVINCED_REPORT_DIR, { recursive: true });

    await page.goto('/');
    await expect(page.getByRole('link', { name: /Love & Minter/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Book a Consultation/i })).toBeVisible();

    const evinced = new EvincedSDK(page);

    // State 1 — home as loaded.
    const initial = await evinced.evAnalyze();

    // State 2 — a light interaction so the "simple" test still covers more than
    // one DOM state, per the brief ("interact ... so the analysis will run on
    // all page states"). Single-run mode = one discrete scan per state; the two
    // snapshots are then deduplicated with evMergeIssues.
    await page.getByRole('tab', { name: 'Premium products' }).click();
    await expect(page.getByRole('tabpanel')).toContainText(/premium level/i);
    const afterTab = await evinced.evAnalyze();

    const issues = await evinced.evMergeIssues(initial, afterTab);

    await evinced.evSaveFile(issues, 'html', REPORT_PATH);
    await testInfo.attach('evinced-home-navigation', {
      path: REPORT_PATH,
      contentType: 'text/html',
    });

    expect(existsSync(REPORT_PATH)).toBeTruthy();
    expect(Array.isArray(issues)).toBeTruthy();
    // The brief requires the report to include screenshots — prove it does.
    expect(readFileSync(REPORT_PATH, 'utf8')).toContain('data:image');

    testInfo.annotations.push({
      type: 'a11y-issues',
      description: `home: ${initial.length} + tab: ${afterTab.length} -> merged: ${issues.length}`,
    });
  });
});
