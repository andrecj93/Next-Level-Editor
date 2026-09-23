import type { jsPDF } from 'jspdf';
import { createPdfTextFont } from './pdfTextFont';

/** A rendered grapheme, in points measured from the top-left of the PDF page. */
export interface PdfTextGlyph {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Logical source order, before the browser's visual bidi reordering. */
  order?: number;
}

// jsPDF exposes these plugin hooks at runtime, but omits them from its types.
interface PdfPluginApi {
  events: { subscribe(topic: string, callback: () => void): string };
  newObject(): number;
  write(value: string): void;
  putStream(options: {
    objectId: number;
    data: string;
    additionalKeyValues?: { key: string; value: string }[];
  }): void;
}

interface TextFont {
  characters: { text: string; width: number; glyph: number }[];
  objectId: number;
}

const hex = (value: number) => value.toString(16).padStart(4, '0');
const number = (value: number) => Number(value.toFixed(4));
const utf16 = (value: string) => Array.from({ length: value.length }, (_, i) =>
  value.charCodeAt(i).toString(16).padStart(4, '0')).join('');

const direction = (text: string): number | null => {
  // PDF readers infer each text object's base direction independently. Keep
  // mixed-language sentences in directional runs, as browser print does.
  if (/[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e900}-\u{1e95f}]/u.test(text)) return -1;
  return /\p{L}/u.test(text) ? 1 : null;
};

/**
 * Add an invisible, Unicode text layer over the rendered pages. A tiny embedded
 * TrueType font supplies selection geometry; the browser already rendered the
 * exact letterforms into the page image. ToUnicode maps preserve the original
 * graphemes without font downloads, fallback substitutions or OCR. Type 3 fonts
 * cannot be used here: PDFium ignores their text when selecting/searching.
 *
 * Each page is a Form XObject with its own font resources. The instance-local
 * plugin hooks do not replace jsPDF's fonts (including visible page numbers).
 * This supplies searchable text, not PDF/UA tagging or semantic reading order.
 */
export function createPdfTextLayer(pdf: jsPDF) {
  const api = pdf.internal as unknown as PdfPluginApi;
  const fonts: TextFont[] = [];
  const characters = new Map<string, { font: number; code: number }>();
  const advances = new Map<number, number>();
  const forms: { name: string; content: string; fonts: Set<number>; objectId: number }[] = [];
  const width = pdf.internal.pageSize.getWidth() * pdf.internal.scaleFactor;
  const height = pdf.internal.pageSize.getHeight() * pdf.internal.scaleFactor;

  const encode = (text: string, width: number) => {
    const key = `${width}:${text}`;
    let character = characters.get(key);
    if (!character) {
      if (!fonts.length || fonts[fonts.length - 1].characters.length === 65535) {
        fonts.push({ characters: [], objectId: 0 });
      }
      const font = fonts.length - 1;
      let glyph = advances.get(width);
      if (!glyph) { glyph = advances.size + 1; advances.set(width, glyph); }
      fonts[font].characters.push({ text, width, glyph });
      character = { font, code: fonts[font].characters.length };
      characters.set(key, character);
    }
    return character;
  };

  api.events.subscribe('putResources', () => {
    if (!forms.length) return;
    const fontFileId = api.newObject();
    const fontData = createPdfTextFont([...advances.keys()]);
    api.putStream({ objectId: fontFileId, data: fontData, additionalKeyValues: [{ key: 'Length1', value: String(fontData.length) }] });
    api.write('endobj');
    const descriptorId = api.newObject();
    api.write(`<< /Type /FontDescriptor /FontName /NLETextLayer /Flags 4 /FontBBox [0 -200 ${Math.max(1000, ...advances.keys())} 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 800 /StemV 80 /FontFile2 ${fontFileId} 0 R >>\nendobj`);

    for (const [index, font] of fonts.entries()) {
      const entries = font.characters.map(({ text }, i) => `<${hex(i + 1)}> <${utf16(text)}>`);
      const mappings: string[] = [];
      // CMap blocks are limited to 100 entries by the PDF specification.
      for (let start = 0; start < entries.length; start += 100) {
        const chunk = entries.slice(start, start + 100);
        mappings.push(`${chunk.length} beginbfchar`, ...chunk, 'endbfchar');
      }
      const cmapId = api.newObject();
      api.putStream({ objectId: cmapId, data: [
        '/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
        `/CMapName /NLEUnicode${index} def`, '/CMapType 2 def',
        '1 begincodespacerange', '<0001> <ffff>', 'endcodespacerange', ...mappings,
        'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end',
      ].join('\n') });
      api.write('endobj');
      const glyphMapId = api.newObject();
      // Equal advances can share an outline while retaining distinct Unicode.
      api.putStream({ objectId: glyphMapId, data: '\x00\x00' + font.characters.map(({ glyph }) => String.fromCharCode(glyph >> 8, glyph & 255)).join('') });
      api.write('endobj');
      const descendantId = api.newObject();
      api.write(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NLETextLayer /FontDescriptor ${descriptorId} 0 R /DW 1000 /W [1 [${font.characters.map(({ width }) => width).join(' ')}]] /CIDToGIDMap ${glyphMapId} 0 R /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>\nendobj`);
      font.objectId = api.newObject();
      api.write([
        '<< /Type /Font /Subtype /Type0 /BaseFont /NLETextLayer /Encoding /Identity-H',
        `/DescendantFonts [${descendantId} 0 R] /ToUnicode ${cmapId} 0 R >>`, 'endobj',
      ].join('\n'));
    }

    for (const form of forms) {
      form.objectId = api.newObject();
      api.putStream({
        objectId: form.objectId,
        data: form.content,
        additionalKeyValues: [
          { key: 'Type', value: '/XObject' }, { key: 'Subtype', value: '/Form' },
          { key: 'BBox', value: `[0 0 ${number(width)} ${number(height)}]` },
          { key: 'Resources', value: `<< /Font << ${[...form.fonts].map(i => `/NLEFont${i} ${fonts[i].objectId} 0 R`).join(' ')} >> >>` },
        ],
      });
      api.write('endobj');
    }
  });
  api.events.subscribe('putXobjectDict', () => {
    for (const form of forms) api.write(`/${form.name} ${form.objectId} 0 R`);
  });

  return {
    addPage(glyphs: PdfTextGlyph[]) {
      const valid = glyphs.filter(glyph => glyph.text && [glyph.x, glyph.y, glyph.width, glyph.height].every(Number.isFinite)
        && glyph.width > 0 && glyph.height > 0);
      if (!valid.length) return;
      const usedFonts = new Set<number>();
      const content = ['q', 'BT', '3 Tr'];
      for (let start = 0; start < valid.length;) {
        const first = valid[start];
        let runDirection = direction(first.text);
        for (let i = start + 1; runDirection === null && i < valid.length && Math.abs(valid[i].y - first.y) <= 0.01; i++) {
          runDirection = direction(valid[i].text);
        }
        runDirection ??= 1;
        let end = start + 1;
        while (end < valid.length) {
          const next = valid[end];
          const previous = valid[end - 1];
          const nextDirection = direction(next.text);
          if (Math.abs(next.height - first.height) > 0.01 || Math.abs(next.y - first.y) > 0.01
            || next.x <= previous.x || next.x - previous.x - previous.width > first.height * 0.5
            || (nextDirection !== null && nextDirection !== runDirection)
            || (nextDirection === null && next.order !== undefined && previous.order !== undefined
              && !/\p{N}/u.test(next.text + previous.text)
              && Math.sign(next.order - previous.order) !== runDirection)) break;
          end++;
        }
        let width = 0;
        let font = -1;
        const codes: string[] = [];
        for (let i = start; i < end; i++) {
          const advance = Math.max(1, Math.min(32767, Math.round((i + 1 < end ? valid[i + 1].x - valid[i].x : valid[i].width) / first.height * 1000)));
          const character = encode(valid[i].text, advance);
          if (font !== -1 && font !== character.font) { end = i; break; }
          font = character.font;
          width += advance;
          codes.push(hex(character.code));
        }
        usedFonts.add(font);
        const run = valid.slice(start, end);
        const last = run[run.length - 1];
        const logical = [...run].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(glyph => glyph.text).join('');
        const reordered = run.some((glyph, i) => i > 0 && glyph.order !== undefined && glyph.order < (run[i - 1].order ?? 0));
        // PDFium's bidi heuristic reverses words in a visually ordered RTL run.
        // ActualText records the logical source for readers that support it;
        // PDF.js derives the same text from ToUnicode and visual positions.
        if (reordered) content.push(`/Span << /ActualText <feff${utf16(logical)}> >> BDC`);
        content.push(`/NLEFont${font} ${number(first.height)} Tf`,
          `${number((last.x + last.width - first.x) / (width / 1000 * first.height) * 100)} Tz`,
          `1 0 0 1 ${number(first.x)} ${number(height - first.y - first.height * 0.8)} Tm`,
          `<${codes.join('')}> Tj`);
        if (reordered) content.push('EMC');
        start = end;
      }
      content.push('ET', 'Q');
      const form = { name: `NLEText${forms.length}`, content: content.join('\n'), fonts: usedFonts, objectId: 0 };
      forms.push(form);
      api.write(`q /${form.name} Do Q`);
    },
  };
}
