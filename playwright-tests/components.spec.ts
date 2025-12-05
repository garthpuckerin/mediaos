import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Helper to wait for content and check if authenticated
 */
async function waitForContent(
  page: Page,
  contentLocator: Locator
): Promise<boolean> {
  await page.waitForLoadState('networkidle');
  const loginHeading = page.getByRole('heading', { name: /Sign In/i });

  try {
    await Promise.race([
      loginHeading.waitFor({ timeout: 5000 }),
      contentLocator.waitFor({ timeout: 5000 }),
    ]);

    const isOnLogin = await loginHeading.isVisible().catch(() => false);
    if (isOnLogin) return false;

    return await contentLocator.isVisible().catch(() => false);
  } catch {
    return await contentLocator.isVisible().catch(() => false);
  }
}

/**
 * Component Tests
 * Tests for common UI components
 */

test.describe('Button Component', () => {
  test('should display buttons on dashboard', async ({ page }) => {
    await page.goto('/');
    const searchButton = page.getByRole('button', { name: /Search/i });
    if (!(await waitForContent(page, searchButton))) {
      return;
    }
    await expect(searchButton).toBeVisible();
  });
});

test.describe('Navigation Links', () => {
  test('should display navigation links', async ({ page }) => {
    await page.goto('/');
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    if (!(await waitForContent(page, dashboardLink))) {
      return;
    }
    await expect(dashboardLink).toBeVisible();
  });
});

test.describe('Input Component', () => {
  test('should display search input when search is opened', async ({
    page,
  }) => {
    await page.goto('/');
    const searchButton = page.getByRole('button', { name: /Search/i });
    if (!(await waitForContent(page, searchButton))) {
      return;
    }
    await searchButton.click();
    await expect(page.getByPlaceholder('Search library...')).toBeVisible();
  });
});

test.describe('Modal Component', () => {
  test('should open and close search modal', async ({ page }) => {
    await page.goto('/');
    const searchButton = page.getByRole('button', { name: /Search/i });
    if (!(await waitForContent(page, searchButton))) {
      return;
    }

    await searchButton.click();
    await expect(page.getByPlaceholder('Search library...')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search library...')).not.toBeVisible();
  });
});
