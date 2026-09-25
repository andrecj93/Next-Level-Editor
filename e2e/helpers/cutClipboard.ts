import { expect, type Page } from '@playwright/test';
import { installClipboard, pasteWithContextMenu } from './clipboard';

export async function openSelectionContextMenu(page: Page) {
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const point = await editor.evaluate(root => {
    const range = window.getSelection()!.getRangeAt(0);
    const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
    const area = root.getBoundingClientRect();
    return { x: rect.x + Math.max(rect.width / 2, 1) - area.x, y: rect.y + rect.height / 2 - area.y };
  });
  await editor.click({ button: 'right', position: point });
  return page.getByRole('menu', { name: 'Context menu', exact: true });
}

export async function exerciseMovingFormattedText(page: Page) {
  await installClipboard(page);
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('A quiet evening.');
  await editor.evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!, 2); range.setEnd(root.firstChild!, 7);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  });
  await page.keyboard.press('ControlOrMeta+b');
  await expect(editor.locator('strong')).toHaveText('quiet');
  // Select inside the text node, as dragging over a word does. Range cloning
  // alone would drop the inherited <strong> wrapper from the clipboard.
  await editor.evaluate(root => {
    const text = root.querySelector('strong')!.firstChild!;
    const range = document.createRange(); range.selectNodeContents(text);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  });
  const original = await editor.innerHTML();
  await (await openSelectionContextMenu(page)).getByRole('menuitem', { name: /Cut/ }).click();
  await expect(editor).toHaveText('A  evening.');
  await expect(editor).toBeFocused();
  const cut = await editor.innerHTML();
  await editor.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', cut);
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('Tomorrow, ');
  await editor.locator('p').last().click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(editor.locator('p').last()).toHaveText('Tomorrow, quiet');
  await expect(editor.locator('p').last().locator('strong')).toHaveText('quiet');
  await expect(editor).toBeFocused();
  const pasted = await editor.innerHTML();
  await editor.press('ControlOrMeta+z');
  await expect(editor.locator('p').last()).toHaveText('Tomorrow, ');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', pasted);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' again.');
  await expect(editor.locator('p').last()).toHaveText('Tomorrow, quiet again.');
  const final = await editor.innerHTML();
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', final);
}
