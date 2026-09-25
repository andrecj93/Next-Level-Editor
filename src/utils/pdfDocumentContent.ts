import type { jsPDF, OutlineItem } from 'jspdf';
import type { PdfPageSlice } from './pdfPagination';
import { createPdfTextLayer, type PdfTextGlyph } from './pdfTextLayer';

interface Grapheme { segment: string; index: number }
interface SegmenterConstructor {
  new(locale?: string, options?: { granularity: 'grapheme' }): { segment(text: string): Iterable<Grapheme> };
}

function visibleContent(root: HTMLElement) {
  const opacity = new WeakMap<Element, boolean>();
  const hasInk = (element: Element): boolean => {
    const cached = opacity.get(element);
    if (cached !== undefined) return cached;
    const visible = getComputedStyle(element).opacity !== '0'
      && (element === root || !element.parentElement || hasInk(element.parentElement));
    opacity.set(element, visible);
    return visible;
  };
  return (element: Element) => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && hasInk(element);
  };
}

function graphemes(text: string): Iterable<Grapheme> {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
  if (Segmenter) return new Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
  let index = 0;
  return Array.from(text, segment => {
    const grapheme = { segment, index };
    index += segment.length;
    return grapheme;
  });
}

/** PDF readers apply bidi processing to text in visual order. */
function visualOrder(glyphs: PdfTextGlyph[]): PdfTextGlyph[] {
  const rows: { top: number; bottom: number; glyphs: PdfTextGlyph[] }[] = [];
  for (const glyph of glyphs.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = rows[rows.length - 1];
    if (last && glyph.y < last.bottom - Math.min(glyph.height, last.bottom - last.top) * 0.3) {
      last.glyphs.push(glyph);
      last.bottom = Math.max(last.bottom, glyph.y + glyph.height);
    } else rows.push({ top: glyph.y, bottom: glyph.y + glyph.height, glyphs: [glyph] });
  }
  return rows.flatMap(row => row.glyphs.sort((a, b) => a.x - b.x));
}

export function pdfPageAt(pages: PdfPageSlice[], y: number): number {
  let low = 0;
  let high = pages.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (pages[mid].top <= y) low = mid; else high = mid - 1;
  }
  return low;
}

/** Measure the frozen export DOM, yielding during long manuscripts. */
export async function preparePdfDocumentContent(
  root: HTMLElement,
  pages: PdfPageSlice[],
  signal?: AbortSignal,
) {
  const box = root.getBoundingClientRect();
  const text = pages.map(() => [] as PdfTextGlyph[]);
  const range = root.ownerDocument.createRange();
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const visible = visibleContent(root);
  let node: Node | null;
  let count = 0;
  let deadline = performance.now() + 8;
  const cancelled = () => {
    if (signal?.aborted) throw new DOMException('PDF export cancelled', 'AbortError');
  };
  cancelled();
  while ((node = walker.nextNode())) {
    if (!node.textContent || !node.parentElement) continue;
    if (!visible(node.parentElement)) continue;
    range.selectNodeContents(node);
    if (!range.getClientRects?.().length) continue;
    for (const { segment, index } of graphemes(node.textContent)) {
      range.setStart(node, index);
      range.setEnd(node, index + segment.length);
      // WebKit can include a zero-width caret at the opposite end of a bidi
      // run. Its bounding union makes the first letter as wide as the run.
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      if (rects.length && !/^[\r\n]+$/.test(segment)) {
        const left = Math.min(...rects.map(rect => rect.left));
        const right = Math.max(...rects.map(rect => rect.right));
        const top = Math.min(...rects.map(rect => rect.top));
        const bottom = Math.max(...rects.map(rect => rect.bottom));
        const y = top - box.top;
        text[pdfPageAt(pages, y + (bottom - top) / 2)].push({
          text: segment, x: left - box.left, y, width: right - left, height: bottom - top, order: count,
        });
      }
      if (++count % 128 === 0 && performance.now() >= deadline) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        cancelled();
        deadline = performance.now() + 8;
      }
    }
  }
  cancelled();
  return text.map(visualOrder);
}

/** Preserve links and the heading hierarchy in the finished document. */
export function createPdfDocumentNavigation(root: HTMLElement, pages: PdfPageSlice[], pdf: jsPDF, scale: number, margin: number) {
  const box = root.getBoundingClientRect();
  const visible = visibleContent(root);
  const headings: { level: number; item: OutlineItem }[] = [];
  for (const heading of root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
    const title = heading.innerText?.trim();
    const rect = heading.getBoundingClientRect();
    if (!title || !rect.height || !visible(heading)) continue;
    const level = Number(heading.tagName[1]);
    while (headings.length && headings[headings.length - 1].level >= level) headings.pop();
    const item = pdf.outline.add(headings[headings.length - 1]?.item ?? null, title,
      { pageNumber: pdfPageAt(pages, rect.top - box.top) + 1 });
    headings.push({ level, item });
  }

  const destinations = new Map(Array.from(root.querySelectorAll<HTMLElement>('[id]'), el => [el.id, el]));
  const links = pages.map(() => [] as { x: number; y: number; width: number; height: number; destination: { url: string } | { pageNumber: number; top: number } }[]);
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (!visible(anchor)) continue;
    const href = anchor.getAttribute('href')?.trim();
    if (!href) continue;
    let destination: { url: string } | { pageNumber: number; top: number };
    try {
      if (href.startsWith('#')) {
        const target = destinations.get(decodeURIComponent(href.slice(1)));
        if (!target) continue;
        const top = target.getBoundingClientRect().top - box.top;
        const page = pdfPageAt(pages, top);
        destination = { pageNumber: page + 1, top: margin + (top - pages[page].top) * scale };
      } else {
        const url = new URL(href, root.ownerDocument.baseURI);
        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) continue;
        destination = { url: url.href };
      }
    } catch { continue; }
    for (const rect of Array.from(anchor.getClientRects())) {
      if (!rect.width || !rect.height) continue;
      const top = rect.top - box.top;
      const bottom = rect.bottom - box.top;
      const first = pdfPageAt(pages, top);
      const last = pdfPageAt(pages, bottom - 0.01);
      for (let page = first; page <= last; page++) {
        const start = Math.max(top, pages[page].top);
        const end = Math.min(bottom, pages[page].top + pages[page].height);
        if (end <= start) continue;
        links[page].push({ x: margin + (rect.left - box.left) * scale, y: margin + (start - pages[page].top) * scale,
          width: rect.width * scale, height: (end - start) * scale, destination });
      }
    }
  }
  return { addPage(index: number) {
    for (const link of links[index]) pdf.link(link.x, link.y, link.width, link.height, link.destination);
  } };
}

export function createPdfDocumentContent(pdf: jsPDF, root: HTMLElement, pages: PdfPageSlice[], text: PdfTextGlyph[][], scale: number, margin: number) {
  // Layout-less DOM test environments have no measured content.
  const layer = text.some(page => page.length) ? createPdfTextLayer(pdf) : null;
  const navigation = createPdfDocumentNavigation(root, pages, pdf, scale, margin);
  const points = pdf.internal?.scaleFactor ?? 72 / 25.4;
  return { addPage(index: number) {
    layer?.addPage(text[index].map(glyph => ({ text: glyph.text, order: glyph.order,
      x: (margin + glyph.x * scale) * points,
      y: (margin + (glyph.y - pages[index].top) * scale) * points,
      width: glyph.width * scale * points, height: glyph.height * scale * points,
    })));
    navigation.addPage(index);
  } };
}
