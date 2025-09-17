import { test, expect } from '@playwright/test';

test.describe('MediaOS E2E Tests', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main dashboard loads
    await expect(page.locator('h1')).toContainText('MediaOS');
    
    // Check for navigation elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should navigate to library page', async ({ page }) => {
    await page.goto('/');
    
    // Click on library navigation
    await page.click('a[href="/library"]');
    
    // Verify we're on the library page
    await expect(page).toHaveURL(/.*library/);
    await expect(page.locator('h2')).toContainText('Library');
  });

  test('should display system health', async ({ page }) => {
    await page.goto('/');
    
    // Check for health status indicator
    await expect(page.locator('[data-testid="health-status"]')).toBeVisible();
  });

  test('should handle API health check', async ({ page }) => {
    const response = await page.request.get('/api/system/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
  });
});
