import { expect, type Page } from '@playwright/test';

export async function exerciseInlineTyping(page: Page, label = 'Bold', shortcut = 'b', tag = 'strong') {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('She chose to ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+' + shortcut);
  await page.keyboard.type('walk');
  await editor.press('ControlOrMeta+' + shortcut);
  // Touch devices expose these controls in a dock. Narrow desktop layouts
  // place them in Style, so check the actual available control there.
  const control = page.getByRole('button', { name: label, exact: true });
  const needsStyle = !(await control.isVisible());
  const style = page.getByRole('button', { name: 'More formatting', exact: true });
  if (needsStyle) await style.click();
  await expect(control).toHaveAttribute('aria-pressed', 'false');
  if (needsStyle) {
    await style.click();
    await editor.focus();
  }
  await page.keyboard.type(' home, slowly.');
  await expect(editor.locator(tag)).toHaveText('walk');
  const prose = await editor.innerHTML();
  await editor.press('Enter');
  await page.keyboard.type('Tomorrow was another day.');
  await expect(editor.locator('p').last()).toHaveText('Tomorrow was another day.');
  await expect(editor.locator('p').last().locator(tag)).toHaveCount(0);
  await editor.press('ControlOrMeta+z');
  await expect(editor.locator('p').last()).not.toHaveText('Tomorrow was another day.');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor.locator('p').last()).toHaveText('Tomorrow was another day.');
  const final = await editor.innerHTML();
  expect(final).toContain(prose);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', final);
}
