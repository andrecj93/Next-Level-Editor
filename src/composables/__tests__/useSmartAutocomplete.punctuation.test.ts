import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

/**
 * Regressions:
 *  - #6: replacement used to hit the FIRST occurrence in the whole pre-caret
 *    text, not the trigger just typed at the caret.
 *  - #7: ambiguous fractions converted mid-token, so typing a date "1/24"
 *    became "½4".
 */
describe("detectSmartPunctuation", () => {
  const make = () => {
    // Suppress the out-of-setup lifecycle warning; detect* is pure.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const div = document.createElement("div");
    return useSmartAutocomplete(ref<HTMLElement | null>(div));
  };
  const { detectSmartPunctuation } = make();

  it("converts a symbol when it is the just-typed trigger at the caret", () => {
    expect(detectSmartPunctuation("->")).toMatchObject({
      original: "->",
      replacement: "→",
    });
    expect(detectSmartPunctuation("hello (c)")).toMatchObject({
      original: "(c)",
      replacement: "©",
    });
  });

  it("only replaces the trailing occurrence, never an earlier identical one", () => {
    // "a — b --" scenario: the just-typed trailing "--" converts; the earlier
    // one (already converted or literal) is untouched because original="--".
    const r = detectSmartPunctuation("a -- b --");
    expect(r).toMatchObject({ original: "--", replacement: "—" });
  });

  it("does not convert a trigger that is NOT at the caret", () => {
    // "--" exists but the caret is after more text → nothing to convert.
    expect(detectSmartPunctuation("-- then more text")).toBeNull();
  });

  it("converts a standalone fraction once a trailing boundary is typed", () => {
    expect(detectSmartPunctuation("1/2 ")).toMatchObject({
      original: "1/2 ",
      replacement: "½ ",
    });
    // Mixed number: "24 1/2 " → "24 ½ "
    expect(detectSmartPunctuation("24 1/2 ")).toMatchObject({
      original: "1/2 ",
      replacement: "½ ",
    });
  });

  it("does NOT mangle a date/version containing a fraction-like sequence", () => {
    expect(detectSmartPunctuation("1/24")).toBeNull(); // typing a date
    expect(detectSmartPunctuation("1/24 ")).toBeNull(); // even with boundary
    expect(detectSmartPunctuation("241/2 ")).toBeNull(); // preceded by a digit
  });
});
