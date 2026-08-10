import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Two measured defects in the variable pill's styling.
 *
 * R23-49: `.editor-variable::before` is the pill's in-flow status dot (6px wide
 * + 6px margin), and `.editor-variable[title]:hover::before` REUSED that same
 * pseudo-element as an absolutely-positioned tooltip arrow. An element has only
 * ::before and ::after, and ::after was already the tooltip body — so on hover
 * the dot left the flow and the pill lost 12px. Measured in chromium: the token
 * text jumped exactly -12.00px and the pill went 159.63px -> 147.63px the
 * instant the pointer touched it. The arrow is hover-only ornament; the dot is
 * always-visible identity, so the arrow is what goes.
 *
 * R23-66: the print rule set the substituted value to an ABSOLUTE `12pt`, while
 * the token text is hidden with font-size: 0. Measured under print emulation, a
 * value inside a 35.2px <h1> printed at 16px — under half the size of the words
 * either side of it. It must inherit the surrounding type.
 */
describe("variable pill styling (#R23-49, #R23-66)", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/styles/editor-variables.css"),
    "utf-8"
  );

  it("keeps the status dot in flow — no ::before hijacked on hover", () => {
    // Any `:hover::before` on the pill steals the dot's layout box.
    expect(css).not.toMatch(/\.editor-variable\[title\]:hover::before/);
  });

  it("still draws the dot, and still draws the tooltip body", () => {
    // The fix must not throw away the pill's identity or its tooltip.
    expect(css).toMatch(/\.editor-variable::before\s*\{/);
    expect(css).toMatch(/\.editor-variable\[title\]:hover::after\s*\{/);
  });

  it("prints the substituted value at the surrounding type size", () => {
    // Isolate the print `::after` rule that injects attr(data-value).
    const rule = css.match(
      /\.editor-variable::after\s*\{([^}]*content:\s*attr\(data-value\)[^}]*)\}/
    );
    expect(rule, "print rule injecting attr(data-value) should exist").toBeTruthy();
    const body = rule![1];
    // No absolute pt/px size — the value has to follow its context.
    expect(body).not.toMatch(/font-size:\s*\d+(pt|px)/);
  });

  it("never hides the token via font-size: 0 on the pill (#R24-1)", () => {
    // ::after inherits from its ORIGINATING element. `font-size: 0` on the
    // pill therefore zeroed the injected value too — page.pdf() showed
    // variables printing as NOTHING. The previous revision of this very test
    // asserted `font-size: inherit` on ::after as if that were the fix; it was
    // the regression. The token is hidden as a real child instead.
    const printBlock = css.slice(css.indexOf("@media print"));
    const printPillRule = printBlock.match(/\.editor-variable\s*\{([^}]*)\}/);
    expect(printPillRule, "print rule for the pill should exist").toBeTruthy();
    expect(printPillRule![1]).not.toMatch(/font-size:\s*0/);
  });

  it("hides the .variable-token child in print instead (#R24-1)", () => {
    const printBlock = css.slice(css.indexOf("@media print"));
    const tokenRule = printBlock.match(
      /\.editor-variable\s+\.variable-token\s*\{([^}]*)\}/
    );
    expect(tokenRule, "print must hide the token wrapper").toBeTruthy();
    expect(tokenRule![1]).toMatch(/display:\s*none/);
  });
});
