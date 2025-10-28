import { test, expect } from '@playwright/test';

test.describe('MediaOS smoke', () => {
  test('loads home and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('MediaOS')).toBeVisible();
  });

  test('Library nav and kind tabs are visible', async ({ page }) => {
    await page.goto('/');
    // Left nav has Library
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible();
    await page.getByRole('link', { name: 'Library' }).click();
    // Kind tabs contain Series/Movies/Books/Music
    await expect(page.getByRole('link', { name: 'Series' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Movies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Books' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Music' })).toBeVisible();
  });
});
