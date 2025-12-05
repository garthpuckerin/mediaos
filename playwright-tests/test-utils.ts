import { Page, expect } from '@playwright/test';

/**
 * Navigate to a page and ensure user is on the expected page.
 * If redirected to login, attempts to complete login flow.
 */
export async function navigateAuthenticated(
  page: Page,
  path: string,
  expectedHeading?: string | RegExp
) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  // Check if redirected to login
  const loginHeading = page.getByRole('heading', { name: /Sign In/i });
  const isOnLogin = await loginHeading
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (isOnLogin) {
    // Try the test login
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('test@mediaos.local');
    await passwordInput.fill('testpassword123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    await page.waitForTimeout(1500);

    // Check if still on login
    const stillOnLogin = await loginHeading
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (stillOnLogin) {
      // Return false to indicate authentication failed
      return { authenticated: false, page };
    }

    // Re-navigate after login
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  // Verify expected heading if provided
  if (expectedHeading) {
    const heading = page.getByRole('heading', { name: expectedHeading });
    await expect(heading).toBeVisible({ timeout: 5000 });
  }

  return { authenticated: true, page };
}

/**
 * Skip test if not authenticated
 */
export async function requireAuth(page: Page, test: any) {
  const loginHeading = page.getByRole('heading', { name: /Sign In/i });
  const isOnLogin = await loginHeading
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (isOnLogin) {
    test.skip(true, 'Test requires authentication');
  }
}

/**
 * Check if currently on login page
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  const loginHeading = page.getByRole('heading', { name: /Sign In/i });
  return loginHeading.isVisible({ timeout: 2000 }).catch(() => false);
}
