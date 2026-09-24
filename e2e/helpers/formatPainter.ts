import { expect, type Locator, type Page } from '@playwright/test';
import { switchViewMode } from './toolbar';

export async function exerciseFormatCopy(page: Page, options: { touch?: boolean; keyboard?: boolean } = {}) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting toolbar', exact: true });
  const activate = (locator: Locator) => options.touch ? locator.tap() : locator.click();
  await switchViewMode(page, 'Code');
  await page.locator('.code-editor').fill('<p>She wrote <em>back</em>.</p><p>The gate stayed open.</p>');
  await switchViewMode(page, 'Editor');
  const original = await editor.innerHTML();

  const command = async (name: string) => {
    const tools = toolbar.getByRole('button', { name: 'Tools', exact: true });
    const item = page.getByRole('menuitem', { name, exact: true });
    if (options.keyboard) {
      await tools.press('ArrowDown');
      for (let step = 0; step < 20 && !(await item.evaluate(el => el === document.activeElement)); step++) {
        await page.keyboard.press('ArrowDown');
      }
      await expect(item).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await activate(tools);
      await activate(item);
    }
    await expect(editor).toBeFocused();
  };

  // These equivalent real DOM ranges select only "back". Their start is
  // outside <em>, just as the manuscript's text-selection interaction produced.
  await editor.evaluate((root, parentBoundary) => {
    const paragraph = root.querySelector('p')!;
    const leading = paragraph.firstChild!;
    const range = document.createRange();
    if (parentBoundary) {
      range.setStart(paragraph, 1);
      range.setEnd(paragraph, 2);
    } else {
      range.setStart(leading, leading.textContent!.length);
      range.setEnd(paragraph.querySelector('em')!.firstChild!, 4);
    }
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  }, Boolean(options.keyboard));
  await command('Copy Format');
  await expect(page.locator('.toast-notification')).toHaveText('Formatting copied. Select text, then choose Paste Format.');
  expect(await editor.innerHTML()).toBe(original);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('back');

  await editor.evaluate(root => {
    const text = root.querySelectorAll('p')[1].firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 8);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await command('Paste Format');
  await expect(editor.locator('p').nth(1).locator('em')).toHaveText('gate');
  await expect(editor.locator('p').nth(1)).toHaveText('The gate stayed open.');
  await expect(page.locator('.toast-notification')).toHaveText('Formatting applied.');
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('gate');
  const painted = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await editor.innerHTML()).toBe(painted);

  // Copying plain text is meaningful too: it removes destination emphasis.
  await editor.evaluate(root => {
    const range = document.createRange();
    range.selectNodeContents(root.querySelectorAll('p')[1].firstChild!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await command('Copy Format');
  await editor.evaluate(root => {
    const range = document.createRange();
    range.selectNodeContents(root.querySelector('em')!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await command('Paste Format');
  expect(await editor.locator('p').first().innerHTML()).toBe('She wrote back.');
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('back');
  await expect(editor.locator('p').nth(1).locator('em')).toHaveText('gate');
  const plainApplied = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(painted);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await editor.innerHTML()).toBe(plainApplied);

  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tomorrow, she would return.');
  await expect(editor.locator('p').last()).toHaveText('Tomorrow, she would return.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const final = await editor.innerHTML();
  await page.reload();
  await expect(editor.locator('em')).toHaveCount(1);
  expect(await editor.innerHTML()).toBe(final);
}
