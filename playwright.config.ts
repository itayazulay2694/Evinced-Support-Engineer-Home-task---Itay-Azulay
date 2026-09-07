/**
 * @file Playwright config for the Evinced home exercise against a11y-audits.com.
 *
 * - `chromium` — main specs under `tests/`
 * - `scale-example` — fixture demo under `examples/`
 * - Evinced aggregated reporter settings come from `evConfig.json` (`report.*`)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // Evinced aggregated reporter — one combined a11y report across the whole
    // run. Settings come from evConfig.json (`report.*`), not inline options.
    ['@evinced/js-playwright-sdk/reporter'],
  ],
  globalSetup: require.resolve('./global.setup.ts'),
  use: {
    baseURL: 'https://a11y-audits.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testDir: './tests',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'scale-example',
      testDir: './examples',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
