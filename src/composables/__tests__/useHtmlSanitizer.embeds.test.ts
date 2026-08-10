import { describe, it, expect } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";
import { createEmbeddedResizable } from "../../utils/embeddedResizable";

// The sanitizer used to unwrap ALL divs, so `.embedded-resizable-container`
// media wrappers were destroyed on every v-model round-trip (an inserted image
// degraded to a bare <img>, videos/iframes vanished). Containers must now
// survive with a rebuilt, trusted attribute set — while staying safe.
describe("useHtmlSanitizer embedded media containers", () => {
  const { sanitizeHtml } = useHtmlSanitizer();

  // Parse into a detached document so happy-dom doesn't try to actually load
  // iframe/video sources over the network.
  const parse = (html: string) => {
    const doc = document.implementation.createHTMLDocument("t");
    doc.body.innerHTML = html;
    return doc.body;
  };

  it("keeps an inserted image container intact through sanitization", () => {
    const html = createEmbeddedResizable({
      type: "image",
      src: "https://example.com/cat.png",
      alt: "cat",
      width: 500,
      height: 400,
    });
    const out = parse(sanitizeHtml(html));

    const container = out.querySelector<HTMLElement>(
      ".embedded-resizable-container"
    );
    expect(container).not.toBeNull();
    expect(container?.getAttribute("data-type")).toBe("image");
    expect(container?.getAttribute("data-width")).toBe("500");
    expect(container?.getAttribute("contenteditable")).toBe("false");
    expect(container?.getAttribute("tabindex")).toBe("0");
    expect(container?.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/cat.png"
    );
  });

  it("keeps a YouTube iframe embed but removes iframes from other hosts", () => {
    const good = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="embed" data-width="640" data-height="360"><iframe src="https://www.youtube.com/embed/abc123" allowfullscreen></iframe></div>'
    );
    expect(parse(good).querySelector("iframe")).not.toBeNull();

    const evil = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="embed"><iframe src="https://evil.example.com/steal"></iframe></div>'
    );
    expect(parse(evil).querySelector("iframe")).toBeNull();
  });

  it("rebuilds the container style from data-* instead of trusting inline CSS", () => {
    const out = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="image" data-src="/a.png" data-width="300" data-height="200" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999;"><img src="/a.png" /></div>'
    );
    const container = parse(out).querySelector<HTMLElement>(
      ".embedded-resizable-container"
    )!;
    // The hostile overlay style is gone; the deterministic style is present.
    expect(container.getAttribute("style")).not.toContain("fixed");
    expect(container.getAttribute("style")).toContain("width: 300px");
    expect(container.getAttribute("style")).toContain("position: relative");
  });

  it("drops unsafe data-src and unknown container types", () => {
    const unsafeSrc = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="image" data-src="javascript:alert(1)"><img src="/x.png" /></div>'
    );
    expect(
      parse(unsafeSrc)
        .querySelector(".embedded-resizable-container")
        ?.getAttribute("data-src")
    ).toBe("");

    const unknownType = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="wat"><b>kept text</b></div>'
    );
    // Unsalvageable container unwraps to its (sanitized) children.
    expect(parse(unknownType).querySelector(".embedded-resizable-container")).toBeNull();
    expect(parse(unknownType).textContent).toContain("kept text");
  });

  it("strips transient resize handles from persisted content", () => {
    const out = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="image" data-src="/a.png"><img src="/a.png" /><div class="embed-resize-handle" data-handle="se"></div></div>'
    );
    expect(parse(out).querySelector(".embed-resize-handle")).toBeNull();
    expect(parse(out).querySelector("img")).not.toBeNull();
  });

  it("still unwraps plain divs AND sanitizes their children (no unwrap bypass)", () => {
    const out = sanitizeHtml(
      '<div><b onclick="alert(1)">bold</b><script>alert(2)</script></div>'
    );
    const root = parse(out);
    expect(root.querySelector("div")).toBeNull();
    expect(root.querySelector("script")).toBeNull();
    // The unwrapped child must have been visited: onclick stripped.
    expect(root.querySelector("b")?.hasAttribute("onclick")).toBe(false);
    expect(root.textContent).toContain("bold");
  });

  it("keeps a video element with a safe src", () => {
    const out = sanitizeHtml(
      '<div class="embedded-resizable-container" data-type="video" data-src="https://example.com/v.mp4"><video src="https://example.com/v.mp4" controls></video></div>'
    );
    const video = parse(out).querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("https://example.com/v.mp4");
  });
});
