import { test, expect } from './test-base';

test.describe('Noureddin El Mobaraki (NL) E2E Smoke Tests', () => {
  test('should load the main page and show the hero title with the correct name', async ({ page }) => {
    await page.goto('./');

    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible({ timeout: 30000 });
    await expect(heroTitle).toContainText('Noureddin El Mobaraki');
  });

  test('should mount the main content region in the default layout', async ({ page }) => {
    await page.goto('./');

    await page.locator('#main-content').waitFor({ state: 'attached', timeout: 30000 });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 30000 });
  });
});
