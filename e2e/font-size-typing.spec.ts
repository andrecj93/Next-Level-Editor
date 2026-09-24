import { expect, test } from '@playwright/test';
import { chooseTextSize, exerciseFontSizeTyping, textSizeRatio } from './helpers/fontSizeTyping';

test('text size changes affect the next words without compounding', async ({ page }) => {
  await exerciseFontSizeTyping(page);
});

for (const selected of [false, true]) test(`Normal restores ${selected ? 'selected letters' : 'continued typing'} inside a larger word`, async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Her note: ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+i');
  await chooseTextSize(page, 'Large');
  await page.keyboard.type('WORD');
  await editor.press('ArrowLeft');
  if (selected) {
    await editor.press('Shift+ArrowLeft');
    await editor.press('Shift+ArrowLeft');
  }
  await chooseTextSize(page, 'Normal');
  if (!selected) await page.keyboard.type('middle');
  const phrase = selected ? 'OR' : 'middle';
  expect(await textSizeRatio(editor, phrase)).toBeCloseTo(1, 2);
  expect(await textSizeRatio(editor, 'D')).toBeCloseTo(1.25, 2);
  await expect(editor).toHaveText(selected ? 'Her note: WORD' : 'Her note: WORmiddleD');
  expect((await editor.locator('em').allTextContents()).join('')).toBe(selected ? 'WORD' : 'WORmiddleD');
});
