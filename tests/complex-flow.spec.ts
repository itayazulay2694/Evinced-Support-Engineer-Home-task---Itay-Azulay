/**
 * @file Complex multi-page flow — continuous Evinced mode (`evStart` / `evStop`).
 *
 * Records accessibility issues across home (incl. feature tabs), catalog, product,
 * cart drawer, contact form, and cart. `evStop` + `evSaveFile` run in `finally` so a
 * mid-test failure still produces an HTML report with screenshots.
 */

import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { EvincedSDK } from '@evinced/js-playwright-sdk';
import { EVINCED_REPORT_DIR } from '../evincedReportDir';

const REPORT_PATH = `${EVINCED_REPORT_DIR}/complex-flow.html`;

test.describe('Complex flow — continuous mode (evStart / evStop)', () => {
  test('exercises multiple page states with validations and saves HTML report', async ({
    page,
  }, testInfo) => {
    mkdirSync(EVINCED_REPORT_DIR, { recursive: true });

    const evinced = new EvincedSDK(page);
    await evinced.evStart();

    let issues: Awaited<ReturnType<EvincedSDK['evStop']>> = [];
    try {
      // --- State: home ---
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Love & Minter/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Book a Consultation/i })).toBeVisible();

      // --- State: home with feature tabs toggled (DOM mutation, no navigation).
      //     The demo tabs expose no aria-selected (an a11y smell in itself), so
      //     the swapped tabpanel copy is what we assert on. ---
      await page.getByRole('tab', { name: 'Secured checkout' }).click();
      await expect(page.getByRole('tabpanel')).toContainText(/security measures/i);
      await page.getByRole('tab', { name: 'Premium products' }).click();
      await expect(page.getByRole('tabpanel')).toContainText(/premium level/i);

      // --- State: catalog ---
      await page.getByRole('link', { name: 'Catalog' }).first().click();
      await expect(page).toHaveURL(/\/collections\/all/);
      await expect(page.getByRole('heading', { name: /Products/i }).first()).toBeVisible();

      // --- State: product page, reached by clicking a grid item (real user path,
      //     not a hard-coded goto) ---
      const firstProduct = page.locator('a[href*="/products/"]').first();
      const productHref = await firstProduct.getAttribute('href');
      await firstProduct.click();
      await expect(page).toHaveURL(/\/products\//);
      if (productHref) {
        await expect(page).toHaveURL(new RegExp(productHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
      const productName = (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim();
      expect(productName && productName.length).toBeTruthy();

      // --- State: add-to-cart drawer (DOM mutation) ---
      await page.getByRole('button', { name: /^Add to cart$/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // --- State: contact form with input validations ---
      await page.goto('/pages/contact');
      await expect(page).toHaveURL(/\/pages\/contact/);
      await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();

      const name = 'Itay Test';
      const email = 'itay.test@example.com';
      const message = 'Accessibility audit home exercise validation.';
      const nameField = page.getByRole('textbox', { name: 'Name' });
      const emailField = page.getByRole('textbox', { name: 'E-mail' }).first();
      const messageField = page.getByRole('textbox', { name: 'Message' });

      await nameField.fill(name);
      await emailField.fill(email);
      await messageField.fill(message);

      await expect(nameField).toHaveValue(name);
      await expect(emailField).toHaveValue(email);
      await expect(messageField).toHaveValue(message);
      // Not submitting on purpose: "Send message" delivers a real email to the
      // demo-site owner. The form-fill states are what Evinced needs to scan.

      // --- State: cart, now holding the product added above ---
      await page.goto('/cart');
      await expect(page).toHaveURL(/\/cart/);
      await expect(page).toHaveTitle(/shopping cart/i);
      if (productName) {
        await expect(page.getByText(productName, { exact: false }).first()).toBeVisible();
      }
    } finally {
      issues = await evinced.evStop();
      await evinced.evSaveFile(issues, 'html', REPORT_PATH);
      if (existsSync(REPORT_PATH)) {
        await testInfo.attach('evinced-complex-flow', {
          path: REPORT_PATH,
          contentType: 'text/html',
        });
      }
    }

    expect(existsSync(REPORT_PATH)).toBeTruthy();
    expect(Array.isArray(issues)).toBeTruthy();
    // The brief requires the report to include screenshots — prove it does.
    expect(readFileSync(REPORT_PATH, 'utf8')).toContain('data:image');

    testInfo.annotations.push({
      type: 'a11y-issues',
      description: `continuous scan across ${7} states -> ${issues.length} issues`,
    });
  });
});
