import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  degradeVideoEmbeds,
  degradeVideoEmbedsFromHtml,
  exportAsWord,
  exportAsHtml,
} from "../export";
import { embedSrcToWatchUrl } from "../embed";
import { buildEmbedContainerStyle } from "../embeddedResizable";

/**
 * R29-1 — Word and PDF exports silently LOSE every video embed.
 *
 * Neither destination can render a live player: html2canvas only rasterizes
 * an iframe whose contentWindow.document it can reach (verified in the
 * dependency's source), which a cross-origin YouTube/Vimeo player forbids —
 * the PDF got an empty box. html-docx-js embeds the HTML for Word to render,
 * and Word's HTML import has no browsing context for iframes — the video
 * simply vanished. Markdown already solved this shape: it emits a link.
 *
 * Static exports now degrade the embed container to a compact paragraph with
 * a visible, clickable link to the CANONICAL watch URL (embed URLs are for
 * players, watch URLs are for humans). exportAsHtml keeps the live player —
 * a browser renders it fine.
 */

const captured: { word: string[] } = { word: [] };
vi.mock("html-docx-js-typescript", () => ({
  asBlob: vi.fn(async (html: string) => {
    captured.word.push(html);
    return new Blob([html]);
  }),
}));

const CONTAINER_STYLE = buildEmbedContainerStyle(640, 360, "center");

const embedContainer = (iframeSrc: string) =>
  `<div class="embedded-resizable-container" data-type="embed" data-src="" ` +
  `data-width="640" data-height="360" data-maintain-aspect="true" ` +
  `data-alignment="center" style="${CONTAINER_STYLE}" ` +
  `contenteditable="false" tabindex="0">` +
  `<iframe src="${iframeSrc}" ` +
  `style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" ` +
  `allowfullscreen title="YouTube video player"></iframe></div>`;

const YOUTUBE_DOC =
  "<p>before</p>" +
  embedContainer("https://www.youtube.com/embed/abc123") +
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

describe("embedSrcToWatchUrl (R29-1)", () => {
  it("maps a YouTube embed src to the canonical watch URL", () => {
    expect(embedSrcToWatchUrl("https://www.youtube.com/embed/abc123")).toBe(
      "https://www.youtube.com/watch?v=abc123"
    );
  });

  it("maps a youtube-nocookie embed src to the canonical watch URL", () => {
    expect(
      embedSrcToWatchUrl("https://www.youtube-nocookie.com/embed/abc123")
    ).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("maps a Vimeo player src to the public video URL", () => {
    expect(embedSrcToWatchUrl("https://player.vimeo.com/video/76979871")).toBe(
      "https://vimeo.com/76979871"
    );
  });

  it("keeps the unlisted-video hash in the Vimeo URL", () => {
    expect(
      embedSrcToWatchUrl("https://player.vimeo.com/video/76979871?h=a1b2c3")
    ).toBe("https://vimeo.com/76979871/a1b2c3");
  });

  it("returns null for anything else", () => {
    expect(embedSrcToWatchUrl("https://example.com/x")).toBeNull();
    expect(embedSrcToWatchUrl("")).toBeNull();
  });
});

describe("degradeVideoEmbedsFromHtml (R29-1)", () => {
  it("replaces the player container with a visible watch link", () => {
    const out = degradeVideoEmbedsFromHtml(YOUTUBE_DOC);

    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("embedded-resizable-container");
    expect(out).toContain('href="https://www.youtube.com/watch?v=abc123"');
    // The URL is VISIBLE text too — a rasterized PDF link is not clickable,
    // so the reader must be able to read it.
    expect(out).toContain("https://www.youtube.com/watch?v=abc123</a>");
    expect(out).toContain("YouTube video");
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<p>after</p>");
  });

  it("labels a Vimeo player as Vimeo and uses the public URL", () => {
    const out = degradeVideoEmbedsFromHtml(
      embedContainer("https://player.vimeo.com/video/76979871")
    );

    expect(out).toContain('href="https://vimeo.com/76979871"');
    expect(out).toContain("Vimeo video");
  });

  it("drops an embed container with no usable player instead of exporting an empty box", () => {
    const out = degradeVideoEmbedsFromHtml(
      `<p>x</p><div class="embedded-resizable-container" data-type="embed" ` +
        `data-src="" data-width="640" data-height="360" ` +
        `style="${CONTAINER_STYLE}"></div><p>y</p>`
    );

    expect(out).not.toContain("embedded-resizable-container");
    expect(out).toContain("<p>x</p>");
    expect(out).toContain("<p>y</p>");
  });

  it("labels a non-YouTube/Vimeo iframe generically, never as YouTube (R30-2)", () => {
    // Only reachable via the live-DOM PDF path or plugin-inserted content —
    // but a wrong label is a lie in the document either way.
    const out = degradeVideoEmbedsFromHtml(
      embedContainer("https://example.com/player/42")
    );

    expect(out).toContain('href="https://example.com/player/42"');
    expect(out).toContain("Embedded video");
    expect(out).not.toContain("YouTube");
  });

  it("replaces an uploaded video file with an explicit placeholder (R30-1)", () => {
    // Word's HTML import has no <video> support and html2canvas cannot paint
    // an unloaded clone — the uploaded video exported as invisible blank
    // space. A data: payload cannot become a useful link, so the reader gets
    // an explicit placeholder instead of silent loss.
    const doc =
      `<p>x</p><div class="embedded-resizable-container" data-type="video" ` +
      `data-src="data:video/mp4;base64,AAAA" data-width="640" data-height="360" ` +
      `style="${CONTAINER_STYLE}" contenteditable="false" tabindex="0">` +
      `<video src="data:video/mp4;base64,AAAA" controls ` +
      `style="width: 100%; height: 100%; object-fit: contain;"></video></div><p>y</p>`;

    const out = degradeVideoEmbedsFromHtml(doc);

    expect(out).not.toContain("<video");
    expect(out).not.toContain("embedded-resizable-container");
    expect(out).toContain("Video attachment");
    expect(out).toContain("<p>x</p>");
    expect(out).toContain("<p>y</p>");
  });

  it("links an uploaded video that has a real URL instead of a placeholder (R30-1)", () => {
    const doc =
      `<div class="embedded-resizable-container" data-type="video" ` +
      `data-src="https://cdn.example.com/talk.mp4" data-width="640" data-height="360" ` +
      `style="${CONTAINER_STYLE}">` +
      `<video src="https://cdn.example.com/talk.mp4" controls></video></div>`;

    const out = degradeVideoEmbedsFromHtml(doc);

    expect(out).not.toContain("<video");
    expect(out).toContain('href="https://cdn.example.com/talk.mp4"');
    expect(out).toContain("https://cdn.example.com/talk.mp4</a>");
  });

  it("leaves image and file containers alone", () => {
    const doc =
      `<div class="embedded-resizable-container" data-type="image" ` +
      `data-src="/a.png" data-width="500" data-height="400" ` +
      `style="${buildEmbedContainerStyle(500, 400, "center")}"><img src="/a.png" /></div>`;

    expect(degradeVideoEmbedsFromHtml(doc)).toContain('data-type="image"');
  });

  it("returns embed-free HTML unchanged (identity fast path)", () => {
    const plain = "<p>hello</p>";
    expect(degradeVideoEmbedsFromHtml(plain)).toBe(plain);
  });
});

describe("export wiring (R29-1)", () => {
  it("exportAsWord ships the watch link, never the iframe", async () => {
    await exportAsWord(YOUTUBE_DOC, "d.docx");

    expect(captured.word).toHaveLength(1);
    expect(captured.word[0]).not.toContain("<iframe");
    expect(captured.word[0]).toContain(
      'href="https://www.youtube.com/watch?v=abc123"'
    );
  });

  it("exportAsHtml KEEPS the live player (a browser can render it)", () => {
    let html = "";
    const blobSpy = vi
      .spyOn(window, "Blob")
      .mockImplementation(function (parts: BlobPart[] | undefined) {
        html = String(parts?.[0] ?? "");
        return { size: html.length, type: "text/html" } as unknown as Blob;
      } as never);

    exportAsHtml(YOUTUBE_DOC, "d.html", false);
    blobSpy.mockRestore();

    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube.com/embed/abc123");
  });

  it("the DOM variant used by the PDF clone degrades in place", () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = YOUTUBE_DOC;

    degradeVideoEmbeds(tempDiv);

    expect(tempDiv.querySelector("iframe")).toBeNull();
    expect(tempDiv.querySelector(".embedded-resizable-container")).toBeNull();
    const anchor = tempDiv.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe(
      "https://www.youtube.com/watch?v=abc123"
    );
    expect(anchor?.textContent).toContain(
      "https://www.youtube.com/watch?v=abc123"
    );
  });
});
