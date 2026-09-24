import { expect, type Locator, type Page } from '@playwright/test';
import { switchViewMode } from './toolbar';

export async function exerciseClearFormatting(page: Page, options: {
  touch?: boolean;
  entry?: 'style' | 'tools' | 'shortcut' | 'palette';
} = {}) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting toolbar', exact: true });
  const activate = (locator: Locator) => options.touch ? locator.tap() : locator.click();
  await switchViewMode(page, 'Code');
  await page.locator('.code-editor').fill('<p>She wrote <strong><em>back</em></strong>.</p><p>Keep <a href="https://example.com">this link</a> and <code>x</code>.</p>');
  await switchViewMode(page, 'Editor');
  const original = await editor.innerHTML();
  const untouched = await editor.locator('p').nth(1).innerHTML();
  await editor.focus();
  await editor.evaluate(root => {
    const paragraph = root.querySelector('p')!;
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, paragraph.firstChild!.textContent!.length);
    range.setEnd(paragraph.querySelector('em')!.firstChild!, 2);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  // A boundary in the preceding text node must not misreport the selected marks.
  // The primary marks are hidden on phones, where Style provides the controls.
  await expect(toolbar.getByRole('button', { name: 'Bold', exact: true, includeHidden: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(toolbar.getByRole('button', { name: 'Italic', exact: true, includeHidden: true })).toHaveAttribute('aria-pressed', 'true');
  if (options.entry === 'shortcut') {
    await page.keyboard.press('ControlOrMeta+Backslash');
  } else if (options.entry === 'palette') {
    await page.keyboard.press('ControlOrMeta+Shift+k');
    const palette = page.getByRole('dialog', { name: 'Command palette', exact: true });
    await palette.getByRole('combobox').fill('Clear Formatting');
    await page.keyboard.press('Enter');
  } else if (options.entry === 'tools') {
    await activate(toolbar.getByRole('button', { name: 'Tools', exact: true }));
    await activate(page.getByRole('menuitem', { name: 'Clear Formatting', exact: true }));
  } else {
    await activate(toolbar.getByRole('button', { name: 'More formatting', exact: true }));
    await activate(toolbar.getByRole('group', { name: 'More formatting options', exact: true }).getByRole('button', { name: 'Clear Formatting', exact: true }));
  }
  await expect(editor).toBeFocused();
  await expect(page.locator('.toast-notification')).toHaveText('Formatting cleared.');
  expect(await editor.locator('p').first().innerHTML()).toBe('She wrote ba<strong><em>ck</em></strong>.');
  expect(await editor.locator('p').nth(1).innerHTML()).toBe(untouched);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('ba');
  const cleared = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await editor.innerHTML()).toBe(cleared);

  // Continue writing over the selected letters without clicking back into the page.
  await page.keyboard.type('BA');
  await expect(editor.locator('p').first()).toHaveText('She wrote BAck.');
  await expect(editor.locator('p').first().locator('strong em')).toHaveText('ck');
  expect(await editor.locator('p').nth(1).innerHTML()).toBe(untouched);
  const final = await editor.innerHTML();
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  expect(await editor.innerHTML()).toBe(final);
}
