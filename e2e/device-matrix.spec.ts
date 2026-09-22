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
  const size = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const content = document.documentElement.scrollWidth;
    const overflow = content > width + 1 ? [...document.querySelectorAll('body *')]
      .map(el => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ el, box }) => box.right > width + 1 && getComputedStyle(el).visibility !== 'hidden'
        && !el.closest('[inert], [aria-hidden="true"]'))
      .slice(0, 12)
      .map(({ el, box }) => ({ tag: el.tagName, class: el.className, left: box.left, right: box.right, width: box.width })) : [];
    return { width, content, viewport: window.visualViewport?.width, scale: window.visualViewport?.scale, overflow };
  });
  expect(size.content, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
}

async function insideViewport(locator: Locator) {
  // WebKit delivers visualViewport resize after the protocol resize resolves.
  // Wait for the actual bounded geometry, including Vue's next-tick clamp.
  await expect(async () => {
    const geometry = await locator.evaluate(el => {
      const box = el.getBoundingClientRect();
      const viewport = window.visualViewport;
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight, top: viewport?.offsetTop ?? 0, left: viewport?.offsetLeft ?? 0 };
    });
    expect(geometry.x, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.left - 1);
    expect(geometry.y, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.top - 1);
    expect(geometry.right, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width + geometry.left + 1);
    expect(geometry.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.height + geometry.top + 1);
  }).toPass({ timeout: 2000, intervals: [50, 100, 250] });
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

test('PDF progress and cancellation stay reachable without losing the draft', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  const closeMobile = page.getByRole('button', { name: 'Close toolbar', exact: true });
  if (await closeMobile.isVisible()) await activate(closeMobile, hasTouch);
  await switchView(page, 'Code');
  const paragraph = 'The writer stopped at the harbor and opened her notebook. She had a whole chapter left to tell, and the quiet room gave her time to find the words.';
  await page.locator('.code-editor').fill(`<h1>A chapter in progress</h1>${`<p>${paragraph}</p>`.repeat(200)}`);
  await switchView(page, 'Editor');
  const before = await editor.innerHTML();
  await activate(toolbarFor(page).getByRole('button', { name: 'Export', exact: true }), hasTouch);
  await activate(page.getByRole('menuitem', { name: 'PDF', exact: true }), hasTouch);
  const progress = page.getByRole('group', { name: 'PDF export progress' });
  await expect(progress).toBeVisible();
  const cancel = progress.getByRole('button', { name: 'Cancel PDF export' });
  await cancel.scrollIntoViewIfNeeded();
  await insideViewport(cancel);
  await noHorizontalOverflow(page);
  await test.info().attach('pdf-progress', { body: await page.screenshot(), contentType: 'image/png' });
  await activate(cancel, hasTouch);
  await expect(progress).toHaveCount(0);
  await expect(editor).toBeFocused();
  await expect(page.locator('div[style*="-9999px"]')).toHaveCount(0);
  expect(await editor.innerHTML()).toBe(before);
  expect(downloads).toEqual([]);
});

test('write, format, revise, undo and recover without losing prose', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  await activate(editor, hasTouch);
  await page.keyboard.type('A map of the ordinary');
  const insert = toolbarFor(page).getByRole('button', { name: 'Insert', exact: true });
  const insertBefore = await insert.boundingBox();
  const toolbarBefore = await toolbarFor(page).evaluate(el => [...el.querySelectorAll('.writing-toolbar-row > *')].map(child => ({ class: child.className, width: child.getBoundingClientRect().width, x: child.getBoundingClientRect().x })));
  await toolbarFor(page).getByRole('button', { name: 'Format', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Heading 1', exact: true }).click();
  await expect(editor.locator('h1'), await editor.innerHTML()).toHaveText('A map of the ordinary');
  const toolbarAfter = await toolbarFor(page).evaluate(el => [...el.querySelectorAll('.writing-toolbar-row > *')].map(child => ({ class: child.className, width: child.getBoundingClientRect().width, x: child.getBoundingClientRect().x })));
  expect(Math.abs((await insert.boundingBox())!.x - insertBefore!.x), `format changes do not move the next toolbar control: ${JSON.stringify({toolbarBefore, toolbarAfter})}`).toBeLessThanOrEqual(1);
  await editor.press('End');
  await editor.press('Enter');
  await page.keyboard.type('She returned in order to find the the house.');
  expect(Math.abs((await insert.boundingBox())!.x - insertBefore!.x), 'returning to a paragraph keeps the toolbar still').toBeLessThanOrEqual(1);
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

test('a blank manuscript stays spacious and offers notes without moving the page', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
  await expect(companion).not.toBeVisible();
  const before = await editor.boundingBox();
  const width = page.viewportSize()!.width;
  if (width <= 700) {
    const toolbar = await toolbarFor(page).boundingBox();
    expect(toolbar!.height, 'mobile tools leave room for the manuscript').toBeLessThanOrEqual(width > 350 ? 52 : 96);
  }
  await activate(editor, hasTouch);
  await page.keyboard.type('She returned in order to find the house.');
  await expect(opener).toHaveAttribute('aria-description', '1 writing note ready to review');
  await expect(companion).not.toBeVisible();
  const after = await editor.boundingBox();
  expect(after!.x).toBe(before!.x);
  expect(after!.width).toBe(before!.width);
  await activate(opener, hasTouch);
  await expect(companion.getByRole('button', { name: 'Use “to”', exact: true })).toBeVisible();
  await activate(companion.getByRole('button', { name: 'Dismiss note: A little more direct', exact: true }), hasTouch);
  await expect(opener).not.toHaveAttribute('aria-description');
  await expect(editor).toHaveText('She returned in order to find the house.');
  await noHorizontalOverflow(page);
});

test('dismissing writing notes keeps keyboard focus and leaves the manuscript intact', async ({ page }) => {
  const editor = editorFor(page);
  await editor.fill('She returned in order to find the the house.');
  const before = await editor.innerHTML();
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  if (!(await companion.isVisible())) await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
  await companion.getByRole('button', { name: 'Dismiss note: An accidental echo?', exact: true }).press('Enter');
  await expect(companion.getByRole('button', { name: 'Show passage: in order to', exact: true })).toBeFocused();
  await companion.getByRole('button', { name: 'Dismiss note: A little more direct', exact: true }).press('Enter');
  await expect(companion.getByRole('button', { name: 'Writing notes', exact: true })).toBeFocused();
  await expect(companion).toContainText('You’ve considered every note. Keep your voice.');
  expect(await editor.innerHTML()).toBe(before);
  await companion.getByRole('button', { name: 'Writing notes', exact: true }).press('Escape');
  await expect(page.getByRole('button', { name: 'Writing companion', exact: true })).toBeFocused();
});

test('kept writing notes survive closing the panel and edits elsewhere in the book', async ({ page, hasTouch }) => {
  const draft = '<h2>Arrival</h2><p>She returned in order to find the house.</p>';
  await switchView(page, 'Code');
  await page.locator('.code-editor').fill(draft);
  await switchView(page, 'Editor');
  const companion = page.getByRole('complementary', { name: 'Writing companion' });
  const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
  if (!(await companion.isVisible())) await activate(opener, hasTouch);
  const before = await editorFor(page).innerHTML();
  await activate(companion.getByRole('button', { name: 'Dismiss note: A little more direct', exact: true }), hasTouch);
  await activate(companion.getByRole('button', { name: 'Close writing companion' }), hasTouch);
  await activate(opener, hasTouch);
  await expect(companion).toContainText('You’ve considered every note. Keep your voice.');
  expect(await editorFor(page).innerHTML()).toBe(before);
  await activate(companion.getByRole('button', { name: 'Close writing companion' }), hasTouch);
  await switchView(page, 'Code');
  const prefix = '<p>The the harbor was quiet.</p>';
  await page.locator('.code-editor').fill(prefix + draft);
  await switchView(page, 'Editor');
  await activate(opener, hasTouch);
  // The new note proves the debounced review has caught up with this edit.
  await expect(companion.getByRole('button', { name: 'Use “The”', exact: true })).toBeVisible();
  await expect(companion.getByRole('button', { name: 'Use “to”', exact: true })).toHaveCount(0);
  await activate(companion.getByRole('button', { name: 'Close writing companion' }), hasTouch);
  await switchView(page, 'Code');
  await page.locator('.code-editor').fill(prefix + draft.replace('find the house', 'see the house'));
  await switchView(page, 'Editor');
  await activate(opener, hasTouch);
  await expect(companion.getByRole('button', { name: 'Use “to”', exact: true })).toBeVisible();
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
  await expect(toolbarFor(page).getByRole('button', { name: 'More formatting', exact: true })).toContainText('Style');
  for (const [name, option] of [['Align', 'Center'], ['Size', 'Large']]) {
    const trigger = formatting.getByRole('button', { name, exact: true });
    await trigger.scrollIntoViewIfNeeded();
    // Accessible names alone missed the phone controls rendering as empty arrows.
    await expect(trigger.locator('.dropdown-label')).toBeVisible();
    await expect(trigger).toContainText(name);
    await activate(trigger, hasTouch);
    const menu = page.getByRole('menu', { name, exact: true });
    await settle(page);
    await insideViewport(menu);
    await activate(menu.getByRole('menuitem', { name: option, exact: true }), hasTouch);
  }
  await expect(editor.locator('[style*="font-size"]')).toHaveText('A sentence worth keeping.');
  await expect(editor.locator('[style*="text-align"]')).toHaveCSS('text-align', 'center');
  await expect(editor).toHaveText('A sentence worth keeping.');
  await noHorizontalOverflow(page);
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
  const exported = await readFile((await download.path())!, 'utf8');
  expect(exported).toContain('Reading room');
  expect(exported).toContain('text-align: center');
  expect(exported).toContain('font-size: 1.25em');
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
    await noHorizontalOverflow(page);
    await menu.press('Escape');
    // The leaving menu still occupies the DOM: its exit must not widen the
    // page or make a mobile browser rescale the manuscript for one frame.
    await noHorizontalOverflow(page);
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
  const scan = async (scope?: string) => {
    await settle(page);
    let audit = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
    if (scope) audit = audit.include(scope);
    const results = await audit.analyze();
    expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
  };
  for (const dark of [false, true]) {
    if (dark) {
      await toolbarFor(page).getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Dark appearance', exact: true }).click();
    }
    const viewMenu = page.getByRole('menu', { name: 'View', exact: true });
    await expect(viewMenu).not.toBeVisible();
    await scan();
    const prompt = page.getByRole('button', { name: /Another prompt/ });
    if (await prompt.isVisible()) {
      await prompt.hover();
      await scan('.writing-prompt');
    }
    await toolbarFor(page).getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editor view', exact: true }).hover();
    await scan('.dropdown-menu');
    await viewMenu.press('Escape');
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

test('toolbar keyboard entry survives desktop to phone resizing', async ({ page }) => {
  const editor = editorFor(page);
  const toolbar = toolbarFor(page);
  const sentence = 'The workshop smelled of paper and rain.';
  await page.setViewportSize({ width: 1366, height: 768 });
  await editor.fill(sentence);
  await editor.press('Alt+F10');
  await page.keyboard.press('Home');
  await expect(toolbar.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const format = toolbar.getByRole('button', { name: 'Format', exact: true });
  await expect(format).toBeVisible();
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  await editor.focus();
  await page.keyboard.press('Alt+F10');
  await expect(format).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.keyboard.press('Shift+Tab');
  await expect(format).toBeFocused();
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect(editor).toHaveText(sentence);
  await noHorizontalOverflow(page);
});

test('Enter and Space open toolbar menus ready for keyboard navigation', async ({ page }) => {
  const editor = editorFor(page);
  const toolbar = toolbarFor(page);
  const sentence = 'I set the notebook beside the window.';
  await editor.fill(sentence);
  for (const key of ['Enter', 'Space']) {
    await editor.focus();
    await page.keyboard.press('Alt+F10');
    await page.keyboard.press('Home');
    if (await toolbar.getByRole('button', { name: 'Undo', exact: true }).isVisible()) {
      await page.keyboard.press('ArrowRight');
    }
    const format = toolbar.getByRole('button', { name: 'Format', exact: true });
    await expect(format).toBeFocused();
    await page.keyboard.press(key);
    const menu = page.getByRole('menu', { name: 'Format', exact: true });
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(format).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor).toBeFocused();
  }
  await expect(editor).toHaveText(sentence);
});

test('expanded formatting includes colors in keyboard navigation without losing selection', async ({ page }) => {
  const editor = editorFor(page);
  const toolbar = toolbarFor(page);
  const sentence = 'We left before dusk.';
  await editor.fill(sentence);
  await editor.press('ControlOrMeta+A');
  await toolbar.getByRole('button', { name: 'More formatting', exact: true }).click();
  await editor.press('Alt+F10');
  await page.keyboard.press('End');
  await expect(toolbar.getByRole('button', { name: 'Close more formatting', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(toolbar.getByLabel('Highlight color', { exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(toolbar.getByLabel('Text color', { exact: true })).toBeFocused();
  await expect(toolbar.locator('button[tabindex="0"], input[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(toolbar.getByLabel('Highlight color', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(sentence);
  await page.keyboard.press('ControlOrMeta+b');
  await expect(editor.locator('b,strong')).toHaveText(sentence);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor.locator('b,strong')).toHaveCount(0);
  await expect(editor).toHaveText(sentence);
  await noHorizontalOverflow(page);
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

test('site navigation stays reachable above the editor and preserves the draft', async ({ page, hasTouch }) => {
  const editor = editorFor(page);
  const sentence = 'The story stays with me when I leave the page.';
  await editor.fill(sentence);
  await noHorizontalOverflow(page);
  const toggle = page.getByRole('button', { name: 'Toggle menu', exact: true });
  if (await toggle.isVisible()) {
    await activate(toggle, hasTouch);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
  await settle(page);
  await insideViewport(navigation);
  await activate(navigation.getByRole('button', { name: 'Docs', exact: true }), hasTouch);
  await expect(page).toHaveURL(/#docs$/);
  await page.goBack();
  await expect(editor).toHaveText(sentence);
  if (await toggle.isVisible()) {
    await activate(toggle, hasTouch);
    await navigation.getByRole('button', { name: 'Docs', exact: true }).press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  }
  await noHorizontalOverflow(page);
});
