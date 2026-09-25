import { test, expect } from '@playwright/test';
import { exerciseWritingContinuation } from './helpers/writingContinuation';
import { switchViewMode } from './helpers/toolbar';

test('accept a writing note and continue at the same place', async ({ page, hasTouch }) => {
  await exerciseWritingContinuation(page, hasTouch);
});

for (const position of ['empty paragraph', 'backwards selection'] as const) {
  test(`accept a writing note while keeping an unrelated ${position}`, async ({ page }) => {
    await page.goto('/#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await switchViewMode(page, 'Code');
    await page.locator('.code-editor').fill('<p>She opened the window in order to hear the town.</p>'
      + (position === 'empty paragraph' ? '<p><br></p>' : ''));
    await switchViewMode(page, 'Editor');
    await editor.press('ControlOrMeta+End');
    if (position === 'backwards selection') {
      for (let index = 0; index < 5; index++) await editor.press('Shift+ArrowLeft');
    }
    const before = await editor.innerHTML();
    await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
    await page.getByRole('button', { name: 'Use “to”', exact: true }).click();
    await expect(editor).toBeFocused();
    const revised = await editor.innerHTML();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(editor).toHaveJSProperty('innerHTML', revised);
    if (position === 'backwards selection') {
      expect(await page.evaluate(() => {
        const selection = window.getSelection()!;
        return { text: selection.toString(), backwards: selection.anchorOffset > selection.focusOffset };
      })).toEqual({ text: 'town.', backwards: true });
      await page.keyboard.type('harbor.');
      await expect(editor.locator('p')).toHaveText('She opened the window to hear the harbor.');
    } else {
      await page.keyboard.type('Mara listened.');
      await expect(editor.locator('p')).toHaveText(['She opened the window to hear the town.', 'Mara listened.']);
    }
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
  });
}
