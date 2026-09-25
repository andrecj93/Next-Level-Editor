/** Geometry is measured from the export snapshot, never from the live draft. */
export interface PdfBand {
  top: number;
  bottom: number;
}

export interface PdfPageSlice {
  top: number;
  height: number;
}

/** Image dimensions and fonts must settle before deciding where pages end. */
export async function waitForPdfResources(root: HTMLElement, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cancel = () => finish(new DOMException('PDF export cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('PDF images or fonts did not finish loading')), 15000);
    function finish(error?: Error) {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve();
    }
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    const images = Array.from(root.querySelectorAll('img'), image => {
      image.loading = 'eager';
      // An already-broken image should retain the document's fallback state.
      return image.decode?.().catch(() => {});
    });
    Promise.all([root.ownerDocument.fonts?.ready, ...images]).then(() => finish(), error => finish(error));
  });
}

/** Cover the complete document while keeping blocks and text lines intact. */
export function paginatePdfContent(
  height: number,
  pageHeight: number,
  blocks: PdfBand[] = [],
  lines: PdfBand[] = [],
  breaks: number[] = [],
): PdfPageSlice[] {
  if (!Number.isFinite(height) || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error('Invalid PDF layout dimensions');
  }
  const total = Math.max(1, Math.ceil(height));
  const forced = [...new Set(breaks.map(Math.floor).filter(value => value > 0 && value < total))].sort((a, b) => a - b);
  const blockBands = [...blocks].sort((a, b) => b.top - a.top);
  const lineBands = [...lines].sort((a, b) => b.top - a.top);
  const pages: PdfPageSlice[] = [];
  let top = 0;
  while (top < total) {
    const limit = Math.min(total, top + pageHeight);
    const explicitBreak = forced.find(value => value > top && value <= limit);
    let end = explicitBreak ?? limit;
    // Avoid splitting a paragraph, table row, image, or a heading with its
    // first following line when that group can fit on a page of its own.
    for (const band of explicitBreak === undefined ? blockBands : []) {
      if (band.top > top + 0.5 && band.top < end && band.bottom > end && band.bottom - band.top <= pageHeight) {
        end = band.top;
      }
    }
    // Very long paragraphs still split between lines, never across glyphs.
    for (const line of explicitBreak === undefined ? lineBands : []) {
      if (line.top > top + 0.5 && line.top < end && line.bottom > end) end = line.top;
    }
    end = Math.floor(end);
    if (end <= top) end = Math.min(total, top + Math.max(1, Math.floor(pageHeight)));
    pages.push({ top, height: end - top });
    top = end;
  }
  return pages;
}

export function measurePdfPages(root: HTMLElement, pageHeight: number): PdfPageSlice[] {
  const box = root.getBoundingClientRect();
  const lines: PdfBand[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    const range = root.ownerDocument.createRange();
    range.selectNodeContents(node);
    // DOM-only test environments do not implement layout rectangles.
    for (const rect of Array.from(range.getClientRects?.() ?? [])) {
      if (rect.height > 0 && rect.width > 0) lines.push({ top: rect.top - box.top, bottom: rect.bottom - box.top });
    }
  }
  lines.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,tr,img,svg,hr')).map(element => {
    const rect = element.getBoundingClientRect();
    const band = { top: rect.top - box.top, bottom: rect.bottom - box.top };
    if (/^H[1-6]$/.test(element.tagName)) {
      const nextLine = lines.find(line => line.top >= band.bottom);
      if (nextLine) band.bottom = nextLine.bottom;
    }
    return band;
  }).filter(band => band.bottom > band.top).sort((a, b) => b.top - a.top);
  const breaks = Array.from(root.querySelectorAll<HTMLElement>('.page-break'))
    .map(element => element.getBoundingClientRect().top - box.top);
  return paginatePdfContent(Math.max(box.height, root.scrollHeight), pageHeight, blocks, lines, breaks);
}
