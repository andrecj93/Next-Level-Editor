import { expect, type Page } from '@playwright/test';

/** Page-local clipboard avoids sharing the OS clipboard between test workers.
 * The browser still constructs real Blob, ClipboardItem and DataTransfer data.
 */
export async function installClipboard(page: Page, flavors?: Record<string, string>, plainOnly = false) {
  await page.addInitScript(({ flavors, plainOnly }) => {
    let items = flavors ? [{
      types: Object.keys(flavors),
      getType: async (type: string) => new Blob([flavors[type]], { type }),
    }] : [] as Array<{ types: readonly string[]; getType: (type: string) => Promise<Blob> }>;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: async (value: typeof items) => { items = value; },
        readText: async () => items[0]?.types.includes('text/plain') ? (await items[0].getType('text/plain')).text() : '',
        ...(plainOnly ? {} : { read: async () => items }),
      },
    });
  }, { flavors, plainOnly });
}

export async function pasteWithContextMenu(page: Page) {
  await page.getByRole('menu', { name: 'Context menu', exact: true }).getByRole('menuitem', { name: /Paste/ }).click();
}

export async function exerciseRichClipboard(page: Page) {
  await installClipboard(page);
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('That evening, she wrote back.');
  await editor.evaluate(root => {
    const text = root.firstChild!;
    const range = document.createRange();
    range.setStart(text, 24);
    range.setEnd(text, 28);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await page.keyboard.press('ControlOrMeta+i');
  await expect(editor.locator('em')).toHaveText('back');
  await editor.press('ControlOrMeta+a');
  await editor.click({ button: 'right' });
  await page.getByRole('menu', { name: 'Context menu', exact: true }).getByRole('menuitem', { name: /Copy/ }).click();
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  const before = await editor.innerHTML();
  await editor.locator('p').last().click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(editor.locator('em')).toHaveCount(2);
  await expect(editor).toBeFocused();
  const pasted = await editor.innerHTML();
  await editor.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(before);
  await editor.press('ControlOrMeta+Shift+z');
  expect(await editor.innerHTML()).toBe(pasted);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' More tomorrow.');
  await expect(editor.locator('p').last()).toContainText('That evening, she wrote back. More tomorrow.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const final = await editor.innerHTML();
  await page.reload();
  await expect(editor.locator('em')).toHaveCount(2);
  expect(await editor.innerHTML()).toBe(final);
  return editor;
}
