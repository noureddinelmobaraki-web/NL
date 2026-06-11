import { test, expect } from '@playwright/test';

test.describe('Retro world smoke test', () => {
  test.slow();

  test('Retro theme renders the Retro World iframe', async ({ page }) => {
    // Force the retro theme before first paint via persisted prefs.
    await page.addInitScript(() => {
      localStorage.setItem('nl-prefs-v1', JSON.stringify({ theme: 'retro' }));
    });

    await page.goto('./');

    // In the retro theme the app renders RetroWorldPage (there is no #main-content).
    const retroIframe = page.locator('iframe[title="Retro World"]');
    await expect(retroIframe).toBeVisible({ timeout: 30000 });

    const src = await retroIframe.getAttribute('src');
    expect(src).toContain('retro/index.html');
  });
});
