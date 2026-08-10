import { describe, it, expect } from "vitest";
import {
  createEmbeddedResizable,
  buildEmbedContainerStyle,
  getEmbeddedDimensions,
  updateEmbeddedDimensions,
} from "../embeddedResizable";

// These tests exercise the pure HTML-generation + measurement helpers of
// embeddedResizable: every `type` branch of createEmbeddedResizable, all three
// alignment branches of buildEmbedContainerStyle, and the get/update dimension
// helpers. They assert the real produced markup / return values, not spies.

const parse = (html: string): HTMLElement => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.firstElementChild as HTMLElement;
};

describe("createEmbeddedResizable content generation", () => {
  it("builds an <img> for the image type and mirrors src into data-src", () => {
    const container = parse(
      createEmbeddedResizable({
        type: "image",
        src: "picture.png",
        alt: "a picture",
      })
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("picture.png");
    expect(img?.getAttribute("alt")).toBe("a picture");
    // Non-embed types persist the src into data-src (escaped).
    expect(container.dataset.src).toBe("picture.png");
    expect(container.dataset.type).toBe("image");
    // object-fit style is applied so the media fills the container.
    expect(img?.getAttribute("style")).toContain("object-fit: contain");
  });

  it("builds a <video controls> for the video type", () => {
    const container = parse(
      createEmbeddedResizable({ type: "video", src: "clip.mp4" })
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("clip.mp4");
    // controls is a boolean attribute (present, empty value in happy-dom).
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(container.dataset.type).toBe("video");
    expect(container.dataset.src).toBe("clip.mp4");
  });

  it("inlines raw HTML for the embed type and keeps data-src empty", () => {
    const iframe =
      '<iframe src="https://player.example/xyz" allowfullscreen></iframe>';
    const container = parse(
      createEmbeddedResizable({ type: "embed", src: iframe })
    );

    // Embed src is treated as trusted HTML and injected verbatim into the body.
    expect(container.querySelector("iframe")).not.toBeNull();
    expect(
      container.querySelector("iframe")?.getAttribute("src")
    ).toBe("https://player.example/xyz");
    // The container never stores the raw HTML in data-src.
    expect(container.dataset.src).toBe("");
    expect(container.dataset.type).toBe("embed");
  });

  it("builds a download link for the file type with the provided alt label", () => {
    const container = parse(
      createEmbeddedResizable({
        type: "file",
        src: "report.pdf",
        alt: "Quarterly Report",
      })
    );

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("report.pdf");
    expect(link?.getAttribute("download")).toBe("Quarterly Report");
    expect(link?.getAttribute("target")).toBe("_blank");
    // The visible label uses the alt text.
    expect(link?.textContent).toContain("Quarterly Report");
    expect(container.dataset.type).toBe("file");
  });

  it('falls back to "Download File" label when a file has no alt', () => {
    const container = parse(
      createEmbeddedResizable({ type: "file", src: "data.bin" })
    );

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    // alt defaults to "" so download="" and the visible label is the fallback.
    expect(link?.getAttribute("download")).toBe("");
    expect(link?.textContent).toContain("Download File");
  });

  it("applies the supplied width/height/aspect/alignment to the data-* attributes", () => {
    const container = parse(
      createEmbeddedResizable({
        type: "image",
        src: "x.png",
        width: 640,
        height: 480,
        maintainAspectRatio: false,
        alignment: "right",
      })
    );

    expect(container.dataset.width).toBe("640");
    expect(container.dataset.height).toBe("480");
    expect(container.dataset.maintainAspect).toBe("false");
    expect(container.dataset.alignment).toBe("right");
    // The inline width/height must reflect the requested size.
    expect(container.style.width).toBe("640px");
    expect(container.style.height).toBe("480px");
  });

  it("applies default dimensions/aspect/alignment when omitted", () => {
    const container = parse(
      createEmbeddedResizable({ type: "image", src: "x.png" })
    );

    expect(container.dataset.width).toBe("400");
    expect(container.dataset.height).toBe("300");
    expect(container.dataset.maintainAspect).toBe("true");
    expect(container.dataset.alignment).toBe("center");
    // Container is non-editable and focusable.
    expect(container.getAttribute("contenteditable")).toBe("false");
    expect(container.getAttribute("tabindex")).toBe("0");
  });

  it("escapes ampersands and quotes in a file src and alt without breaking out", () => {
    const container = parse(
      createEmbeddedResizable({
        type: "file",
        src: 'a&b"c.pdf',
        alt: 'weird "name" & co',
      })
    );

    const link = container.querySelector("a");
    // The security-relevant chars (& and ") are entity-escaped in the markup and
    // decode back to their literal values through the DOM parser — the quotes
    // never terminate the attribute early.
    expect(link?.getAttribute("href")).toBe('a&b"c.pdf');
    expect(link?.getAttribute("download")).toBe('weird "name" & co');
    // And the container survives as a single well-formed node.
    expect(container.classList.contains("embedded-resizable-container")).toBe(
      true
    );
  });

  it("entity-escapes angle brackets in an image alt so no stray tag is injected", () => {
    const container = parse(
      createEmbeddedResizable({
        type: "image",
        src: "x.png",
        alt: "<b>bold</b>",
      })
    );

    // The alt was escaped, so no <b> element leaked into the container — the
    // only child element is the <img> itself. This is the real security
    // property: angle brackets in an attribute cannot inject a sibling tag.
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    // The alt attribute carries the (escaped) text rather than spawning markup.
    expect(container.querySelector("img")?.getAttribute("alt")).toContain(
      "bold"
    );
  });
});

describe("buildEmbedContainerStyle alignment branches", () => {
  it("centers with auto side margins by default", () => {
    const style = buildEmbedContainerStyle(400, 300, "center");
    expect(style).toContain("margin: 16px auto");
    expect(style).toContain("width: 400px");
    expect(style).toContain("height: 300px");
  });

  it("aligns left with a zero right margin", () => {
    const style = buildEmbedContainerStyle(200, 150, "left");
    expect(style).toContain("margin: 16px 0 16px 0");
    expect(style).not.toContain("auto");
  });

  it("aligns right with an auto left margin", () => {
    const style = buildEmbedContainerStyle(200, 150, "right");
    expect(style).toContain("margin: 16px 0 16px auto");
  });

  it("always includes the shared structural declarations", () => {
    const style = buildEmbedContainerStyle(100, 100, "center");
    expect(style).toContain("position: relative");
    expect(style).toContain("display: block");
    expect(style).toContain("overflow: hidden");
    expect(style).toContain("border-radius: 8px");
    // The margin declaration must be terminated (no trailing semicolon leaks).
    expect(style.endsWith("cursor: pointer")).toBe(true);
  });
});

describe("getEmbeddedDimensions", () => {
  it("reads width/height from data attributes", () => {
    const el = document.createElement("div");
    el.dataset.width = "520";
    el.dataset.height = "410";
    expect(getEmbeddedDimensions(el)).toEqual({ width: 520, height: 410 });
  });

  it("falls back to 400x300 defaults when data attributes are absent", () => {
    const el = document.createElement("div");
    expect(getEmbeddedDimensions(el)).toEqual({ width: 400, height: 300 });
  });
});

describe("updateEmbeddedDimensions", () => {
  it("writes both the inline style and the data attributes", () => {
    const el = document.createElement("div");
    updateEmbeddedDimensions(el, 333, 222);
    expect(el.style.width).toBe("333px");
    expect(el.style.height).toBe("222px");
    expect(el.dataset.width).toBe("333");
    expect(el.dataset.height).toBe("222");
  });
});
