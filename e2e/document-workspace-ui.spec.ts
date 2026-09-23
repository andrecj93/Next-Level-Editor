import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/?lab=documents');
  await expect(page.getByRole('textbox', { name: 'Rich text editor', exact: true })).toContainText('A better document');
});

test('workspace settings disclose without losing the draft and return keyboard focus', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const before = await editor.textContent();
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await expect(page.getByLabel('Document language', { exact: true })).toBeHidden();
  await settings.click();
  await page.getByLabel('Document language', { exact: true }).fill('pt-PT');
  await page.getByLabel('Direction', { exact: true }).selectOption('rtl');
  await page.getByLabel('Direction', { exact: true }).press('Escape');
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await expect(editor).toContainText('A better document');
  await settings.click();
  await page.getByLabel('Document language', { exact: true }).fill('en');
  await page.getByLabel('Direction', { exact: true }).selectOption('auto');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(editor).toHaveText(before!);
});

test('document inspector opens a valid tab, supports arrow navigation and remembers the last tool', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Document tools', exact: true });
  await trigger.click();
  const first = page.getByRole('tab', { name: 'Versions', exact: true });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('No saved versions yet.', { exact: true })).toBeVisible();
  const vertical = await page.getByRole('tablist', { name: 'Document tools' }).getAttribute('aria-orientation') === 'vertical';
  await first.focus();
  await first.press(vertical ? 'ArrowDown' : 'ArrowRight');
  const word = page.getByRole('tab', { name: 'Import Word', exact: true });
  await expect(word).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Import Word' })).toBeVisible();
  await word.press('End');
  const last = page.getByRole('tab', { name: 'Collaboration', exact: true });
  await expect(last).toBeFocused();
  await last.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await expect(last).toBeInViewport();
  await last.focus();
  await last.press('Home');
  await expect(first).toBeFocused();
});

test('document workspace reflows and keeps writing space with the inspector open', async ({ page }, info) => {
  const trigger = page.getByRole('button', { name: 'Document tools', exact: true });
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(size);
    await trigger.click();
    await expect(page.getByLabel('Checkpoint name', { exact: true })).toBeVisible();
    await expect.poll(() => editor.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(120);
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector('.document-tools-panel')!.getBoundingClientRect();
      const writing = document.querySelector('[data-testid="primary"] [contenteditable]')!.getBoundingClientRect();
      return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, panelLeft: panel.left, writingRight: writing.right };
    });
    expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
    if (size.width >= 1100) expect(geometry.writingRight).toBeLessThanOrEqual(geometry.panelLeft + 1);
    if (size.width === 390 || size.width === 1280) {
      await info.attach(`workspace-${size.width}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    }
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
});

test('workspace and inspector remain accessible in light and dark themes', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const root = page.getByTestId('primary');
  const trigger = root.getByRole('button', { name: 'Document tools', exact: true });
  for (const theme of ['light', 'dark']) {
    const editorRoot = root.locator('.next-level-editor');
    if (!await editorRoot.evaluate((element, value) => element.classList.contains(`theme-${value}`), theme)) {
      const toggle = root.getByRole('button', { name: 'Toggle dark/light theme', exact: true });
      await expect(toggle).toBeVisible();
      await toggle.click();
    }
    await expect(editorRoot).toHaveClass(new RegExp(`theme-${theme}`));
    await expect(editorRoot).toHaveCSS('background-color', theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await expect(page.locator('.document-lab')).toHaveCSS('color-scheme', theme);
    await trigger.click();
    const result = await new AxeBuilder({ page }).include('.document-lab').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    await info.attach(`workspace-${theme}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await root.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await trigger.click();
  await page.emulateMedia({ media: 'print' });
  await expect(root.locator('.nle-document-tools')).toBeHidden();
  await expect(root.locator('.next-level-editor')).toHaveCSS('padding-right', '0px');
  await page.emulateMedia({ media: 'screen' });
});
