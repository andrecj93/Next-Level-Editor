import { expect, test } from '@playwright/test';
import { exerciseRichClipboard, installClipboard, pasteWithContextMenu } from './helpers/clipboard';

test('menu Copy and Paste preserve rich text, writing, undo and recovery', async ({ page }) => {
  await exerciseRichClipboard(page);
});

test('a short-screen menu keeps every item reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await installClipboard(page);
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('A short draft.');
  const before = await editor.innerHTML();
  await editor.press('ControlOrMeta+a');
  await editor.click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Context menu', exact: true });
  await menu.press('End');
  const last = menu.getByRole('menuitem').last();
  await expect(last).toBeFocused();
  const bounds = await last.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(256);
  await expect(menu).toBeVisible();
  await page.keyboard.press('Home');
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(editor).toBeFocused();
  expect(await editor.innerHTML()).toBe(before);
});

test('menu Paste sanitizes rich HTML and keeps its formatting', async ({ page }) => {
  await installClipboard(page, {
    'text/html': '<p><strong>A quieter ending.</strong><a href="javascript:alert(1)"> Read on.</a><img src="x" onerror="alert(1)"><script>alert(1)</script></p>',
    'text/plain': 'A quieter ending. Read on.',
  });
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Replace this passage.');
  const before = await editor.innerHTML();
  await editor.press('ControlOrMeta+a');
  await editor.click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(editor.locator('strong')).toHaveText('A quieter ending.');
  await expect(editor.locator('script,[onerror],a[href^="javascript:"]')).toHaveCount(0);
  await editor.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(before);
});

test('menu Paste uses literal text when only the text API is available', async ({ page }) => {
  await installClipboard(page, { 'text/plain': '<strong>Literal words</strong>' }, true);
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Replace this passage.');
  await editor.press('ControlOrMeta+a');
  await editor.click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(editor).toHaveText('<strong>Literal words</strong>');
  await expect(editor.locator('strong')).toHaveCount(0);
});

test('pasting a formatted phrase keeps the sentence together while revising', async ({ page }) => {
  await installClipboard(page, { 'text/html': '<strong>old wooden</strong> door', 'text/plain': 'old wooden door' });
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('The door opened.');
  const before = await editor.innerHTML();
  const blocksBefore = await editor.locator('p,div,br').count();
  const selectedPhrase = await editor.evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!, 4);
    range.setEnd(root.firstChild!, 8);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    const bounds = range.getBoundingClientRect();
    const editorBounds = root.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2 - editorBounds.x, y: bounds.y + bounds.height / 2 - editorBounds.y };
  });
  await editor.click({ button: 'right', position: selectedPhrase });
  await pasteWithContextMenu(page);
  await expect(editor).toHaveText('The old wooden door opened.');
  await expect(editor.locator('strong')).toHaveText('old wooden');
  await expect(editor.locator('p,div,br')).toHaveCount(blocksBefore);
  await editor.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(before);
  await editor.press('ControlOrMeta+Shift+z');
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' Nobody entered.');
  await expect(editor).toHaveText('The old wooden door opened. Nobody entered.');
  await expect(editor.locator('p,div,br')).toHaveCount(blocksBefore);
});

test('menu Paste inserts a decodable image that survives undo and draft recovery', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [{
          types: ['image/png'],
          getType: async () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 2;
            canvas.getContext('2d')!.fillRect(0, 0, 2, 2);
            return new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
          },
        }],
      },
    });
  });
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('A sketch of the harbour.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  const before = await editor.innerHTML();
  await editor.locator('p').last().click({ button: 'right' });
  await pasteWithContextMenu(page);
  const image = editor.locator('img');
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(2);
  await editor.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(before);
  await editor.press('ControlOrMeta+Shift+z');
  await expect(image).toHaveCount(1);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved at');
  const final = { src: await image.getAttribute('src'), alt: await image.getAttribute('alt'), text: await editor.innerText() };
  await page.reload();
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute('src', final.src!);
  await expect(image).toHaveAttribute('alt', final.alt!);
  expect(await editor.innerText()).toBe(final.text);
  await expect(editor.locator('.embedded-resizable-container')).toHaveAttribute('data-width', '500');
  await expect(editor.locator('.embedded-resizable-container')).toHaveAttribute('data-height', '400');
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(2);
});

test('menu Paste keeps code blocks literal', async ({ page }) => {
  await installClipboard(page, { 'text/html': '<strong>value</strong>', 'text/plain': '<strong>value</strong>' });
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.evaluate(root => {
    root.innerHTML = '<pre><code>replaceMe()</code></pre>';
    root.dispatchEvent(new InputEvent('input', { bubbles: true }));
    (root as HTMLElement).focus();
    const range = document.createRange();
    range.selectNodeContents(root.querySelector('code')!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await editor.locator('code').click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(editor.locator('code')).toHaveText('<strong>value</strong>');
  await expect(editor.locator('strong')).toHaveCount(0);
});

test('a delayed menu Paste cannot overwrite a newer revision', async ({ page }) => {
  await installClipboard(page, { 'text/html': '<strong>Old clipboard content</strong>' });
  await page.goto('/?empty=true#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('Keep this paragraph.');
  await page.evaluate(() => {
    const originalRead = navigator.clipboard.read.bind(navigator.clipboard);
    navigator.clipboard.read = () => new Promise(resolve => {
      document.documentElement.dataset.clipboardPending = 'true';
      (window as unknown as { finishPaste: () => Promise<void> }).finishPaste = async () => resolve(await originalRead());
    });
  });
  await editor.press('ControlOrMeta+a');
  await editor.click({ button: 'right' });
  await pasteWithContextMenu(page);
  await expect(page.locator('html')).toHaveAttribute('data-clipboard-pending', 'true');
  await editor.press('ControlOrMeta+End');
  await page.keyboard.type(' A newer thought.');
  const beforeCompletion = await editor.innerHTML();
  await page.evaluate(() => (window as unknown as { finishPaste: () => Promise<void> }).finishPaste());
  await expect(page.locator('.toast-notification')).toHaveText('Your writing position changed. Paste again where you want it.');
  await expect(page.locator('.toast-notification')).toBeVisible();
  expect(await editor.innerHTML()).toBe(beforeCompletion);
  await expect(editor.locator('strong')).toHaveCount(0);
});
