import { test, expect } from '@playwright/test';

for (const mode of ['editor', 'split'] as const) {
  test(`book counts follow typing, undo and recovery in ${mode}`, async ({ page }) => {
    await page.goto('/?empty=true');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    const book = '<p>Once upon a time.</p>'.repeat(1000);
    await page.locator('.code-editor').fill(book);
    await expect(page.locator('.word-count')).toHaveText('4,000 words');
    await expect(page.locator('.char-count')).toHaveText('17,999 characters');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: mode === 'editor' ? 'Editor view' : 'Split view', exact: true }).click();
    if (mode === 'split') await page.getByRole('button', { name: 'Editor', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.click();
    await editor.press('ControlOrMeta+End');
    await editor.press('Enter');
    const original = await editor.evaluate(element => element.innerHTML);
    await page.keyboard.type('The story continues.');
    await expect(editor).toContainText('The story continues.');
    await expect(page.locator('.word-count')).toHaveText('4,003 words');
    await expect(page.locator('.char-count')).toHaveText('18,020 characters');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', original);
    await expect(page.locator('.word-count')).toHaveText('4,000 words');
    await expect(page.locator('.char-count')).toHaveText('17,999 characters');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(page.locator('.word-count')).toHaveText('4,003 words');
    await expect(page.locator('.char-count')).toHaveText('18,020 characters');
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
    await page.goto('/#playground');
    await expect(editor).toContainText('The story continues.');
    await expect(page.locator('.word-count')).toHaveText('4,003 words');
    await expect(page.locator('.char-count')).toHaveText('18,020 characters');
  });
}
