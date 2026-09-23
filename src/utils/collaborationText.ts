import * as Y from "yjs";
import type { Fragment, Node as PMNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { absolutePositionToRelativePosition, initProseMirrorDoc } from "y-prosemirror";

/** Retain character identity instead of inferring an insertion from equal strings.
 * At a mark boundary, "quoted" + " rest" -> "quoted more" + " rest" can be
 * represented by a string diff as inserting after the existing space. Deleting
 * that old space concurrently then joins the remote words. The transaction's
 * range preserves which space was actually inserted by the local author.
 */
export function collaborativeTextSplice(
  transaction: Transaction,
  fragment: Y.XmlFragment,
  mapping: ReturnType<typeof initProseMirrorDoc>["mapping"],
): { text: Y.XmlText; index: number; remove: number; insert: string } | undefined {
  if (transaction.steps.length !== 1) return;
  const changes: { from: number; to: number; newFrom: number; newTo: number }[] = [];
  transaction.steps[0].getMap().forEach((from, to, newFrom, newTo) => {
    changes.push({ from, to, newFrom, newTo });
  });
  if (changes.length !== 1) return;
  let { from, to, newFrom, newTo } = changes[0];
  const splitsSurrogate = (document: PMNode, position: number) => {
    const at = document.resolve(position);
    if (!at.parent.isTextblock || !at.parentOffset || at.parentOffset === at.parent.content.size) return false;
    const pair = at.parent.textBetween(at.parentOffset - 1, at.parentOffset + 1, "", "\uFFFC");
    return /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(pair);
  };
  // HTML diffs use UTF-16 offsets. A common high surrogate is not a complete
  // unchanged character; deleting only its low half corrupts Yjs undo history.
  if (splitsSurrogate(transaction.before, from) || splitsSurrogate(transaction.doc, newFrom)) { from--; newFrom--; }
  if (splitsSurrogate(transaction.before, to) || splitsSurrogate(transaction.doc, newTo)) { to++; newTo++; }
  const start = transaction.before.resolve(from), end = transaction.before.resolve(to);
  if (!start.sameParent(end) || !start.parent.isTextblock) return;
  const before = transaction.before.slice(from, to), after = transaction.doc.slice(newFrom, newTo);
  const textOnly = (content: Fragment) => {
    let result = true;
    content.forEach(node => { if (!node.isText) result = false; });
    return result;
  };
  if (before.openStart || before.openEnd || after.openStart || after.openEnd ||
      !textOnly(before.content) || !textOnly(after.content)) return;
  const removed = before.content.textBetween(0, before.content.size, "", "");
  const inserted = after.content.textBetween(0, after.content.size, "", "");
  // HTML formatting commands can express a marks-only change as a replace
  // step. Replacing its characters would destroy their shared identity.
  if (removed === inserted) return;
  // A single HTML update may also format existing letters and append new text.
  // Keep the unchanged letters; only splice the actual text difference within
  // this transaction's range, never across neighboring text outside that range.
  let prefix = 0, suffix = 0;
  while (prefix < removed.length && prefix < inserted.length && removed[prefix] === inserted[prefix]) prefix++;
  while (suffix < removed.length - prefix && suffix < inserted.length - prefix &&
    removed[removed.length - 1 - suffix] === inserted[inserted.length - 1 - suffix]) suffix++;
  if (splitsSurrogate(transaction.before, from + prefix) || splitsSurrogate(transaction.doc, newFrom + prefix)) prefix--;
  if (splitsSurrogate(transaction.before, to - suffix) || splitsSurrogate(transaction.doc, newTo - suffix)) suffix--;
  const resolve = (position: number) => Y.createAbsolutePositionFromRelativePosition(
    absolutePositionToRelativePosition(position, fragment, mapping), fragment.doc!,
  );
  const first = resolve(from + prefix), last = resolve(to - suffix);
  if (!first || !last || !(first.type instanceof Y.XmlText) || first.type !== last.type ||
      last.index - first.index !== to - from - prefix - suffix) return;
  return {
    text: first.type, index: first.index, remove: to - from - prefix - suffix,
    insert: inserted.slice(prefix, inserted.length - suffix),
  };
}
