import { expect, type Page } from '@playwright/test';

export async function exerciseCommentsReturn(page: Page, method: 'close' | 'toggle' = 'close', backwards = false) {
  // The compact sidebar covers the footer; its own Close remains available.
  if (method === 'toggle') await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const opener = page.getByRole('button', { name: 'Comments', exact: true });
  await editor.fill('She kept the letter.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('The bus waited.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const before = await editor.innerHTML();
  if (backwards) for (let step = 0; step < 7; step++) await page.keyboard.press('Shift+ArrowLeft');
  await opener.click();
  const panel = page.getByRole('complementary', { name: 'Comments', exact: true });
  const close = panel.getByRole('button', { name: 'Close comments sidebar', exact: true });
  await expect(panel).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  const openTab = panel.getByRole('tab', { name: 'Open 0', exact: true });
  const resolvedTab = panel.getByRole('tab', { name: 'Resolved 0', exact: true });
  await expect(openTab).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(resolvedTab).toBeFocused();
  await expect(resolvedTab).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByRole('tabpanel', { name: 'Resolved 0', exact: true })).toContainText('No resolved comments');
  await page.keyboard.press('Home');
  await expect(openTab).toBeFocused();
  await expect(openTab).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(resolvedTab).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(openTab).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('tabpanel', { name: 'Open 0', exact: true })).toBeFocused();
  if (method === 'toggle') await opener.click();
  else await close.click();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await expect(editor).toBeFocused();
  if (backwards) {
    expect(await editor.evaluate(() => getSelection()?.toString())).toBe('waited.');
    expect(await editor.evaluate(() => getSelection()!.anchorOffset > getSelection()!.focusOffset)).toBe(true);
  }
  // Raw keyboard input detects focus loss; locator typing would conceal it.
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
