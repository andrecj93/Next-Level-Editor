import { expect, type Page } from '@playwright/test';

export async function exerciseCrossParagraphEnter(page: Page, nativeInput = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Alpha beta.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('Gamma delta.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const original = await editor.innerHTML();
  for (let step = 0; step < 6; step++) await page.keyboard.press('ArrowLeft');
  for (let step = 0; step < 12; step++) await page.keyboard.press('Shift+ArrowLeft');
  expect((await editor.evaluate(() => getSelection()?.toString()))?.replace(/\s+/g, ' ')).toBe('beta. Gamma ');
  if (nativeInput) {
    // Exercise beforeinput without the editor's hardware-key handler.
    await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  }
  await page.keyboard.press('Enter');
  await expect(editor.locator('p')).toHaveText(['Alpha', 'delta.']);
  await expect(page.locator('.editor-footer')).toContainText('2 words');
  const changed = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  expect((await editor.evaluate(() => getSelection()?.toString()))?.replace(/\s+/g, ' ')).toBe('beta. Gamma ');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', changed);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', changed);
  await expect(page.locator('.editor-footer')).toContainText('2 words');
}
