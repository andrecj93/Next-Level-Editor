import { test, expect } from '@playwright/test';

for (const existing of [false, true]) {
  test(`New document accepts the first sentence ${existing ? 'after replacing a draft' : 'from a blank page'}`, async ({ page }) => {
    await page.goto('/?empty=true#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await expect(editor).not.toBeFocused();
    if (existing) {
      await editor.click();
      await page.keyboard.type('The previous draft stays separate.');
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Preview view', exact: true }).click();
    }
    await page.getByRole('button', { name: 'New document', exact: true }).click();
    if (existing) await page.getByRole('button', { name: 'Replace document', exact: true }).click();
    await expect(editor).toBeFocused();
    await page.keyboard.type('The morning began with a letter.');
    await expect(editor).toHaveText('The morning began with a letter.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Mara left it beside the kettle.');
    await expect(editor).toContainText('Mara left it beside the kettle.');
    const written = await editor.innerHTML();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).not.toContainText('Mara left it beside the kettle.');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(editor).toHaveJSProperty('innerHTML', written);
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
    await page.goto('/#playground');
    await expect(editor).toHaveJSProperty('innerHTML', written);
  });
}

test('New document leaves the preview deep link ready for writing', async ({ page }) => {
  await page.goto('/?empty=true&editorView=preview#playground');
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await page.keyboard.type('A place to begin.');
  await expect(editor).toHaveText('A place to begin.');
});

test('New document respects read-only mode', async ({ page }) => {
  await page.goto('/?empty=true&readonly=1#playground');
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await expect(editor).toHaveAttribute('contenteditable', 'false');
  await expect(editor).not.toBeFocused();
  await page.keyboard.type('This must not be inserted.');
  await expect(editor).toBeEmpty();
});
