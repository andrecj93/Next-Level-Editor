import { expect, type Locator, type Page } from '@playwright/test';
import { switchViewMode } from './toolbar';

export async function exerciseWritingContinuation(page: Page, touch = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  const activate = (button: Locator) => touch ? button.tap() : button.click();
  await switchViewMode(page, 'Code');
  await page.locator('.code-editor').fill('<h2>The morning after</h2>'
    + '<p>Mara listened to the bells. The room was still.</p>'.repeat(16)
    + '<p>She opened the window in order to hear the town.</p>');
  await switchViewMode(page, 'Editor');
  await editor.press('ControlOrMeta+End');
  const original = await editor.innerHTML();
  const open = async () => {
    if (!(await companion.isVisible())) await activate(page.getByRole('button', { name: 'Writing companion', exact: true }));
  };
  await open();
  await activate(companion.getByRole('button', { name: 'Use “to”', exact: true }));
  await expect(editor).toBeFocused();
  await expect(editor.locator('p').last()).toHaveText('She opened the window to hear the town.');
  await expect.poll(() => editor.evaluate(root => {
    const selection = window.getSelection()!;
    const prefix = document.createRange();
    prefix.selectNodeContents(root.lastElementChild!);
    prefix.setEnd(selection.focusNode!, selection.focusOffset);
    return prefix.toString();
  })).toBe('She opened the window to hear the town.');
  await expect(async () => {
    const geometry = await editor.evaluate(root => {
      const caret = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      const area = root.getBoundingClientRect();
      return { top: caret.top, bottom: caret.bottom, areaTop: area.top, areaBottom: area.bottom };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.areaTop);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.areaBottom);
  }).toPass();
  const revised = await editor.innerHTML();
  await page.keyboard.type(' Nobody answered.');
  await expect(editor.locator('p').last()).toHaveText('She opened the window to hear the town. Nobody answered.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  // Redo also restores the writing position, not the temporary note selection.
  await page.keyboard.type(' Celia answered.');
  await expect(editor.locator('p').last()).toHaveText('She opened the window to hear the town. Celia answered.');
  // A new empty paragraph shares its text offset with the preceding sentence.
  // Undo/redo must keep its DOM boundary so continued typing stays on that line.
  await editor.press('Enter');
  await page.keyboard.type('Mara returned in order to listen.');
  await editor.press('Enter');
  await open();
  await activate(companion.getByRole('button', { name: 'Use “to”', exact: true }));
  await expect(editor.locator('p').nth(17)).toHaveText('Mara returned to listen.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor.locator('p').nth(17)).toHaveText('Mara returned in order to listen.');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor.locator('p').nth(17)).toHaveText('Mara returned to listen.');
  await page.keyboard.type('The town was quiet.');
  await expect(editor.locator('p')).toHaveCount(19);
  await expect(editor.locator('p').last()).toHaveText('The town was quiet.');
  await expect(editor.locator('p').nth(17)).toHaveText('Mara returned to listen.');
  const final = await editor.innerHTML();
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', final);
}
