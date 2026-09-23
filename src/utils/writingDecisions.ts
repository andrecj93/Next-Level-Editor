/** Bounded, data-only decisions persisted by the host alongside its document. */
export const MAX_WRITING_DECISION_DATA_LENGTH = 1_000_000;
const MAX_DECISIONS = 10_000;

export function parseWritingDecisions(value: string): Set<string> {
  if (value.length > MAX_WRITING_DECISION_DATA_LENGTH) throw new Error('Writing decisions are too large');
  const keys: unknown = JSON.parse(value);
  if (!Array.isArray(keys) || keys.length > MAX_DECISIONS) throw new Error('Invalid writing decisions');
  for (const key of keys) {
    if (typeof key !== 'string') throw new Error('Invalid writing decision');
    const separator = key.indexOf(':');
    const occurrence = key.slice(0, separator);
    if (!/^(0|[1-9]\d*)$/.test(occurrence) || !Number.isSafeInteger(Number(occurrence))) {
      throw new Error('Invalid writing decision occurrence');
    }
    const signature: unknown = JSON.parse(key.slice(separator + 1));
    if (!Array.isArray(signature) || signature.length !== 4) throw new Error('Invalid writing decision signature');
    const [text, start, quote, title] = signature;
    if (typeof text !== 'string' || !Number.isSafeInteger(start) || start < 0 ||
        typeof quote !== 'string' || !quote || text.slice(start, start + quote.length) !== quote ||
        typeof title !== 'string' || !title || title.length > 100) throw new Error('Invalid writing decision passage');
  }
  return new Set(keys);
}

export function serializeWritingDecisions(keys: Iterable<string>): string {
  return JSON.stringify([...keys].sort());
}
