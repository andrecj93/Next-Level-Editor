import { expect, test } from '@playwright/test';
import { installClipboard } from './helpers/clipboard';
import { exerciseMovingFormattedText, openSelectionContextMenu } from './helpers/cutClipboard';

test('move a formatted word through Cut, Paste, undo and draft recovery', async ({ page }) => {
  await exerciseMovingFormattedText(page);
});

test('typing and cutting inline emphasis keeps the visible word count accurate', async ({ page }) => {
  await installClipboard(page);
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const count = page.locator('.editor-footer .word-count');
  await editor.fill('Keep this ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  await expect(count).toHaveText('2 words');
  await page.keyboard.type('word');
  await editor.press('ControlOrMeta+b');
  await expect(count).toHaveText('3 words');
  await editor.press('ControlOrMeta+Shift+ArrowLeft');
  await (await openSelectionContextMenu(page)).getByRole('menuitem', { name: /Cut/ }).click();
  await expect(count).toHaveText('2 words');
  await editor.press('ControlOrMeta+z');
  await expect(count).toHaveText('3 words');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(count).toHaveText('2 words');
});

for (const change of ['selection', 'revision'] as const) {
  test('a delayed Cut preserves a newer ' + change, async ({ page }) => {
    await installClipboard(page);
    await page.goto('/#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('A quiet evening. Another thought.');
    await editor.evaluate(root => {
      const range = document.createRange(); range.setStart(root.firstChild!, 2); range.setEnd(root.firstChild!, 7);
      window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
    });
    await page.evaluate(() => {
      const write = navigator.clipboard.write.bind(navigator.clipboard);
      navigator.clipboard.write = items => new Promise(resolve => {
        document.documentElement.dataset.cutPending = 'true';
        (window as unknown as { finishCut: () => Promise<void> }).finishCut = async () => { await write(items); resolve(); };
      });
    });
    await (await openSelectionContextMenu(page)).getByRole('menuitem', { name: /Cut/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-cut-pending', 'true');
    if (change === 'selection') {
      await editor.evaluate(root => {
        const range = document.createRange(); range.setStart(root.firstChild!, 17); range.setEnd(root.firstChild!, 32);
        window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
      });
    } else {
      await editor.press('ControlOrMeta+End');
      await page.keyboard.type(' A newer ending.');
    }
    const before = await editor.innerHTML();
    await page.evaluate(() => (window as unknown as { finishCut: () => Promise<void> }).finishCut());
    await expect(page.locator('.toast-notification')).toHaveText('Your writing position changed. Nothing was cut.');
    await expect(editor).toHaveJSProperty('innerHTML', before);
    if (change === 'selection') await expect.poll(() => page.evaluate(() => window.getSelection()!.toString())).toBe('Another thought');
  });
}

test('read-only context menus keep Copy available and editing actions disabled', async ({ page }) => {
  await installClipboard(page);
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Keep this paragraph while reading.');
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  const settings = page.locator('#playground-settings');
  await settings.getByText('Read-only', { exact: true }).click();
  const readonly = settings.getByRole('checkbox', { name: /^Read-only/ });
  await expect(readonly).toBeChecked();
  await readonly.press('Escape');
  await expect(settings).not.toBeVisible();
  await expect(editor).toHaveAttribute('aria-readonly', 'true');
  await editor.evaluate(root => {
    const range = document.createRange(); range.selectNodeContents(root.querySelector('p') ?? root);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  });
  const before = await editor.innerHTML();
  const menu = await openSelectionContextMenu(page);
  await expect(menu.getByRole('menuitem', { name: /Copy/ })).toBeEnabled();
  for (const name of [/Cut/, /Paste/, /Bold/, /Italic/, /Underline/, /Insert Link/, /Insert Image/]) {
    await expect(menu.getByRole('menuitem', { name })).toBeDisabled();
  }
  await page.keyboard.press('Escape');
  await expect(editor).toHaveJSProperty('innerHTML', before);
});

test('a Cut permission timeout keeps the prose and rejects late deletion', async ({ page }) => {
  await installClipboard(page);
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Keep this paragraph.');
  await editor.press('ControlOrMeta+a');
  await page.evaluate(() => {
    navigator.clipboard.write = () => new Promise(resolve => {
      (window as unknown as { finishCut: () => void }).finishCut = resolve;
    });
  });
  const before = await editor.innerHTML();
  await (await openSelectionContextMenu(page)).getByRole('menuitem', { name: /Cut/ }).click();
  await expect(page.locator('.toast-notification')).toHaveText('Waiting for clipboard access. Your text stays here until it is copied.');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await expect(page.locator('.toast-notification')).toHaveText('Clipboard access took too long. Nothing was cut. Use Ctrl+X or ⌘X.', { timeout: 12_000 });
  await page.evaluate(() => (window as unknown as { finishCut: () => void }).finishCut());
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await expect(editor).toBeFocused();
});
