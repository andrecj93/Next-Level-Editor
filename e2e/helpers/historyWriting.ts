import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function exerciseHistoryWriting(page: Page) {
  await page.goto('/?empty=true');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.click();
  await page.keyboard.type('The Cartographer of Quiet Places. Mara had carried the letter home through the rain.');
  for (const sentence of ['The harbor was quiet.', 'She left her coat by the door.', 'The kettle had gone cold.', 'There was still time to answer.']) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(sentence);
  }
  await page.keyboard.press('Enter');
  await page.keyboard.type('She opened the letter again. This time, she knew what to say.');
  const original = await editor.innerHTML();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('say.');
  const open = async () => {
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'History Timeline', exact: true }).click();
  };
  await open();
  const panel = page.getByRole('region', { name: 'History timeline', exact: true });
  const close = panel.getByRole('button', { name: 'Close history' });
  await expect(close).toBeFocused();
  await expect(panel.locator('.timeline-entry.is-current .entry-preview')).toContainText('letter again');
  await expect(panel.locator('.timeline-entry.is-current')).toBeInViewport();
  for (const control of [close, ...await panel.locator('.nav-btn').all()]) {
    await expect(control).toBeInViewport();
    expect(await control.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  const bounds = await panel.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });
  expect(bounds).toBe(true);
  for (let mode = 0; mode < 2; mode++) {
    const colors = await panel.locator('.history-timeline').evaluate(el => ({ actual: getComputedStyle(el).backgroundColor, token: getComputedStyle(el).getPropertyValue('--color-surface').trim() }));
    const rgb = colors.token.replace('#', '').match(/.{2}/g)!.map(value => parseInt(value, 16));
    expect(colors.actual).toBe(`rgb(${rgb.join(', ')})`);
    const accessibility = await new AxeBuilder({ page }).include('.history-timeline-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();
  }
  await close.click();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('say.');
  await page.keyboard.type('write.');
  const revised = await editor.innerHTML();
  await open();
  const back = panel.getByRole('button', { name: 'Go back', exact: true });
  await back.click();
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await expect(back).toBeFocused();
  await panel.getByRole('button', { name: 'Go to latest', exact: true }).click();
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(editor).toBeFocused();
  await page.keyboard.type(' The answer was simple.');
  await expect(editor).toContainText('what to write. The answer was simple.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', revised);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', original);
}
