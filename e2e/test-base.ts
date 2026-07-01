import { test as base, expect } from '@playwright/test';

// يحقن علم الأتمتة قبل أي سكربت في الصفحة، فيتجاوز الموقع شاشة التحميل حتميًا.
export const test = base.extend<{}>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as unknown as { __NL_AUTOMATED__?: boolean }).__NL_AUTOMATED__ = true;
    });
    await use(page);
  },
});

export { expect };
