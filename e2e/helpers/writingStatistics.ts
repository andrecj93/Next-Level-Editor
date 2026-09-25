import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function exerciseWritingStatistics(page: Page) {
  await page.goto('/?empty=true');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.click();
  await page.keyboard.insertText('Chapter One — Café 👩‍💻');
  await page.keyboard.press('Enter');
  await page.keyboard.type('The bus waited.');
  const original = await editor.innerHTML();
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('waited');
  const open = async () => {
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Writing statistics', exact: true }).click();
  };
  await open();
  const panel = page.getByRole('region', { name: 'Writing statistics', exact: true });
  const close = panel.getByRole('button', { name: 'Close writing statistics' });
  await expect(close).toBeFocused();
  await expect(panel.locator('.stat-value').nth(0)).toHaveText('6');
  await expect(page.locator('.word-count')).toHaveText('6 words');
  const characters = (await panel.locator('.stat-value').nth(1).innerText()).replace(/\D/g, '');
  await expect(page.locator('.char-count')).toHaveText(`${characters} characters`);
  for (const control of [close, panel.getByRole('button', { name: 'Collapse panel' })]) {
    await expect(control).toBeInViewport();
    expect(await control.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('region', { name: 'Statistics details' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(panel.locator('.seo-section')).toBeInViewport();
  await page.keyboard.press('Home');
  await expect.poll(() => panel.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
  const toggleTheme = page.getByRole('button', { name: /Switch to (dark|light) mode/ });
  for (let mode = 0; mode < 2; mode++) {
    const colors = await panel.evaluate(el => ({ actual: getComputedStyle(el).backgroundColor, token: getComputedStyle(el).getPropertyValue('--color-surface').trim() }));
    const rgb = colors.token.replace('#', '').match(/.{2}/g)!.map(value => parseInt(value, 16));
    expect(colors.actual).toBe(`rgb(${rgb.join(', ')})`);
    const accessibility = await new AxeBuilder({ page }).include('.writing-stats-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await toggleTheme.click();
  }
  await close.click();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('waited');
  await page.keyboard.type('arrived');
  await expect(editor).toContainText('The bus arrived.');
  const finished = await editor.innerHTML();
  await open();
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(editor).toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', finished);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toContainText('The bus arrived.');
  await expect(page.locator('.word-count')).toHaveText('6 words');
}
