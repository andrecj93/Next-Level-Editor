import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The editor's dark mode is driven by the .theme-dark class on the
// .next-level-editor root (toggled from the toolbar), NOT by the OS-level
// prefers-color-scheme media query. These tests guard the conversion of
// component dark styles from @media (prefers-color-scheme: dark) blocks to
// .theme-dark descendant rules, so panels follow the editor's own toggle
// instead of the OS setting.
//
// happy-dom does not apply SFC scoped styles, so the assertions run against
// the component's <style> source. Top-level rules are written unindented,
// while rules nested in @media blocks are indented — the /^.../m anchors
// below therefore also verify the .theme-dark rules are NOT nested inside a
// media query.

const componentStyle = (name: string): string => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components", name),
    "utf-8"
  );
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!match) {
    throw new Error(`No <style> block found in ${name}`);
  }
  return match[1];
};

const components = [
  "AutocompleteDropdown.vue",
  "EmbeddedResizable.vue",
  "HistoryTimeline.vue",
  "SkipLinks.vue",
];

describe.each(components)("%s dark theme styles", (name) => {
  it("does not key dark styles to the OS prefers-color-scheme setting", () => {
    expect(componentStyle(name)).not.toMatch(/@media[^{]*prefers-color-scheme/);
  });

  it("keys dark styles to the editor's .theme-dark class", () => {
    expect(componentStyle(name)).toMatch(/^\.theme-dark /m);
  });

  it("never wraps .theme-dark in :global()/:deep() (mis-compiles in scoped styles)", () => {
    const css = componentStyle(name);
    expect(css).not.toMatch(/:global\(\s*\.theme-dark/);
    expect(css).not.toMatch(/:deep\(\s*\.theme-dark/);
  });
});

describe("converted dark rules keep the original visual values", () => {
  it("AutocompleteDropdown", () => {
    const css = componentStyle("AutocompleteDropdown.vue");
    expect(css).toMatch(
      /^\.theme-dark \.autocomplete-dropdown \{[^}]*background: #1e1e1e/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.suggestion-item\.selected \{[^}]*background: #1a3a52/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.suggestion-item\.selected \{[^}]*border-left-color: #60a5fa/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.dropdown-footer \{[^}]*background: #252525/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.help-text kbd \{[^}]*background: #1e1e1e/m
    );
  });

  it("EmbeddedResizable", () => {
    const css = componentStyle("EmbeddedResizable.vue");
    expect(css).toMatch(
      /^\.theme-dark \.embedded-resizable:hover \{[^}]*border-color: rgba\(102, 126, 234, 0\.5\)/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.embedded-toolbar \{[^}]*background: #2a2a2a/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.toolbar-btn:hover \{[^}]*background: #3a3a3a/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.size-indicator \{[^}]*color: #ccc/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.resize-handle \{[^}]*border-color: #2a2a2a/m
    );
  });

  it("HistoryTimeline", () => {
    const css = componentStyle("HistoryTimeline.vue");
    expect(css).toMatch(
      /^\.theme-dark \.history-timeline \{[^}]*background: var\(--bg-secondary-dark, #2a2a2a\)/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.timeline-title \{[^}]*color: var\(--text-primary-dark, #f0f0f0\)/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.btn-clear,\r?\n\.theme-dark \.btn-export \{[^}]*background: var\(--bg-primary-dark, #1e1e1e\)/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.timeline-entry:hover \{[^}]*background: var\(--bg-hover-dark, #333\)/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.entry-preview \{[^}]*background: var\(--bg-primary-dark, #1e1e1e\)/m
    );
  });

  it("SkipLinks", () => {
    const css = componentStyle("SkipLinks.vue");
    expect(css).toMatch(
      /^\.theme-dark \.skip-link \{[^}]*background: #3b82f6/m
    );
    expect(css).toMatch(/^\.theme-dark \.skip-link \{[^}]*color: #000000/m);
    expect(css).toMatch(
      /^\.theme-dark \.skip-link:hover \{[^}]*background: #60a5fa/m
    );
    expect(css).toMatch(
      /^\.theme-dark \.skip-link:focus \{[^}]*outline-color: #000000/m
    );
  });
});
