import { test, expect } from '@playwright/test';

test.describe('Retro iframe and Desktop Midnight lyrics smoke tests', () => {
  test('Test A — Retro iframe is visible', async ({ page }) => {
    // Go to base URL
    await page.goto('./');

    // Force theme to retro in storage and reload
    await page.evaluate(() => {
      localStorage.setItem('nl-prefs-v1', JSON.stringify({ theme: 'retro' }));
    });
    await page.reload();

    // Assert that the Retro iframe exists and is visible
    const retroIframe = page.locator('iframe[title="Retro World"]');
    await expect(retroIframe).toBeVisible();

    const src = await retroIframe.getAttribute('src');
    expect(src).toContain('retro/index.html');
  });

  test('Test B — Desktop Midnight lyrics auto-scroll viewport exists', async ({ page }) => {
    // Set viewport explicitly to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Go to base URL
    await page.goto('./');

    // Force theme to midnight in storage and reload
    await page.evaluate(() => {
      localStorage.setItem('nl-prefs-v1', JSON.stringify({ theme: 'midnight' }));
    });
    await page.reload();

    // Navigate to MY SONGS section
    const mySongsButton = page.locator('button').filter({ hasText: 'MY SONGS' }).first();
    await mySongsButton.click();

    // Wait for the My Songs section to be visible
    const mySongsSection = page.locator('#my-songs-section');
    await expect(mySongsSection).toBeVisible();

    // Click the first song card to activate/play
    const firstSongCard = page.locator('[class*="song-card-container"]').first();
    await firstSongCard.click();

    // Open lyrics using the lyrics toggle button (.lyrics-btn-compact)
    const lyricsBtn = page.locator('.lyrics-btn-compact').first();
    await lyricsBtn.click();

    // Assert .mid-lyrics container exists and is visible
    const midLyrics = page.locator('.mid-lyrics');
    await expect(midLyrics).toBeVisible();

    // Assert the container has a bounded scroll viewport
    const dimensions = await midLyrics.evaluate((el) => {
      return {
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      };
    });

    expect(dimensions.clientHeight).toBeGreaterThan(100);
    expect(dimensions.scrollHeight).toBeGreaterThanOrEqual(dimensions.clientHeight);
  });
});
