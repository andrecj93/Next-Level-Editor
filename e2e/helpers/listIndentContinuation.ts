import { expect, type Page } from '@playwright/test';

export async function exerciseListIndentContinuation(page: Page, prefix: string) {
  await page.goto('/?empty=true');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.click();
  await page.keyboard.type(prefix + 'Coffee');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Letters');
  await page.keyboard.press('Tab');
  await page.keyboard.type(' home');
  const nested = editor.locator('li > :is(ul, ol)');
  await expect(nested.locator(':scope > li')).toHaveText(['Letters home']);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type(' today');
  await expect(editor.locator(':scope > :is(ul, ol) > li')).toHaveText(['Coffee', 'Letters home today']);
  await page.keyboard.press('Tab');
  const beforeEnter = await editor.innerHTML();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Return ticket');
  await expect(nested.locator(':scope > li')).toHaveText(['Letters home today', 'Return ticket']);
  const continued = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', beforeEnter);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', continued);
  for (let i = 0; i < 'Return ticket'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('Return ticket');
  await expect.poll(() => page.evaluate(() => {
    const selection = getSelection()!; const range = selection.getRangeAt(0);
    return selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
  })).toBe(true);
  await page.keyboard.type('Train fare');
  await expect(editor.locator(':scope > :is(ul, ol) > li').last()).toHaveText('Train fare');
  const finished = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor.locator(':scope > :is(ul, ol) > li').last()).toHaveText('Return ticket');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', finished);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', finished);
}
