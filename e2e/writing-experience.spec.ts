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
    const search = page.getByRole('search', { name: 'Find & Replace' });
    await expect(search).toBeVisible();
    await search.getByRole('textbox', { name: 'Find', exact: true }).fill('sentence');
    await expect(search.locator('.search-count')).toHaveText('1 of 1');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    await expect(page.locator('.code-editor')).toBeVisible();
    await expect(search).toHaveCount(0);
    expect(await page.evaluate(() => CSS.highlights.has('nle-find-current'))).toBe(false);
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Find & Replace', exact: true }).click();
    await expect(editor).toBeVisible();
    await expect(search.getByRole('textbox', { name: 'Find', exact: true })).toBeFocused();
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

  test('resizing preserves open compact notes and returns focus when the desktop sidebar closes', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
    const companion = page.getByRole('complementary', { name: 'Writing companion' });
    await page.setViewportSize({ width: 1200, height: 844 });
    await editor.fill('She returned in order to find the house.');
    await opener.click();
    const notes = companion.getByRole('button', { name: /Writing notes/ });
    await expect(notes).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(companion).not.toBeVisible();
    await expect(opener).toBeFocused();
    await opener.press('Enter');
    await expect(notes).toBeFocused();
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(companion).toBeVisible();
    await expect(notes).toBeFocused();
    const editorHeight = (await editor.boundingBox())!.height;
    await companion.getByRole('button', { name: 'Use “to”', exact: true }).click();
    await expect(editor).toHaveText('She returned to find the house.');
    await expect(editor).toBeFocused();
    expect((await editor.boundingBox())!.height, 'resolving a note does not resize the manuscript').toBeCloseTo(editorHeight, 0);
    // Collapsing the sidebar must not steal focus from an active manuscript.
    await page.setViewportSize({ width: 1200, height: 844 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(companion).not.toBeVisible();
    await expect(editor).toBeFocused();
    await editor.press('ControlOrMeta+End');
    await page.keyboard.type(' Still here.');
    await expect(editor).toContainText('Still here.');
  });

  test('opening Style or writing notes keeps the active line visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    await page.locator('.code-editor').fill('<h2>A letter home</h2>' + '<p>She carried the letter to the kitchen and set it beside her cup. The house was quiet enough to hear the clock in the hall.</p>'.repeat(20));
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
    await editor.press('ControlOrMeta+End');
    await editor.press('Enter');
    await page.keyboard.type('The final line stays with its writer.');
    const lineIsVisible = async () => {
      await expect(async () => {
        const geometry = await editor.evaluate(el => {
          const caret = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
          const area = el.getBoundingClientRect();
          return { top: caret.top, bottom: caret.bottom, areaTop: area.top, areaBottom: area.bottom };
        });
        expect(geometry.top, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.areaTop);
        expect(geometry.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.areaBottom);
      }).toPass({ timeout: 2000 });
    };
    await lineIsVisible();
    await page.getByRole('button', { name: 'More formatting', exact: true }).click();
    await lineIsVisible();
    await page.getByRole('button', { name: 'Close more formatting', exact: true }).click();
    await editor.press('ControlOrMeta+End');
    for (let character = 0; character < 7; character++) await editor.press('Shift+ArrowLeft');
    await editor.press('ControlOrMeta+i');
    await expect(editor.locator('em,i')).toHaveText('writer.');
    const before = await editor.innerHTML();
    await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
    await lineIsVisible();
    expect(await editor.innerHTML()).toBe(before);
    await page.getByRole('button', { name: 'Close writing companion', exact: true }).click();
    // A scroll-state fixture also runs in mobile WebKit, which has no wheel API.
    await editor.evaluate(el => { el.scrollTop = 0; });
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
    await page.getByRole('button', { name: 'More formatting', exact: true }).click();
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
  });

  test('reflow keeps the visible writing line and leaves a scrolled-away caret alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    await page.locator('.code-editor').fill('<h2>A letter home</h2>' + '<p>Mara carried the letter to the kitchen and set it beside her cup. The house was quiet enough to hear the clock in the hall.</p>'.repeat(40));
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
    await editor.press('ControlOrMeta+End');
    await page.keyboard.type(' The next sentence belongs here.');
    const before = await editor.innerHTML();
    for (const viewport of [{ width: 375, height: 812 }, { width: 834, height: 1112 }, { width: 1280, height: 700 }]) {
      await page.setViewportSize(viewport);
      await expect(async () => {
        const position = await editor.evaluate(el => {
          const caret = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return { top: caret.top, bottom: caret.bottom, low: box.top, high: box.bottom };
        });
        expect(position.top, JSON.stringify(position)).toBeGreaterThanOrEqual(position.low);
        expect(position.bottom, JSON.stringify(position)).toBeLessThanOrEqual(position.high);
      }).toPass({ timeout: 3000 });
      await expect(editor).toBeFocused();
    }
    expect(await editor.innerHTML()).toBe(before);
    // Finish the resize delivery before starting a separate reading gesture.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
    await editor.evaluate(el => { el.scrollTop = 0; });
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
    // Let the actual scroll event record that the writer is reading elsewhere.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
    expect(await editor.innerHTML()).toBe(before);
  });

  test('search follows a visible passage through reflow and respects reading elsewhere', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Code view', exact: true }).click();
    await page.locator('.code-editor').fill('<h2>The letter</h2>' + '<p>Mara carried the letter to the kitchen. The clock was the only sound in the house.</p>'.repeat(30) + '<p>Celia folded the map.</p>');
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editor view', exact: true }).click();
    const before = await editor.innerHTML();
    await editor.press('ControlOrMeta+f');
    const search = page.getByRole('search', { name: 'Find & Replace' });
    const query = search.getByRole('textbox', { name: 'Find', exact: true });
    await query.fill('Celia');
    await expect(search.locator('.search-count')).toHaveText('1 of 1');
    for (const viewport of [{ width: 320, height: 568 }, { width: 834, height: 1112 }, { width: 740, height: 360 }]) {
      await page.setViewportSize(viewport);
      await expect(async () => {
        const geometry = await editor.evaluate(el => {
          const range = [...CSS.highlights.get('nle-find-current')!][0] as Range;
          const match = range.getClientRects()[0];
          const area = el.getBoundingClientRect();
          return { top: match.top, bottom: match.bottom, low: Math.max(area.top, 0), high: Math.min(area.bottom, innerHeight) };
        });
        expect(geometry.top, JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.low);
        expect(geometry.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.high);
      }).toPass({ timeout: 3000 });
      await expect(query).toBeFocused();
    }
    expect(await editor.innerHTML()).toBe(before);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
    await editor.evaluate(el => { el.scrollTop = 0; });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
    await expect(query).toBeFocused();
    // Returning to a result is deliberate; clicking its excerpt restores the
    // exact selection so normal typing edits that occurrence immediately.
    await query.press('Enter');
    await search.getByRole('button', { name: /^Edit passage in/ }).click();
    await expect(search).toHaveCount(0);
    await expect(editor).toBeFocused();
    await page.keyboard.type('Célia');
    await expect(editor).toContainText('Célia folded the map.');
    await editor.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
    await editor.press('ControlOrMeta+f');
    await query.fill('Celia');
    await query.press('Enter');
    await query.press('Escape');
    await expect(editor).toBeFocused();
    await page.keyboard.type('Célia');
    await expect(editor).toContainText('Célia folded the map.');
    await editor.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
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
    await page.getByRole('button', { name: 'Writing companion', exact: true }).click();
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
    const before = await editor.evaluate(element => element.innerHTML);
    const session = await page.context().newCDPSession(page);
    let typingRoundTripMs = 0;
    let browserWorkMs = 0;
    try {
      await session.send('Performance.enable');
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const metricsBefore = await session.send('Performance.getMetrics');
      const start = Date.now();
      await page.keyboard.type('A small final thought.');
      await expect(editor).toContainText('A small final thought.');
      typingRoundTripMs = Date.now() - start;
      const metricsAfter = await session.send('Performance.getMetrics');
      browserWorkMs = ((metricsAfter.metrics.find(metric => metric.name === 'TaskDuration')?.value ?? 0)
        - (metricsBefore.metrics.find(metric => metric.name === 'TaskDuration')?.value ?? 0)) * 1000;
    } finally {
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await session.send('Performance.disable');
      await session.detach();
    }
    const measurement = { paragraphs: 1000, chapters: 20, cpuRate: 4, typingRoundTripMs, browserWorkMs };
    console.info('[writing-workspace] Book-length interaction', JSON.stringify(measurement));
    await test.info().attach('book-length-interaction.json', { body: JSON.stringify(measurement), contentType:'application/json' });
    expect(typingRoundTripMs).toBeLessThan(5000);
    await expect(editor.locator('h2')).toHaveCount(20);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toHaveJSProperty('innerHTML', before);
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
