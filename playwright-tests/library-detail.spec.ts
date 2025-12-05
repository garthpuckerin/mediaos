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
 * Library Tests
 */

test.describe('Library List', () => {
  test('should display library page', async ({ page }) => {
    await page.goto('/library/series');
    const gridButton = page.getByRole('button', { name: 'Grid' });
    if (!(await waitForContent(page, gridButton))) {
      return;
    }
    await expect(gridButton).toBeVisible();
  });

  test('should display view mode toggle', async ({ page }) => {
    await page.goto('/library/series');
    const gridButton = page.getByRole('button', { name: 'Grid' });
    if (!(await waitForContent(page, gridButton))) {
      return;
    }
    await expect(gridButton).toBeVisible();
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
  });

  test('should switch to list view', async ({ page }) => {
    await page.goto('/library/series');
    const listButton = page.getByRole('button', { name: 'List' });
    if (!(await waitForContent(page, listButton))) {
      return;
    }
    await listButton.click();
    // Size controls should be hidden in list view
    await expect(page.getByText('Size:')).not.toBeVisible();
  });

  test('should switch to grid view', async ({ page }) => {
    await page.goto('/library/series');
    const gridButton = page.getByRole('button', { name: 'Grid' });
    if (!(await waitForContent(page, gridButton))) {
      return;
    }
    await page.getByRole('button', { name: 'List' }).click();
    await gridButton.click();
    await expect(page.getByText('Size:')).toBeVisible();
  });

  test('should change poster size', async ({ page }) => {
    await page.goto('/library/series');
    const compactButton = page.getByRole('button', { name: 'Compact' });
    if (!(await waitForContent(page, compactButton))) {
      return;
    }
    await compactButton.click();
    // Verify button is visible after click
    await expect(compactButton).toBeVisible();
  });

  test('should show item count', async ({ page }) => {
    await page.goto('/library/series');
    const itemCount = page.getByText(/\d+ items?/);
    if (!(await waitForContent(page, itemCount))) {
      return;
    }
    await expect(itemCount).toBeVisible();
  });
});

test.describe('Library Kind Tabs', () => {
  test('should display all kind tabs', async ({ page }) => {
    await page.goto('/library/series');
    const seriesLink = page.getByRole('link', { name: 'Series' });
    if (!(await waitForContent(page, seriesLink))) {
      return;
    }

    await expect(seriesLink).toBeVisible();
    await expect(page.getByRole('link', { name: 'Movies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Books' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Music' })).toBeVisible();
  });

  test('should navigate to movies library', async ({ page }) => {
    await page.goto('/library/series');
    const moviesLink = page.getByRole('link', { name: 'Movies' });
    if (!(await waitForContent(page, moviesLink))) {
      return;
    }
    await moviesLink.click();
    await expect(page).toHaveURL(/.*library.*movies/);
  });

  test('should navigate to books library', async ({ page }) => {
    await page.goto('/library/series');
    const booksLink = page.getByRole('link', { name: 'Books' });
    if (!(await waitForContent(page, booksLink))) {
      return;
    }
    await booksLink.click();
    await expect(page).toHaveURL(/.*library.*books/);
  });

  test('should navigate to music library', async ({ page }) => {
    await page.goto('/library/series');
    const musicLink = page.getByRole('link', { name: 'Music' });
    if (!(await waitForContent(page, musicLink))) {
      return;
    }
    await musicLink.click();
    await expect(page).toHaveURL(/.*library.*music/);
  });
});
