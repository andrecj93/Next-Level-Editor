import { PDF_TEXT_FONT } from './pdfTextLayerFont';

/**
 * Build the embedded selection font with the measured advances. A text run can
 * then use one PDF text object, which keeps RTL word order intact in PDFium.
 * Each original glyph is a rectangle; no platform font outlines are copied.
 * Only glyf, loca and hmtx vary. The template supplies the required name/cmap/
 * OS/2 tables, and table + whole-font checksums are recalculated below.
 */
export function createPdfTextFont(widths: number[]): string {
  const template = Uint8Array.from(atob(PDF_TEXT_FONT), character => character.charCodeAt(0));
  const source = new DataView(template.buffer);
  const tables = new Map<string, Uint8Array>();
  const count = source.getUint16(4);
  for (let i = 0; i < count; i++) {
    const start = 12 + i * 16;
    const tag = String.fromCharCode(...template.slice(start, start + 4));
    tables.set(tag, template.slice(source.getUint32(start + 8), source.getUint32(start + 8) + source.getUint32(start + 12)));
  }
  const advances = [1000, ...widths];
  const glyf = new Uint8Array(advances.length * 36);
  const outlines = new DataView(glyf.buffer);
  const loca = new Uint8Array((advances.length + 1) * 4);
  const offsets = new DataView(loca.buffer);
  const hmtx = new Uint8Array(advances.length * 4);
  const metrics = new DataView(hmtx.buffer);
  for (const [i, width] of advances.entries()) {
    const start = i * 36;
    // One contour with four on-curve points, expressed as signed deltas.
    [1, 0, -200, width, 800, 3, 0].forEach((value, n) => outlines.setInt16(start + n * 2, value));
    glyf.fill(1, start + 14, start + 18);
    [0, width, 0, -width, -200, 0, 1000, 0].forEach((value, n) => outlines.setInt16(start + 18 + n * 2, value));
    offsets.setUint32(i * 4, start);
    metrics.setUint16(i * 4, width);
  }
  offsets.setUint32(advances.length * 4, glyf.length);
  tables.set('glyf', glyf);
  tables.set('loca', loca);
  tables.set('hmtx', hmtx);
  // Format 3 has no glyph-name array to become stale as advances are added.
  const post = tables.get('post')!.slice(0, 32);
  new DataView(post.buffer).setUint32(0, 0x00030000);
  tables.set('post', post);
  const head = new DataView(tables.get('head')!.buffer);
  const hhea = new DataView(tables.get('hhea')!.buffer);
  const maxp = new DataView(tables.get('maxp')!.buffer);
  const maxWidth = Math.max(...advances);
  head.setUint32(8, 0);
  head.setInt16(40, maxWidth);
  head.setInt16(50, 1); // long loca offsets
  hhea.setUint16(10, maxWidth);
  hhea.setInt16(16, maxWidth);
  hhea.setUint16(34, advances.length);
  maxp.setUint16(4, advances.length);

  const align = (length: number) => Math.ceil(length / 4) * 4;
  const checksum = (bytes: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < bytes.length; i += 4) {
      sum = (sum + ((bytes[i] << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0))) >>> 0;
    }
    return sum;
  };
  const directoryLength = 12 + count * 16;
  const output = new Uint8Array(directoryLength + [...tables.values()].reduce((length, table) => length + align(table.length), 0));
  output.set(template.slice(0, 12));
  const directory = new DataView(output.buffer);
  let offset = directoryLength;
  let headOffset = 0;
  for (const [i, [tag, data]] of [...tables].entries()) {
    const record = 12 + i * 16;
    output.set(Array.from(tag, character => character.charCodeAt(0)), record);
    directory.setUint32(record + 4, checksum(data));
    directory.setUint32(record + 8, offset);
    directory.setUint32(record + 12, data.length);
    output.set(data, offset);
    if (tag === 'head') headOffset = offset;
    offset += align(data.length);
  }
  directory.setUint32(headOffset + 8, (0xb1b0afba - checksum(output)) >>> 0);
  // Avoid spreading a large font into a function argument list.
  return Array.from(output, value => String.fromCharCode(value)).join('');
}
