import { test, expect } from '@playwright/test';

test.describe('Retro world smoke test', () => {
  test.slow();

  test('Entering the Retro page renders the Retro World iframe', async ({ page }) => {
    await page.goto('./');

    // ريترو الآن صفحة مستقلة تُفتح من زر شاشة التحميل (وليست theme).
    const retroBtn = page.getByRole('button', { name: 'Retro', exact: true });
    await expect(retroBtn).toBeVisible({ timeout: 30000 });
    await retroBtn.click();

    const retroIframe = page.locator('iframe[title="Retro World"]');
    await expect(retroIframe).toBeVisible({ timeout: 30000 });

    const src = await retroIframe.getAttribute('src');
    expect(src).toContain('retro/index.html');
  });
});
