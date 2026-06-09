import { test, expect } from '@playwright/test';

test.describe('Noureddin El Mobaraki (NL) E2E Smoke Tests', () => {
  test('should load the main page, verify name and check main section contains hero-title', async ({ page }) => {
    // Navigate to the base URL
    await page.goto('./');

    // Check main document title or h1 heading
    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Noureddin El Mobaraki');
  });

  test('should scroll or navigate to My Songs section without crashing', async ({ page }) => {
    await page.goto('./');

    // Ensure the main logo/hero-title is visible
    await expect(page.locator('.hero-title')).toBeVisible();

    // Click "MY SONGS" navigation button in AppNavGrid
    const mySongsButton = page.locator('button').filter({ hasText: 'MY SONGS' }).first();
    await mySongsButton.click();

    // Verify My Songs section is visible and contains loaded elements
    const mySongsSection = page.locator('#my-songs-section');
    await expect(mySongsSection).toBeVisible();
  });

  test('should switch theme to Retro, open retro world and then exit/switch back', async ({ page }) => {
    await page.goto('./');

    // Ensure the theme switcher fab button is present
    const themeTrigger = page.locator('button.fab-button').filter({ hasText: 'Change theme' }).or(page.locator('button.fab-button[aria-label^="Change theme"]')).first();
    await themeTrigger.click({ force: true });

    // Click the Retro theme option
    const retroOption = page.locator('button[aria-label="Retro"]').first();
    await retroOption.click({ force: true });

    // Verify we transitioned to Retro mode (RetroWorldPage loads)
    const retroControlBtn = page.locator('.retro-control-btn').first();
    await expect(retroControlBtn).toBeVisible({ timeout: 15000 });

    // Open retro dropdown settings (it should have one of the buttons with Class .retro-control-btn and aria-expanded/haspopup)
    const retroSettingsBtn = page.locator('button[aria-haspopup="menu"]').first();
    await retroSettingsBtn.click({ force: true });

    // Click exit retro button
    const exitRetroBtn = page.locator('#retro-theme-option-exit');
    await exitRetroBtn.click({ force: true });

    // Verify we returned back to standard theme and hero-title is visible again
    await expect(page.locator('.hero-title')).toBeVisible({ timeout: 15000 });
  });
});
