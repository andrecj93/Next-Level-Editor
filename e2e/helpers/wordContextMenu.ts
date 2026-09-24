import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function rightClickLetter(page: Page, offset: number, length = 1) {
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.press('ControlOrMeta+Home');
  const point = await editor.evaluate((root, at) => {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && !node.textContent) node = walker.nextNode();
    const range = root.ownerDocument.createRange();
    range.setStart(node!, at.offset);
    range.setEnd(node!, at.offset + at.length);
    const rect = range.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const hit = (document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    }).caretPositionFromPoint?.(x, y);
    const Segmenter = Reflect.get(Intl, 'Segmenter');
    const words = Segmenter ? Array.from(new Segmenter(undefined, { granularity: 'word' }).segment(node?.textContent ?? '')) : [];
    return { x, y, text: node?.textContent, width: rect.width, hitText: hit?.offsetNode.textContent, hitType: hit?.offsetNode.nodeType, hitOffset: hit?.offset, words };
  }, { offset, length });
  await test.info().attach('word-pointer-hit', { body: JSON.stringify(point), contentType: 'application/json' });
  await page.mouse.click(point.x, point.y, { button: 'right' });
}

export async function exerciseWordContextMenu(page: Page, dark = false) {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const hasDraft = Boolean((await editor.textContent())?.trim());
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  if (hasDraft) await page.getByRole('button', { name: 'Replace document', exact: true }).click();
  await expect(editor).toBeEmpty();
  if (dark) {
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Dark appearance', exact: true }).click();
  }
  await editor.click();
  await page.keyboard.type('Café, ação e silêncio.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('A tarde estava tranquila.');
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const original = await editor.innerHTML();
  await rightClickLetter(page, 3);
  const menu = page.getByRole('menu', { name: 'Context menu', exact: true });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('opacity', '1');
  expect((await new AxeBuilder({ page }).include('.context-menu').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('Café');
  await expect(menu.getByRole('menuitem', { name: /Copy/ })).toBeEnabled();
  await menu.getByRole('menuitem', { name: /Bold/ }).click();
  await expect(editor.locator('strong')).toHaveText('Café');
  await expect(editor.locator('p')).toHaveText(['Café, ação e silêncio.', 'A tarde estava tranquila.']);
  const formatted = await editor.innerHTML();
  await editor.evaluate(root => {
    root.setAttribute('data-test-composed-typing', 'false');
    root.addEventListener('compositionend', () => root.setAttribute('data-test-composed-typing', 'true'), { once: true });
  });
  await page.keyboard.type('Chá');
  await expect(editor.locator('p')).toHaveText(['Chá, ação e silêncio.', 'A tarde estava tranquila.']);
  const replaced = await editor.innerHTML();
  const composed = await editor.getAttribute('data-test-composed-typing') === 'true';
  await page.keyboard.press('ControlOrMeta+z');
  // Firefox sends á as a committed composition. Native textarea comparison
  // confirms that Undo first rejects that composition, leaving the typed Ch.
  if (composed) {
    await expect(editor.locator('strong')).toHaveText('Ch');
    await page.keyboard.press('ControlOrMeta+z');
  }
  await expect(editor).toHaveJSProperty('innerHTML', formatted);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', formatted);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  if (composed) {
    await expect(editor.locator('strong')).toHaveText('Ch');
    await page.keyboard.press('ControlOrMeta+Shift+z');
  }
  await expect(editor).toHaveJSProperty('innerHTML', replaced);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  await page.reload();
  await expect(editor).toHaveJSProperty('innerHTML', replaced);
}
