import { test, expect } from '@playwright/test';

const SAB_ENABLED =
  process.env.E2E_SAB === '1' || process.env.E2E_SAB === 'true';

test.describe('SAB-only flows (smoke)', () => {
  test.skip(!SAB_ENABLED, 'Set E2E_SAB=1 to enable SAB smoke tests');

  test('Item Detail: Last Grab updates after NZB upload', async ({ page }) => {
    await page.goto('/');
    // Navigate to Library and open first item detail
    await page.getByText('Library', { exact: true }).click();
    const firstCard = page.locator('[data-testid="library-card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Upload NZB (requires a test NZB path configured by the runner)
    const nzbPath = process.env.E2E_NZB_PATH;
    expect(nzbPath, 'E2E_NZB_PATH not set').toBeTruthy();
    const fileInput = page.locator('input[type="file"][name="nzbUpload"]');
    await fileInput.setInputFiles(nzbPath!);
    await page.getByRole('button', { name: /upload nzb/i }).click();

    // Toast success
    await expect(page.getByText(/uploaded|queued/i)).toBeVisible();
    // Last Grab section appears/refreshed
    await expect(page.getByText(/Last Grab/i)).toBeVisible();
  });

  test('Activity: queue shows job and actions are present', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByText('Activity', { exact: true }).click();
    await page.getByText('Queue', { exact: true }).click();
    const row = page.locator('[data-testid="queue-row"]').first();
    await expect(row).toBeVisible();
    await expect(
      row.getByRole('button', { name: /pause|resume/i })
    ).toBeVisible();
    await expect(row.getByRole('button', { name: /remove/i })).toBeVisible();
  });
});
