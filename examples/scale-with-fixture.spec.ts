/**
 * @file Scale integration example — imports `{ test, expect }` from
 * `fixtures/evinced.fixture` so continuous Evinced scanning and HTML report
 * generation run automatically with no per-spec SDK calls.
 */

import { test, expect } from '../fixtures/evinced.fixture';

test.describe('Scale integration example', () => {
  test('home page covered by shared continuous fixture', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Love & Minter/i }).first()).toBeVisible();
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search/);
  });
});
