import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";
import { createEmbeddedResizable } from "../../utils/embeddedResizable";
import { getVideoEmbedHtml, getVideoPlayerHtml } from "../../utils/embed";

/**
 * R23-62 — a YouTube/Vimeo player came back from the FIRST sanitizer round-trip
 * with the browser's default 2px inset border, and clipped by the container.
 *
 * The player's presentation lives entirely in inline CSS: an aspect-ratio
 * wrapper <div class="video-embed"> plus an iframe at
 * `position: absolute; inset: 0; border: 0`. The wrapper is an unrecognized
 * div, so sanitizeTree unwraps it, and `position`/`top`/`left`/`border` are all
 * outside STYLE_ALLOWED_PROPERTIES, so the iframe kept only width/height —
 * losing `border: 0` (default border appears) and its absolute fill.
 *
 * The fix must NOT widen the style allowlist: `position` + offsets are a real
 * overlay/clickjacking surface in a paste-fed editor. The player is instead
 * REBUILT from its validated src, the same way file attachments and page breaks
 * already are — attacker CSS is discarded, ours is regenerated.
 */
describe("useHtmlSanitizer - embedded video player round-trip (R23-62)", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  // Parse into a detached document so happy-dom doesn't try to actually load
  // the player over the network.
  const parse = (html: string): HTMLElement => {
    const doc = document.implementation.createHTMLDocument("t");
    doc.body.innerHTML = html;
    return doc.body;
  };

  /** Exactly what handleInsertEmbed puts in the document for a YouTube URL. */
  const insertedYouTube = () =>
    createEmbeddedResizable({
      type: "embed",
      src: getVideoEmbedHtml("https://www.youtube.com/watch?v=dQw4w9WgXcQ")!,
      alt: "Video embed",
      width: 640,
      height: 360,
      maintainAspectRatio: true,
      alignment: "center",
    });

  const styleOf = (el: Element | null): string =>
    (el?.getAttribute("style") ?? "").toLowerCase();

  it("keeps the player borderless and filling its container", () => {
    const out = sanitizer.sanitizeHtml(insertedYouTube());
    const iframe = parse(out).querySelector("iframe");

    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );

    const style = styleOf(iframe);
    expect(style).toContain("border: 0");
    expect(style).toContain("position: absolute");
    expect(style).toContain("top: 0");
    expect(style).toContain("left: 0");
    expect(style).toContain("width: 100%");
    expect(style).toContain("height: 100%");
  });

  it("keeps the player usable: fullscreen, permissions and an accessible name", () => {
    const out = sanitizer.sanitizeHtml(insertedYouTube());
    const iframe = parse(out).querySelector("iframe")!;

    expect(iframe.hasAttribute("allowfullscreen")).toBe(true);
    expect(iframe.getAttribute("allow")).toContain("encrypted-media");
    expect(iframe.getAttribute("title")).toBe("YouTube video player");
  });

  it("rebuilds a Vimeo player with its own permissions and title", () => {
    const html = createEmbeddedResizable({
      type: "embed",
      src: getVideoEmbedHtml("https://vimeo.com/76979871")!,
      width: 640,
      height: 360,
      alignment: "center",
    });
    const iframe = parse(sanitizer.sanitizeHtml(html)).querySelector("iframe")!;

    expect(iframe.getAttribute("src")).toBe(
      "https://player.vimeo.com/video/76979871"
    );
    expect(iframe.getAttribute("title")).toBe("Vimeo video player");
    expect(iframe.getAttribute("allow")).toContain("fullscreen");
    expect(styleOf(iframe)).toContain("border: 0");
  });

  it("is idempotent — a second pass reproduces byte-identical output", () => {
    const once = sanitizer.sanitizeHtml(insertedYouTube());
    const twice = sanitizer.sanitizeHtml(once);

    expect(twice).toBe(once);
  });

  it("holds exactly one player, with no leftover wrapper chrome", () => {
    const out = parse(sanitizer.sanitizeHtml(insertedYouTube()));
    const container = out.querySelector(".embedded-resizable-container")!;

    expect(out.querySelectorAll("iframe")).toHaveLength(1);
    expect(container.querySelector(".video-embed")).toBeNull();
    expect(container.querySelector("p")).toBeNull();
  });

  it("what the editor inserts already matches what the sanitizer rebuilds", () => {
    // Measured: the aspect-ratio wrapper's `margin: 20px 0` pushed the player
    // 20px down inside the fixed-height container and its bottom was clipped,
    // so a freshly inserted video only looked right after a reload rebuilt it.
    const inserted = createEmbeddedResizable({
      type: "embed",
      src: getVideoPlayerHtml("https://www.youtube.com/watch?v=dQw4w9WgXcQ")!,
      width: 640,
      height: 360,
      alignment: "center",
    });
    const before = parse(inserted).querySelector("iframe")!;
    const after = parse(sanitizer.sanitizeHtml(inserted)).querySelector(
      "iframe"
    )!;

    expect(parse(inserted).querySelector(".video-embed")).toBeNull();
    for (const attribute of ["src", "style", "allow", "title"]) {
      expect(after.getAttribute(attribute)).toBe(before.getAttribute(attribute));
    }
  });

  describe("the rebuild is not a way in", () => {
    it("discards attacker CSS on the player instead of trusting it", () => {
      // position: fixed + a full-viewport box would float an invisible overlay
      // over the host app's UI — the exact reason `position` is not allowlisted.
      const html =
        '<div class="embedded-resizable-container" data-type="embed" data-width="640" data-height="360">' +
        '<iframe src="https://www.youtube.com/embed/abc123" ' +
        'style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; opacity: 0.01; z-index: 99999;"' +
        "></iframe></div>";

      const style = styleOf(parse(sanitizer.sanitizeHtml(html)).querySelector("iframe"));

      expect(style).not.toContain("fixed");
      expect(style).not.toContain("100vw");
      expect(style).not.toContain("opacity");
      expect(style).not.toContain("z-index");
    });

    it("still refuses an iframe from any other host", () => {
      const html =
        '<div class="embedded-resizable-container" data-type="embed" data-width="640" data-height="360">' +
        '<iframe src="https://evil.example.com/steal"></iframe></div>';

      expect(sanitizer.sanitizeHtml(html)).not.toContain("evil.example.com");
    });

    it("does not let a javascript: src ride along in the rebuild", () => {
      const html =
        '<div class="embedded-resizable-container" data-type="embed" data-width="640" data-height="360">' +
         
        "<iframe src=\"javascript:alert('x')\"></iframe></div>";

      const out = sanitizer.sanitizeHtml(html);
      expect(out).not.toContain("javascript:");
      expect(out).not.toContain("alert");
    });

    it("drops event handlers and sandbox escapes from the player", () => {
      const html =
        '<div class="embedded-resizable-container" data-type="embed" data-width="640" data-height="360">' +
        '<iframe src="https://www.youtube.com/embed/abc123" onload="alert(1)" ' +
        'sandbox="allow-scripts allow-same-origin" srcdoc="<script>alert(2)</script>"></iframe></div>';

      const out = sanitizer.sanitizeHtml(html);
      expect(out).not.toContain("onload");
      expect(out).not.toContain("srcdoc");
      expect(out).not.toContain("sandbox");
      expect(out).not.toContain("alert");
    });
  });
});
