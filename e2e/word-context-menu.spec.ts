import { test, expect } from '@playwright/test';
import { exerciseWordContextMenu, rightClickLetter } from './helpers/wordContextMenu';

test('right-clicking an accented letter edits the complete word', async ({ page }) => {
  await exerciseWordContextMenu(page);
});

test('right-click word editing stays readable in dark appearance', async ({ page }) => {
  await exerciseWordContextMenu(page, true);
});

test('word context menu recognizes multilingual prose', async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  for (const [word, offset, length] of [
    ['ação', 2, 1], ['cafe\u0301', 3, 2], ['Привет', 2, 1],
    ['مرحبا', 2, 1], ['𐐀𐐁', 0, 2], ['can’t', 3, 1], ['你好', 0, 1],
  ] as const) {
    await editor.fill('');
    await page.keyboard.type(`${word}.`);
    await rightClickLetter(page, offset, length);
    await expect(page.getByRole('menu', { name: 'Context menu', exact: true })).toBeVisible();
    expect(await page.evaluate(() => getSelection()?.toString())).toBe(word);
    await page.keyboard.press('Escape');
  }
});

test('Shift right-click leaves the native browser menu available', async ({ page, browserName }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('');
  await page.keyboard.type('Café.');
  await page.evaluate(() => document.addEventListener('contextmenu', event => {
    queueMicrotask(() => { document.documentElement.dataset.nativeMenuPrevented = String(event.defaultPrevented); });
  }, { once: true }));
  await page.keyboard.down('Shift');
  await rightClickLetter(page, 3);
  await page.keyboard.up('Shift');
  await expect(page.getByRole('menu', { name: 'Context menu', exact: true })).toHaveCount(0);
  // Firefox intentionally skips the DOM event for Shift+right-click.
  const prevented = await page.locator('html').getAttribute('data-native-menu-prevented');
  expect(prevented).toBe(browserName === 'firefox' ? null : 'false');
  await page.keyboard.press('Escape');
  await expect(editor).toHaveText('Café.');
});
