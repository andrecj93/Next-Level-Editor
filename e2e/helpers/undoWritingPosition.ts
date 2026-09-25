import { expect, type Page } from '@playwright/test';

export async function openSavedWritingDraft(page: Page) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Opening sentence.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('Final paragraph.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveText('Opening sentence.Final paragraph.');
  return editor;
}

export async function exerciseUndoWritingPosition(page: Page) {
  const editor = await openSavedWritingDraft(page);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' She waited.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('Opening sentence.Final paragraph.');
  // Do not reposition the caret: this is the sentence the person writes next.
  await page.keyboard.type(' Then she wrote.');
  await expect(editor.locator('p').last()).toHaveText('Final paragraph. Then she wrote.');
  await expect(editor.locator('p').first()).toHaveText('Opening sentence.');
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor.locator('p').last()).toHaveText('Final paragraph. Then she wrote.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveText('Opening sentence.Final paragraph. Then she wrote.');
}
