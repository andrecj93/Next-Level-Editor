import { afterEach, describe, expect, it, vi } from 'vitest';
import { paginatePdfContent, waitForPdfResources } from '../pdfPagination';

describe('PDF page planning', () => {
  it('covers a book without a canvas the height of the whole manuscript', () => {
    const pages = paginatePdfContent(186522, 1100);
    expect(pages.length).toBeGreaterThan(100);
    expect(pages.every(page => page.height > 0 && page.height <= 1100)).toBe(true);
    expect(pages[0].top).toBe(0);
    expect(pages.reduce((height, page) => height + page.height, 0)).toBe(186522);
    for (let i = 1; i < pages.length; i++) expect(pages[i].top).toBe(pages[i - 1].top + pages[i - 1].height);
  });

  it('keeps a paragraph or a heading and first line together', () => {
    expect(paginatePdfContent(1800, 1000, [{ top: 900, bottom: 1100 }]))
      .toEqual([{ top: 0, height: 900 }, { top: 900, height: 900 }]);
  });

  it('splits an oversized paragraph between text lines', () => {
    const pages = paginatePdfContent(2500, 1000, [{ top: 0, bottom: 2500 }], [{ top: 980, bottom: 1015 }]);
    expect(pages[0]).toEqual({ top: 0, height: 980 });
    expect(pages[1].top).toBe(980);
  });

  it('honors explicit page breaks without blank pages at the ends', () => {
    expect(paginatePdfContent(1300, 1000, [], [], [0, 400, 400, 1300]))
      .toEqual([{ top: 0, height: 400 }, { top: 400, height: 900 }]);
  });

  it('makes progress through fractional layout edges', () => {
    const pages = paginatePdfContent(2000.3, 900.8, [{ top: 0.2, bottom: 1800 }], [{ top: 899.2, bottom: 912 }]);
    expect(pages.every(page => Number.isInteger(page.top) && page.height > 0 && page.height <= 900.8)).toBe(true);
    expect(pages.reduce((total, page) => total + page.height, 0)).toBe(2001);
  });

  it('prioritizes authored page breaks over keeping a heading with following text', () => {
    expect(paginatePdfContent(1800, 1000, [{ top: 350, bottom: 550 }], [], [400.8]))
      .toEqual([{ top: 0, height: 400 }, { top: 400, height: 1000 }, { top: 1400, height: 400 }]);
  });

  it('rejects dimensions that would produce an unbounded loop', () => {
    expect(() => paginatePdfContent(100, 0)).toThrow('Invalid PDF layout');
    expect(() => paginatePdfContent(Infinity, 900)).toThrow('Invalid PDF layout');
  });
});

describe('PDF layout resources', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for image dimensions before planning page boundaries', async () => {
    const root = document.createElement('div');
    const image = document.createElement('img');
    let loaded!: () => void;
    image.decode = () => new Promise(resolve => { loaded = resolve; });
    root.append(image);
    const done = vi.fn();
    const pending = waitForPdfResources(root).then(done);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    expect(image.loading).toBe('eager');
    loaded();
    await pending;
    expect(done).toHaveBeenCalledOnce();
  });

  it('cancels promptly even if an image never finishes loading', async () => {
    const root = document.createElement('div');
    const image = document.createElement('img');
    image.decode = () => new Promise(() => {});
    root.append(image);
    const controller = new AbortController();
    const pending = waitForPdfResources(root, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('bounds waits for unavailable resources so export does not stay busy forever', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const image = document.createElement('img');
    image.decode = () => new Promise(() => {});
    root.append(image);
    const result = expect(waitForPdfResources(root)).rejects.toThrow('did not finish loading');
    await vi.advanceTimersByTimeAsync(15000);
    await result;
  });
});
