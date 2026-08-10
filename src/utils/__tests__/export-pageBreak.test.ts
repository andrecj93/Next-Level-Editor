import { describe, it, expect } from "vitest";
import { htmlToMarkdown, formatHtml } from "../export";

/**
 * R23-37: the page-break WIDGET is editor chrome — a `<span>Page Break</span>`
 * label plus a rule, inside a contenteditable=false div. Exports serialized it
 * verbatim, so "Page Break" became body text in the exported document:
 *
 *   Chapter one.\n\nPage Break---\n\nChapter two.
 *
 * The PDF path already strips this (stripPageBreakChrome), because html2canvas
 * rasterizes the live DOM; the text-serializing exports never did. The label
 * must not survive, and the break itself should read as a real separator.
 */
const PAGE_BREAK =
  '<div class="page-break" contenteditable="false">' +
  '<span class="page-break-label">Page Break</span>' +
  '<hr class="page-break-line" /></div>';

const DOC = `<p>Chapter one.</p>${PAGE_BREAK}<p>Chapter two.</p>`;

describe("page-break chrome never becomes document text (#R23-37)", () => {
  it("keeps the label out of exported Markdown", () => {
    const md = htmlToMarkdown(DOC);

    expect(md).not.toContain("Page Break");
    expect(md).toContain("Chapter one.");
    expect(md).toContain("Chapter two.");
  });

  it("emits a real separator between the two halves in Markdown", () => {
    const md = htmlToMarkdown(DOC);
    const before = md.indexOf("Chapter one.");
    const rule = md.indexOf("---");
    const after = md.indexOf("Chapter two.");

    expect(rule).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(rule);
  });

  it("keeps the label out of exported/pretty-printed HTML", () => {
    const html = formatHtml(DOC);

    expect(html).not.toContain("Page Break");
    expect(html).not.toContain("page-break-label");
    expect(html).toContain("Chapter one.");
    expect(html).toContain("Chapter two.");
  });

  it("leaves an ordinary horizontal rule alone", () => {
    // Control: a real <hr> the user inserted is document content, not chrome.
    const md = htmlToMarkdown("<p>a</p><hr><p>b</p>");
    expect(md).toContain("---");
    expect(md).toContain("a");
    expect(md).toContain("b");
  });
});
