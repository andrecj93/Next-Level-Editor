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

export async function exerciseInlineDeletion(page: Page, withoutKeydown = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('She chose to ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  await page.keyboard.type('walk');
  await expect(editor).toHaveText('She chose to walk');
  expect(await editor.textContent()).not.toContain('\u200b');
  await editor.press('ControlOrMeta+b');
  if (withoutKeydown) {
    // Let the browser perform the edit and fire its real beforeinput event,
    // while withholding the hardware-keyboard handler (as on soft keyboards).
    await editor.evaluate(el => el.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Backspace') event.stopImmediatePropagation();
    }, { capture: true, once: true }));
  }
  await editor.press('Backspace');
  await expect(editor).toHaveText('She chose to wal');
  expect(await editor.textContent()).not.toContain('\u200b');
  await editor.press('ControlOrMeta+z');
  await expect(editor).toHaveText('She chose to walk');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveText('She chose to wal');
  await page.keyboard.type('k home.');
  await expect(editor).toHaveText('She chose to walk home.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveText('She chose to walk home.');
  expect(await editor.innerHTML()).not.toContain('data-nle-typing-placeholder');
  expect(await editor.textContent()).not.toContain('\u200b');
}

export async function exerciseParagraphTyping(page: Page, nativeInput = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('She wrote.');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  if (nativeInput) await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  await editor.press('Enter');
  await page.keyboard.type('Tomorrow.');
  await expect(editor.locator('p').last().locator('strong,b')).toHaveText('Tomorrow.');
  await editor.press('ControlOrMeta+b');
  if (nativeInput) await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  await editor.press('Enter');
  await page.keyboard.type('Another day.');
  await expect(editor.locator('p').last()).toHaveText('Another day.');
  await expect(editor.locator('p').last().locator('strong,b')).toHaveCount(0);
  await editor.press('ControlOrMeta+z');
  await expect(editor.locator('p').last()).not.toHaveText('Another day.');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor.locator('p').last()).toHaveText('Another day.');
  const html = await editor.innerHTML();
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', html);
  expect(html).not.toContain('data-nle-typing-placeholder');
}
