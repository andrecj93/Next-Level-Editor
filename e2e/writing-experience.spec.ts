import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Manuscript writing workspace', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/?empty=true'); });

  test('the homepage demonstrates an actionable writing note', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'The compact homepage links to the full workspace');
    await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name: 'Home', exact: true }).click();
    const companion = page.getByRole('complementary', { name: 'Writing companion' });
    await companion.getByRole('button', { name: 'Use “to”', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true }).first();
    await expect(editor).toContainText('Mara returned to the harbor to find the house');
    await expect(editor).not.toContainText('in order to');
  });

  test('draft chapters, revise an exact passage, undo, navigate and recover the book', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'Sustained keyboard workflow; phone coverage below');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.click();
    await page.keyboard.type('The Cartographer of Quiet Places');
    await page.getByRole('button', { name: 'Format', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Heading 1', exact: true }).click();
    await expect(editor.locator('h1')).toHaveText('The Cartographer of Quiet Places');
    await editor.press('End');
    await editor.press('Enter');
    for (let chapter = 1; chapter <= 4; chapter++) {
      await page.keyboard.type(`Chapter ${chapter}`);
      await page.getByRole('button', { name: 'Format', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Heading 2', exact: true }).click();
      await editor.press('End');
      await editor.press('Enter');
      for (let paragraph = 0; paragraph < 4; paragraph++) {
        await page.keyboard.type(`Mara reached the harbor as the lights came on. She carried a brass key and a map that her father had drawn before she was born. This was chapter ${chapter}, a place to begin again. The sea was quiet. The town was listening.`);
        await editor.press('Enter');
      }
    }
    await page.keyboard.type('She returned in order to find the the house.');
    const companion = page.getByRole('complementary', { name: 'Writing companion' });
    if (!(await companion.isVisible())) await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
    await companion.getByRole('button', { name: 'Use “the”', exact: true }).click();
    await expect(editor).toContainText('find the house');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(editor).toContainText('find the the house');
    await companion.getByRole('button', { name: 'Use “the”', exact: true }).click();
    await companion.getByRole('button', { name: 'Use “to”', exact: true }).click();
    await expect(editor).toContainText('She returned to find the house.');
    await expect(editor.locator('h2')).toHaveCount(4);
    await expect(editor.locator('h1')).toHaveText('The Cartographer of Quiet Places');
    await companion.getByRole('button', { name: 'Outline', exact: true }).click();
    await companion.getByRole('button', { name: 'Chapter 1', exact: true }).click();
    await expect(editor.locator('h2').first()).toBeInViewport();
    const geometry = await editor.evaluate(el => {
      const r = el.getBoundingClientRect();
      const panel = document.querySelector('.writing-companion')!.getBoundingClientRect();
      return { right: r.right, panelLeft: panel.left, scrollHeight: document.documentElement.scrollHeight, viewport: innerHeight };
    });
    expect(geometry.right).toBeLessThanOrEqual(geometry.panelLeft + 1);
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.viewport + 1);
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved', {timeout: 6000});
    await page.goto('/#playground');
    await expect(editor).toContainText('She returned to find the house.');
    await expect(editor.locator('h2')).toHaveCount(4);
  });

  test('toolbar menus preserve the selection and expose advanced tools', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('A sentence worth keeping.');
    await editor.press('ControlOrMeta+A');
    await page.getByRole('button', { name: 'More formatting', exact: true }).click();
    await page.getByRole('group', { name: 'More formatting options' }).getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(editor.locator('b,strong')).toContainText('A sentence worth keeping.');
    await page.getByRole('button', { name: 'Close more formatting', exact: true }).click();
    await expect(page.getByRole('button', { name: 'More formatting', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Find & Replace', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Find & Replace' })).toBeVisible();
  });

  test('the companion opens from source or preview and returns keyboard focus on dismissal', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Writing companion', exact: true });
    const companion = page.getByRole('complementary', { name: 'Writing companion' });
    for (const view of ['Code view', 'Preview view']) {
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: view, exact: true }).click();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await button.click();
      await expect(page.getByRole('textbox', { name: 'Rich text editor', exact: true })).toBeVisible();
      await expect(companion).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(companion.getByRole('button', { name: 'Writing notes', exact: true })).toBeFocused();
      await companion.getByRole('button', { name: 'Writing notes', exact: true }).press('Escape');
      await expect(companion).not.toBeVisible();
      await expect(button).toBeFocused();
    }
  });

  test('writing notes and toolbar reflow without covering the page on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('The the house stood on the hill.');
    await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use “The”', exact: true })).toBeVisible();
    const geometry = await page.evaluate(() => {
      const editorRect = document.querySelector('.editor-content')!.getBoundingClientRect();
      const notesRect = document.querySelector('.writing-companion')!.getBoundingClientRect();
      return { editorBottom: editorRect.bottom, notesTop: notesRect.top, width: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(geometry.editorBottom).toBeLessThanOrEqual(geometry.notesTop + 1);
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
  });

  test('light and dark manuscript interfaces meet automated accessibility checks', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'axe browser coverage');
    await page.getByRole('textbox', { name: 'Rich text editor', exact: true }).fill('She went in order to see the the house.');
    await expect(page.getByRole('button', { name: 'Use “the”', exact: true })).toBeVisible();
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
      await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))));
      const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      expect(results.violations.map(v => ({id:v.id, nodes:v.nodes.map(n => ({ target:n.target, summary:n.failureSummary }))}))).toEqual([]);
    }
  });

  test('a book-length draft remains editable and keeps its chapters', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'Book-length performance sample on desktop');
    const paragraph = 'Mara crossed the town with a map in her pocket. She knew the harbor and the library, but every street held a story she had never heard. At the market, a neighbor stopped to ask when she was coming home.';
    const chapters = Array.from({ length: 20 }, (_, chapter) => `<h2>Chapter ${chapter + 1}</h2>${Array.from({length:50}, () => `<p>${paragraph}</p>`).join('')}`).join('');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    await page.locator('.code-editor').fill(`<h1>A long manuscript</h1>${chapters}`);
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await expect(editor.locator('h2')).toHaveCount(20);
    await editor.click();
    await editor.press('ControlOrMeta+End');
    await editor.press('Enter');
    const start = Date.now();
    await page.keyboard.type('A small final thought.');
    await expect(editor).toContainText('A small final thought.');
    const typingRoundTripMs = Date.now() - start;
    console.info('[writing-workspace] Book-length interaction', JSON.stringify({ paragraphs: 1000, chapters: 20, typingRoundTripMs }));
    await test.info().attach('book-length-interaction.json', { body: JSON.stringify({ paragraphs:1000, chapters:20, typingRoundTripMs }), contentType:'application/json' });
    expect(typingRoundTripMs).toBeLessThan(5000);
    await expect(editor.locator('h2')).toHaveCount(20);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).not.toContainText('A small final thought.');
  });

  for (const mode of ['editor', 'split']) test(`composed text commits and cancels without corrupting undo or recovery in ${mode}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'The browser composition protocol is Chromium-specific; this is not a physical keyboard test');
    if (mode === 'split') {
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Split view', exact: true }).click();
      await page.getByRole('button', { name: 'Editor', exact: true }).click();
    }
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('A story: ');
    await editor.press('ControlOrMeta+End');
    const input = await page.context().newCDPSession(page);
    await input.send('Input.imeSetComposition', { text: 'にほん', selectionStart: 3, selectionEnd: 3 });
    await expect(editor).toHaveText('A story: にほん');
    await input.send('Input.imeSetComposition', { text: '日本', selectionStart: 2, selectionEnd: 2 });
    await expect(editor).toHaveText('A story: 日本');
    await input.send('Input.insertText', { text: '日本' });
    await page.keyboard.type(' begins.');
    await expect(editor).toHaveText('A story: 日本 begins.');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveText('A story: 日本');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveText('A story:');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(editor).toHaveText('A story: 日本 begins.');
    await editor.press('ControlOrMeta+End');
    await input.send('Input.imeSetComposition', { text: '仮', selectionStart: 1, selectionEnd: 1 });
    await expect(editor).toContainText('仮');
    await input.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
    await expect(editor).toHaveText('A story: 日本 begins.');
    await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
    await page.goto('/#playground');
    await expect(editor).toHaveText('A story: 日本 begins.');
    await input.detach();
  });
});
