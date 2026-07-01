import { test, expect } from './test-base';

test.describe('Retro world smoke test', () => {
  test.slow();

  test('Opening Retro from the mode switcher renders the Retro World iframe', async ({ page }) => {
    await page.goto('./');

    // 1) Wait until the initial theme View-Transition finishes, otherwise the
    //    html.theme-switching overlay intercepts pointer events.
    await page.waitForFunction(
      () => !document.documentElement.classList.contains('theme-switching'),
      undefined,
      { timeout: 30000 },
    );

    // 2) The switcher has a continuous idle animation in the "orb" state, so it is
    //    never "stable". Use force to bypass the stability/actionability wait.
    const switcher = page.getByRole('group', { name: 'Mode switcher' });
    await expect(switcher).toBeVisible({ timeout: 30000 });
    await switcher.hover({ force: true }).catch(() => {});
    await switcher.click({ force: true });

    // 3) Retro item inside the switcher.
    const retroItem = page.getByRole('menuitem', { name: 'Retro', exact: true });
    await expect(retroItem).toBeVisible({ timeout: 30000 });
    await retroItem.click({ force: true });

    const retroIframe = page.locator('iframe[title="Retro World"]');
    await expect(retroIframe).toBeVisible({ timeout: 30000 });

    const src = await retroIframe.getAttribute('src');
    expect(src).toContain('retro/index.html');
  });
});
