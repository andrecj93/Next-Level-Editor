export interface DocxLimits {
  compressedBytes: number;
  expandedBytes: number;
  entries: number;
  timeoutMs: number;
}
export const defaultDocxLimits: DocxLimits = {
  compressedBytes: 15_000_000,
  expandedBytes: 60_000_000,
  entries: 2000,
  timeoutMs: 20000,
};
/** Central-directory inspection happens before decompression, including per-entry limits. */
export function inspectDocxArchive(
  buffer: ArrayBuffer,
  limits: DocxLimits = defaultDocxLimits,
): void {
  if (buffer.byteLength > limits.compressedBytes)
    throw new Error("The Word file exceeds the import size limit.");
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50)
    throw new Error("Choose a valid, unencrypted DOCX file.");
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    view.getUint32(end, true) !== 0x06054b50
  )
    end--;
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50)
    throw new Error("The Word archive is incomplete.");
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true);
  if (
    count > limits.entries ||
    count === 65535 ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true)
  )
    throw new Error("Unsupported or oversized Word archive.");
  let cursor = offset,
    total = 0,
    hasDocument = false;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error("Invalid Word archive directory.");
    if (view.getUint16(cursor + 8, true) & 1)
      throw new Error("Encrypted Word files cannot be imported.");
    const compressed = view.getUint32(cursor + 20, true),
      size = view.getUint32(cursor + 24, true);
    total += size;
    if (
      size > limits.expandedBytes ||
      total > limits.expandedBytes ||
      compressed === 0xffffffff ||
      size === 0xffffffff
    )
      throw new Error("The expanded Word file exceeds the import limit.");
    const nameLength = view.getUint16(cursor + 28, true);
    if (cursor + 46 + nameLength > end)
      throw new Error("Invalid archive filename.");
    const name = new TextDecoder().decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    if (names.has(name)) throw new Error("Duplicate Word archive entry.");
    names.add(name);
    const local = view.getUint32(cursor + 42, true);
    if (local + 30 > offset || view.getUint32(local, true) !== 0x04034b50)
      throw new Error("Invalid Word entry offset.");
    const localNameLength = view.getUint16(local + 26, true),
      extra = view.getUint16(local + 28, true);
    if (
      local + 30 + localNameLength + extra + compressed > offset ||
      new TextDecoder().decode(
        bytes.subarray(local + 30, local + 30 + localNameLength),
      ) !== name
    )
      throw new Error("Inconsistent Word entry.");
    if (![0, 8].includes(view.getUint16(cursor + 10, true)))
      throw new Error("Unsupported Word compression.");
    if (name === "word/document.xml") hasDocument = true;
    if (/vbaProject\.bin$/i.test(name))
      throw new Error("Macro-enabled documents are not supported.");
    if (name.includes("..") || name.startsWith("/"))
      throw new Error("Invalid Word archive path.");
    cursor +=
      46 +
      nameLength +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
  }
  if (!hasDocument) throw new Error("This ZIP file is not a Word document.");
}
/** Count actual streamed output, not attacker-controlled directory sizes. */
export function expandDocxArchive(
  buffer: ArrayBuffer,
  limits: DocxLimits = defaultDocxLimits,
): Record<string, Uint8Array> {
  inspectDocxArchive(buffer, limits);
  const result: Record<string, Uint8Array> = Object.create(null);
  let total = 0,
    entries = 0,
    failure: Error | undefined;
  const unzip = new Unzip((file) => {
    if (
      ++entries > limits.entries ||
      Object.prototype.hasOwnProperty.call(result, file.name)
    )
      throw new Error("Word archive entry limit exceeded.");
    const parts: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (error) {
        failure = error;
        return;
      }
      total += chunk.length;
      size += chunk.length;
      if (total > limits.expandedBytes) {
        failure = new Error("Expanded archive limit exceeded.");
        file.terminate();
        return;
      }
      parts.push(chunk);
      if (final) {
        const value = new Uint8Array(size);
        let offset = 0;
        for (const part of parts) {
          value.set(part, offset);
          offset += part.length;
        }
        result[file.name] = value;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const bytes = new Uint8Array(buffer);
  for (let offset = 0; offset < bytes.length; offset += 1024) {
    unzip.push(
      bytes.subarray(offset, offset + 1024),
      offset + 1024 >= bytes.length,
    );
    if (failure) throw failure;
  }
  if (!result["word/document.xml"]) throw new Error("Missing Word document.");
  return result;
}
import { Unzip, UnzipInflate } from "fflate";
