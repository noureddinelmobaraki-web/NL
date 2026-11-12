import { test, expect } from './test-base';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: '1920' },
  { width: 1440, height: 900, name: '1440' },
  { width: 1280, height: 800, name: '1280' },
  { width: 1024, height: 768, name: '1024' },
  { width: 768, height: 1024, name: '768' },
  { width: 390, height: 844, name: '390' },
];

test.describe('Liquid Glass Books & Audiobooks Viewport Baselines', () => {
  for (const vp of VIEWPORTS) {
    test(`captures baseline at ${vp.name}px width`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('./?view=liquidGlass', { waitUntil: 'domcontentloaded' });
      const portalRoot = page.locator('.lg-portal-root');
      await expect(portalRoot).toBeVisible({ timeout: 20000 });
      const stage = page.locator('.lg-stage');
      await expect(stage).toBeVisible({ timeout: 20000 });
    });
  }
});
