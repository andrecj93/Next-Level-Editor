import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function exerciseStyleFeedback(page: Page) {
  await page.goto('/?empty=true');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.click();
  await page.keyboard.type('# A quiet morning');
  await expect(editor.locator('h1')).toHaveText('A quiet morning');
  for (const paragraph of [
    'The letter was folded beside the kettle. Celia left it there.',
    'The gate was closed when Celia came home.',
    'The table was cleared before Celia opened her notebook.',
    'The map was copied for Celia at the library.',
    'The photograph was framed by Celia after the visit.',
    'The room was cleaned before Celia arrived. Mara really wanted to answer, but she waited.',
  ]) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(paragraph);
  }
  const original = await editor.innerHTML();
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('waited');
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Writing statistics', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Writing statistics', exact: true });
  await expect(panel.locator('.stat-item').filter({ hasText: 'Paragraphs' }).locator('.stat-value')).toHaveText('6');
  await expect(panel).not.toContainText('Repeated Words');
  await expect(panel).not.toContainText('Weak Adverbs');
  await expect(panel).toContainText('celia (6)');
  const passive = panel.locator('details').filter({ hasText: 'Possible passive voice' });
  const summary = passive.locator('summary');
  await summary.click();
  await expect(passive).toHaveAttribute('open', '');
  expect(await summary.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(passive.locator('.style-context')).toHaveCount(5);
  await expect(passive.locator('.style-context').first()).toContainText('The letter was folded beside the kettle.');
  const more = passive.getByRole('button', { name: 'Show more possible passive voice' });
  expect(await more.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await more.click();
  await expect(passive.locator('.style-context')).toHaveCount(6);
  await expect(more).toHaveCount(0);
  // Native disclosure remains operable with a keyboard on every profile.
  await summary.press('Enter');
  await expect(passive).not.toHaveAttribute('open');
  const adverbs = panel.locator('details').filter({ hasText: 'Adverbs and intensifiers' });
  await adverbs.locator('summary').click();
  await expect(adverbs.locator('.style-context')).toContainText('Mara really wanted to answer, but she waited.');
  await expect(adverbs.locator('strong')).toHaveText('really');
  for (let theme = 0; theme < 2; theme++) {
    const accessibility = await new AxeBuilder({ page }).include('.writing-stats-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();
  }
  await panel.getByRole('button', { name: 'Close writing statistics' }).click();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('waited');
  await page.keyboard.type('listened');
  await expect(editor).toContainText('but she listened.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', original);
}
