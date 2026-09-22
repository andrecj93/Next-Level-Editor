import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ensureToolbarExpanded, switchViewMode } from './helpers/toolbar';

async function openManuscript(page: Page, paragraphs = 90) {
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
  test.setTimeout(120000);
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
  const pendingDownload = page.waitForEvent('download', { timeout: 90000 });
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
