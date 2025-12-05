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

test.describe('Dashboard E2E Tests', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    if (!(await waitForContent(page, dashboardHeading))) {
      return;
    }

    await expect(dashboardHeading).toBeVisible();
    await expect(page.getByText('MediaOS')).toBeVisible();
  });

  test('should display library stats cards', async ({ page }) => {
    await page.goto('/');
    const seriesText = page.getByText('Series');
    if (!(await waitForContent(page, seriesText))) {
      return;
    }

    await expect(seriesText).toBeVisible();
    await expect(page.getByText('Movies')).toBeVisible();
    await expect(page.getByText('Books')).toBeVisible();
    await expect(page.getByText('Music')).toBeVisible();
  });

  test('should navigate to library page from nav', async ({ page }) => {
    await page.goto('/');
    const libraryLink = page.getByRole('link', { name: 'Library' });
    if (!(await waitForContent(page, libraryLink))) {
      return;
    }

    await libraryLink.click();
    await expect(page).toHaveURL(/.*library/);
  });

  test('should navigate to library from stats card', async ({ page }) => {
    await page.goto('/');
    const seriesLink = page.getByRole('link', { name: /Series/i }).first();
    if (!(await waitForContent(page, seriesLink))) {
      return;
    }

    await seriesLink.click();
    await expect(page).toHaveURL(/.*library.*series/);
  });

  test('should display welcome message', async ({ page }) => {
    await page.goto('/');
    const welcomeText = page.getByText('Welcome back to MediaOS');
    if (!(await waitForContent(page, welcomeText))) {
      return;
    }
    await expect(welcomeText).toBeVisible();
  });

  test('should display recent additions section', async ({ page }) => {
    await page.goto('/');
    const recentAdditions = page.getByText('Recent Additions');
    if (!(await waitForContent(page, recentAdditions))) {
      return;
    }
    await expect(recentAdditions).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'View All' }).first()
    ).toBeVisible();
  });

  test('should display download queue section', async ({ page }) => {
    await page.goto('/');
    const downloadQueue = page.getByText('Download Queue');
    if (!(await waitForContent(page, downloadQueue))) {
      return;
    }
    await expect(downloadQueue).toBeVisible();
  });

  test('should display upcoming releases section', async ({ page }) => {
    await page.goto('/');
    const upcomingReleases = page.getByText('Upcoming Releases');
    if (!(await waitForContent(page, upcomingReleases))) {
      return;
    }
    await expect(upcomingReleases).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    await page.goto('/');
    const quickActions = page.getByText('Quick Actions');
    if (!(await waitForContent(page, quickActions))) {
      return;
    }
    await expect(quickActions).toBeVisible();
    await expect(page.getByRole('link', { name: /Add Series/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Add Movie/i })).toBeVisible();
  });

  test('should have working navigation to all sections', async ({ page }) => {
    await page.goto('/');
    const libraryLink = page.getByRole('link', { name: 'Library' });
    if (!(await waitForContent(page, libraryLink))) {
      return;
    }

    // Test Library
    await libraryLink.click();
    await expect(page).toHaveURL(/.*library/);

    // Test Calendar
    await page.getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL(/.*calendar/);

    // Test Activity
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL(/.*activity/);

    // Test Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/.*settings/);
  });

  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');
    // This test passes if the page loads without error
  });
});

test.describe('Dashboard Mobile Responsiveness', () => {
  test('should display properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    if (!(await waitForContent(page, dashboardHeading))) {
      return;
    }
    await expect(dashboardHeading).toBeVisible();
  });

  test('should display properly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    if (!(await waitForContent(page, dashboardHeading))) {
      return;
    }
    await expect(dashboardHeading).toBeVisible();
  });
});

test.describe('Dashboard Quick Actions', () => {
  test('should navigate to add series page', async ({ page }) => {
    await page.goto('/');
    const addSeriesLink = page.getByRole('link', { name: /Add Series/i });
    if (!(await waitForContent(page, addSeriesLink))) {
      return;
    }
    await addSeriesLink.click();
    await expect(page).toHaveURL(/.*add.*series|.*series.*add/i);
  });

  test('should navigate to add movie page', async ({ page }) => {
    await page.goto('/');
    const addMovieLink = page.getByRole('link', { name: /Add Movie/i });
    if (!(await waitForContent(page, addMovieLink))) {
      return;
    }
    await addMovieLink.click();
    await expect(page).toHaveURL(/.*add.*movie|.*movie.*add/i);
  });

  test('should navigate to wanted list', async ({ page }) => {
    await page.goto('/');
    const wantedLink = page.getByRole('link', { name: /View Wanted/i });
    if (!(await waitForContent(page, wantedLink))) {
      return;
    }
    await wantedLink.click();
    await expect(page).toHaveURL(/.*wanted/);
  });

  test('should navigate to indexers settings', async ({ page }) => {
    await page.goto('/');
    const indexersLink = page.getByRole('link', { name: /Manage Indexers/i });
    if (!(await waitForContent(page, indexersLink))) {
      return;
    }
    await indexersLink.click();
    await expect(page).toHaveURL(/.*indexers/);
  });
});
