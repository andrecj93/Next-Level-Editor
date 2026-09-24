import { expect, type Page } from '@playwright/test';

export async function exerciseCompanionReturn(page: Page, method: 'close' | 'escape' | 'toggle' = 'close', backwards = false) {
  // Compact notes cover the footer and provide their own Close control.
  // The footer toggle is exercised in the side-by-side layout in each engine.
  if (method === 'toggle') await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
  if (await opener.getAttribute('aria-expanded') === 'true') await opener.click();
  await editor.fill('She returned in order to find the house.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('The bus waited.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const before = await editor.innerHTML();
  if (backwards) for (let step = 0; step < 7; step++) await page.keyboard.press('Shift+ArrowLeft');
  await opener.click();
  const panel = page.getByRole('complementary', { name: 'Writing companion' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /Writing notes/ })).toBeFocused();
  if (method === 'escape') await page.keyboard.press('Escape');
  else if (method === 'toggle') await opener.click();
  else await panel.getByRole('button', { name: 'Close writing companion', exact: true }).click();
  await expect(panel).not.toBeVisible();
  await expect(editor).toBeFocused();
  if (backwards) {
    expect(await editor.evaluate(() => getSelection()?.toString())).toBe('waited.');
    expect(await editor.evaluate(() => getSelection()!.anchorOffset > getSelection()!.focusOffset)).toBe(true);
  }
  // Deliberately use the keyboard; a locator action would hide lost focus.
  await page.keyboard.type(backwards ? 'left.' : ' Then she smiled.');
  await expect(editor.locator('p').last()).toHaveText(backwards ? 'The bus left.' : 'The bus waited. Then she smiled.');
  const changed = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', changed);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', changed);
}
