import { expect, test } from '@playwright/test';
import { exerciseVariablesReturn } from './helpers/variablesReturn';

for (const method of ['close', 'escape', 'toggle'] as const) {
  test(`closing variables with ${method} resumes the sentence`, async ({ page }) => {
    await exerciseVariablesReturn(page, method);
  });
}
test('closing variables restores a backward replacement selection', async ({ page }) => {
  await exerciseVariablesReturn(page, 'close', true);
});

test('keyboard variable insertion replaces a name in the middle and resumes writing', async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Dear friend, thank you for the letter.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await editor.press('ControlOrMeta+Home');
  for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowRight');
  for (let step = 0; step < 6; step++) await page.keyboard.press('Shift+ArrowRight');
  expect(await editor.evaluate(() => getSelection()?.toString())).toBe('friend');
  await page.getByRole('button', { name: 'Variables', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Close variables panel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  // Firefox makes the scroll container itself a native Tab stop.
  if (await page.locator('.variables-panel-list').evaluate(el => document.activeElement === el)) {
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('button', { name: 'user.name John Doe', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await expect(editor.locator('.editor-variable')).toHaveCount(1);
  await expect(editor).toHaveText('Dear {{ user.name }} , thank you for the letter.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const inserted = await editor.innerHTML();
  await page.keyboard.type('(Mara)');
  await expect(editor).toHaveText('Dear {{ user.name }} (Mara), thank you for the letter.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const continued = await editor.innerHTML();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Template variables' })).not.toBeVisible();
  await expect(editor).toBeFocused();
  await page.keyboard.type('!');
  await expect(editor).toHaveText('Dear {{ user.name }} (Mara)!, thank you for the letter.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', continued);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', inserted);
});
