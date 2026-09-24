import { expect, test } from '@playwright/test';
import { exerciseUndoWritingPosition, openSavedWritingDraft } from './helpers/undoWritingPosition';

test('undo of the first edit keeps continued writing at the end of a saved draft', async ({ page }) => {
  await exerciseUndoWritingPosition(page);
});

test('moving to another passage starts a separate typing undo step', async ({ page }) => {
  const editor = await openSavedWritingDraft(page);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' End.');
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.type('New ');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('Opening sentence.Final paragraph. End.');
  await page.keyboard.type('Revised ');
  await expect(editor.locator('p').first()).toHaveText('Revised Opening sentence.');
});

test('undo restores a backward selection for the next replacement', async ({ page }) => {
  const editor = await openSavedWritingDraft(page);
  await editor.press('ControlOrMeta+End');
  for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.type('line.');
  await page.keyboard.press('ControlOrMeta+z');
  expect(await editor.evaluate(() => getSelection()?.toString())).toBe('paragraph.');
  await page.keyboard.type('chapter.');
  await expect(editor.locator('p').last()).toHaveText('Final chapter.');
});

for (const key of ['Enter', 'Backspace']) test(`undo of the first ${key} keeps the original writing position`, async ({ page }) => {
  const editor = await openSavedWritingDraft(page);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.press(key);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('Opening sentence.Final paragraph.');
  await page.keyboard.type(' Next.');
  await expect(editor.locator('p').last()).toHaveText('Final paragraph. Next.');
});
