import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MarkdownIt from "markdown-it";
import { exportAsWord, exportAsHtml, htmlToMarkdown, substituteVariableValues } from "../export";

/**
 * R24-2 (round-24 audit): #R23-37 removed the page-break widget's "Page Break"
 * label from the two serializers (formatHtml, htmlToMarkdown) — but exportAsWord
 * embeds the raw editor HTML directly into its document shell, and
 * exportAsHtml's prettify=false branch does the same. Both shipped the literal
 * centered text "Page Break" as document content, and the .docx did not even
 * break the page there.
 */
const captured: { word: string[] } = { word: [] };

vi.mock("html-docx-js-typescript", () => ({
  asBlob: vi.fn(async (html: string) => {
    captured.word.push(html);
    return new Blob(["x"], { type: "application/octet-stream" });
  }),
}));

const PAGE_BREAK_DOC =
  "<p>before</p>" +
  '<div class="page-break" contenteditable="false">' +
  '<span class="page-break-label">Page Break</span>' +
  '<hr class="page-break-line"></div>' +
  "<p>after</p>";

let objectUrlBlobs: Blob[];

beforeEach(() => {
  captured.word.length = 0;
  objectUrlBlobs = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((obj: Blob | MediaSource) => {
    if (obj instanceof Blob) objectUrlBlobs.push(obj);
    return "blob:mock";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportAsWord strips editor chrome (#R24-2)", () => {
  it("never ships the 'Page Break' label text", async () => {
    await exportAsWord(PAGE_BREAK_DOC, "d.docx");

    expect(captured.word).toHaveLength(1);
    expect(captured.word[0]).not.toContain("page-break-label");
    expect(captured.word[0]).not.toContain("Page Break");
    // The surrounding document is intact.
    expect(captured.word[0]).toContain("<p>before</p>");
    expect(captured.word[0]).toContain("<p>after</p>");
  });

  it("turns the widget into a real Word page break", async () => {
    await exportAsWord(PAGE_BREAK_DOC, "d.docx");

    expect(captured.word[0]).toContain("page-break-after");
  });
});

describe("exportAsHtml prettify=false strips the label too (#R24-2)", () => {
  it("does not ship the label as body text", async () => {
    exportAsHtml(PAGE_BREAK_DOC, "d.html", false);

    expect(objectUrlBlobs).toHaveLength(1);
    const text = await objectUrlBlobs[0].text();
    expect(text).not.toContain("page-break-label");
    expect(text).not.toContain("Page Break");
    expect(text).toContain("<p>before</p>");
  });
});

describe("markdown escapes HTML-looking variable values (#R24-5)", () => {
  it("a value containing markup prints as literal text, not live HTML", () => {
    const doc =
      '<p>By <span class="editor-variable" data-variable="user.name" ' +
      'data-value="&lt;b&gt;Acme&lt;/b&gt;">{{ user.name }}</span>.</p>';

    const md = htmlToMarkdown(substituteVariableValues(doc));

    // Assert the PROPERTY, not a spelling of it: render the Markdown and
    // require that no live element comes out. The old substring check
    // (`not.toMatch(/<b>/)`) was a proxy that rejected `\<b>` — a perfectly
    // safe Markdown escape — and it duly broke when happy-dom 20.11 started
    // decoding the entity in textContent the way real browsers do.
    // `html: true` is the permissive renderer setting on purpose: it proves
    // the escaping holds even where raw HTML would be allowed through.
    const rendered = new MarkdownIt({ html: true }).render(md);
    const host = document.createElement("div");
    host.innerHTML = rendered;

    expect(host.querySelector("b")).toBeNull();
    expect(host.textContent).toContain("<b>Acme</b>");
  });

  it("a plain value still renders as itself (control)", () => {
    const doc =
      '<p>By <span class="editor-variable" data-variable="user.name" ' +
      'data-value="Acme Corp">{{ user.name }}</span>.</p>';

    const md = htmlToMarkdown(substituteVariableValues(doc));
    const host = document.createElement("div");
    host.innerHTML = new MarkdownIt({ html: true }).render(md);

    expect(host.textContent).toContain("By Acme Corp.");
    expect(host.textContent).not.toContain("\\");
  });
});
