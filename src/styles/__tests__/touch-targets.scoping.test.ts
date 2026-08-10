import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// touch-targets.css ships in the single dist stylesheet consumers import. Bare
// element/attribute selectors (`button`, `a`, `[role="button"]`, `select`, …)
// inside its touch media queries therefore restyle the ENTIRE consumer page on
// any touch device: every link gets a 44px floor, every button scales on
// :active, and the site's own focus rings are overridden. Same leak class as
// the focus-indicators.css bug fixed in round 5. Every selector must reference
// a class — either an editor scope (.next-level-editor, teleported
// [class*="nle-theme-"] roots, .mobile-toolbar) or a deliberate opt-in utility
// (.touch-target, body.debug-touch-targets …).

const css = readFileSync(
  resolve(process.cwd(), "src/styles/touch-targets.css"),
  "utf-8"
);

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every individual selector in the file (at-rule preludes excluded). */
const allSelectors = (): string[] => {
  const flat = stripComments(css);
  const selectors: string[] = [];
  const re = /([^{}]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    const prelude = m[1].trim();
    if (prelude.startsWith("@")) continue; // @media/@supports headers
    for (const sel of prelude.split(",")) {
      const s = sel.trim();
      if (s) selectors.push(s);
    }
  }
  return selectors;
};

describe("touch-targets.css leaks nothing onto the consumer page", () => {
  it("every selector references a class (no bare element/attribute selectors)", () => {
    // A "class reference" is a .class or a [class*=…] scope — both require the
    // consumer (or the editor) to opt in; bare `button`/`a`/`[role=…]` do not.
    const offenders = allSelectors().filter(
      (s) => !s.includes(".") && !s.includes("[class*=")
    );
    expect(offenders).toEqual([]);
  });

  it("still applies the 44px floor to controls inside the editor", () => {
    expect(css).toMatch(/\.next-level-editor button\b/);
    expect(css).toMatch(/\.next-level-editor a\b/);
  });

  it("covers the teleported overlay roots and the mobile toolbar", () => {
    expect(css).toMatch(/\[class\*="nle-theme-"\] button\b/);
    expect(css).toMatch(/\.mobile-toolbar button\b/);
  });
});
