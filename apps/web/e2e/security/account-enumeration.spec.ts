import { test, expect } from '@playwright/test';

/**
 * Verifies the login endpoint cannot be used to enumerate accounts.
 * All failure cases must return identical error text and have similar
 * response time (constant-delay defense).
 *
 * Pre-conditions in test DB:
 * - customer1@example.com is a real customer
 * - staff@veganglow.com is a real staff (non-super_admin)
 * - noone@nowhere.example does not exist
 */
const cases: Array<{ label: string; email: string; password: string }> = [
  { label: 'wrong password (existing customer)', email: 'customer1@example.com', password: 'wrong-pw' },
  { label: 'non-existent email',                 email: 'noone@nowhere.example', password: 'anything' },
  { label: 'staff trying to use storefront',     email: 'staff@veganglow.com',   password: 'wrong-pw' },
];

test.describe('login does not leak account state', () => {
  for (const c of cases) {
    test(c.label, async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', c.email);
      await page.fill('input[name="password"]', c.password);
      const start = Date.now();
      await page.click('button[type="submit"]');
      // Wait for either error or redirect — error wins for our test cases.
      await page.waitForLoadState('networkidle');
      const errorText = await page.locator('text=Email hoặc mật khẩu không đúng').first().textContent({ timeout: 3000 });
      expect(errorText).toContain('Email hoặc mật khẩu không đúng');
      const elapsed = Date.now() - start;
      // Constant delay floor 300ms; ceiling 3s sanity
      expect(elapsed).toBeGreaterThanOrEqual(290);
      expect(elapsed).toBeLessThan(3000);
    });
  }
});
