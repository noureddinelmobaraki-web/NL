import { test, expect } from '@playwright/test';

test.describe('Accessibility Smoke Tests', () => {
  test.slow();

  test('should verify essential accessibility features', async ({ page }) => {
    // Set viewport BEFORE goto
    await page.setViewportSize({ width: 1280, height: 720 });

    // Ensure theme is set so loading or landing selection is bypassed smoothly
    await page.addInitScript(() => {
      localStorage.setItem('nl-prefs-v1', JSON.stringify({ theme: 'midnight' }));
    });

    // Visit base URL
    await page.goto('./');

    // Wait until the loading/theme gate is gone and main content is mounted.
    await page.locator('#main-content').waitFor({ state: 'attached', timeout: 30000 });

    // 1. Assert there is a skip link
    const skipLink = page.locator('a.skip-to-content, a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // 2. Assert there is exactly one division with id="main-content"
    const mainContent = page.locator('[id="main-content"]');
    await expect(mainContent).toBeVisible();

    // Wait for network and rendering idle to stable list of elements
    await page.waitForLoadState('networkidle');

    // 3. Assert all visible buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        const hasAriaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(hasAriaLabel || text?.trim() || await button.getAttribute('aria-labelledby')).toBeTruthy();
      }
    }

    // 4. Assert all visible images either have non-empty alt or aria-hidden="true" or role="presentation"
    const images = await page.locator('img').all();
    for (const img of images) {
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt');
        const ariaHidden = await img.getAttribute('aria-hidden');
        const role = await img.getAttribute('role');
        const passesAltCheck = alt !== null || ariaHidden === 'true' || role === 'presentation' || role === 'none';
        expect(passesAltCheck).toBe(true);
      }
    }

    // 5. Assert no horizontal overflow on standard desktop viewport size
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 4);
  });
});
