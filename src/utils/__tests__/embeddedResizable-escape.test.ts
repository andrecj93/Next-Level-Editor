import { describe, it, expect } from "vitest";
import { createEmbeddedResizable } from "../embeddedResizable";

// Regression for #16: an embed's raw iframe HTML (full of double-quotes) used to
// break out of data-src="${src}" and corrupt the container tag — the tabindex
// was lost and a sibling node spilled out. Attribute values must be escaped.
describe("createEmbeddedResizable attribute escaping", () => {
  const parse = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp;
  };

  it("produces a single well-formed container for a YouTube embed", () => {
    const iframe =
      '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315" allowfullscreen></iframe>';
    const temp = parse(createEmbeddedResizable({ type: "embed", src: iframe }));

    // No sibling nodes spilled out of the container.
    expect(temp.childElementCount).toBe(1);

    const container = temp.firstElementChild as HTMLElement;
    expect(container.classList.contains("embedded-resizable-container")).toBe(
      true
    );
    // Container attributes survive intact.
    expect(container.getAttribute("tabindex")).toBe("0");
    expect(container.getAttribute("contenteditable")).toBe("false");
    // The iframe lives in the body, and data-src is not polluted with raw HTML.
    expect(container.querySelector("iframe")).not.toBeNull();
    expect(container.getAttribute("data-src")).toBe("");
  });

  it("escapes quotes in an image alt without corrupting the container", () => {
    const temp = parse(
      createEmbeddedResizable({
        type: "image",
        src: "photo.png",
        alt: 'a "quoted" caption',
      })
    );

    expect(temp.childElementCount).toBe(1);
    const img = temp.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe('a "quoted" caption');
    expect(img?.getAttribute("src")).toBe("photo.png");
  });
});
