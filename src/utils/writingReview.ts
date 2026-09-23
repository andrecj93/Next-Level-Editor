import { getWordCount } from './commands';

/** Small, explainable English writing checks. Never sends manuscript text away. */
export interface WritingNote {
  id: string;
  block: number;
  blockText: string;
  start: number;
  quote: string;
  title: string;
  detail: string;
  /** Optional UI message; detail retains the English fallback for existing hosts. */
  detailMessage?: { key: string; parameters: Record<string, string | number> };
  replacement?: string;
}

export interface WritingReview {
  words: number;
  paragraphs: number;
  readingMinutes: number;
  outline: { block: number; level: number; text: string }[];
  notes: WritingNote[];
}

/** Give short, repeated phrases enough context to recognise before jumping. */
export function writingNoteContext(note: WritingNote, outline: WritingReview['outline'], paragraphLabel: (number: number) => string = number => `Paragraph ${number}`) {
  let section: WritingReview['outline'][number] | undefined;
  for (const heading of outline) {
    if (heading.block >= note.block) break;
    section = heading;
  }
  const before = note.blockText.slice(0, note.start);
  const after = note.blockText.slice(note.start + note.quote.length);
  const lead = before.length > 56 ? `…${before.slice(-56).replace(/^\S*\s/, '')}` : before;
  const tail = after.length > 56 ? `${after.slice(0, 56).replace(/\s\S*$/, '')}…` : after;
  const paragraph = note.block - (section?.block ?? -1);
  return { before: lead, after: tail, location: `${section ? `${section.text} · ` : ''}${paragraphLabel(paragraph)}` };
}

const WRITING_BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,div,td,th';
interface WritingBlock {
  element: HTMLElement;
  text: string;
  spans: { node: Text; start: number; editable: boolean }[];
}

/** Keep bare first lines, nested paragraphs, and inline marks in DOM order. */
export function writingBlocks(root: HTMLElement): WritingBlock[] {
  const blocks: WritingBlock[] = [];
  let current: WritingBlock | undefined;
  const flush = () => {
    if (current?.text.trim() && current.spans.some(span => span.editable)) blocks.push(current);
    current = undefined;
  };
  const visit = (parent: HTMLElement, owner: HTMLElement, editable: boolean) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (current?.element !== owner) flush();
        current ??= { element: owner, text: '', spans: [] };
        current.spans.push({ node: node as Text, start: current.text.length, editable });
        current.text += node.textContent ?? '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.matches('pre,script,style')) { flush(); continue; }
        const canEdit = editable && !element.matches('code,[contenteditable="false"]');
        if (element.matches(WRITING_BLOCKS)) {
          flush();
          visit(element, element, canEdit);
          flush();
        } else if (element.tagName === 'BR') {
          if (current) current.text += '\n';
        } else {
          visit(element, owner, canEdit);
        }
      }
    }
  };
  visit(root, root, !root.closest('pre,code,[contenteditable="false"]'));
  flush();
  return blocks;
}

/** Resolve the writing position only on review/open, never on each keystroke. */
export function writingNoteNearSelection(root: HTMLElement, notes: WritingNote[]): string | undefined {
  const selection = root.ownerDocument.getSelection();
  const node = selection?.focusNode;
  if (!node || (node !== root && !root.contains(node)) || !notes.length) return;
  const blocks = writingBlocks(root);
  const offset = selection!.focusOffset;
  const probe = node.nodeType === Node.TEXT_NODE ? node : node.childNodes[Math.max(0, offset - 1)] ?? node;
  const matching = blocks.map((block, index) => ({ block, index })).filter(({ block }) =>
    block.spans.some(span => span.editable && (span.node === probe || probe.contains(span.node))));
  const current = node.nodeType !== Node.TEXT_NODE && offset > 0 ? matching[matching.length - 1] : matching[0];
  if (!current) return;
  // Start with the current paragraph, then the next one with a note. At the
  // end of a document, return to the closest preceding paragraph with notes.
  const next = notes.find(note => note.block >= current.index);
  const candidate = next ?? notes.find(note => note.block === notes[notes.length - 1].block);
  return candidate && blocks[candidate.block]?.text === candidate.blockText ? candidate.id : undefined;
}

const passageIsEditable = (block: WritingBlock, start: number, end: number) =>
  !block.spans.some(span => !span.editable && span.start < end && span.start + span.node.length > start);

export function reviewWriting(html: string): WritingReview {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = writingBlocks(doc.body);
  const words = getWordCount(html);
  const result: WritingReview = { words, paragraphs: 0, readingMinutes: Math.max(1, Math.ceil(words / 200)), outline: [], notes: [] };
  blocks.forEach((block, index) => {
    const paragraph = block.text;
    if (!paragraph.trim()) return;
    if (/^H[1-6]$/.test(block.element.tagName)) {
      result.outline.push({ block: index, level: Number(block.element.tagName[1]), text: paragraph });
      return;
    }
    result.paragraphs++;
    const add = (start: number, quote: string, title: string, detail: string | NonNullable<WritingNote['detailMessage']>, replacement?: string) => {
      if (!passageIsEditable(block, start, start + quote.length)) return;
      const fallback = typeof detail === 'string' ? detail : detail.key.replace(/\{(\w+)\}/g, (token, key: string) => String(detail.parameters[key] ?? token));
      result.notes.push({ id: `${index}:${start}:${title}:${quote}`, block: index, blockText: paragraph, start, quote, title, detail: fallback, ...(typeof detail === 'string' ? {} : { detailMessage: detail }), replacement });
    };
    const repeated = /\b([a-z]+)(\s+)\1\b/gi;
    let match: RegExpExecArray | null;
    while ((match = repeated.exec(paragraph))) {
      add(match.index, match[0], 'An accidental echo?', 'This word appears twice in a row. Keep it if the repetition is intentional.', match[1]);
    }
    const phrases = /\b(in order to|due to the fact that|at this point in time|very unique)\b/gi;
    const simpler: Record<string, string> = { 'in order to': 'to', 'due to the fact that': 'because', 'at this point in time': 'now', 'very unique': 'unique' };
    while ((match = phrases.exec(paragraph))) {
      let replacement = simpler[match[0].toLowerCase()];
      if (/^[A-Z]/.test(match[0])) replacement = replacement[0].toUpperCase() + replacement.slice(1);
      add(match.index, match[0], 'A little more direct', { key: '“{replacement}” carries the same idea with fewer words. Your rhythm may call for the longer version.', parameters: { replacement } }, replacement);
    }
    const sentences = /[^.!?]+(?:[.!?]+|$)/g;
    while ((match = sentences.exec(paragraph))) {
      const sentence = match[0].trim();
      const count = sentence.split(/\s+/).length;
      if (count > 35) add(match.index + match[0].indexOf(sentence), sentence, 'Give this thought room to breathe', { key: 'This sentence runs to {count} words. Read it aloud; if you lose the thread, try a full stop where the thought turns.', parameters: { count } });
    }
  });
  return result;
}

/** Locate an exact, still-current passage, including text across inline formatting. */
export function writingNoteRange(root: HTMLElement, note: WritingNote): Range | null {
  const block = writingBlocks(root)[note.block];
  const end = note.start + note.quote.length;
  if (!block || block.text !== note.blockText || block.text.slice(note.start, end) !== note.quote || !passageIsEditable(block, note.start, end)) return null;
  const range = root.ownerDocument.createRange();
  let started = false;
  for (const { node, start } of block.spans) {
    if (!started && note.start >= start && note.start < start + node.length) {
      range.setStart(node, note.start - start);
      started = true;
    }
    if (started && end >= start && end <= start + node.length) {
      range.setEnd(node, end - start);
      return range;
    }
  }
  return null;
}
