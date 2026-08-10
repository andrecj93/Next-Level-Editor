/**
 * Page Management Utilities
 * Page breaks and table of contents functionality
 */

import { smoothScrollIntoView } from "./scroll";
import { splitBlockAtCaret } from "./blockInsertion";

// Constants
const MAX_HEADING_ID_LENGTH = 50;
const TOC_INDENT_PX = 20;

/**
 * The nearest <ul>/<ol> ancestor of `node`, bounded by the editor root. Bounded
 * on purpose: an unbounded walk climbed to the document, so an editor embedded
 * inside a HOST page's list found that list and inserted outside the editor.
 */
function closestListWithin(
  node: Node | null,
  root: HTMLElement
): HTMLElement | null {
  let current: Node | null = node;
  while (current && current.nodeType !== Node.DOCUMENT_NODE) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (element.tagName === "UL" || element.tagName === "OL") return element;
    }
    if (current === root) break;
    current = current.parentNode;
  }
  return null;
}

/**
 * Inserts a page break at the current cursor position
 * @param selection - The browser selection object
 * @param root - The editor root; when given, a caret inside a paragraph or
 *   heading splits that block first so the page break lands BETWEEN blocks
 *   (a <div> nested inside a <p> is invalid HTML that parsers restructure on
 *   the next serialize/re-parse round-trip).
 */
export function insertPageBreak(
  selection: Selection | null,
  root?: HTMLElement | null
): void {
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  let range = selection.getRangeAt(0);

  // Check if we're inside a list and exit if needed. Bound the walk to the
  // editor root: without it the search climbed to the document, so an editor
  // embedded inside a host-page <ul> found the HOST list and inserted the page
  // break OUTSIDE the editor, mutating the host page.
  let node: Node | null = range.startContainer;
  let list: HTMLElement | null = null;

  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "UL" || element.tagName === "OL") {
        list = element;
        break;
      }
    }
    if (root && node === root) break;
    node = node.parentNode;
  }

  // If we're in a list, insert after the list
  if (list) {
    const newRange = document.createRange();
    newRange.setStartAfter(list);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    range = newRange;
  }

  range.deleteContents();

  // Split the caret's paragraph/heading so the break inserts at block level.
  let splitTail: HTMLElement | null = null;
  if (root) {
    splitTail = splitBlockAtCaret(range, root);
    if (splitTail) range = selection.getRangeAt(0);
  }

  // Create page break element
  const pageBreak = document.createElement("div");
  pageBreak.className = "page-break";
  pageBreak.contentEditable = "false";
  pageBreak.innerHTML =
    '<span class="page-break-label">Page Break</span><hr class="page-break-line" />';

  // Insert the page break
  range.insertNode(pageBreak);

  // A place to keep typing after the break. When splitBlockAtCaret already left
  // an empty tail (the caret was at the end of its block), reuse THAT — adding
  // another produced two blank lines that survived into every export. #R23-61
  const reusableTail =
    splitTail &&
    !(splitTail.textContent || "").trim() &&
    splitTail.previousSibling === pageBreak
      ? splitTail
      : null;
  let nextParagraph: HTMLElement;
  if (reusableTail) {
    nextParagraph = reusableTail;
  } else {
    nextParagraph = document.createElement("p");
    nextParagraph.innerHTML = "<br>";
    pageBreak.parentNode?.insertBefore(nextParagraph, pageBreak.nextSibling);
  }

  // Move cursor to the new paragraph
  const newRange = document.createRange();
  newRange.setStart(nextParagraph, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * Interface for a heading item in the TOC
 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
  element: HTMLElement;
}

/**
 * Whether `id` is already taken by some OTHER element in the document — so a
 * newly generated heading anchor cannot land on a non-heading that happens to
 * carry the same id. #R23-42
 */
function conflictsWithOtherElement(
  root: HTMLElement,
  id: string,
  element: HTMLElement
): boolean {
  const owner = root.ownerDocument?.getElementById(id) ?? null;
  return owner !== null && owner !== element;
}

/**
 * Generates a table of contents from the headings in the editor
 * @param editor - The editor element
 * @returns Array of TOC items
 */
export function generateTableOfContents(editor: HTMLElement): TocItem[] {
  const headings = editor.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const tocItems: TocItem[] = [];
  // Anchors handed out during THIS pass, so a kept id is never reissued.
  const claimedIds = new Set<string>();

  headings.forEach((heading) => {
    const element = heading as HTMLElement;
    // Skip the TOC nav's OWN "Table of Contents" heading — otherwise every
    // regenerate/update listed the TOC as a link to itself and re-added it.
    if (element.closest(".table-of-contents")) return;
    // Index the DOCUMENT headings only, so ids stay stable regardless of the
    // skipped TOC heading.
    const index = tocItems.length;
    const level = Number.parseInt(heading.tagName.substring(1), 10);
    const text = element.textContent || "";

    // Generate or get ID for the heading. An existing id is KEPT so links and
    // already-exported HTML keep resolving — but it must not be handed out
    // twice. The index is positional, so adding a heading above an existing one
    // regenerates that heading's id verbatim whenever the slugs match: two
    // "Summary" headings, or ANY two headings in a non-Latin script (the slug
    // regex strips every non-ASCII character, leaving it empty). The TOC then
    // rendered two links to the same anchor and one heading was unreachable.
    // #R23-42
    // conflictsWithOtherElement looks across the whole DOCUMENT, so an id that
    // arrives already owned by another editor's heading — two editors loading
    // the same saved HTML — is re-homed instead of pointing a TOC link into the
    // other editor's document. #R23-60
    let id = element.id;
    if (!id || claimedIds.has(id) || conflictsWithOtherElement(editor, id, element)) {
      // Using replace with global flag (replaceAll not available in ES2019)
      const base = `heading-${index}-${text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, MAX_HEADING_ID_LENGTH)}`;
      id = base;
      let suffix = 2;
      while (
        claimedIds.has(id) ||
        conflictsWithOtherElement(editor, id, element)
      ) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      element.id = id;
    }
    claimedIds.add(id);

    tocItems.push({
      level,
      text,
      id,
      element,
    });
  });

  return tocItems;
}

/**
 * Generates HTML for a table of contents
 * @param tocItems - Array of TOC items
 * @returns HTML string for the TOC
 */
const escapeTocText = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function generateTocHtml(tocItems: TocItem[]): string {
  if (tocItems.length === 0) {
    return "<p><em>No headings found in the document.</em></p>";
  }

  let html = '<nav class="table-of-contents"><h2>Table of Contents</h2><ul>';

  tocItems.forEach((item) => {
    const indent = (item.level - 1) * TOC_INDENT_PX;
    // Heading text/ids are raw user content and this HTML is inserted via
    // innerHTML (not through the sanitizer), so escape to avoid broken or
    // injected markup from headings like "Q&A <notes>".
    html += `<li style="margin-left: ${indent}px;"><a href="#${escapeTocText(
      item.id
    )}">${escapeTocText(item.text)}</a></li>`;
  });

  html += "</ul></nav>";
  return html;
}

/**
 * Inserts a table of contents at the current cursor position
 * @param editor - The editor element
 * @param selection - The browser selection object
 */
export function insertTableOfContents(
  editor: HTMLElement,
  selection: Selection | null
): boolean {
  const tocItems = generateTableOfContents(editor);

  // Nothing to build a TOC from. This used to insert generateTocHtml's
  // placeholder — "No headings found in the document." — into the document as
  // real content, splitting the caret's paragraph in two. hasTableOfContents
  // never recognised that paragraph, so the user had to delete it by hand. The
  // caller reports the situation instead. #R23-39
  if (tocItems.length === 0) return false;

  // Asking for a TOC when one already exists means "refresh it", not "add a
  // second one" — which is exactly what updateTableOfContents is for, and it
  // had no call sites at all. #R23-40
  if (hasTableOfContents(editor)) {
    updateTableOfContents(editor);
    return true;
  }

  const tocHtml = generateTocHtml(tocItems);

  if (!selection || selection.rangeCount === 0) {
    // If no selection, insert at the beginning
    const div = document.createElement("div");
    div.innerHTML = tocHtml;
    editor.insertBefore(div.firstChild as Node, editor.firstChild);
    return true;
  } else {
    let range = selection.getRangeAt(0);
    range.deleteContents();

    // A caret inside a list item must escape the list first, exactly as
    // insertPageBreak does: splitting an <li> leaves the <nav> INSIDE it,
    // breaking the item's text around a nested block that survives the
    // sanitizer and every export. #R23-41
    const list = closestListWithin(range.startContainer, editor);
    if (list) {
      const afterList = document.createRange();
      afterList.setStartAfter(list);
      afterList.collapse(true);
      selection.removeAllRanges();
      selection.addRange(afterList);
      range = afterList;
    }

    // Split the caret's paragraph/heading so the <nav> lands at block level —
    // nested inside a <p> it is invalid HTML that parsers restructure on the
    // next serialize/re-parse round-trip.
    if (splitBlockAtCaret(range, editor)) {
      range = selection.getRangeAt(0);
    }

    const div = document.createElement("div");
    div.innerHTML = tocHtml;
    const toc = div.firstChild as Node;
    range.insertNode(toc);

    // Leave a collapsed caret after the TOC. `insertNode` leaves the range
    // spanning the inserted node, which read as "everything is selected" and
    // popped the floating formatting bubble uninvited.
    const after = document.createRange();
    after.setStartAfter(toc);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
    return true;
  }
}

/**
 * Updates an existing table of contents in the document
 * @param editor - The editor element
 */
export function updateTableOfContents(editor: HTMLElement): void {
  const tocElement = editor.querySelector(".table-of-contents");
  if (!tocElement) {
    return;
  }

  const tocItems = generateTableOfContents(editor);
  const tocHtml = generateTocHtml(tocItems);

  const div = document.createElement("div");
  div.innerHTML = tocHtml;
  tocElement.parentNode?.replaceChild(div.firstChild as Node, tocElement);
}

/**
 * Checks if the document has a table of contents
 * @param editor - The editor element
 * @returns true if a TOC exists
 */
export function hasTableOfContents(editor: HTMLElement): boolean {
  return editor.querySelector(".table-of-contents") !== null;
}

/**
 * Scrolls to a heading by its ID
 * @param headingId - The ID of the heading to scroll to
 */
export function scrollToHeading(headingId: string): void {
  const heading = document.getElementById(headingId);
  if (heading) {
    smoothScrollIntoView(heading, { behavior: "smooth", block: "start" });
  }
}
