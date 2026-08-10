import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyTextColor, applyBackgroundColor, applyFontSize } from "../commands";

/**
 * Regression coverage for the multi-block inline-style trap: applying a text
 * color / highlight / font size to a selection spanning two or more blocks used
 * to wrap the whole extracted fragment in ONE inline <span>, producing invalid
 * block-in-inline nesting (`<span><p>…</p><p>…</p></span>`) that collapses the
 * paragraphs on export and is fragile across round-trips. Each block's slice
 * must now be wrapped in its own span.
 */
describe("multi-block inline styling wraps each block separately", () => {
  let root: HTMLElement;

  const selectAcrossParagraphs = () => {
    const paras = Array.from(root.querySelectorAll("p"));
    const range = document.createRange();
    range.setStart(paras[0].firstChild!, 0);
    range.setEnd(paras[1].firstChild!, paras[1].firstChild!.textContent!.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  beforeEach(() => {
    root = document.createElement("div");
    root.contentEditable = "true";
    root.innerHTML = "<p>Hello</p><p>World</p>";
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  it("applyTextColor: one span per paragraph, never a block inside a span", () => {
    selectAcrossParagraphs();
    applyTextColor(root, "rgb(255, 0, 0)");

    expect(root.querySelector("span p")).toBeNull();
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(2);
    spans.forEach((s) => expect(s.style.color).toBe("rgb(255, 0, 0)"));
    // Structure preserved: still two separate paragraphs.
    expect(root.querySelectorAll("p").length).toBe(2);
    expect(root.textContent).toBe("HelloWorld");
  });

  it("applyBackgroundColor: one highlight span per paragraph", () => {
    selectAcrossParagraphs();
    applyBackgroundColor(root, "rgb(255, 255, 0)");

    expect(root.querySelector("span p")).toBeNull();
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(2);
    spans.forEach((s) =>
      expect(s.style.backgroundColor).toBe("rgb(255, 255, 0)")
    );
    expect(root.querySelectorAll("p").length).toBe(2);
  });

  it("applyFontSize: one sized span per paragraph", () => {
    selectAcrossParagraphs();
    applyFontSize(root, "large");

    expect(root.querySelector("span p")).toBeNull();
    const spans = root.querySelectorAll("span");
    expect(spans.length).toBe(2);
    spans.forEach((s) => expect(s.style.fontSize).toBe("1.25em"));
    expect(root.querySelectorAll("p").length).toBe(2);
  });

  it("applyTextColor keeps an existing highlight span (doesn't strip it)", () => {
    root.innerHTML =
      '<p><span style="background-color: yellow">a</span></p><p>b</p>';
    selectAcrossParagraphs();
    applyTextColor(root, "rgb(0, 0, 255)");

    // The pre-existing highlight must survive (the wrapper doesn't unwrap spans).
    const highlight = Array.from(root.querySelectorAll("span")).find(
      (s) => s.style.backgroundColor
    );
    expect(highlight).toBeTruthy();
    expect(root.querySelector("span p")).toBeNull();
  });
});
