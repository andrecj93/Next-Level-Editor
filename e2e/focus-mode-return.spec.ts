import { test, expect } from '@playwright/test';
import { exerciseFocusModeReturn } from './helpers/focusModeReturn';
import { switchViewMode } from './helpers/toolbar';
test('enter focus mode and continue the sentence', async ({ page }) => {
  await exerciseFocusModeReturn(page);
});
for (const exit of ['menu', 'escape'] as const) {
  test(`leave focus mode with ${exit} and continue the sentence`, async ({ page }) => {
    await exerciseFocusModeReturn(page, exit);
  });
}
test('focus mode retains a backward selection for replacement', async ({ page }) => {
  await exerciseFocusModeReturn(page, undefined, true);
});
test('focus mode from the command palette resumes the selection', async ({ page }) => {
  await exerciseFocusModeReturn(page, undefined, true, true);
});

for (const mode of ['Code', 'Split'] as const) {
  test(`focus mode retains the source position in ${mode} view`, async ({ page }) => {
    await page.goto('/#playground');
    await switchViewMode(page, mode);
    const code = page.getByRole('textbox', { name: 'HTML source code', exact: true });
    await code.fill('<p>Wait here.</p>');
    await code.press('Home');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft');
    for (const label of ['Focus mode', 'Exit focus mode']) {
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: label, exact: true }).click();
      await expect(code).toBeFocused();
      expect(await code.evaluate(el => [el.selectionStart, el.selectionEnd, el.selectionDirection])).toEqual([3, 7, 'backward']);
    }
    await page.keyboard.type('Stay');
    await expect(code).toHaveValue('<p>Stay here.</p>');
    await switchViewMode(page, 'Editor');
    await expect(page.getByRole('textbox', { name: 'Rich text editor', exact: true })).toHaveText('Stay here.');
  });
}
