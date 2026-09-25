import { test, expect } from '@playwright/test';

test('the document title follows heading edits, undo, recovery and a new page', async ({ page }) => {
  await page.goto('/?empty=true#playground');
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const title = page.locator('.pg-document-name');
  await page.keyboard.type('The quiet sea');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Heading 1', exact: true }).click();
  await expect(title).toHaveText('The quiet sea');
  await editor.press('End');
  await page.keyboard.type(' at dawn');
  await expect(title).toHaveText('The quiet sea at dawn');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(title).toHaveText('The quiet sea');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(title).toHaveText('The quiet sea at dawn');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Mara opened the window.');
  await expect(title).toHaveText('The quiet sea at dawn');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.goto('/#playground');
  await expect(title).toHaveText('The quiet sea at dawn');
  await expect(editor).toContainText('Mara opened the window.');
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  await page.getByRole('button', { name: 'Replace document', exact: true }).click();
  await expect(title).toHaveText('Untitled document');
  await page.keyboard.type('A fresh start.');
  await expect(editor).toHaveText('A fresh start.');
  await expect(title).toHaveText('Untitled document');
});

test('the header follows formatted titles and removal in source view', async ({ page }) => {
  await page.goto('/?empty=true#playground');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
  const source = page.getByRole('textbox', { name: 'HTML source code', exact: true });
  const title = page.locator('.pg-document-name');
  await source.fill('<h1>A <em>quiet</em> &amp; distant shore</h1><p>The story begins.</p>');
  await expect(title).toHaveText('A quiet & distant shore');
  await source.fill('<p>The story has no title yet.</p>');
  await expect(title).toHaveText('Untitled document');
  await expect(source).toBeFocused();
});
