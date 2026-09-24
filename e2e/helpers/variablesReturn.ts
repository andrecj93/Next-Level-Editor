import { expect, type Page } from '@playwright/test';

export async function exerciseVariablesReturn(page: Page, method: 'close' | 'escape' | 'toggle' = 'close', backwards = false) {
  if (method === 'toggle') await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const opener = page.getByRole('button', { name: 'Variables', exact: true });
  await editor.fill('She kept the letter.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('The bus waited.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const before = await editor.innerHTML();
  if (backwards) for (let step = 0; step < 7; step++) await page.keyboard.press('Shift+ArrowLeft');
  await opener.click();
  const panel = page.getByRole('region', { name: 'Template variables' });
  const close = panel.getByRole('button', { name: 'Close variables panel', exact: true });
  await expect(panel).toBeVisible();
  await expect(close).toBeFocused();
  await expect(async () => {
    const box = await panel.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  }).toPass();
  if (method === 'escape') await page.keyboard.press('Escape');
  else if (method === 'toggle') await opener.click();
  else await close.click();
  await expect(panel).not.toBeVisible();
  await expect(editor).toBeFocused();
  if (backwards) {
    expect(await editor.evaluate(() => getSelection()?.toString())).toBe('waited.');
    expect(await editor.evaluate(() => getSelection()!.anchorOffset > getSelection()!.focusOffset)).toBe(true);
  }
  // A locator typing action would hide lost focus by refocusing the page.
  await page.keyboard.type(backwards ? 'left.' : ' Then she smiled.');
  await expect(editor.locator('p').last()).toHaveText(backwards ? 'The bus left.' : 'The bus waited. Then she smiled.');
  const changed = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', changed);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', changed);
}
