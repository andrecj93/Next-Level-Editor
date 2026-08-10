import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  stripEmbedChrome,
  stripEmbedChromeFromHtml,
  exportAsHtml,
  exportAsWord,
} from "../export";
import { buildEmbedContainerStyle } from "../embeddedResizable";

/**
 * R28-1 — the embed container's EDITOR chrome shipped in every deliverable.
 *
 * The container's entire look is a persisted inline style
 * (buildEmbedContainerStyle): a dashed affordance border, an 8px radius,
 * `cursor: pointer` and a `transition` — plus `contenteditable="false"` and
 * `tabindex="0"`. All of it is editing UI, none of it is document content, yet
 * HTML and Word exports carried it verbatim, the PDF rasterized it (and, when
 * an embed was SELECTED at export time, rasterized the solid selection border
 * and the four corner resize handles too, because that path reads the LIVE
 * editor DOM), and printing drew the dashed box around every image and video.
 *
 * Exports now strip the chrome the same way page-break chrome is stripped —
 * while KEEPING everything that is layout or identity: size, margin,
 * position/overflow (the player inside is absolutely positioned), the class
 * and the data-* payload, so an exported document re-imported into the editor
 * still round-trips back into a live embed.
 */

// Word conversion is lazy-loaded; capture what it is asked to convert.
const captured: { word: string[] } = { word: [] };
vi.mock("html-docx-js-typescript", () => ({
  asBlob: vi.fn(async (html: string) => {
    captured.word.push(html);
    return new Blob([html]);
  }),
}));

const CONTAINER_STYLE = buildEmbedContainerStyle(640, 360, "center");

/** A persisted embed container exactly as the sanitizer round-trips it. */
const EMBED_DOC =
  "<p>before</p>" +
  `<div class="embedded-resizable-container" data-type="embed" data-src="" ` +
  `data-width="640" data-height="360" data-maintain-aspect="true" ` +
  `data-alignment="center" style="${CONTAINER_STYLE}" ` +
  `contenteditable="false" tabindex="0">` +
  `<iframe src="https://www.youtube.com/embed/abc123" ` +
  `style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" ` +
  `allowfullscreen title="YouTube video player"></iframe></div>` +
  "<p>after</p>";

beforeEach(() => {
  captured.word.length = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("stripEmbedChromeFromHtml (R28-1)", () => {
  it("removes the affordance chrome but keeps layout, identity and the player", () => {
    const out = stripEmbedChromeFromHtml(EMBED_DOC);

    expect(out).not.toContain("dashed");
    expect(out).not.toContain("cursor: pointer");
    expect(out).not.toContain("transition");
    expect(out).not.toContain("border-radius: 8px");
    expect(out).not.toContain("contenteditable");
    expect(out).not.toContain("tabindex");

    // Layout the absolutely-positioned player depends on stays.
    expect(out).toContain("width: 640px");
    expect(out).toContain("height: 360px");
    expect(out).toContain("position: relative");
    // Identity for re-import round-trips stays.
    expect(out).toContain('class="embedded-resizable-container"');
    expect(out).toContain('data-type="embed"');
    // The player itself is untouched.
    expect(out).toContain("https://www.youtube.com/embed/abc123");
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<p>after</p>");
  });

  it("returns embed-free HTML unchanged (identity fast path)", () => {
    const plain = "<p>hello</p><ul><li>world</li></ul>";
    expect(stripEmbedChromeFromHtml(plain)).toBe(plain);
  });

  it("the editor-side chrome itself is untouched (control)", () => {
    // The strip is an EXPORT concern — inside the editor the dashed border is
    // the intended affordance and must survive this batch unchanged.
    expect(CONTAINER_STYLE).toContain("dashed");
    expect(CONTAINER_STYLE).toContain("cursor: pointer");
  });
});

describe("file-attachment cards keep a NEUTRAL boundary (R29-2)", () => {
  // Batch 147 cleared the border on every container type — but an attachment
  // is a CARD: its fixed 300x200 box stayed, so exports showed a floating
  // paperclip in blank space. The editor-accent dashed chrome still goes;
  // a neutral print-safe border takes its place for file cards only.
  const FILE_DOC =
    `<div class="embedded-resizable-container" data-type="file" ` +
    `data-src="data:application/pdf;base64,AAAA" data-width="300" ` +
    `data-height="200" data-maintain-aspect="false" data-alignment="center" ` +
    `style="${buildEmbedContainerStyle(300, 200, "center")}" ` +
    `contenteditable="false" tabindex="0">` +
    `<a href="data:application/pdf;base64,AAAA" download="report.pdf">📎 report.pdf</a></div>`;

  it("swaps the accent chrome for a neutral border instead of none", () => {
    const out = stripEmbedChromeFromHtml(FILE_DOC);

    expect(out).not.toContain("dashed");
    expect(out).not.toContain("cursor: pointer");
    expect(out).toMatch(/border:\s*1px solid/);
    expect(out).toContain("width: 300px");
    expect(out).toContain("report.pdf");
  });

  it("non-file containers still lose the border entirely (control)", () => {
    const out = stripEmbedChromeFromHtml(EMBED_DOC);

    expect(out).not.toMatch(/border:\s*1px solid/);
    expect(out).not.toContain("dashed");
  });
});

describe("stripEmbedChrome on a live (selected) container (R28-1)", () => {
  it("drops the selection border and the corner resize handles", () => {
    const holder = document.createElement("div");
    holder.innerHTML = EMBED_DOC;
    const box = holder.querySelector<HTMLElement>(
      ".embedded-resizable-container"
    )!;
    // What selectContainer does in the live editor.
    box.style.borderStyle = "solid";
    box.style.borderColor = "#667eea";
    for (const corner of ["nw", "se"]) {
      const handle = document.createElement("div");
      handle.className = "embed-resize-handle";
      handle.dataset.handle = corner;
      box.appendChild(handle);
    }

    stripEmbedChrome(holder);

    expect(holder.querySelector(".embed-resize-handle")).toBeNull();
    const style = box.getAttribute("style") ?? "";
    expect(style).not.toContain("solid");
    expect(style).not.toContain("#667eea");
    expect(style).not.toContain("dashed");
    expect(box.hasAttribute("contenteditable")).toBe(false);
    expect(box.hasAttribute("tabindex")).toBe(false);
    expect(holder.querySelector("iframe")).not.toBeNull();
  });
});

describe("exports ship no embed chrome (R28-1)", () => {
  it("exportAsWord strips the dashed border and editing attributes", async () => {
    await exportAsWord(EMBED_DOC, "d.docx");

    expect(captured.word).toHaveLength(1);
    expect(captured.word[0]).not.toContain("dashed");
    expect(captured.word[0]).not.toContain("cursor: pointer");
    expect(captured.word[0]).not.toContain("contenteditable");
    // Word cannot render an iframe, so the player ships as its watch link
    // (see export.videoDegrade.test.ts / #R29-1) — the video must still be
    // REACHABLE from the .docx, just not as a dead embed.
    expect(captured.word[0]).toContain("youtube.com/watch?v=abc123");
  });

  it("exportAsHtml (prettify=false) strips them too", () => {
    let html = "";
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock");
    const blobSpy = vi
      .spyOn(window, "Blob")
      .mockImplementation(function (parts: BlobPart[] | undefined) {
        html = String(parts?.[0] ?? "");
        return { size: html.length, type: "text/html" } as unknown as Blob;
      } as never);

    exportAsHtml(EMBED_DOC, "d.html", false);
    blobSpy.mockRestore();

    expect(html).not.toContain("dashed");
    expect(html).not.toContain("cursor: pointer");
    expect(html).not.toContain("contenteditable");
    expect(html).toContain("youtube.com/embed/abc123");
  });
});
