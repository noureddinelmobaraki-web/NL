import { test, expect } from '@playwright/test';

test.describe('Retro world smoke test', () => {
  test.slow();

  test('Opening Retro from the mode switcher renders the Retro World iframe', async ({ page }) => {
    await page.goto('./');

    // في بيئة الاختبار تتخطّى شاشة التحميل نفسها -> يظهر التطبيق الرئيسي مباشرة.
    // ريترو لم تعد theme، بل تُفتح من «مبدّل الأوضاع» (فقاعة زجاجية).
    const switcher = page.getByRole('group', { name: 'Mode switcher' });
    await expect(switcher).toBeVisible({ timeout: 30000 });

    // على الحاسوب يُفتح بالـ hover، وعلى الهاتف بالنقر — ننفّذ الاثنين للأمان.
    await switcher.hover();
    await switcher.click();

    // زر ريترو داخل المبدّل دوره menuitem واسمه Retro.
    const retroItem = page.getByRole('menuitem', { name: 'Retro', exact: true });
    await expect(retroItem).toBeVisible({ timeout: 30000 });
    await retroItem.click();

    const retroIframe = page.locator('iframe[title="Retro World"]');
    await expect(retroIframe).toBeVisible({ timeout: 30000 });

    const src = await retroIframe.getAttribute('src');
    expect(src).toContain('retro/index.html');
  });
});
