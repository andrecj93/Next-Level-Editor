import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureToolbarExpanded, switchViewMode } from './helpers/toolbar';

const standardFontDataUrl = resolve('node_modules/pdfjs-dist/standard_fonts').replace(/\\/g, '/') + '/';
async function readWithPdfium(file: string, needle: string): Promise<{ pages: string[]; selection: { page: number; rects: number[][] }[] }> {
  const { stdout } = await promisify(execFile)(process.env.NLE_PDF_PYTHON || 'python', ['scripts/read-pdf-text.py', file, needle], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function openManuscript(page: Page, paragraphs = Number(process.env.NLE_PDF_PARAGRAPHS ?? 90)) {
  await page.goto('/?empty=true#playground');
  const closeMobile = page.getByRole('button', { name: 'Close toolbar', exact: true });
  if (await closeMobile.isVisible()) await closeMobile.click();
  await switchViewMode(page, 'Code');
  const prose = 'Mara reached the harbor as the lights came on. She carried a brass key and a map that her father had drawn before she was born. The sea was quiet. The town was listening. She opened her notebook and began again.';
  await page.locator('.code-editor').fill(`<h1>The quiet harbor</h1>${Array.from({ length: paragraphs }, (_, index) => `<p>${index + 1}. ${prose}</p>`).join('')}`);
  await switchViewMode(page, 'Editor');
  return page.getByRole('textbox', { name: 'Rich text editor', exact: true });
}

async function startPdf(page: Page) {
  await ensureToolbarExpanded(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('menuitem', { name: 'PDF', exact: true }).click();
}

test('a manuscript exports as bounded PDF pages while the writer keeps typing', async ({ page }) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toDataURL;
    const records: { width: number; height: number; empty: boolean }[] = [];
    Object.assign(window, { pdfCanvases: records });
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      const result = original.apply(this, args);
      records.push({ width: this.width, height: this.height, empty: result === 'data:,' });
      return result;
    };
  });
  const editor = await openManuscript(page);
  const before = await editor.innerText();
  const pendingDownload = page.waitForEvent('download', { timeout: 300000 });
  await startPdf(page);
  const progress = page.getByRole('group', { name: 'PDF export progress' });
  await expect(progress).toBeVisible();
  await expect(progress.getByRole('button', { name: 'Cancel PDF export' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await editor.locator('p').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' She kept writing.', { delay: 12 });
  const download = await pendingDownload;
  expect(await download.failure()).toBeNull();
  const file = (await download.path())!;
  const bytes = await readFile(file);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pages = bytes.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;
  expect(pages).toBeGreaterThan(2);
  const document = await getDocument({ data: new Uint8Array(bytes), standardFontDataUrl }).promise;
  const text: string[] = [];
  for (let index = 1; index <= document.numPages; index++) {
    const content = await (await document.getPage(index)).getTextContent();
    const parts = content.items.flatMap(item => 'str' in item ? [item.str] : []);
    expect(parts.pop()).toBe(String(index));
    text.push(parts.join(' '));
  }
  expect(text.join(' ').replace(/\s/g, '')).toBe(before.replace(/\s/g, ''));
  expect(text.join(' ')).toContain('Mara reached the harbor as the lights came on.');
  expect(text.join(' ')).toContain('90.');
  expect(text.join(' ')).not.toContain('She kept writing.');
  await document.destroy();
  const canvases = await page.evaluate(() => (window as Window & { pdfCanvases?: { width: number; height: number; empty: boolean }[] }).pdfCanvases!);
  expect(canvases).toHaveLength(pages);
  expect(canvases.every(canvas => !canvas.empty && canvas.width > 0 && canvas.height > 0 && canvas.width * canvas.height <= 3000000)).toBe(true);
  await expect(progress).toHaveCount(0);
  await expect(page.locator('div[style*="-9999px"]')).toHaveCount(0);
  const after = (await editor.innerText()).replace(/\u00a0/g, ' ');
  expect(after).toContain(' She kept writing.');
  expect(after.replace(' She kept writing.', '').replace(/\s+/g, ' ')).toBe(before.replace(/\s+/g, ' '));
  expect(errors).toEqual([]);
  await test.info().attach('manuscript.pdf', { path: file, contentType: 'application/pdf' });
});

test('the downloaded book has Unicode text, chapter bookmarks and usable links', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?empty=true#playground');
  await switchViewMode(page, 'Code');
  const samples = ['Olá, café — a sailor’s story.', 'Ελληνικά · Українська · 日本語 · 中文', 'مرحبا بالعالم', 'שלום עולם', 'Family 👩‍👩‍👧‍👦 and e\u0301', 'Mara said: مرحبا بالعالم — then smiled.', 'مرحبا 2026 بالعالم', 'שלום 42 עולם', 'Mara said: مرحبا 2026 بالعالم — then smiled.'];
  await page.locator('.code-editor').fill(`<h1>O café — 日本語<span style="display:none">Private annotation</span></h1><p><a href="https://example.com/book?chapter=1&amp;lang=pt">Read the source</a> and <a href="#heading-2-chapter-two">go to chapter two</a>.</p>${samples.map(s => `<p>${s}</p>`).join('')}<p>The <strong>brass key</strong> was <em>still warm</em> in her hand.</p><p><a href="https://example.com/long-link">${'A link that continues naturally onto the next line. '.repeat(5)}</a></p><div class="page-break"></div><h2 id="heading-2-chapter-two">Chapter Two — A Room Left Open</h2><p>The story continues here.</p>`);
  await switchViewMode(page, 'Editor');
  const pendingDownload = page.waitForEvent('download', { timeout: 90000 });
  await startPdf(page);
  const printedSelection = await page.locator('.nle-pdf-snapshot strong').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const box = element.closest('.nle-pdf-snapshot')!.getBoundingClientRect();
    const scale = 186 / box.width * 72 / 25.4;
    const margin = 12 * 72 / 25.4;
    return { left: margin + (rect.left - box.left) * scale, right: margin + (rect.right - box.left) * scale,
      top: 841.89 - margin - (rect.top - box.top) * scale, bottom: 841.89 - margin - (rect.bottom - box.top) * scale };
  });
  const download = await pendingDownload;
  const file = (await download.path())!;
  await test.info().attach('unicode-book.pdf', { path: file, contentType: 'application/pdf' });
  const document = await getDocument({ data: new Uint8Array(await readFile(file)), standardFontDataUrl }).promise;
  const contents = await (await document.getPage(1)).getTextContent({ disableNormalization: true });
  const text = contents.items.flatMap(item => 'str' in item ? [item.str + (item.hasEOL ? '\n' : '')] : []).join('').replace(/\s+/g, ' ');
  for (const sample of samples) expect(text).toContain(sample);
  expect(text).not.toContain('Private annotation');
  const { pages: [nativeText], selection } = await readWithPdfium(file, 'brass key');
  for (const sample of samples) expect(nativeText).toContain(sample);
  expect(nativeText).toContain('The brass key was still warm in her hand.');
  expect(selection).toHaveLength(1);
  expect(selection[0].page).toBe(1);
  expect(selection[0].rects).toHaveLength(1);
  const [left, bottom, right, top] = selection[0].rects[0];
  for (const [actual, expected] of [[left, printedSelection.left], [bottom, printedSelection.bottom], [right, printedSelection.right], [top, printedSelection.top]]) {
    expect(Math.abs(actual - expected)).toBeLessThan(1);
  }
  await test.info().attach('selection-geometry.json', { body: JSON.stringify({ printedSelection, selection }), contentType: 'application/json' });
  expect(text).toContain('The brass key was still warm in her hand.');
  const outline = await document.getOutline();
  expect(outline?.[0].title).toBe('O café — 日本語');
  expect(outline?.[0].items[0].title).toBe('Chapter Two — A Room Left Open');
  const annotations = await (await document.getPage(1)).getAnnotations();
  expect(annotations.some(item => item.url === 'https://example.com/book?chapter=1&lang=pt')).toBe(true);
  expect(annotations.filter(item => item.url === 'https://example.com/long-link').length).toBeGreaterThan(1);
  const internal = annotations.find(item => Array.isArray(item.dest));
  expect(internal).toBeTruthy();
  expect(await document.getPageIndex(internal!.dest[0])).toBe(1);
  await document.destroy();
});

test('a writer can cancel PDF preparation and return to an unchanged draft', async ({ page }) => {
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  const editor = await openManuscript(page, 120);
  const text = await editor.innerText();
  await startPdf(page);
  const progress = page.getByRole('group', { name: 'PDF export progress' });
  await expect(progress).toBeVisible();
  await progress.getByRole('button', { name: 'Cancel PDF export' }).click();
  await expect(editor).toBeFocused();
  await expect(progress).toHaveCount(0);
  await expect(page.locator('.toast-notification')).toHaveText('PDF export cancelled. Your document is unchanged.');
  await expect(page.locator('div[style*="-9999px"]')).toHaveCount(0);
  expect(await editor.innerText()).toBe(text);
  expect(downloads).toEqual([]);
});
