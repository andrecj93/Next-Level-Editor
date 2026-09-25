import { expect, type Page } from '@playwright/test';

export async function exerciseCompanionViewMemory(page: Page) {
  await page.goto('/?empty=true');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
  await page.locator('.code-editor').fill('<h1>My book</h1><h2>First chapter</h2><p>She returned in order to find the house.</p><h2>Second chapter</h2><p>The road was quiet.</p>');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
  if (await opener.getAttribute('aria-expanded') !== 'true') await opener.click();
  const panel = page.getByRole('complementary', { name: 'Writing companion' });
  await panel.getByRole('button', { name: 'Outline', exact: true }).click();
  const layout = await panel.evaluate(el => ({
    fixed: getComputedStyle(el).position === 'fixed',
    stacked: getComputedStyle(el.parentElement!).flexDirection === 'column',
  }));
  const oldHeight = await editor.evaluate(el => el.clientHeight);
  await panel.getByRole('button', { name: 'Second chapter', exact: true }).click();
  await expect(editor).toBeFocused();
  // Both overlays and stacked outlines must return space to the manuscript.
  // Do not close a still-visible compact panel in the test: that masked the bug.
  if (layout.fixed || layout.stacked) {
    await expect(panel).toHaveCount(0);
    if (layout.stacked && !layout.fixed) {
      await expect.poll(() => editor.evaluate(el => el.clientHeight)).toBeGreaterThan(oldHeight + 20);
    }
  } else {
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Close writing companion', exact: true }).click();
  }
  await opener.click();
  await expect(panel.getByRole('button', { name: 'Outline', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Outline', exact: true })).toBeFocused();
  await expect(panel.getByRole('navigation', { name: 'Document outline' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();
  await page.keyboard.press('End');
  const before = await editor.innerHTML();
  await page.keyboard.type(' revised');
  await expect(editor.locator('h2').last()).toHaveText('Second chapter revised');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await opener.click();
  await panel.getByRole('button', { name: /Writing notes/ }).click();
  await panel.getByRole('button', { name: 'Close writing companion', exact: true }).click();
  await opener.click();
  await expect(panel.getByRole('button', { name: /Writing notes/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: /Writing notes/ })).toBeFocused();
  await expect(panel.getByRole('navigation', { name: 'Document outline' })).toHaveCount(0);
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await panel.getByRole('button', { name: /^Show passage in/ }).click();
  if (layout.fixed || layout.stacked) await expect(panel).toHaveCount(0);
  else await expect(panel).toBeVisible();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('in order to');
  await page.keyboard.type('to');
  await expect(editor).toContainText('She returned to find the house.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', before);
}
