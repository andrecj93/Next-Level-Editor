import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R28-1 (print half) — the embed container's chrome is a persisted INLINE
 * style (dashed affordance border; solid border + corner handles while
 * selected), so without !important print rules every image/video printed
 * inside a dashed box, and printing with an embed selected drew the solid
 * selection border and the four white corner dots.
 *
 * The export paths strip the chrome from the markup (stripEmbedChrome);
 * window.print() renders the live DOM, so print CSS must neutralize it there.
 */
describe("@media print neutralizes embed-container chrome (R28-1)", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/styles/NextLevelEditor.css"),
    "utf-8"
  );

  // Isolate the print block: from `@media print {` to the css that follows it.
  const printBlock = (() => {
    const start = css.indexOf("@media print");
    expect(start).toBeGreaterThan(-1);
    // The block ends at the first `}` that closes the media query — find it by
    // brace counting so nested rules don't fool the extraction.
    let depth = 0;
    for (let i = css.indexOf("{", start); i < css.length; i++) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) return css.slice(start, i + 1);
      }
    }
    throw new Error("unclosed @media print block");
  })();

  it("kills the container border with !important (inline style demands it)", () => {
    const rule = printBlock.match(
      /\.embedded-resizable-container\s*\{([^}]*)\}/
    );
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/border:\s*none\s*!important/);
    expect(rule![1]).toMatch(/border-radius:\s*0\s*!important/);
  });

  it("hides the corner resize handles", () => {
    const rule = printBlock.match(/\.embed-resize-handle\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/display:\s*none\s*!important/);
  });

  it("keeps a neutral border on FILE cards (R29-2)", () => {
    // An attachment is a card: border-none leaves its fixed box printing as a
    // floating paperclip in blank space. The attribute selector outranks the
    // class-only border:none rule, so this wins regardless of order.
    const rule = printBlock.match(
      /\.embedded-resizable-container\[data-type="file"\]\s*\{([^}]*)\}/
    );
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/border:\s*1px solid[^;]*!important/);
  });
});
