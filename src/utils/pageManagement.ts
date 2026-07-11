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

  // Check if we're inside a list and exit if needed
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
  if (root && splitBlockAtCaret(range, root)) {
    range = selection.getRangeAt(0);
  }

  // Create page break element
  const pageBreak = document.createElement("div");
  pageBreak.className = "page-break";
  pageBreak.contentEditable = "false";
  pageBreak.innerHTML =
    '<span class="page-break-label">Page Break</span><hr class="page-break-line" />';

  // Insert the page break
  range.insertNode(pageBreak);

  // Add a paragraph after the page break for continued editing
  const nextParagraph = document.createElement("p");
  nextParagraph.innerHTML = "<br>";
  pageBreak.parentNode?.insertBefore(nextParagraph, pageBreak.nextSibling);

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
 * Generates a table of contents from the headings in the editor
 * @param editor - The editor element
 * @returns Array of TOC items
 */
export function generateTableOfContents(editor: HTMLElement): TocItem[] {
  const headings = editor.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const tocItems: TocItem[] = [];

  headings.forEach((heading, index) => {
    const element = heading as HTMLElement;
    const level = Number.parseInt(heading.tagName.substring(1), 10);
    const text = element.textContent || "";

    // Generate or get ID for the heading
    let id = element.id;
    if (!id) {
      // Using replace with global flag (replaceAll not available in ES2019)
      id = `heading-${index}-${text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, MAX_HEADING_ID_LENGTH)}`;
      element.id = id;
    }

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
export function generateTocHtml(tocItems: TocItem[]): string {
  if (tocItems.length === 0) {
    return "<p><em>No headings found in the document.</em></p>";
  }

  let html = '<nav class="table-of-contents"><h2>Table of Contents</h2><ul>';

  tocItems.forEach((item) => {
    const indent = (item.level - 1) * TOC_INDENT_PX;
    html += `<li style="margin-left: ${indent}px;"><a href="#${item.id}">${item.text}</a></li>`;
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
): void {
  const tocItems = generateTableOfContents(editor);
  const tocHtml = generateTocHtml(tocItems);

  if (!selection || selection.rangeCount === 0) {
    // If no selection, insert at the beginning
    const div = document.createElement("div");
    div.innerHTML = tocHtml;
    editor.insertBefore(div.firstChild as Node, editor.firstChild);
  } else {
    let range = selection.getRangeAt(0);
    range.deleteContents();

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
