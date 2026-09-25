import { expect, type Page } from '@playwright/test';

export async function exerciseLinkEditingPosition(page: Page) {
  await page.goto('/?empty=true');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
  await page.locator('.code-editor').fill('<p>See <a href="https://example.com/old"><em>harbor map</em></a> today.</p>');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const link = editor.locator('a');
  const original = await editor.innerHTML();
  await editor.press('ControlOrMeta+Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  await editor.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Edit link', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'URL', exact: true }).fill('https://example.com/revised');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.isCollapsed)).toBe(true);
  await expect(link).toHaveAttribute('href', 'https://example.com/revised');
  await expect(link.locator('em')).toHaveText('harbor map');
  const revised = await editor.innerHTML();
  await page.keyboard.type('X');
  await expect(link.locator('em')).toHaveText('harXbor map');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  // A backward selection remains the same selected phrase after a URL edit.
  await editor.press('ControlOrMeta+Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('harbor');
  await page.getByRole('button', { name: 'Insert', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Link', exact: true }).click();
  await page.getByRole('textbox', { name: 'URL', exact: true }).fill('https://example.com/final');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('harbor');
  await expect.poll(() => page.evaluate(() => {
    const selection = getSelection()!; const range = selection.getRangeAt(0);
    return selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
  })).toBe(true);
  const final = await editor.innerHTML();
  await page.keyboard.type('port');
  await expect(link.locator('em')).toHaveText('port map');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', final);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', final);
  // An explicit caption replacement ends after the link, ready for prose.
  await editor.press('ControlOrMeta+Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  await editor.press('ControlOrMeta+k');
  await page.getByRole('textbox', { name: 'Text to display (optional)', exact: true }).fill('a new map');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await page.keyboard.type(' for Celia');
  await expect(link).toHaveText('a new map');
  await expect(editor).toHaveText('See a new map for Celia today.');
}
