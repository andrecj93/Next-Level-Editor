import { expect, type Locator, type Page } from '@playwright/test';

export async function chooseTextSize(page: Page, label: 'Small' | 'Normal' | 'Large' | 'Huge') {
  const size = page.getByRole('button', { name: 'Size', exact: true });
  if (!await size.isVisible()) await page.getByRole('button', { name: 'More formatting', exact: true }).click();
  await size.click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
  const close = page.getByRole('button', { name: 'Close more formatting', exact: true });
  if (await close.isVisible()) await close.click();
  await expect(page.getByRole('textbox', { name: 'Rich text editor', exact: true })).toBeFocused();
}

export async function textSizeRatio(editor: Locator, phrase: string): Promise<number> {
  return editor.evaluate((root, text) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.includes(text)) continue;
      const parent = walker.currentNode.parentElement!;
      const block = parent.closest('p, li, h1, h2, h3, h4, h5, h6, td, th') ?? root;
      return parseFloat(getComputedStyle(parent).fontSize) / parseFloat(getComputedStyle(block).fontSize);
    }
    throw new Error('Missing rendered phrase: ' + text);
  }, phrase);
}

export async function exerciseFontSizeTyping(page: Page) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Mara wrote ');
  await editor.press('ControlOrMeta+End');
  await chooseTextSize(page, 'Large');
  await page.keyboard.type('a title');
  expect(await textSizeRatio(editor, 'a title')).toBeCloseTo(1.25, 2);
  await chooseTextSize(page, 'Huge');
  await chooseTextSize(page, 'Huge');
  await page.keyboard.type(' and a subtitle');
  expect(await textSizeRatio(editor, 'and a subtitle')).toBeCloseTo(1.75, 2);
  await chooseTextSize(page, 'Normal');
  await page.keyboard.type(' before returning to prose.');
  await expect(editor).toHaveText('Mara wrote a title and a subtitle before returning to prose.');
  expect(await textSizeRatio(editor, 'before returning')).toBeCloseTo(1, 2);
  expect(await textSizeRatio(editor, 'a title')).toBeCloseTo(1.25, 2);
  await editor.press('Enter');
  await page.keyboard.type('The next paragraph.');
  expect(await textSizeRatio(editor, 'The next paragraph.')).toBeCloseTo(1, 2);
  const html = await editor.innerHTML();
  expect(html).not.toContain('data-nle-typing-placeholder');
  await editor.press('ControlOrMeta+z');
  await expect(editor).not.toContainText('The next paragraph.');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', html);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveText('Mara wrote a title and a subtitle before returning to prose.The next paragraph.');
  expect(await textSizeRatio(editor, 'a title')).toBeCloseTo(1.25, 2);
  expect(await textSizeRatio(editor, 'and a subtitle')).toBeCloseTo(1.75, 2);
  expect(await textSizeRatio(editor, 'before returning')).toBeCloseTo(1, 2);
  expect(await textSizeRatio(editor, 'The next paragraph.')).toBeCloseTo(1, 2);
  expect(await editor.innerHTML()).not.toContain('data-nle-typing-placeholder');
}
