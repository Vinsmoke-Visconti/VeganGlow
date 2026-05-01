import { test, expect } from '@playwright/test';

/**
 * Verifies super_admin without verified TOTP factor is forced to setup-mfa
 * and cannot bypass via direct URL manipulation.
 *
 * Pre-condition: super@veganglow.com exists, no TOTP factor enrolled.
 */
test.skip('super_admin must enroll MFA before accessing dashboard', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'super@veganglow.com');
  await page.fill('input[name="password"]', 'TestPass!2026');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin\/setup-mfa/);

  // Attempt URL bypass
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/setup-mfa/);
});
