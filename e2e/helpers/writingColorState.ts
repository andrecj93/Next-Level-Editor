import { expect, test, type Page } from '@playwright/test';

export async function exerciseWritingColorState(page: Page) {
  await page.goto('/?empty=true');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
  await page.locator('.code-editor').fill('<p><span style="color:#dc2626;background-color:#fde047">Red passage.</span></p><p><span style="color:#2563eb">Blue passage.</span></p><p>Plain passage.</p>');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const original = await editor.innerHTML();
  await editor.press('ControlOrMeta+Home');
  await page.getByRole('button', { name: 'More formatting', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Text color', exact: true });
  const highlight = page.getByRole('textbox', { name: 'Highlight color', exact: true });
  const none = page.getByRole('button', { name: 'Remove highlight', exact: true });
  await expect(text).toHaveValue('#dc2626');
  await expect(highlight).toHaveValue('#fde047');
  await expect(none).toHaveAttribute('aria-pressed', 'false');
  await editor.press('ArrowDown');
  await expect(text).toHaveValue('#2563eb');
  await expect(none).toHaveAttribute('aria-pressed', 'true');
  // Plain text follows the current theme rather than the initial picker value.
  await editor.press('ControlOrMeta+End');
  const actualPlain = () => editor.locator('p').last().evaluate(el => {
    const channels = getComputedStyle(el).color.match(/\d+/g)!;
    return '#' + channels.slice(0, 3).map(value => Number(value).toString(16).padStart(2, '0')).join('');
  });
  await expect(text).toHaveValue(await actualPlain());
  const theme = page.getByRole('button', { name: /Switch to (dark|light) mode/ });
  await theme.click();
  await expect.poll(async () => await text.inputValue() === await actualPlain()).toBe(true);
  // Theme/selection changes are observations, never a formatting edit.
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await editor.press('ControlOrMeta+Home');
  await expect(text).toHaveValue('#dc2626');
  await editor.press('Home');
  await editor.press('Shift+End');
  await text.fill('#16a34a');
  const colorState = await editor.evaluate(el => {
    const selection = getSelection();
    return { html: el.innerHTML, selected: selection?.toString(), anchor: selection?.anchorNode?.nodeName, anchorText: selection?.anchorNode?.textContent, offset: selection?.anchorOffset };
  });
  await test.info().attach('applied-writing-color.json', { body: JSON.stringify(colorState), contentType: 'application/json' });
  await expect(text).toHaveValue('#16a34a');
  await expect.poll(() => editor.locator('p').first().evaluate(el => {
    const colors = new Set<string>();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) if (node.textContent) colors.add(getComputedStyle(node.parentElement!).color);
    return [...colors];
  })).toEqual(['rgb(22, 163, 74)']);
  await page.getByRole('button', { name: 'Close more formatting', exact: true }).click();
  await expect(editor).toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
}
