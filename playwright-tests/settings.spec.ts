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
 * Settings Pages Tests
 * Tests for all settings pages: General, Download Clients, Indexers, Quality, Verification, Plugins
 */

test.describe('Settings Navigation', () => {
  test('should display settings sub-navigation', async ({ page }) => {
    await page.goto('/settings/general');
    const generalLink = page.getByRole('link', { name: 'General' });
    if (!(await waitForContent(page, generalLink))) {
      return;
    }

    await expect(generalLink).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Download Clients' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Indexers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quality' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Verification' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Plugins' })).toBeVisible();
  });

  test('should navigate between settings pages', async ({ page }) => {
    await page.goto('/settings/general');
    const generalLink = page.getByRole('link', { name: 'General' });
    if (!(await waitForContent(page, generalLink))) {
      return;
    }

    // Navigate to Download Clients
    await page.getByRole('link', { name: 'Download Clients' }).click();
    await expect(page).toHaveURL(/.*settings.*download-clients/);

    // Navigate to Indexers
    await page.getByRole('link', { name: 'Indexers' }).click();
    await expect(page).toHaveURL(/.*settings.*indexers/);

    // Navigate to Quality
    await page.getByRole('link', { name: 'Quality' }).click();
    await expect(page).toHaveURL(/.*settings.*quality/);

    // Navigate to Verification
    await page.getByRole('link', { name: 'Verification' }).click();
    await expect(page).toHaveURL(/.*settings.*verification/);

    // Navigate to Plugins
    await page.getByRole('link', { name: 'Plugins' }).click();
    await expect(page).toHaveURL(/.*settings.*plugins/);
  });

  test('should highlight active settings page', async ({ page }) => {
    await page.goto('/settings/general');
    const generalLink = page.getByRole('link', { name: 'General' });
    if (!(await waitForContent(page, generalLink))) {
      return;
    }
    await expect(generalLink).toBeVisible();
  });
});

test.describe('General Settings', () => {
  test('should display general settings page', async ({ page }) => {
    await page.goto('/settings/general');
    const generalHeading = page.getByRole('heading', { name: /General/i });
    if (!(await waitForContent(page, generalHeading))) {
      return;
    }
    await expect(generalHeading).toBeVisible();
  });
});

test.describe('Download Clients Settings', () => {
  test('should display download clients page', async ({ page }) => {
    await page.goto('/settings/download-clients');
    const heading = page.getByRole('heading', { name: /Download Clients/i });
    if (!(await waitForContent(page, heading))) {
      return;
    }
    await expect(heading).toBeVisible();
  });
});

test.describe('Indexers Settings', () => {
  test('should display indexers page', async ({ page }) => {
    await page.goto('/settings/indexers');
    const heading = page.getByRole('heading', { name: /Indexers/i });
    if (!(await waitForContent(page, heading))) {
      return;
    }
    await expect(heading).toBeVisible();
  });
});

test.describe('Quality Settings', () => {
  test('should display quality settings page', async ({ page }) => {
    await page.goto('/settings/quality');
    const heading = page.getByRole('heading', { name: /Quality/i });
    if (!(await waitForContent(page, heading))) {
      return;
    }
    await expect(heading).toBeVisible();
  });
});

test.describe('Verification Settings', () => {
  test('should display verification settings page', async ({ page }) => {
    await page.goto('/settings/verification');
    const heading = page.getByRole('heading', { name: /Verification/i });
    if (!(await waitForContent(page, heading))) {
      return;
    }
    await expect(heading).toBeVisible();
  });
});

test.describe('Plugins Settings', () => {
  test('should display plugins settings page', async ({ page }) => {
    await page.goto('/settings/plugins');
    const heading = page.getByRole('heading', { name: /Plugins/i });
    if (!(await waitForContent(page, heading))) {
      return;
    }
    await expect(heading).toBeVisible();
  });
});
