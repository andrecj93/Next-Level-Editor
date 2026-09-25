import { expect, type Page } from '@playwright/test';

export async function exerciseRemoveWritingHighlight(page: Page) {
  await page.goto('/?empty=true');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
  await page.locator('.code-editor').fill('<p><em><span style="background-color: #ffff00; color: #000000">Keep this thought.</span></em></p>');
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const before = await editor.innerHTML();
  await editor.press('ControlOrMeta+Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('this');
  await page.getByRole('button', { name: 'More formatting', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Remove highlight', exact: true });
  await expect(remove).toBeInViewport();
  await remove.click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveText('Keep this thought.');
  await expect(editor.locator('em')).toHaveText('Keep this thought.');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('this');
  // Check the actual painted background at each letter, including both sides
  // of the selection. Removing one word must not erase adjacent highlights.
  const backgrounds = await editor.evaluate(root => {
    const result: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      let el = node.parentElement;
      let background = '';
      while (el && el !== root) {
        const color = getComputedStyle(el).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break; }
        el = el.parentElement;
      }
      result.push(...Array.from(node.textContent ?? '', () => background));
    }
    return result;
  });
  expect(backgrounds.slice(0, 5)).toEqual(Array(5).fill('rgb(255, 255, 0)'));
  expect(backgrounds.slice(5, 9)).toEqual(Array(4).fill(''));
  expect(backgrounds.slice(9)).toEqual(Array(9).fill('rgb(255, 255, 0)'));
  const after = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', before);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', after);
  await page.getByRole('button', { name: 'Close more formatting', exact: true }).click();
  await page.keyboard.type('that');
  await expect(editor).toHaveText('Keep that thought.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', after);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toHaveJSProperty('innerHTML', after);
  // Turn highlighting off while writing in the middle of an existing run.
  await editor.press('ControlOrMeta+Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'More formatting', exact: true }).click();
  await remove.click();
  await page.getByRole('button', { name: 'Close more formatting', exact: true }).click();
  await page.keyboard.type('X');
  await expect(editor).toHaveText('KeXep this thought.');
  await expect(editor.locator('em')).toHaveText('KeXep this thought.');
  const painted = await editor.locator('span[style*="background-color"]').allTextContents();
  expect(painted.join('')).toBe('Keep  thought.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('Keep this thought.');
}
