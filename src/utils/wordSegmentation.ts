/** Share the same Unicode word boundaries across the footer and writing analysis. */
interface SegmentData { segment: string; isWordLike?: boolean }
interface Segmenter { segment(text: string): Iterable<SegmentData> }
interface SegmenterConstructor {
  new (locale?: string, options?: { granularity: 'word' | 'grapheme' }): Segmenter;
}

function* wordsIn(text: string): Generator<string> {
  const Constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (Constructor) {
    for (const part of new Constructor(undefined, { granularity: 'word' }).segment(text)) {
      if (part.isWordLike) yield part.segment;
    }
  } else {
    // Keep combining accents, internal apostrophes, joiners and underscores.
    const pattern = /[\p{L}\p{N}][\p{L}\p{N}\p{M}_\u200c\u200d]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}_\u200c\u200d]*)*/gu;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) yield match[0];
  }
}

export function countWords(text: string): number {
  let count = 0;
  const words = wordsIn(text);
  while (!words.next().done) count++;
  return count;
}

export function splitWords(text: string): string[] {
  return Array.from(wordsIn(text.toLowerCase()));
}

/** A joined emoji or combining accent is one visible character. */
export function countCharacters(text: string): number {
  const Constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (!Constructor) return [...text].length;
  const characters = new Constructor(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]();
  let count = 0;
  while (!characters.next().done) count++;
  return count;
}
