import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const editorFor = (page: Page) => page.getByRole('textbox', { name: 'Rich text editor', exact: true });
const toolbarFor = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting toolbar', exact: true });
const activate = async (locator: Locator, touch: boolean) => touch ? locator.tap() : locator.click();
const settle = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
  .map(animation => animation.finished.catch(() => undefined))));

async function noHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(size.content, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
}

async function insideViewport(locator: Locator) {
  const geometry = await locator.evaluate(el => {
    const box = el.getBoundingClientRect();
    const viewport = window.visualViewport;
    return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight, top: viewport?.offsetTop ?? 0, left: viewport?.offsetLeft ?? 0 };
  });
  expect(geometry.x, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.left - 1);
  expect(geometry.y, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.top - 1);
  expect(geometry.right, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width + geometry.left + 1);
  expect(geometry.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.height + geometry.top + 1);
}

async function switchView(page: Page, mode: string) {
  await toolbarFor(page).getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: `${mode} view`, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?empty=true');
  await expect(editorFor(page)).toBeVisible();
  // Assert every scenario's uncaught runtime errors at the end of its test.
  test.info().annotations.push({ type: 'device-profile', description: JSON.stringify(test.info().project.use) });
  (page as Page & { deviceErrors?: string[] }).deviceErrors = errors;
});

test.afterEach(async ({ page }, info) => {
  expect((page as Page & { deviceErrors?: string[] }).deviceErrors).toEqual([]);
  if (info.status === info.expectedStatus) await info.attach('device-state', { body: await page.screenshot(), contentType: 'image/png' });
});

test('write, format, revise, undo and recover without losing prose', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  await activate(editor, hasTouch);
  await page.keyboard.type('A map of the ordinary');
  await toolbarFor(page).getByRole('button', { name: 'Format', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Heading 1', exact: true }).click();
  await expect(editor.locator('h1'), await editor.innerHTML()).toHaveText('A map of the ordinary');
  await editor.press('End');
  await editor.press('Enter');
  await page.keyboard.type('She returned in order to find the the house.');
  await expect(editor.locator('h1'), await editor.innerHTML()).toHaveText('A map of the ordinary');
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  if (!(await companion.isVisible())) await activate(page.getByRole('button', { name: 'Writing companion', exact: true }), hasTouch);
  await companion.getByRole('button', { name: 'Use “the”', exact: true }).click();
  await expect(editor).toContainText('find the house');
  await companion.getByRole('button', { name: 'Close writing companion' }).click();
  await toolbarFor(page).getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('find the the house');
  await expect(editor.locator('h1')).toHaveText('A map of the ordinary');
  await activate(page.getByRole('button', { name: 'Writing companion', exact: true }), hasTouch);
  await companion.getByRole('button', { name: 'Use “the”', exact: true }).click();
  await companion.getByRole('button', { name: 'Use “to”', exact: true }).click();
  await expect(editor).toContainText('She returned to find the house.');
  await companion.getByRole('button', { name: 'Close writing companion' }).click();
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  await expect(editor).toContainText('She returned to find the house.');
  await expect(editor.locator('h1')).toHaveText('A map of the ordinary');
  await noHorizontalOverflow(page);
});

test('formatting, links, search and download remain usable', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  await editor.fill('A sentence worth keeping.');
  await editor.press('ControlOrMeta+A');
  await activate(toolbarFor(page).getByRole('button', { name: 'More formatting', exact: true }), hasTouch);
  const formatting = page.getByRole('group', { name: 'More formatting options' });
  await formatting.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(editor.locator('b,strong')).toHaveText('A sentence worth keeping.');
  await formatting.getByRole('button', { name: 'Close more formatting', exact: true }).click();
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Link', exact: true }).click();
  await page.locator('#link-url').fill('https://example.com/reading');
  await page.locator('#link-text').fill('Reading room');
  await page.getByRole('button', { name: 'Insert link', exact: true }).click();
  await expect(editor.locator('a')).toHaveText('Reading room');
  await toolbarFor(page).getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Find & Replace', exact: true }).click();
  const find = page.getByRole('dialog', { name: 'Find & Replace' });
  await expect(find).toBeVisible();
  await settle(page);
  await insideViewport(find);
  await find.press('Escape');
  await toolbarFor(page).getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPending = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'HTML', exact: true }).click();
  const download = await downloadPending;
  expect(await download.failure()).toBeNull();
  expect(await readFile((await download.path())!, 'utf8')).toContain('Reading room');
  await noHorizontalOverflow(page);
});

test('direct formatting preserves the selection through touch, undo and link insertion', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  const sentence = 'This paragraph belongs to its writer.';
  await editor.fill(sentence);
  await editor.press('ControlOrMeta+A');
  const dock = page.getByRole('group', { name: 'Quick formatting', exact: true });
  const style = page.getByRole('group', { name: 'More formatting options', exact: true });
  // Wide touch layouts use the full toolbar; phones and narrow tablets use the dock.
  const useDock = hasTouch && page.viewportSize()!.width < 900;
  if (useDock) await expect(dock).toBeVisible();
  else await activate(toolbarFor(page).getByRole('button', { name: 'More formatting', exact: true }), hasTouch);
  const controls = useDock ? dock : style;
  for (const [label, selector] of [['Bold', 'b,strong'], ['Italic', 'i,em'], ['Underline', 'u']]) {
    await activate(controls.getByRole('button', { name: label, exact: true }), hasTouch);
    await expect(editor.locator(selector)).toHaveText(sentence);
    const selection = await editor.evaluate(el => {
      const selected = window.getSelection();
      return { text: selected?.toString(), collapsed: selected?.isCollapsed, focus: document.activeElement?.className, html: el.innerHTML };
    });
    expect(selection.text, `${label}: ${JSON.stringify(selection)}`).toBe(sentence);
  }
  if (useDock) await dock.getByRole('button', { name: 'Undo', exact: true }).tap();
  else {
    await style.getByRole('button', { name: 'Close more formatting', exact: true }).click();
    await toolbarFor(page).getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Undo', exact: true }).click();
  }
  await expect(editor.locator('u')).toHaveCount(0);
  await expect(editor.locator('b,strong')).toHaveText(sentence);
  await expect(editor.locator('i,em')).toHaveText(sentence);
  await editor.press('ControlOrMeta+A');
  if (useDock) await dock.getByRole('button', { name: 'Link', exact: true }).tap();
  else {
    await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Link', exact: true }).click();
  }
  await expect(page.locator('#link-text')).toHaveValue(sentence);
  await expect(page.locator('#link-text')).toHaveAttribute('readonly', '');
  await settle(page);
  await insideViewport(page.getByRole('dialog', { name: 'Insert link', exact: true }));
  await insideViewport(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.locator('#link-url').fill('https://example.com/story');
  await page.getByRole('button', { name: 'Insert link', exact: true }).click();
  await expect(editor.locator('a')).toHaveText(sentence);
  await expect(editor.locator('a')).toHaveAttribute('href', 'https://example.com/story');
  await expect(editor).toHaveText(sentence);
  await expect(editor.locator('b,strong')).toHaveText(sentence);
  await expect(editor.locator('i,em')).toHaveText(sentence);
  // A caret inside the same link should edit it, preserving the inline marks.
  await editor.press('Home');
  await editor.press('ArrowRight');
  if (useDock) await dock.getByRole('button', { name: 'Link', exact: true }).tap();
  else {
    await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Link', exact: true }).click();
  }
  await expect(page.getByRole('dialog', { name: 'Edit link', exact: true })).toBeVisible();
  await settle(page);
  await insideViewport(page.getByRole('dialog', { name: 'Edit link', exact: true }));
  await expect(page.locator('#link-url')).toHaveValue('https://example.com/story');
  await page.locator('#link-url').fill('https://example.com/revised-story');
  await page.getByRole('button', { name: 'Save link', exact: true }).click();
  await expect(editor.locator('a')).toHaveCount(1);
  await expect(editor.locator('a')).toHaveAttribute('href', 'https://example.com/revised-story');
  await expect(editor.locator('b,strong')).toHaveText(sentence);
  await expect(editor.locator('i,em')).toHaveText(sentence);
});

test('menus and insert dialogs fit the available screen', async ({ page }) => {
  for (const name of ['Format', 'Insert', 'Tools', 'View', 'Export']) {
    const trigger = toolbarFor(page).getByRole('button', { name, exact: true });
    await trigger.click();
    const menu = page.locator('.dropdown-menu:visible').first();
    await expect(menu).toBeVisible();
    await settle(page);
    await insideViewport(menu);
    await menu.press('Escape');
  }
  for (const item of ['Link', 'Image', 'Table', 'Code Block', 'Video', 'File Manager']) {
    await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).click();
    await page.getByRole('menuitem', { name: item, exact: true }).click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await settle(page);
    await insideViewport(dialog);
    await dialog.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
});

test('notes, chapter navigation and the caret retain usable space', async ({ page, hasTouch }) => {
  await switchView(page, 'Code');
  await page.locator('.code-editor').fill('<h1>A quiet town</h1><h2>Arrival</h2><p>The the house was quiet.</p>' + '<p>She wrote another paragraph beside the open window.</p>'.repeat(25) + '<h2>Departure</h2><p>A new beginning.</p>');
  await switchView(page, 'Editor');
  const editor = editorFor(page);
  await activate(editor, hasTouch);
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' Still here.');
  const size = await editor.boundingBox();
  expect(size!.height, 'at least three lines of manuscript remain available').toBeGreaterThanOrEqual(96);
  await noHorizontalOverflow(page);
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  if (!(await companion.isVisible())) await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
  await companion.getByRole('button', { name: 'Outline', exact: true }).click();
  await companion.getByRole('button', { name: 'Arrival', exact: true }).click();
  await expect(editor.locator('h2').first()).toBeInViewport();
  await companion.getByRole('button', { name: 'Close writing companion' }).click();
  await expect(page.getByRole('button', { name: 'Writing companion', exact: true })).toBeFocused();
  await editor.click();
  await editor.press('ControlOrMeta+End');
  const caret = await editor.evaluate(el => {
    const range = document.getSelection()?.getRangeAt(0);
    const r = range?.getBoundingClientRect();
    const dock = document.querySelector('.mobile-toolbar')?.getBoundingClientRect();
    const root = el.getBoundingClientRect();
    return { caretTop: r?.top ?? -1, caretBottom: r?.bottom ?? -1, rootTop: root.top, rootBottom: root.bottom, dockTop: dock?.top ?? innerHeight, screenBottom: innerHeight };
  });
  expect(caret.caretTop, JSON.stringify(caret)).toBeGreaterThanOrEqual(Math.max(0, caret.rootTop) - 1);
  expect(caret.caretBottom, JSON.stringify(caret)).toBeLessThanOrEqual(Math.min(caret.rootBottom, caret.dockTop, caret.screenBottom) + 1);
});

test('source, preview, mixed scripts and structured content preserve the document', async ({ page }) => {
  const text = 'Português: Olá. 日本語: 物語。 العربية: بداية جديدة.';
  await switchView(page, 'Code');
  await page.locator('.code-editor').fill(`<h1>Across the world</h1><p>${text}</p><p>${'longword'.repeat(40)}</p><table><tbody><tr>${'<td>A table cell</td>'.repeat(8)}</tr></tbody></table>`);
  for (const view of ['Preview', 'Split', 'Editor']) {
    await switchView(page, view);
    await noHorizontalOverflow(page);
  }
  await expect(editorFor(page)).toContainText(text);
  await expect(editorFor(page).locator('td')).toHaveCount(8);
  await editorFor(page).press('ControlOrMeta+End');
  await editorFor(page).press('Enter');
  await page.keyboard.insertText(' A final sentence.');
  await expect(editorFor(page)).toContainText('A final sentence.');
});

test('light and dark interfaces remain accessible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await editorFor(page).fill('A quiet opening paragraph.');
  for (const dark of [false, true]) {
    if (dark) {
      await toolbarFor(page).getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Dark appearance', exact: true }).click();
    }
    await settle(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
    await noHorizontalOverflow(page);
  }
});

test('resizing and keyboard navigation preserve the draft and open menus', async ({ page, viewport }) => {
  const editor = editorFor(page);
  await editor.fill('The window changes. The story stays.');
  for (const size of [{ width: 640, height: 360 }, { width: 320, height: 640 }, viewport!]) {
    await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).click();
    await page.setViewportSize(size);
    await settle(page);
    const menu = page.getByRole('menu', { name: 'Insert', exact: true });
    await expect(menu).toBeVisible();
    await insideViewport(menu);
    if (size.height >= 600) {
      await expect.poll(async () => {
        const trigger = await toolbarFor(page).getByRole('button', { name: 'Insert', exact: true }).boundingBox();
        const box = await menu.boundingBox();
        return Math.abs(box!.y - trigger!.y - trigger!.height - 4);
      }, { message: 'the menu returns to its trigger when vertical space is restored' }).toBeLessThanOrEqual(1);
    }
    await menu.press('Escape');
    await expect(editor).toHaveText('The window changes. The story stays.');
    await noHorizontalOverflow(page);
  }
  await editor.press('Alt+F10');
  await expect(toolbarFor(page)).toContainText('Insert');
  expect(await toolbarFor(page).evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('ArrowRight');
  expect(await toolbarFor(page).evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' Keep writing.');
  await expect(editor).toHaveText('The window changes. The story stays. Keep writing.');
});

test('configuration stays above the toolbar and returns focus without losing work', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  await editor.fill('Keep this paragraph while changing settings.');
  const configure = page.getByRole('button', { name: 'Configure', exact: true });
  await activate(configure, hasTouch);
  const settings = page.locator('#playground-settings');
  await expect(settings).toBeVisible();
  await settle(page);
  await insideViewport(settings);
  await expect(settings.getByLabel('Template', { exact: true })).toBeVisible();
  // Opening the picker used to hit the writing toolbar layered over it.
  await settings.getByLabel('Template', { exact: true }).click({ trial: true });
  const readonly = settings.getByRole('checkbox', { name: /^Read-only/ });
  await activate(settings.getByText('Read-only', { exact: true }), hasTouch);
  await expect(readonly).toBeChecked();
  await readonly.press('Escape');
  await expect(settings).not.toBeVisible();
  await expect(configure).toBeFocused();
  await expect(editor).toHaveAttribute('aria-readonly', 'true');
  await activate(configure, hasTouch);
  await activate(settings.getByText('Read-only', { exact: true }), hasTouch);
  await expect(readonly).not.toBeChecked();
  await settings.getByRole('button', { name: 'Close configuration', exact: true }).click();
  await expect(configure).toBeFocused();
  await expect(editor).toHaveAttribute('aria-readonly', 'false');
  await expect(editor).toHaveText('Keep this paragraph while changing settings.');
  await noHorizontalOverflow(page);
});
