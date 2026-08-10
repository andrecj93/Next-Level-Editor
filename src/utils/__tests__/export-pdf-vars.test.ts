import { describe, it, expect, afterEach } from "vitest";
import { copyEditorVariables } from "../export";

/**
 * R23-18: the PDF export clone is appended to <body>, outside
 * `.next-level-editor` where the editor's CSS custom properties are defined —
 * so `var(--editor-border)` (table gridlines) and `var(--toolbar-accent)`
 * (blockquote bar) fell back to `none`. copyEditorVariables carries the
 * RESOLVED variables onto the clone so those rules paint. (The actual border
 * rendering is browser-measured — happy-dom does not cascade CSS vars; this
 * covers the copy mechanism.)
 */
afterEach(() => {
  document.body.innerHTML = "";
});

describe("copyEditorVariables (#R23-18)", () => {
  it("copies the editor's custom properties onto the clone", () => {
    const source = document.createElement("div");
    source.className = "next-level-editor";
    source.style.setProperty("--editor-border", "#d8dde6");
    source.style.setProperty("--toolbar-accent", "#3b82f6");
    document.body.appendChild(source);

    const clone = document.createElement("div");
    copyEditorVariables(clone, source);

    expect(clone.style.getPropertyValue("--editor-border")).toBe("#d8dde6");
    expect(clone.style.getPropertyValue("--toolbar-accent")).toBe("#3b82f6");
  });

  it("carries a theme override, not just the base value", () => {
    // A dark editor overrides --editor-border; the clone must get the DARK
    // value so the PDF matches what the user sees.
    const source = document.createElement("div");
    source.className = "next-level-editor theme-dark";
    source.style.setProperty("--editor-border", "#334155");
    document.body.appendChild(source);

    const clone = document.createElement("div");
    copyEditorVariables(clone, source);

    expect(clone.style.getPropertyValue("--editor-border")).toBe("#334155");
  });

  it("is a no-op when there is no source editor", () => {
    const clone = document.createElement("div");
    expect(() => copyEditorVariables(clone, null)).not.toThrow();
    expect(clone.getAttribute("style")).toBeFalsy();
  });

  it("does not copy ordinary (non-custom) properties", () => {
    const source = document.createElement("div");
    source.className = "next-level-editor";
    source.style.setProperty("--editor-border", "#d8dde6");
    source.style.display = "flex";
    document.body.appendChild(source);

    const clone = document.createElement("div");
    copyEditorVariables(clone, source);

    // Only the custom prop is carried — never the editor's flex/height chrome,
    // which would distort the PDF layout.
    expect(clone.style.display).toBe("");
  });
});
