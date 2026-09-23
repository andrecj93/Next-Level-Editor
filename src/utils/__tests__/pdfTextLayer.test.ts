// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createPdfTextLayer, type PdfTextGlyph } from '../pdfTextLayer';

async function read(pdf: jsPDF) {
  const document = await getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), useSystemFonts: false }).promise;
  try {
    return await Promise.all(Array.from({ length: document.numPages }, async (_, i) => {
      const page = await document.getPage(i + 1);
      const content = await page.getTextContent({ disableNormalization: true });
      return content.items.flatMap(item => 'str' in item ? [item.str] : []).join('');
    }));
  } finally { await document.destroy(); }
}

function glyphs(text: string, y = 20): PdfTextGlyph[] {
  return Array.from(text, (character, i) => ({ text: character, x: 20 + i * 7, y, width: 7, height: 12 }));
}

describe('PDF Unicode text layer', () => {
  it('round trips punctuation, accents, non-Latin scripts and whole graphemes through an independent reader', async () => {
    const pdf = new jsPDF({ unit: 'pt', compress: true });
    const text = 'Olá, café — Ελληνικά · Українська · 日本語 · 中文';
    const layer = createPdfTextLayer(pdf);
    layer.addPage([...glyphs(text), { text: '👩‍👩‍👧‍👦', x: 20, y: 40, width: 20, height: 12 },
      { text: 'e\u0301', x: 20, y: 60, width: 7, height: 12 }]);
    expect(await read(pdf)).toEqual([`${text}👩‍👩‍👧‍👦e\u0301`]);
  });

  it('supports more than 255 distinct graphemes and keeps fonts isolated from page numbers', async () => {
    const pdf = new jsPDF({ unit: 'pt', compress: true });
    const layer = createPdfTextLayer(pdf);
    const text = Array.from({ length: 600 }, (_, i) => String.fromCodePoint(0x4e00 + i)).join('');
    layer.addPage(glyphs(text.slice(0, 50)));
    pdf.text('1', 280, 800);
    pdf.addPage();
    layer.addPage(Array.from({ length: 11 }, (_, line) => glyphs(text.slice(50 + line * 50, 100 + line * 50), 20 + line * 16)).flat());
    pdf.text('2', 280, 800);
    expect(await read(pdf)).toEqual([`${text.slice(0, 50)}1`, `${text.slice(50)}2`]);
  });

  it('does not share resources across exports or break repeat serialization', async () => {
    const first = new jsPDF({ unit: 'pt' });
    createPdfTextLayer(first).addPage(glyphs('First'));
    const second = new jsPDF({ unit: 'pt' });
    createPdfTextLayer(second).addPage(glyphs('Second'));
    expect(await read(first)).toEqual(['First']);
    expect(await read(second)).toEqual(['Second']);
    expect(await read(first)).toEqual(['First']);
  });
});
