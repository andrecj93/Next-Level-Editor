import { expect, type Page } from '@playwright/test';

export async function exerciseBlockShortcutContinuation(page: Page, writingMode = true) {
  for (const [prefix, selector, prose] of [
    ['## ', 'h2', 'A chapter with room to grow'],
    ['- ', 'ul:not(.checklist) > li', 'Bring a notebook and a pen'],
    ['[] ', 'ul.checklist > li', 'Write the next chapter'],
  ]) {
    await page.goto(`/?empty=true&writingMode=${writingMode}`);
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.click();
    await page.keyboard.type(prefix + prose);
    const block = editor.locator(selector);
    await expect(block).toHaveText(prose);
    expect(await block.evaluate(element => element.contains(getSelection()?.focusNode ?? null))).toBe(true);
    await page.keyboard.type(' today.');
    await expect(block).toHaveText(prose + ' today.');
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(block).toHaveText(prose + ' today.');
    const written = await editor.innerHTML();
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
    await page.goto(`/?writingMode=${writingMode}#playground`);
    await expect(editor).toHaveJSProperty('innerHTML', written);
  }
}
