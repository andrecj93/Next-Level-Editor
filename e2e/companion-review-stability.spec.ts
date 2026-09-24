import { test, expect } from '@playwright/test';

for (const change of ['earlier note', 'earlier paragraph'] as const) {
  test(`review keeps its passage and focus after an ${change} is added`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    // The race requires simultaneous manuscript and note access. Compact
    // return-to-writing behavior is covered separately on device profiles.
    await page.setViewportSize({ width: 1200, height: 850 });
    await page.goto('/#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    const hasDraft = Boolean((await editor.innerText()).trim());
    await page.getByRole('button', { name: 'New document', exact: true }).click();
    if (hasDraft) await page.getByRole('button', { name: 'Replace document', exact: true }).click();
    await expect(editor).toBeEmpty();
    await editor.click();
    for (let index = 0; index < 3; index++) {
      if (index) await page.keyboard.press('Enter');
      await page.keyboard.type(`She returned in order to find house ${index}.`);
    }
    await editor.press('ControlOrMeta+Home');
    const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
    if (await opener.getAttribute('aria-expanded') !== 'true') await opener.click();
    const panel = page.getByRole('complementary', { name: 'Writing companion', exact: true });
    await expect(panel.locator('.note-pagination')).toContainText('1 of 3');
    await panel.getByRole('button', { name: 'Next note', exact: true }).click();
    const passage = panel.locator('.note-passage');
    await expect(passage).toContainText('house 1');
    await page.clock.pauseAt(new Date('2026-01-01T13:00:00Z'));
    await editor.press('ControlOrMeta+Home');
    if (change === 'earlier paragraph') {
      await page.keyboard.press('Enter');
      await page.keyboard.press('ControlOrMeta+Home');
      await page.keyboard.type('A new beginning.');
    } else await page.keyboard.type('The the visitor arrived. ');
    await panel.getByRole('button', { name: 'Writing notes 3', exact: true }).click();
    await page.keyboard.press('Tab'); // Outline
    await page.keyboard.press('Tab'); // Passage
    await expect(passage).toBeFocused();
    await page.clock.runFor(700);
    await expect(panel.locator('.note-pagination')).toContainText(change === 'earlier note' ? '3 of 4' : '2 of 3');
    await expect(passage).toContainText('house 1');
    await expect(passage).toBeFocused();
    // Use the retained note and prove it still targets the same paragraph.
    const before = await editor.innerHTML();
    await panel.getByRole('button', { name: 'Use “to”', exact: true }).click();
    await expect(editor).toContainText('She returned to find house 1.');
    await expect(editor).toContainText('She returned in order to find house 0.');
    await expect(editor).toContainText('She returned in order to find house 2.');
    await expect(editor).toBeFocused();
    const changed = await editor.innerHTML();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(editor).toHaveJSProperty('innerHTML', changed);
    await page.clock.resume();
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
    await page.reload();
    await expect(editor).toHaveJSProperty('innerHTML', changed);
  });
}
