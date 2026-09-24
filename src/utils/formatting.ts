import { CHECKLIST_CLASS } from "./checklist";
import { rangeCapturesContent, rangeForEditableFormatting, rangeTouchesElement } from "./rangeContact";
import { captureSelectionBookmark, type RememberReplacement } from "./selectionBookmark";
import { createTypingPlaceholder } from './typingPlaceholder';

export interface SelectionSnapshot {
  range: Range | null;
}

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
]);

const isElement = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE;

const getSelection = () => {
  // Try window.getSelection first (for test environment compatibility)
  if (globalThis.window?.getSelection) {
    return globalThis.window.getSelection();
  }
  // Fallback to globalThis.getSelection
  if (typeof globalThis.getSelection === "function") {
    return globalThis.getSelection();
  }
  return null;
};

export const getSelectionRange = (): Range | null => {
  const selection = getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  return selection.getRangeAt(0);
};

export const saveSelection = (): Range | null => {
  const range = getSelectionRange();
  return range ? range.cloneRange() : null;
};

export const restoreSelection = (range: Range | null) => {
  if (!range) return;
  const selection = getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
};

const ensureRangeWithinRoot = (range: Range, root: HTMLElement) => {
  const commonAncestor = range.commonAncestorContainer;
  if (!root.contains(commonAncestor)) {
    throw new Error("Selection is outside the editor root.");
  }
};

const getClosestElement = (
  node: Node | null,
  predicate: (element: HTMLElement) => boolean,
  root: HTMLElement
): HTMLElement | null => {
  let current: Node | null = node;
  while (current && current !== root) {
    if (isElement(current) && predicate(current)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
};

const collectFragmentNodes = (fragment: DocumentFragment): Node[] => {
  const nodes: Node[] = [];
  let current = fragment.firstChild;
  while (current) {
    nodes.push(current);
    current = current.nextSibling;
  }
  return nodes;
};

const wrapNodes = (
  nodes: Node[],
  tagName: string,
  attributes: Record<string, string>
) => {
  if (nodes.length === 0) return null;
  const wrapper = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    wrapper.setAttribute(key, value);
  });
  nodes.forEach((node) => wrapper.appendChild(node));
  return wrapper;
};

const replaceTag = (element: HTMLElement, tagName: string, remember?: RememberReplacement): HTMLElement => {
  if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
    return element;
  }
  const newElement = document.createElement(tagName);
  while (element.firstChild) {
    newElement.appendChild(element.firstChild);
  }
  element.replaceWith(newElement);
  remember?.(element, newElement);
  return newElement;
};

const wrapRangeWithElement = (range: Range, element: HTMLElement): Range => {
  const selection = getSelection();
  const contents = range.extractContents();
  element.appendChild(contents);
  range.insertNode(element);
  const newRange = document.createRange();
  newRange.selectNodeContents(element);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return newRange;
};

const createPlaceholderRange = (range: Range, element: HTMLElement): Range => {
  const placeholder = createTypingPlaceholder(element.ownerDocument);
  element.appendChild(placeholder);
  range.insertNode(element);
  const selection = getSelection();
  const newRange = document.createRange();
  newRange.setStart(placeholder.firstChild!, 1);
  newRange.collapse(true);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return newRange;
};

export const wrapSelection = (
  root: HTMLElement,
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  if (range.collapsed) {
    createPlaceholderRange(range, element);
  } else {
    wrapRangeWithElement(range, element);
  }
};

const isRangeFullyStyled = (
  range: Range,
  tagName: string,
  root: HTMLElement
): boolean => {
  const container = range.commonAncestorContainer;

  // A TreeWalker never yields its own root, so when both range endpoints sit
  // inside a single text node (a double-click word selection) the walk below
  // visits nothing and misreports the range as unstyled — the "toggle bold
  // nests <strong><strong>" bug. Check that lone text node directly.
  if (container.nodeType === Node.TEXT_NODE) {
    return (
      !!container.textContent &&
      getClosestElement(
        container,
        (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
        root
      ) !== null
    );
  }

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!range.intersectsNode(node)) {
          return NodeFilter.FILTER_SKIP;
        }
        // Zero-width contact — a selection boundary parked at (text, 0) of the
        // NEXT block's node — is not styled content of this selection. Counting
        // it made a fully-bold selection misreport as partially styled, turning
        // toggle-off into a re-apply. #r16-2
        const contentRange = document.createRange();
        contentRange.selectNodeContents(node);
        if (
          range.compareBoundaryPoints(Range.START_TO_END, contentRange) <= 0 ||
          range.compareBoundaryPoints(Range.END_TO_START, contentRange) >= 0
        ) {
          return NodeFilter.FILTER_SKIP;
        }
        return node.textContent
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );

  let encountered = false;
  while (walker.nextNode()) {
    encountered = true;
    const closest = getClosestElement(
      walker.currentNode,
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
      root
    );
    if (!closest) {
      return false;
    }
  }

  return encountered;
};

const findStyledParent = (node: Node, tagName: string): HTMLElement | null => {
  let current: Node | null = node;
  while (current) {
    if (
      isElement(current) &&
      current.tagName.toLowerCase() === tagName.toLowerCase()
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const unwrapMatchingElements = (
  fragment: DocumentFragment,
  tagName: string
): void => {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
  const toUnwrap: HTMLElement[] = [];
  let current: Node | null = walker.currentNode;
  while (current) {
    if (
      current instanceof HTMLElement &&
      current.tagName.toLowerCase() === tagName.toLowerCase()
    ) {
      toUnwrap.push(current);
    }
    current = walker.nextNode();
  }
  toUnwrap.forEach((node) => unwrapElement(node));
};

// Split a single styled element around the selected range so only the selected
// slice loses the styling, e.g. removing bold from "He" in <strong>Hello</strong>
// yields He<strong>llo</strong>. The leading/trailing slices are re-wrapped in a
// shallow clone of the original element so their attributes (href, style, …) are
// preserved. Handles prefix, suffix, interior, and whole-run selections.
const splitStyledParentAroundRange = (
  range: Range,
  styledParent: HTMLElement,
  tagName: string
): Node[] => {
  const parent = styledParent.parentNode;
  if (!parent) return [];

  // Extract the trailing slice first: removing later content keeps the earlier
  // (leading) offsets valid for the second extraction.
  const afterRange = document.createRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  afterRange.setEnd(styledParent, styledParent.childNodes.length);
  const afterFragment = afterRange.extractContents();

  const beforeRange = document.createRange();
  beforeRange.setStart(styledParent, 0);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeFragment = beforeRange.extractContents();

  unwrapMatchingElements(beforeFragment, tagName);
  unwrapMatchingElements(afterFragment, tagName);

  const makeSlice = (fragment: DocumentFragment): HTMLElement | null => {
    if (!fragment.firstChild) return null;
    const wrapper = styledParent.cloneNode(false) as HTMLElement;
    wrapper.appendChild(fragment);
    // Extracting a zero-length range at a text boundary yields an empty text
    // node; drop the slice unless it carries real text or an element (img/br).
    if (!wrapper.textContent && !wrapper.firstElementChild) return null;
    return wrapper;
  };
  const beforeSlice = makeSlice(beforeFragment);
  const afterSlice = makeSlice(afterFragment);

  // The remaining (selected) middle content is unstyled; flatten any nested
  // same-tag descendants so nothing keeps the styling.
  const middleFragment = document.createDocumentFragment();
  while (styledParent.firstChild) {
    middleFragment.appendChild(styledParent.firstChild);
  }
  unwrapMatchingElements(middleFragment, tagName);
  const middleNodes = collectFragmentNodes(middleFragment);

  const output = document.createDocumentFragment();
  if (beforeSlice) output.appendChild(beforeSlice);
  output.appendChild(middleFragment);
  if (afterSlice) output.appendChild(afterSlice);
  parent.replaceChild(output, styledParent);

  const selection = getSelection();
  if (selection && middleNodes.length > 0) {
    const newRange = document.createRange();
    newRange.setStartBefore(middleNodes[0]);
    newRange.setEndAfter(middleNodes.at(-1)!);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return middleNodes;
};

/** An emptied inline leftover of a boundary-anchored extraction. Block/cell
 * elements are never husks (an empty <p>/<td> is legitimate structure), and
 * neither is anything carrying media or a contenteditable widget. */
const isEmptyInlineHusk = (el: Element): boolean =>
  !BLOCK_OR_CELL_TAGS.has(el.tagName.toLowerCase()) &&
  !(el.textContent ?? "") &&
  !el.querySelector("img, br, hr, iframe, video, table") &&
  !el.hasAttribute("contenteditable");

/**
 * Every empty inline husk currently under `root`. Snapshotting BEFORE a wrap
 * lets the cleanup tell the author's own intentional empty inlines apart from
 * the ones extractContents is about to clone. #r18
 */
export const snapshotEmptyInlineHusks = (root: HTMLElement): Set<Element> =>
  new Set(Array.from(root.querySelectorAll("*")).filter(isEmptyInlineHusk));

/**
 * Remove the empty inline husks a wrap operation just created — the emptied
 * ORIGINAL an inline element leaves behind when a slice boundary sits at
 * (textNode, 0) inside it and extractContents clones the styled portion out.
 * A stale-href <a></a> is the worst case: the sanitizer keeps it, so without
 * this it round-trips into the v-model. Pre-snapshot husks survive. #r18
 */
export const removeNewEmptyInlineHusks = (
  root: HTMLElement,
  before: Set<Element>
): void => {
  root.querySelectorAll("*").forEach((el) => {
    if (isEmptyInlineHusk(el) && !before.has(el)) {
      el.remove();
    }
  });
};

/** Un-style `range` and return the reinserted (now unstyled) nodes. */
const removeInlineStyleFromRange = (range: Range, tagName: string): Node[] => {
  const styledParent = findStyledParent(range.commonAncestorContainer, tagName);

  // Common case: the whole selection lives inside one styled element. Split it
  // so the selected slice is genuinely unstyled (prefix/suffix/interior/whole).
  if (styledParent && styledParent.parentNode) {
    return splitStyledParentAroundRange(range, styledParent, tagName);
  }

  // Snapshot BEFORE extraction: empty inline elements that already exist are
  // the author's own content (an intentional placeholder), not our litter —
  // the cleanup below must never delete them. #r17-3
  const scope = range.commonAncestorContainer;
  const scopeEl =
    scope.nodeType === Node.ELEMENT_NODE
      ? (scope as Element)
      : scope.parentElement;
  const preExistingEmpty = new Set(
    Array.from(scopeEl?.querySelectorAll("*") ?? []).filter(isEmptyInlineHusk)
  );

  // Fallback for a selection spanning multiple sibling styled runs: strip the
  // tag from the extracted fragment and reinsert it in place.
  const fragment = range.extractContents();
  unwrapMatchingElements(fragment, tagName);
  const nodes = collectFragmentNodes(fragment);
  range.insertNode(fragment);

  // A range boundary sitting INSIDE a styled element makes extractContents
  // CLONE it (the clone travels, the original stays behind emptied) — drop
  // those NEW empty inline husks (any tag: a boundary parked inside <em>
  // leaves an <em></em> clone too) so un-styling never litters. Pre-existing
  // empties survive. #r16-2 #r17-2 #r17-3
  scopeEl?.querySelectorAll("*").forEach((el) => {
    if (isEmptyInlineHusk(el) && !preExistingEmpty.has(el)) {
      el.remove();
    }
  });

  // The cleanup may have removed husks that were part of the reinserted
  // fragment — only still-attached nodes can anchor a selection.
  const attached = nodes.filter((node) => document.contains(node));

  const selection = getSelection();
  if (selection && attached.length > 0) {
    const newRange = document.createRange();
    newRange.setStartBefore(attached[0]);
    newRange.setEndAfter(attached.at(-1)!);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  return attached;
};

const removeInlineStyleAtCaret = (
  range: Range,
  tagName: string,
  attributes: Record<string, string>,
  root: HTMLElement
) => {
  let existing = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
    root
  );

  if (!existing) {
    wrapSelection(root, tagName, attributes);
    return;
  }

  // Imported prose can nest the same mark. Turning it off must leave all of
  // those ancestors, while keeping any other active styles at the caret.
  let outer = getClosestElement(existing.parentNode,
    element => element.tagName.toLowerCase() === tagName.toLowerCase(), root);
  while (outer) {
    existing = outer;
    outer = getClosestElement(existing.parentNode,
      element => element.tagName.toLowerCase() === tagName.toLowerCase(), root);
  }

  const placeholder = createTypingPlaceholder(root.ownerDocument);
  const caret = placeholder.firstChild as Text;
  let continuation: Node = placeholder;
  let ancestor = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer as HTMLElement : range.startContainer.parentElement;
  while (ancestor && ancestor !== existing) {
    if (ancestor.tagName.toLowerCase() !== tagName.toLowerCase()) {
      const wrapper = ancestor.cloneNode(false);
      // The original anchor stays with the adjacent authored content.
      (wrapper as HTMLElement).removeAttribute('id');
      wrapper.appendChild(continuation);
      continuation = wrapper;
    }
    ancestor = ancestor.parentElement;
  }

  const parent = existing.parentNode;
  if (!parent) {
    return;
  }

  const referenceNode = existing.nextSibling;

  const beforeRange = document.createRange();
  beforeRange.setStart(existing, 0);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeFragment = beforeRange.cloneContents();

  const afterRange = document.createRange();
  afterRange.setStart(range.startContainer, range.startOffset);
  afterRange.setEnd(existing, existing.childNodes.length);
  const afterFragment = afterRange.cloneContents();

  existing.remove();

  const keepStyledContent = (fragment: DocumentFragment) => {
    const wrapper = existing.cloneNode(false) as HTMLElement;
    Object.entries(attributes).forEach(([key, value]) => wrapper.setAttribute(key, value));
    wrapper.appendChild(fragment);
    return isEmptyInlineHusk(wrapper) ? null : wrapper;
  };
  const beforeWrapper = keepStyledContent(beforeFragment);
  const afterWrapper = keepStyledContent(afterFragment);
  if (beforeWrapper && afterWrapper) afterWrapper.removeAttribute('id');

  if (beforeWrapper && referenceNode) {
    referenceNode.before(beforeWrapper);
  } else if (beforeWrapper) {
    parent.appendChild(beforeWrapper);
  }

  parent.insertBefore(continuation, referenceNode);

  if (afterWrapper && referenceNode) {
    referenceNode.before(afterWrapper);
  } else if (afterWrapper) {
    parent.appendChild(afterWrapper);
  }

  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    // A boundary between inline elements is ambiguous to native typing: the
    // browser can continue the previous mark even after the toolbar says off.
    // A concrete text point outside that mark gives typing a stable owner.
    newRange.setStart(caret, caret.length);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const applyInlineStyle = (
  root: HTMLElement,
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  if (range.collapsed) {
    removeInlineStyleAtCaret(range, tagName, attributes, root);
    return;
  }

  // Per-block SLICES: one clamped sub-range per leaf block PLUS each dropped
  // ancestor's direct inline runs, so a parent <li>/<td>/<blockquote>'s own
  // text is never silently skipped. #r16-4 #r17-1
  const slices = getBlockSlicesInRange(range, root);

  // Zero slices means either a pure boundary-touch selection (no capture →
  // structural no-op; wrapping would splice empty block clones into an inline
  // element) or BARE inline content under the root with no block wrapper
  // (typing into an empty contenteditable) — there the raw range is safe: with
  // no blocks there is no boundary to rip across. #r15-4
  const targets =
    slices.length > 0 ? slices : rangeCapturesContent(range) ? [range] : [];
  if (targets.length === 0) return;

  // Toggle-OFF runs per-slice too: the check on clamped slices keeps a
  // triple-click boundary from misreporting a fully-bold block as partial
  // (#r16-2), and per-slice removal never extracts across a block boundary —
  // the raw-range removal cloned the partially-contained <p>s and left empty
  // <p></p> husks around the selection. #r17-2
  if (targets.every((slice) => isRangeFullyStyled(slice, tagName, root))) {
    // Mutate BACK TO FRONT: two slices can share a container (a parent's
    // "head" and "tail" runs around a sublist), and an earlier extraction
    // would shift the offsets a later slice was built on. Reverse-order
    // mutations only ever touch positions AFTER the remaining slices.
    const groups: Node[][] = [];
    [...targets].reverse().forEach((slice) => {
      groups.push(removeInlineStyleFromRange(slice, tagName));
    });
    const removed = groups.reverse().flat();
    const selection = getSelection();
    if (selection && removed.length > 0) {
      const newRange = document.createRange();
      newRange.setStartBefore(removed[0]);
      newRange.setEndAfter(removed.at(-1)!);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }

  // Wrap each slice independently. Wrapping the whole extracted fragment in
  // one inline element would nest blocks inside an inline tag
  // (<strong><p>…</p></strong>) — invalid DOM the parser restructures on any
  // round-trip. Per-slice keeps it valid, matching execCommand:
  // <p>He<strong>llo</strong></p><p><strong>Wo</strong>rld</p>.
  const huskBaseline = snapshotEmptyInlineHusks(root);
  const wrappers = wrapInlineSlices(targets, tagName, attributes);
  // A slice boundary at (textNode, 0) inside an <em>/<a> makes extractContents
  // clone it and leave the emptied original behind — drop those. #r18
  removeNewEmptyInlineHusks(root, huskBaseline);
  const selection = getSelection();
  if (selection && wrappers.length > 0) {
    const newRange = document.createRange();
    newRange.setStartBefore(wrappers[0]);
    newRange.setEndAfter(wrappers[wrappers.length - 1]);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

/**
 * Wrap each slice in its own inline element, mutating BACK TO FRONT: two
 * slices can share a container (a parent block's "head" and "tail" inline
 * runs around a sublist), and an earlier extraction would shift the offsets a
 * later slice was built on. Reverse order keeps every remaining slice ahead
 * of all mutations. Returns the wrappers in DOCUMENT order.
 */
const wrapInlineSlices = (
  slices: Range[],
  tagName: string,
  attributes: Record<string, string>
): HTMLElement[] => {
  const wrappers: HTMLElement[] = [];
  [...slices].reverse().forEach((sub) => {
    if (sub.collapsed) return;
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    const contents = sub.extractContents();
    unwrapMatchingElements(contents, tagName);
    element.appendChild(contents);
    sub.insertNode(element);
    wrappers.push(element);
  });
  return wrappers.reverse();
};

const getBlockAncestor = (
  node: Node,
  root: HTMLElement
): HTMLElement | null => {
  return getClosestElement(
    node,
    (element) => BLOCK_TAGS.has(element.tagName.toLowerCase()),
    root
  );
};

/**
 * Table cells hold text directly and are NOT in BLOCK_TAGS, so a selection that
 * runs from a paragraph into a cell used to collect only the paragraph. That
 * made it look single-block, and the single-block path would `extractContents()`
 * straight across the table boundary — splitting the table and wrapping partial
 * table structure inside an inline tag. Treating a cell as a block boundary here
 * routes such a selection through the per-block path, which slices each block
 * independently and never reaches across the table.
 *
 * blockquote and pre are here for the same reason: they hold text DIRECTLY and
 * were absent from the global BLOCK_TAGS, so a selection spanning a paragraph
 * and a blockquote/pre collected only the paragraph and orphaned the quote's
 * (or code block's) own text — bold/link/font-size silently skipped it, and
 * font-size injected ghost empty-block husks. #r18
 *
 * Scoped to this collector on purpose: the global BLOCK_TAGS also drives
 * getBlockAncestor for the indent/align/caret paths, which should keep their
 * existing notion of a block.
 */
const BLOCK_OR_CELL_TAGS = new Set([
  ...BLOCK_TAGS,
  "td",
  "th",
  "blockquote",
  "pre",
]);

const getBlockOrCellAncestor = (
  node: Node,
  root: HTMLElement
): HTMLElement | null =>
  getClosestElement(
    node,
    (element) => BLOCK_OR_CELL_TAGS.has(element.tagName.toLowerCase()),
    root
  );

/**
 * Collect every block-level element that a range intersects, from the
 * outermost block containing the start to the outermost block containing the
 * end. Only the top-most block within the root is kept for each intersected
 * block so that nested blocks are not converted twice. Mirrors the multi-block
 * collection performed by applyTextAlignment.
 */
const collectTouchedBlocks = (
  range: Range,
  root: HTMLElement
): HTMLElement[] => {
  const blocks: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const addBlock = (node: Node | null) => {
    const block = node ? getBlockOrCellAncestor(node, root) : null;
    // Boundary-leak guard: a range boundary can sit INSIDE a block at
    // (firstChild, 0) while selecting none of it — that block is not part of
    // the selection and must not be force-added here either.
    if (block && !seen.has(block) && rangeTouchesElement(range, block)) {
      seen.add(block);
      blocks.push(block);
    }
  };

  // Walk every element inside the root, keeping the ones the range genuinely
  // touches (rangeTouchesElement, not the boundary-leaky intersectsNode).
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const element = node as HTMLElement;
      if (!BLOCK_OR_CELL_TAGS.has(element.tagName.toLowerCase())) {
        return NodeFilter.FILTER_SKIP;
      }
      return rangeTouchesElement(range, element)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  let current: Node | null = walker.nextNode();
  while (current) {
    // Normalise to the outermost block ancestor so nested blocks collapse
    // onto a single entry (e.g. a <li> inside a <div>).
    addBlock(current);
    current = walker.nextNode();
  }

  // Guarantee the blocks holding the range boundaries are included even when
  // the boundary sits on a text node the walker never visits directly.
  addBlock(range.startContainer);
  addBlock(range.endContainer);

  // Preserve document order (the trailing boundary additions may append out of
  // order relative to the walk).
  blocks.sort((a, b) => {
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  return blocks;
};

/** The direct <ul>/<ol> children that converting a list item lifts OUT of it
 * (drainListItemInto). A collected descendant sitting inside one of these
 * survives its ancestor's conversion untouched, so both can be converted in the
 * same pass. Any other block tag swallows its nested blocks on conversion. */
const drainableSublists = (block: HTMLElement): HTMLElement[] =>
  block.tagName.toLowerCase() === "li"
    ? (Array.from(block.children).filter((child) =>
        ["ul", "ol"].includes(child.tagName.toLowerCase())
      ) as HTMLElement[])
    : [];

export const getBlocksInRange = (
  range: Range,
  root: HTMLElement
): HTMLElement[] => {
  const blocks = collectTouchedBlocks(range, root);

  return blocks.filter((block) => {
    const descendants = blocks.filter(
      (other) => other !== block && block.contains(other)
    );
    if (descendants.length === 0) return true;

    // A collected ANCESTOR is normally dropped: a wrapper <div> plus its inner
    // <p>s, or a <td> plus the <p>s it holds, breaks the disjoint-subtree
    // invariant per-block consumers rely on — the ancestor's conversion
    // swallows the descendants it is about to convert too. #r16-4
    //
    // Two conditions make it safe (and necessary) to keep: the range captures
    // text the block holds DIRECTLY — so dropping it would silently skip
    // content the user selected — and every collected descendant sits in a
    // sublist the conversion lifts out. That is exactly a bullet selected
    // together with its own sub-bullet. #R23-11
    if (blockOwnSlices(block, range).length === 0) return false;
    const sublists = drainableSublists(block);
    return descendants.every((descendant) =>
      sublists.some((sublist) => sublist.contains(descendant))
    );
  });
};

/** Selector matching every block/cell tag — used to spot a nested block held
 * inside an otherwise-inline child (a <ul> wrapping <li>s, a <table>…). */
const BLOCK_OR_CELL_SELECTOR = Array.from(BLOCK_OR_CELL_TAGS).join(",");

/**
 * Whether a child node is STRUCTURAL: a block/cell itself, or an element that
 * CONTAINS one (a <ul>/<ol>/<table> holding the real blocks). An inline run
 * must break on it — reaching a range boundary INTO such a child and
 * extracting would rip the nested structure (cloning a ghost <ul><li></li>).
 */
const isStructuralChild = (child: Node): boolean =>
  child.nodeType === Node.ELEMENT_NODE &&
  (BLOCK_OR_CELL_TAGS.has((child as HTMLElement).tagName.toLowerCase()) ||
    (child as HTMLElement).querySelector(BLOCK_OR_CELL_SELECTOR) !== null);

/**
 * The per-block SLICES of a range: for every touched block, one clamped
 * sub-range per contiguous run of its DIRECT inline children. Runs break on
 * any STRUCTURAL child, so:
 *  - a parent block's own text is sliced even when it also holds a nested
 *    block (a <li>'s text next to its sublist — #r17-1), and
 *  - the slice never reaches INTO an untouched nested block, so clamping +
 *    extractContents can't rip the sublist structure (the ghost
 *    <ul><li></li></ul> clone — #r18). Collected nested blocks get their own
 *    slice in their own iteration.
 *
 * All slices are disjoint subtrees' sub-ranges, so one built up front stays
 * valid after earlier slices have been mutated. Slices capturing no real
 * content (pure boundary touches) are filtered out.
 */
/**
 * The sub-ranges of `range` covering the content `block` holds DIRECTLY: one
 * per contiguous run of its non-structural direct children, clamped to the
 * range. Runs that capture nothing (pure boundary touches) are dropped, so an
 * empty result means "the range selects none of this block's own content".
 */
const blockOwnSlices = (block: HTMLElement, range: Range): Range[] => {
  const slices: Range[] = [];
  let runStart: Node | null = null;
  let runEnd: Node | null = null;
  const flush = () => {
    if (runStart && runEnd) {
      const sub = document.createRange();
      sub.setStartBefore(runStart);
      sub.setEndAfter(runEnd);
      if (range.compareBoundaryPoints(Range.START_TO_START, sub) > 0) {
        sub.setStart(range.startContainer, range.startOffset);
      }
      if (range.compareBoundaryPoints(Range.END_TO_END, sub) < 0) {
        sub.setEnd(range.endContainer, range.endOffset);
      }
      if (!sub.collapsed && rangeCapturesContent(sub)) slices.push(sub);
    }
    runStart = null;
    runEnd = null;
  };
  for (const child of Array.from(block.childNodes)) {
    if (isStructuralChild(child)) {
      flush();
      continue;
    }
    if (!runStart) runStart = child;
    runEnd = child;
  }
  flush();
  return slices;
};

export const getBlockSlicesInRange = (
  range: Range,
  root: HTMLElement
): Range[] => {
  const slices = collectTouchedBlocks(range, root).flatMap((block) =>
    blockOwnSlices(block, range)
  );

  // Document order — runs from different blocks are appended per-block.
  slices.sort((a, b) => a.compareBoundaryPoints(Range.START_TO_START, b));
  return slices;
};

const selectElements = (elements: HTMLElement[]) => {
  const selection = getSelection();
  if (!selection || elements.length === 0) return;
  const newRange = document.createRange();
  newRange.setStartBefore(elements[0]);
  newRange.setEndAfter(elements[elements.length - 1]);
  selection.removeAllRanges();
  selection.addRange(newRange);
};

/**
 * Move an <li>'s children into `newBlock`, but keep any nested sublist OUT of it:
 * a <ul>/<ol> inside a <p>/<hN> is invalid and the browser silently re-splits it
 * on the next round-trip. Returns the drained sublists in document order so the
 * caller can re-insert them as real lists after `newBlock`.
 */
const drainListItemInto = (
  li: HTMLElement,
  newBlock: HTMLElement
): HTMLElement[] => {
  const nestedLists: HTMLElement[] = [];
  let child = li.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (isElement(child) && ["ul", "ol"].includes(child.tagName.toLowerCase())) {
      nestedLists.push(child);
      li.removeChild(child);
    } else {
      newBlock.appendChild(child);
    }
    child = next;
  }
  return nestedLists;
};

/**
 * Unnest a list item by converting it to a block element outside the list
 * Returns the new block element
 */
const unnestListItem = (li: HTMLElement, tagName: string, remember?: RememberReplacement): HTMLElement => {
  const list = li.parentElement;
  if (!list || !["ul", "ol"].includes(list.tagName.toLowerCase())) {
    return replaceTag(li, tagName, remember);
  }

  const isChecklist = list.classList.contains(CHECKLIST_CLASS);
  const newBlock = document.createElement(tagName);
  // Any sublist the item held stays a real list (never inside newBlock).
  const nestedLists = drainListItemInto(li, newBlock);

  // Nodes that take the item's place, in document order: the converted block,
  // its former sublist(s), then a fresh list holding the items that followed it.
  const replacement: Node[] = [newBlock, ...nestedLists];

  const itemsAfter: Element[] = [];
  let nextSibling = li.nextElementSibling;
  while (nextSibling) {
    itemsAfter.push(nextSibling);
    nextSibling = nextSibling.nextElementSibling;
  }

  // Count the <li>s that PRECEDE the converted one, while it is still in place.
  // Captured before removal — after it, the preceding and following items are
  // briefly indistinguishable. Used to continue the ordinal below. #R23-13
  let precedingItems = 0;
  for (
    let prev = li.previousElementSibling;
    prev;
    prev = prev.previousElementSibling
  ) {
    if (prev.tagName.toLowerCase() === "li") precedingItems += 1;
  }

  // Remove the list item
  li.remove();

  // Items that followed the converted one stay listed, in a new list of the
  // same kind — and checklist-ness — inserted after the converted block.
  if (itemsAfter.length > 0) {
    const listTag = list.tagName.toLowerCase();
    const newList = document.createElement(listTag);
    if (isChecklist) newList.classList.add(CHECKLIST_CLASS);
    // Continue the numbering: the tail carries on from where the original list
    // left off, so converting the middle of "1,2,3,4" leaves "3,4", not "1,2".
    // The trailing list's first item follows the preceding items AND the
    // converted one, offset by the list's own `start` (default 1). Mirrors
    // handleEnterInListItem's split. #R23-13
    if (listTag === "ol") {
      const originalStart = (list as HTMLOListElement).start || 1;
      (newList as HTMLOListElement).start =
        originalStart + precedingItems + 1;
    }
    itemsAfter.forEach((item) => newList.appendChild(item));
    replacement.push(newList);
  }

  // Splice the replacement nodes in where the list sits, preserving order.
  let anchor: Node = list;
  replacement.forEach((node) => {
    list.parentNode?.insertBefore(node, anchor.nextSibling);
    anchor = node;
  });

  // The original list keeps only the items that PRECEDED the converted one; if
  // none remain it is now empty and must go (no stray <ul>/<ol>).
  if (list.children.length === 0) {
    list.remove();
    remember?.(list, replacement);
  } else {
    remember?.(list, [list, ...replacement]);
  }

  remember?.(li, newBlock);
  return newBlock;
};

/**
 * Convert a single block element to a specific tag with NO toggle logic,
 * handling the special case of unnesting a list item when converting to a
 * heading. Returns the resulting block element.
 */
const convertBlockTo = (block: HTMLElement, newTag: string, remember?: RememberReplacement): HTMLElement => {
  // A list item leaves the list WHATEVER it becomes. Retagging it in place put
  // a <p>/<blockquote> directly inside the <ul> (invalid — the parser hoists it
  // out on the next round-trip) and dragged any sublist along inside it. Only
  // headings unnested before, so "Paragraph" over a bullet produced exactly
  // that. unnestListItem splices the new block, and the sublist it lifts out,
  // beside the list instead. #R23-11
  if (block.tagName.toLowerCase() === "li" && newTag.toLowerCase() !== "li") {
    return unnestListItem(block, newTag, remember);
  }

  return replaceTag(block, newTag, remember);
};

/**
 * Toggle a single block element: convert it to the target tag, or to the
 * fallback tag when it already matches the target. Returns the resulting
 * block element.
 */
const convertBlock = (
  block: HTMLElement,
  targetTag: string,
  fallbackTag: string,
  remember?: RememberReplacement
): HTMLElement => {
  const currentTag = block.tagName.toLowerCase();
  const newTag = currentTag === targetTag ? fallbackTag : targetTag;
  return convertBlockTo(block, newTag, remember);
};

/** Browsers initially type directly into an empty contenteditable. Format the
 * whole inline paragraph, including its marks, instead of inserting an empty
 * heading at the caret. Stop at line breaks and neighbouring block elements. */
const wrapLooseParagraph = (root: HTMLElement, range: Range, tag: string): HTMLElement | null => {
  let anchor: Node | null = range.startContainer;
  if (anchor === root) {
    anchor = root.childNodes[range.startOffset] ?? root.childNodes[range.startOffset - 1] ?? null;
  }
  while (anchor?.parentNode && anchor.parentNode !== root) anchor = anchor.parentNode;
  const inline = (node: Node | null): node is Node => Boolean(node &&
    (node.nodeType === Node.TEXT_NODE || (isElement(node) &&
      !BLOCK_OR_CELL_TAGS.has(node.tagName.toLowerCase()) &&
      !['br', 'hr', 'table', 'ul', 'ol', 'figure'].includes(node.tagName.toLowerCase()))));
  if (!inline(anchor) || anchor.parentNode !== root) return null;
  let first = anchor;
  let last = anchor;
  while (inline(first.previousSibling)) first = first.previousSibling;
  while (inline(last.nextSibling)) last = last.nextSibling;
  const paragraph = document.createRange();
  paragraph.setStartBefore(first);
  paragraph.setEndAfter(last);
  const wrapper = document.createElement(tag);
  const caret = wrapRangeWithElement(paragraph, wrapper);
  caret.collapse(false);
  return wrapper;
};

export const toggleBlock = (
  root: HTMLElement,
  tagName: string,
  fallbackTag = "p"
) => {
  const bookmark = captureSelectionBookmark(root);
  try {
    toggleBlockContent(root, tagName, fallbackTag, bookmark?.remember);
  } finally {
    bookmark?.restore();
  }
};

const toggleBlockContent = (
  root: HTMLElement,
  tagName: string,
  fallbackTag: string,
  remember?: RememberReplacement
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  const targetTag = tagName.toLowerCase();

  // Multi-block selection: convert every block-level element the range
  // intersects. The caller restores the exact original selection afterward.
  if (!range.collapsed) {
    const blocks = getBlocksInRange(range, root);
    if (blocks.length > 1) {
      // Word-style uniform conversion: decide the target ONCE for the whole
      // selection. Only when EVERY selected block already matches the target
      // tag does the action toggle off to the fallback; a mixed [h1, p, p]
      // selection + H1 becomes [h1, h1, h1], never the per-block flip
      // [p, h1, h1].
      const everyBlockMatchesTarget = blocks.every(
        (block) => effectiveBlockTag(block) === targetTag
      );
      const decidedTag = everyBlockMatchesTarget ? fallbackTag : targetTag;
      const converted = blocks.map((block) =>
        isTableCell(block)
          ? convertCellContentTo(block, decidedTag, remember)
          : convertBlockTo(block, decidedTag, remember)
      );
      selectElements(converted);
      return;
    }
  }

  const block = getBlockOrCellAncestor(range.startContainer, root);
  if (!block) {
    if (wrapLooseParagraph(root, range, tagName)) return;
    wrapSelection(root, tagName);
    return;
  }

  const replaced = isTableCell(block)
    ? convertCellContentTo(block, effectiveBlockTag(block) === targetTag ? fallbackTag : targetTag, remember)
    : convertBlock(block, targetTag, fallbackTag, remember);

  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(replaced);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

const convertBlockToList = (
  block: HTMLElement,
  listTag: "ul" | "ol",
  remember?: RememberReplacement
): HTMLElement => {
  const list = document.createElement(listTag);
  const listItem = document.createElement("li");
  while (block.firstChild) {
    listItem.appendChild(block.firstChild);
  }
  list.appendChild(listItem);
  block.replaceWith(list);
  remember?.(block, listItem);
  return listItem;
};

const unwrapList = (list: HTMLElement, remember?: RememberReplacement) => {
  const parent = list.parentNode;
  if (!parent) return;
  const fragment = document.createDocumentFragment();
  Array.from(list.children).forEach((child) => {
    if (isElement(child) && child.tagName.toLowerCase() === "li") {
      const paragraph = document.createElement("p");
      // A nested sublist stays a real list beside the paragraph, never inside it.
      const nestedLists = drainListItemInto(child, paragraph);
      fragment.appendChild(paragraph);
      nestedLists.forEach((nested) => fragment.appendChild(nested));
      remember?.(child, paragraph);
    } else {
      fragment.appendChild(child);
    }
  });
  const replacement = Array.from(fragment.childNodes);
  list.replaceWith(fragment);
  remember?.(list, replacement);
};

const isListTag = (element: HTMLElement | null): element is HTMLElement =>
  Boolean(element) && ["ul", "ol"].includes(element!.tagName.toLowerCase());

const getListAncestor = (
  node: Node,
  root: HTMLElement
): HTMLElement | null =>
  getClosestElement(node, (element) => isListTag(element), root);

/**
 * Wrap a collection of block-level elements into a single list, with one <li>
 * per block. The list replaces the first block in the DOM and the remaining
 * blocks are moved into it. Returns the created list.
 */
const isTableCell = (el: HTMLElement): boolean => {
  const tag = el.tagName.toLowerCase();
  return tag === "td" || tag === "th";
};

/**
 * The single block element that IS a cell's whole content, if there is one
 * (whitespace-only text nodes ignored). Used both to avoid nesting a second
 * heading inside the first and to answer "what block tag does this cell
 * effectively have" for the Word-style toggle decision. #R23-2
 */
const cellContentBlock = (cell: HTMLElement): HTMLElement | null => {
  const meaningful = Array.from(cell.childNodes).filter(
    (node) =>
      !(node.nodeType === Node.TEXT_NODE && !(node.textContent || "").trim())
  );
  if (meaningful.length !== 1) return null;
  const only = meaningful[0];
  return isElement(only) &&
    BLOCK_OR_CELL_TAGS.has(only.tagName.toLowerCase())
    ? (only as HTMLElement)
    : null;
};

/** The tag a selected block counts as for the "already matches" toggle. A cell
 * stands in for the single block it contains, so re-applying H1 to cells that
 * are already headings toggles off instead of nesting. #R23-2 */
const effectiveBlockTag = (block: HTMLElement): string =>
  isTableCell(block)
    ? cellContentBlock(block)?.tagName.toLowerCase() ?? ""
    : block.tagName.toLowerCase();

/** Convert a table cell's CONTENT to `newTag`, INSIDE the cell. Replacing the
 * cell itself produces `<tr><h1>…</h1></tr>` — invalid HTML that the parser
 * foster-parents out of the table on the next round-trip, ejecting the text
 * above the table and leaving an empty row. Mirrors wrapCellContentInList.
 * #R23-2 */
const convertCellContentTo = (
  cell: HTMLElement,
  newTag: string,
  remember?: RememberReplacement
): HTMLElement => {
  const inner = cellContentBlock(cell);
  if (inner) return convertBlockTo(inner, newTag, remember);
  const wrapper = document.createElement(newTag);
  while (cell.firstChild) {
    wrapper.appendChild(cell.firstChild);
  }
  cell.appendChild(wrapper);
  remember?.(cell, wrapper);
  return wrapper;
};

/** Wrap a table cell's OWN content in a list placed INSIDE the cell. A cell
 * must never be REPLACED by a list — that yields a bare <ul> directly inside
 * <tr>, invalid HTML the parser foster-parents out on the next round-trip,
 * obliterating the table. #r20-1 */
const wrapCellContentInList = (
  cell: HTMLElement,
  listTag: "ul" | "ol",
  remember?: RememberReplacement
): HTMLElement => {
  const list = document.createElement(listTag);
  const listItem = document.createElement("li");
  while (cell.firstChild) {
    listItem.appendChild(cell.firstChild);
  }
  list.appendChild(listItem);
  cell.appendChild(list);
  remember?.(cell, listItem);
  return list;
};

/**
 * Wrap the selected blocks into list(s). Blocks are grouped into runs that are
 * BOTH consecutive adjacent element siblings AND non-cells: only such a run is
 * safe to collapse into one list at the run's first block.
 *  - A table cell is handled on its own — its CONTENT becomes a list inside it,
 *    never replacing the cell (which would break the table). #r20-1
 *  - Requiring adjacency (not just a shared parent) stops a selection that
 *    straddles an EXISTING list — <p>A</p><ul><li>B</li></ul><p>C</p> — from
 *    collapsing A and C into one list and reordering C before B. #r19-2 #r20-2
 * Returns every created list in document order.
 */
const wrapBlocksIntoList = (
  blocks: HTMLElement[],
  listTag: "ul" | "ol",
  remember?: RememberReplacement
): HTMLElement[] => {
  const lists: HTMLElement[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (isTableCell(blocks[i])) {
      lists.push(wrapCellContentInList(blocks[i], listTag, remember));
      i++;
      continue;
    }

    // Extend the run only across immediately-adjacent same-parent non-cell
    // siblings (nextElementSibling equality implies both).
    let j = i + 1;
    while (
      j < blocks.length &&
      !isTableCell(blocks[j]) &&
      blocks[j - 1].nextElementSibling === blocks[j]
    ) {
      j++;
    }
    const group = blocks.slice(i, j);

    const list = document.createElement(listTag);
    group.forEach((block) => {
      const listItem = document.createElement("li");
      while (block.firstChild) {
        listItem.appendChild(block.firstChild);
      }
      list.appendChild(listItem);
      remember?.(block, listItem);
    });
    group[0].replaceWith(list);
    group.slice(1).forEach((block) => block.remove());
    lists.push(list);
    i = j;
  }
  return lists;
};

/**
 * Convert a single list item back into a paragraph, splitting the surrounding
 * list if necessary (via unnestListItem). Returns the created paragraph.
 */
const convertListItemToParagraph = (li: HTMLElement, remember?: RememberReplacement): HTMLElement =>
  unnestListItem(li, "p", remember);

export const toggleList = (root: HTMLElement, listTag: "ul" | "ol") => {
  const bookmark = captureSelectionBookmark(root);
  try {
    toggleListContent(root, listTag, bookmark?.remember);
  } finally {
    bookmark?.restore();
  }
};

const toggleListContent = (root: HTMLElement, listTag: "ul" | "ol", remember?: RememberReplacement) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  // Detect an existing list ancestor of EITHER type at the caret/start.
  const listAncestor = getListAncestor(range.startContainer, root);

  if (listAncestor) {
    const currentListTag = listAncestor.tagName.toLowerCase();

    // Fix #3: switching list type (e.g. caret in a <ul>, click Numbered)
    // retags the list in place instead of nesting one list inside another.
    if (currentListTag !== listTag) {
      // A selection spanning a bullet's own text AND its sub-bullet must
      // switch every level it touches, not just the outermost (Word/Docs
      // behavior) — the sub-list otherwise kept its old type. Only lists the
      // range genuinely touches retag: an untouched sibling sub-list stays,
      // and a selection wholly inside a sub-list never reaches here for the
      // parent (its listAncestor IS the sub-list). Collect before reparenting
      // the children: live Range endpoints move when their nodes are removed.
      const nestedLists = Array.from(listAncestor.querySelectorAll("ul, ol"))
        .filter(
          (nested): nested is HTMLElement =>
            nested.tagName.toLowerCase() !== listTag &&
            rangeTouchesElement(range, nested)
        );
      const retagged = replaceTag(listAncestor, listTag, remember);
      nestedLists.forEach((nested) => replaceTag(nested, listTag, remember));
      const li = getClosestElement(
        range.startContainer,
        (element) => element.tagName.toLowerCase() === "li",
        retagged
      );
      const selection = getSelection();
      if (selection && li) {
        const newRange = document.createRange();
        newRange.selectNodeContents(li);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      return;
    }

    // Same list type -> toggle OFF.
    const li = getClosestElement(
      range.startContainer,
      (element) => element.tagName.toLowerCase() === "li",
      listAncestor
    );

    // Fix #7: a collapsed caret only converts/outdents the current <li>,
    // splitting the list if needed. The whole list is unwrapped only when the
    // selection spans it (multi-item selection).
    const blocks = range.collapsed ? [] : getBlocksInRange(range, root);
    const spansMultipleItems =
      blocks.filter((block) => block.tagName.toLowerCase() === "li").length > 1;

    if (!spansMultipleItems && li) {
      const paragraph = convertListItemToParagraph(li, remember);
      const selection = getSelection();
      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(paragraph);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      return;
    }

    // Multiple items selected. Work on the DIRECT <li> children of the target
    // list (never nested descendants — a nested item is handled when its parent
    // is unlisted, and double-converting it corrupts the tree).
    const isLi = (el: Element) => el.tagName.toLowerCase() === "li";
    const directItems = Array.from(listAncestor.children).filter(
      isLi
    ) as HTMLElement[];
    // rangeTouchesElement, not intersectsNode: a selection ending INSIDE the
    // next item at (firstChild, 0) selects none of it and must not un-list it.
    const selectedItems = directItems.filter((item) =>
      rangeTouchesElement(range, item)
    );

    // Every item selected -> unwrap the whole list (this also frees any non-<li>
    // children and drains nested sublists so nothing lands inside a <p>).
    if (selectedItems.length > 0 && selectedItems.length === directItems.length) {
      unwrapList(listAncestor, remember);
      return;
    }

    // A STRICT SUBSET -> unlist only those items, splitting the list around them
    // so items outside the selection stay listed. (Previously this unwrapped the
    // whole list, un-listing untouched items too.) Processed in document order;
    // convertListItemToParagraph moves each item's content out rather than
    // destroying it, so later references stay valid.
    if (selectedItems.length > 0) {
      let lastParagraph: HTMLElement | null = null;
      for (const item of selectedItems) {
        lastParagraph = convertListItemToParagraph(item, remember);
      }
      const selection = getSelection();
      if (selection && lastParagraph) {
        const newRange = document.createRange();
        newRange.selectNodeContents(lastParagraph);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      return;
    }

    unwrapList(listAncestor, remember);
    return;
  }

  // Fix #2: multi-block selection wraps the intersected blocks into list(s),
  // grouped by parent so the list never crosses a structural boundary. #r19-2
  if (!range.collapsed) {
    const blocks = getBlocksInRange(range, root).filter(
      (block) => block.tagName.toLowerCase() !== "li"
    );
    if (blocks.length > 1) {
      const lists = wrapBlocksIntoList(blocks, listTag, remember);
      const items = lists.flatMap(
        (list) => Array.from(list.children) as HTMLElement[]
      );
      selectElements(items);
      return;
    }
  }

  const block = getBlockAncestor(range.startContainer, root);
  if (block) {
    const listItem = convertBlockToList(block, listTag, remember);
    const selection = getSelection();
    if (selection) {
      const newRange = document.createRange();
      newRange.selectNodeContents(listItem);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }

  // A cell holding text DIRECTLY is invisible to getBlockAncestor — td/th are
  // deliberately absent from BLOCK_TAGS — so control used to reach the raw
  // fallback below. That extracted across the table boundary and inserted a
  // bare <ul> into the <tr> (invalid HTML the parser foster-parents out,
  // wrecking the column structure) for a cross-cell selection, and split the
  // cell's text around an empty bullet for a plain caret. Convert the CELL's
  // own content into a list INSIDE the cell instead. The multi-block path
  // above misses this whenever the `!== "li"` filter drops the count below 2
  // (e.g. the other cell already holds a list). #r21-1 #r21-2
  const cell = getBlockOrCellAncestor(range.startContainer, root);
  if (cell && isTableCell(cell)) {
    const cellList = wrapCellContentInList(cell, listTag, remember);
    selectElements(Array.from(cellList.children) as HTMLElement[]);
    return;
  }

  const list = document.createElement(listTag);
  const listItem = document.createElement("li");
  const contents = range.extractContents();
  if (contents.childNodes.length === 0) {
    listItem.appendChild(document.createElement('br'));
  } else {
    listItem.appendChild(contents);
  }
  list.appendChild(listItem);
  range.insertNode(list);
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const isInlineStyleActive = (
  root: HTMLElement,
  tagName: string
): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  if (!range.collapsed) return isRangeFullyStyled(range, tagName, root);
  return Boolean(
    getClosestElement(
      range.startContainer,
      (element) => element.tagName.toLowerCase() === tagName.toLowerCase(),
      root
    )
  );
};

export const isBlockActive = (root: HTMLElement, tagName: string): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  const block = getBlockAncestor(range.startContainer, root);
  return block ? block.tagName.toLowerCase() === tagName.toLowerCase() : false;
};

export const isListActive = (
  root: HTMLElement,
  listTag: "ul" | "ol"
): boolean => {
  const range = getSelectionRange();
  if (!range) return false;
  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }
  const listAncestor = getClosestElement(
    range.startContainer,
    (element) => element.tagName.toLowerCase() === listTag,
    root
  );
  return Boolean(listAncestor);
};

/**
 * Indent a list item (move it into a nested list)
 */
export const indentListItem = (root: HTMLElement): boolean => {
  const range = getSelectionRange();
  if (!range) return false;

  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }

  // Find the list item containing the cursor
  const listItem = getClosestElement(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === "li",
    root
  );

  if (!listItem) return false;

  // Get the parent list type
  const parentList = listItem.parentElement;
  if (!parentList || !["ul", "ol"].includes(parentList.tagName.toLowerCase())) {
    return false;
  }

  const listTag = parentList.tagName.toLowerCase() as "ul" | "ol";

  // Indent EVERY selected sibling item, not just the caret's one. Selecting
  // three bullets and pressing Tab should nest all three (matching every other
  // editor). Processed in document order and re-reading previousElementSibling
  // each step, so consecutive selected items land in the same nested list.
  const isListItem = (el: Element) => el.tagName.toLowerCase() === "li";
  // rangeTouchesElement, not intersectsNode: a selection ending INSIDE the next
  // item at (firstChild, 0) selects none of it and must not indent it too.
  const selectedItems = (
    Array.from(parentList.children).filter(isListItem) as HTMLElement[]
  ).filter((li) => rangeTouchesElement(range, li));
  const targets = selectedItems.length > 0 ? selectedItems : [listItem];

  let indentedAny = false;
  for (const item of targets) {
    const prevSibling = item.previousElementSibling;
    // The first item in the list has no previous sibling to nest under.
    if (!prevSibling || prevSibling.tagName.toLowerCase() !== "li") continue;

    let nestedList = Array.from(prevSibling.children).find((child) =>
      ["ul", "ol"].includes(child.tagName.toLowerCase())
    ) as HTMLElement | undefined;
    if (!nestedList) {
      nestedList = document.createElement(listTag);
      // A checklist's nested list must ALSO be a checklist, or the indented item
      // becomes a dead checkbox and loses data-checked on the next sanitize pass.
      if (parentList.classList.contains(CHECKLIST_CLASS)) {
        nestedList.classList.add(CHECKLIST_CLASS);
      }
      prevSibling.appendChild(nestedList);
    }
    nestedList.appendChild(item);
    indentedAny = true;
  }

  if (!indentedAny) return false;

  // Restore selection to the caret's item.
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  return true;
};

/**
 * Outdent a list item (move it out of a nested list)
 */
export const outdentListItem = (root: HTMLElement): boolean => {
  const range = getSelectionRange();
  if (!range) return false;

  try {
    ensureRangeWithinRoot(range, root);
  } catch {
    return false;
  }

  // Find the list item containing the cursor
  const listItem = getClosestElement(
    range.startContainer,
    (el) => el.tagName.toLowerCase() === "li",
    root
  );

  if (!listItem) return false;

  // Get the parent list
  const parentList = listItem.parentElement;
  if (!parentList || !["ul", "ol"].includes(parentList.tagName.toLowerCase())) {
    return false;
  }

  // Get the grandparent list item (if it exists)
  const grandparentLi = parentList.parentElement;
  if (!grandparentLi || grandparentLi.tagName.toLowerCase() !== "li") {
    return false; // Can't outdent if not in a nested list
  }

  // Get the great-grandparent list
  const greatGrandparentList = grandparentLi.parentElement;
  if (
    !greatGrandparentList ||
    !["ul", "ol"].includes(greatGrandparentList.tagName.toLowerCase())
  ) {
    return false;
  }

  // Outdent EVERY selected sibling, not just the caret's one — Tab already
  // indents them all, and outdenting just the first then re-nested the OTHER
  // selected items underneath it, leaving them indented under a new parent.
  // Same collector as indentListItem (rangeTouchesElement, not intersectsNode:
  // a selection ending at the next item's (firstChild, 0) selects none of it).
  // #R23-12
  const isListItem = (el: Element) => el.tagName.toLowerCase() === "li";
  const selectedItems = (
    Array.from(parentList.children).filter(isListItem) as HTMLElement[]
  ).filter((li) => rangeTouchesElement(range, li));
  const movingItems = selectedItems.length > 0 ? selectedItems : [listItem];
  const lastMoving = movingItems[movingItems.length - 1];

  // Items that follow the outdented ones in the nested list must travel WITH
  // them, becoming children of the LAST one — otherwise they stay under the
  // previous parent and, because that parent sits ABOVE the outdented items,
  // they'd render above them (silent reorder). Matches Google Docs: outdenting
  // B in "A > [B, C]" yields "A, B > [C]". Measured from the last moving item,
  // so a multi-item selection does not swallow its own members.
  const followingItems: HTMLElement[] = [];
  let sibling = lastMoving.nextElementSibling;
  while (sibling) {
    const next = sibling.nextElementSibling;
    if (isListItem(sibling)) {
      followingItems.push(sibling as HTMLElement);
    }
    sibling = next;
  }

  // Insert the outdented items after the grandparent list item, in order.
  let anchor: Node | null = grandparentLi.nextSibling;
  for (const item of movingItems) {
    if (anchor) {
      greatGrandparentList.insertBefore(item, anchor);
    } else {
      greatGrandparentList.appendChild(item);
    }
    anchor = item.nextSibling;
  }

  // Re-nest the former following siblings under the LAST outdented item.
  if (followingItems.length > 0) {
    const listTag = parentList.tagName.toLowerCase();
    let nested = Array.from(lastMoving.children).find((child) =>
      ["ul", "ol"].includes(child.tagName.toLowerCase())
    ) as HTMLElement | undefined;
    if (!nested) {
      nested = document.createElement(listTag);
      // Keep checklist-ness so the re-nested following items stay toggleable.
      if (parentList.classList.contains(CHECKLIST_CLASS)) {
        nested.classList.add(CHECKLIST_CLASS);
      }
      lastMoving.appendChild(nested);
    }
    followingItems.forEach((item) => nested!.appendChild(item));
  }

  // If the parent list is now empty, remove it
  if (parentList.children.length === 0) {
    parentList.remove();
  }

  // Restore selection
  const selection = getSelection();
  if (selection) {
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  return true;
};

/**
 * Wrap a range's contents in a single inline <a>, first stripping any anchors
 * the range overlaps. A selection that straddles an existing link's boundary
 * makes extractContents() clone the partial <a> into the fragment; wrapping that
 * as-is nests <a> inside <a>, which the parser collapses to an EMPTY link on the
 * next round-trip. Unwrapping first guarantees a single, well-formed anchor.
 */
const wrapRangeAsLink = (
  targetRange: Range,
  attributes: Record<string, string>
): HTMLElement | null => {
  const fragment = targetRange.extractContents();
  unwrapMatchingElements(fragment, "a");
  const nodes = collectFragmentNodes(fragment);
  const anchor = wrapNodes(nodes, "a", attributes);
  if (!anchor) return null;
  targetRange.insertNode(anchor);
  return anchor;
};

/**
 * Link a non-collapsed selection. Spanning multiple blocks links the selected
 * slice of EACH block in its own inline <a>, never one <a> around the blocks
 * (<a><p>…</p><p>…</p></a> is invalid and re-splits on round-trip).
 */
const linkSelection = (
  root: HTMLElement,
  attributes: Record<string, string>
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  // Per-block slices (leaf blocks + dropped ancestors' direct inline runs):
  // each is a disjoint subtree's sub-range built up front, so it stays valid
  // as earlier slices are wrapped. Zero slices: pure boundary-touch → no-op;
  // bare inline content under the root → link the raw range (no block
  // boundary exists to rip across). #r15-4 #r16-4 #r17-1
  const slices = getBlockSlicesInRange(range, root);
  const targets =
    slices.length > 0 ? slices : rangeCapturesContent(range) ? [range] : [];
  if (targets.length === 0) return;

  // Mutate BACK TO FRONT (slices can share a container — a parent's inline
  // runs around a sublist — and earlier extraction would shift later
  // offsets). The first anchor created is therefore the DOCUMENT-last one,
  // which is where the caret should land.
  const huskBaseline = snapshotEmptyInlineHusks(root);
  let documentLastAnchor: HTMLElement | null = null;
  [...targets].reverse().forEach((sub) => {
    if (sub.collapsed) return;
    const anchor = wrapRangeAsLink(sub, attributes);
    if (anchor && !documentLastAnchor) documentLastAnchor = anchor;
  });
  // Re-linking a selection that starts inside an existing <a> clones it and
  // leaves an empty stale-href anchor behind (the sanitizer keeps it). #r18
  removeNewEmptyInlineHusks(root, huskBaseline);

  const selection = getSelection();
  if (selection && documentLastAnchor) {
    const newRange = document.createRange();
    newRange.selectNodeContents(documentLastAnchor);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

export const insertLink = (root: HTMLElement, url: string, text = "") => {
  const range = getSelectionRange();
  if (!range) return;

  // Editing an existing link: if the caret/selection sits inside an <a>, UPDATE
  // that anchor in place. Wrapping/inserting a new <a> would nest anchors
  // (`<a href="old">He<a href="new">x</a>llo</a>`) — invalid DOM the browser
  // reparses into stray/duplicated links on the next round-trip, so the URL
  // could never actually be changed.
  const existingAnchor = getClosestElement(
    range.commonAncestorContainer,
    (element) => element.tagName === "A",
    root
  );
  if (existingAnchor) {
    existingAnchor.setAttribute("href", url);
    existingAnchor.setAttribute("target", "_blank");
    existingAnchor.setAttribute("rel", "noopener noreferrer");
    // Only relabel from an explicit caption; a text selection keeps its content.
    if (range.collapsed && text) existingAnchor.textContent = text;
    const selection = getSelection();
    if (selection) {
      const newRange = document.createRange();
      newRange.selectNodeContents(existingAnchor);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }

  // If range is collapsed (no text selected), create link with visible text —
  // the caller's custom text when given, otherwise the URL itself.
  if (range.collapsed) {
    const element = document.createElement("a");
    element.href = url;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    element.textContent = text || url;
    // No inline color/decoration: let `.editor-content a` (theme-aware, with a
    // dark-mode color and hover state) style it. Hard-coding an inline color here
    // defeated the theme and hover, and made a URL-only link look different from
    // one created by selecting text first (which uses wrapSelection, no inline).

    range.insertNode(element);

    // Move cursor after the link
    const newRange = document.createRange();
    newRange.setStartAfter(element);
    newRange.collapse(true);
    const selection = getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  } else {
    // Selected text -> link it without ever nesting anchors or wrapping blocks.
    linkSelection(root, {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
    });
  }
};

export const insertImage = (
  root: HTMLElement,
  url: string,
  alt: string = ""
) => {
  const range = getSelectionRange();
  if (!range) return;
  ensureRangeWithinRoot(range, root);

  // Create a wrapper div for the image with resize functionality
  const wrapper = document.createElement("div");
  wrapper.className = "editor-image-wrapper";
  wrapper.contentEditable = "false";
  wrapper.style.display = "inline-block";
  wrapper.style.position = "relative";
  wrapper.style.maxWidth = "600px"; // Default max width to fit editor
  wrapper.style.width = "auto";
  wrapper.style.margin = "10px 0";
  wrapper.style.cursor = "pointer";

  const image = document.createElement("img");
  image.src = url;
  if (alt) {
    image.alt = alt;
  }
  image.className = "editor-image-resizable";
  image.style.maxWidth = "100%";
  image.style.width = "100%"; // Fill wrapper
  image.style.height = "auto";
  image.style.display = "block";
  image.style.borderRadius = "4px";
  image.draggable = false;

  wrapper.appendChild(image);

  // Insert the wrapped image
  range.deleteContents();
  range.insertNode(wrapper);

  // Insert a paragraph after the image for typing
  const para = document.createElement("p");
  para.appendChild(document.createElement('br'));
  wrapper.parentNode?.insertBefore(para, wrapper.nextSibling);

  // Position cursor in the new paragraph
  const selection = getSelection();
  if (selection && para.firstChild) {
    const newRange = document.createRange();
    newRange.setStart(para, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

/**
 * Inline text-formatting tags that "Clear formatting" unwraps. Links (<a>) and
 * code (<code>) are intentionally preserved — clearing character formatting
 * shouldn't destroy a link or turn code back into prose.
 */
const CLEARABLE_INLINE_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "ins",
  "mark",
  "sub",
  "sup",
  "small",
  "big",
  "tt",
  "font",
  "span",
]);

/** Keep semantic wrappers and non-editable widgets when clearing character styles. */
const canClearInlineElement = (element: HTMLElement): boolean =>
  CLEARABLE_INLINE_TAGS.has(element.tagName.toLowerCase()) &&
  !element.closest('[contenteditable="false"]') &&
  !Array.from(element.attributes).some(attribute =>
    !["style", "class"].includes(attribute.name)
  );

/** Split only the inline formatting around a boundary. The unselected side
 * keeps a shallow clone of the original wrapper and all of its attributes. */
const isolateFormattingBoundary = (
  marker: Comment,
  root: HTMLElement,
  side: "start" | "end"
) => {
  let outer: HTMLElement | null = null;
  let ancestor = marker.parentElement;
  while (ancestor && ancestor !== root && !BLOCK_OR_CELL_TAGS.has(ancestor.tagName.toLowerCase())) {
    if (canClearInlineElement(ancestor)) outer = ancestor;
    ancestor = ancestor.parentElement;
  }
  if (!outer?.parentNode) return;
  const doc = root.ownerDocument;
  const outside = doc.createRange();
  if (side === "end") {
    outside.setStartAfter(marker);
    outside.setEnd(outer, outer.childNodes.length);
  } else {
    outside.setStart(outer, 0);
    outside.setEndBefore(marker);
  }
  const fragment = outside.extractContents();
  const clone = outer.cloneNode(false) as HTMLElement;
  clone.appendChild(fragment);
  const hasContent = clone.textContent || clone.querySelector("img, br, hr, iframe, video, [contenteditable]");
  if (side === "end") {
    outer.after(marker);
    if (hasContent) marker.after(clone);
  } else {
    outer.before(marker);
    if (hasContent) marker.before(clone);
  }
};

export const clearFormatting = (root: HTMLElement): boolean => {
  const originalRange = getSelectionRange();
  if (!originalRange) return false;
  ensureRangeWithinRoot(originalRange, root);
  if (originalRange.collapsed || !rangeCapturesContent(originalRange)) return false;
  const range = rangeForEditableFormatting(originalRange, root);
  if (!range || !rangeCapturesContent(range)) return false;

  const selection = getSelection();
  if (!selection) return false;
  const backwards = selection.anchorNode === originalRange.endContainer &&
    selection.anchorOffset === originalRange.endOffset;
  const before = root.innerHTML;
  const emptyBefore = snapshotEmptyInlineHusks(root);
  const doc = root.ownerDocument;
  const start = doc.createComment("format-start");
  const end = doc.createComment("format-end");
  const endRange = range.cloneRange();
  endRange.collapse(false);
  endRange.insertNode(end);
  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(start);
  let bookmark: ReturnType<typeof captureSelectionBookmark> = null;

  try {
    // End first keeps both boundary markers attached when they share a wrapper.
    isolateFormattingBoundary(end, root, "end");
    isolateFormattingBoundary(start, root, "start");
    const selected = doc.createRange();
    selected.setStartAfter(start);
    selected.setEndBefore(end);
    const inline = Array.from(root.querySelectorAll<HTMLElement>(
      Array.from(CLEARABLE_INLINE_TAGS).join(",")
    )).filter(element => canClearInlineElement(element) && rangeTouchesElement(selected, element));
    inline.forEach(unwrapElement);
    removeNewEmptyInlineHusks(root, emptyBefore);

    // Markers survive unwrapping and preserve the exact selected content.
    const restored = doc.createRange();
    restored.setStartAfter(start);
    restored.setEndBefore(end);
    if (backwards && selection.setBaseAndExtent) {
      selection.setBaseAndExtent(restored.endContainer, restored.endOffset, restored.startContainer, restored.startOffset);
    } else {
      selection.removeAllRanges();
      selection.addRange(restored);
    }
    bookmark = captureSelectionBookmark(root);
  } finally {
    end.remove();
    start.remove();
    // Removing markers shifts element offsets. Restore from their surviving
    // neighbours instead of relying on the live Range's mutation adjustment.
    bookmark?.restore();
  }
  return root.innerHTML !== before;
};
