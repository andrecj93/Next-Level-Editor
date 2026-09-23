import { afterEach, describe, expect, it, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { createPdfDocumentNavigation, pdfPageAt, preparePdfDocumentContent } from '../pdfDocumentContent';

const pages = [{ top: 0, height: 100 }, { top: 100, height: 100 }];
const rect = (top: number, height = 20) => ({ top, bottom: top + height, left: 10, right: 70, x: 10, y: top, width: 60, height, toJSON() {} });

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('PDF document navigation', () => {
  it('preserves heading hierarchy and destinations at page boundaries', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h1>Book</h1><h3>First scene</h3><h2 id="heading-two">Next chapter</h2><h3>Second scene</h3>';
    document.body.append(root);
    root.querySelectorAll('h1,h2,h3').forEach((heading, i) => {
      vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(rect(i === 0 ? 0 : i === 1 ? 50 : 100));
    });
    const add = vi.fn((_parent, title, options) => ({ title, options, children: [] }));
    createPdfDocumentNavigation(root, pages, { outline: { add } } as unknown as jsPDF, 1, 12);
    expect(add.mock.calls.map(call => [call[0]?.title ?? null, call[1], call[2].pageNumber]))
      .toEqual([[null, 'Book', 1], ['Book', 'First scene', 1], ['Book', 'Next chapter', 2], ['Next chapter', 'Second scene', 2]]);
    expect(pdfPageAt(pages, 99.9)).toBe(0);
    expect(pdfPageAt(pages, 100)).toBe(1);
  });

  it('clips wrapped links to pages and rejects executable or unresolved destinations', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2 id="heading-two">Chapter</h2><a href="#heading-two">Chapter link</a><a href="https://example.com/">Website</a><a href="javascript:alert(1)">Unsafe</a><a href="data:text/html,bad">Unsafe data</a><a href="#missing">Missing</a><a href="#%invalid">Malformed</a>';
    document.body.append(root);
    vi.spyOn(root.querySelector('h2')!, 'getBoundingClientRect').mockReturnValue(rect(110));
    root.querySelectorAll('a').forEach(anchor => vi.spyOn(anchor, 'getClientRects').mockReturnValue([rect(90, 20)] as unknown as DOMRectList));
    const link = vi.fn();
    const navigation = createPdfDocumentNavigation(root, pages, { outline: { add: vi.fn() }, link } as unknown as jsPDF, 1, 12);
    navigation.addPage(0);
    navigation.addPage(1);
    expect(link).toHaveBeenCalledTimes(4);
    expect(link).toHaveBeenNthCalledWith(1, 22, 102, 60, 10, { pageNumber: 2, top: 22 });
    expect(link).toHaveBeenNthCalledWith(2, 22, 102, 60, 10, { url: 'https://example.com/' });
    expect(link).toHaveBeenNthCalledWith(3, 22, 12, 60, 10, { pageNumber: 2, top: 22 });
  });

  it('does not disclose invisible links or bookmarks', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section style="opacity:0"><h1>Hidden title</h1><a href="https://example.com/private">Private link</a></section>';
    document.body.append(root);
    vi.spyOn(root.querySelector('h1')!, 'getBoundingClientRect').mockReturnValue(rect(0));
    vi.spyOn(root.querySelector('a')!, 'getClientRects').mockReturnValue([rect(0)] as unknown as DOMRectList);
    const add = vi.fn();
    const link = vi.fn();
    createPdfDocumentNavigation(root, pages, { outline: { add }, link } as unknown as jsPDF, 1, 12).addPage(0);
    expect(add).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
  });

  it('rejects a cancelled preparation without changing the snapshot', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>The draft must remain intact.</p>';
    const controller = new AbortController();
    controller.abort();
    await expect(preparePdfDocumentContent(root, pages, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(root.innerHTML).toBe('<p>The draft must remain intact.</p>');
  });

  it('excludes a WebKit bidi caret rectangle from a letter’s selection bounds', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>م</p>';
    document.body.append(root);
    const range = document.createRange();
    Object.defineProperties(range, {
      getClientRects: { value: () => [{ ...rect(5), left: 10, right: 10, width: 0 }, { ...rect(5), left: 60, right: 66, width: 6 }] },
      getBoundingClientRect: { value: () => ({ ...rect(5), left: 10, right: 66, width: 56 }) },
    });
    vi.spyOn(document, 'createRange').mockReturnValue(range);
    const result = await preparePdfDocumentContent(root, pages);
    expect(result[0]).toEqual([{ text: 'م', x: 60, y: 5, width: 6, height: 20, order: 0 }]);
  });
});
