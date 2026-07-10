import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Focus indicator colors must follow the editor's own dark-theme toggle
// (.theme-dark class on the .next-level-editor root), not the OS-level
// prefers-color-scheme media query — otherwise focus rings stay light-themed
// inside a dark editor and vice versa.

const css = readFileSync(
  resolve(process.cwd(), "src/styles/focus-indicators.css"),
  "utf-8"
);

describe("focus-indicators.css dark theme", () => {
  it("does not key dark adjustments to the OS prefers-color-scheme setting", () => {
    expect(css).not.toMatch(/@media[^{]*prefers-color-scheme/);
  });

  it("overrides focus tokens under the editor's .theme-dark class", () => {
    const darkBlock = css.match(/^\.theme-dark \{([^}]*)\}/m);
    expect(darkBlock).not.toBeNull();
    // Follows the active preset accent; #60a5fa only as the out-of-scope
    // fallback (a bare #60a5fa would hardcode the default-preset blue).
    expect(darkBlock![1]).toContain(
      "--focus-color: var(--toolbar-accent, #60a5fa)"
    );
    expect(darkBlock![1]).toContain("--focus-color-high-contrast: #ffffff");
    expect(darkBlock![1]).toContain("--focus-bg-high-contrast: #000000");
  });

  it("keeps the light-mode defaults on :root untouched", () => {
    const rootBlock = css.match(/^:root \{([^}]*)\}/m);
    expect(rootBlock).not.toBeNull();
    expect(rootBlock![1]).toContain("--focus-color: #4a90e2");
  });

  it("makes the editor-scoped focus ring follow the active theme accent", () => {
    // The hardcoded #4a90e2 ring fails 3:1 on the warm/midnight light
    // toolbars; inside the editor (and on teleported .nle-theme-* overlay
    // roots) the ring must resolve to the preset's --toolbar-accent. The
    // declaration has to live on those roots — declared at :root the var()
    // would resolve out of the accent's scope and freeze the fallback.
    const editorBlock = css.match(
      /^\.next-level-editor,\s*\n\[class\*="nle-theme-"\] \{([^}]*)\}/m
    );
    expect(editorBlock).not.toBeNull();
    expect(editorBlock![1]).toContain(
      "--focus-color: var(--toolbar-accent, #4a90e2)"
    );
  });

  it("keeps the high-contrast and forced-colors blocks", () => {
    expect(css).toMatch(/@media \(prefers-contrast: more\)/);
    expect(css).toMatch(/@media \(forced-colors: active\)/);
  });
});

// Note: happy-dom resolves custom properties on the element a selector
// matches, but does not cascade them to descendants via getComputedStyle,
// so the assertions target the matched elements directly.
describe("focus token overrides on a dark editor root (behavioral)", () => {
  let styleEl: HTMLStyleElement;
  let editorRoot: HTMLDivElement;

  beforeAll(() => {
    styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    editorRoot = document.createElement("div");
    editorRoot.className = "next-level-editor theme-dark";
    document.body.appendChild(editorRoot);
  });

  afterAll(() => {
    styleEl.remove();
    editorRoot.remove();
  });

  it("resolves --focus-color to the dark value on the .theme-dark root", () => {
    const value = getComputedStyle(editorRoot)
      .getPropertyValue("--focus-color")
      .trim();
    expect(value).toBe("#60a5fa");
  });

  it("keeps the light --focus-color on the document root", () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--focus-color")
      .trim();
    expect(value).toBe("#4a90e2");
  });
});
