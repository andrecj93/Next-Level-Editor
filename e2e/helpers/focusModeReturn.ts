import { expect, type Page } from '@playwright/test';

export async function exerciseFocusModeReturn(page: Page, exit?: 'menu' | 'escape', backwards = false, palette = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const view = page.getByRole('button', { name: 'View', exact: true });
  await editor.fill('She kept the letter.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('The bus waited.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const before = await editor.innerHTML();
  if (backwards) {
    for (let n = 0; n < 7; n++) await page.keyboard.press('Shift+ArrowLeft');
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('waited.');
  }
  if (palette) {
    await page.keyboard.press('ControlOrMeta+Shift+k');
    await page.getByRole('dialog', { name: 'Command palette', exact: true }).getByRole('combobox').fill('Toggle Focus Mode');
    await page.keyboard.press('Enter');
  } else {
    await view.click();
    await page.getByRole('menuitem', { name: 'Focus mode', exact: true }).click();
  }
  await expect(editor).toBeFocused();
  if (exit === 'escape') await page.keyboard.press('Escape');
  if (exit === 'menu') {
    await view.click();
    await page.getByRole('menuitem', { name: 'Exit focus mode', exact: true }).click();
  }
  await expect(editor).toBeFocused();
  await expect(page.locator('.next-level-editor')).toHaveClass(exit ? /^(?!.*\bis-focus\b)/ : /\bis-focus\b/);
  if (backwards) expect(await page.evaluate(() => getSelection()?.toString())).toBe('waited.');
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
