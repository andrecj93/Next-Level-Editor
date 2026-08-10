import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

/**
 * The single-marker inline rules (`*italic*`, `` `code` ``) let the emphasis
 * body contain spaces and reach arbitrarily far back to an earlier STRAY
 * marker. Typing a real `*word*` after an unrelated `2 * 3` made the rule grab
 * `* 3 and then *`, destroying the multiplication and never forming the
 * intended italic — and it fired on the first `*` of a `**bold**` before the
 * bold rule could win. CommonMark requires emphasis markers to hug non-space
 * content, which also stops the reach-back.
 */
describe("useSmartAutocomplete emphasis marker flanking", () => {
  const { detectMarkdown } = useSmartAutocomplete(ref<HTMLElement | null>(null));

  it("italicizes only the tight *word*, ignoring an earlier stray '*'", () => {
    const r = detectMarkdown("2 * 3 and then *word*");
    expect(r).not.toBeNull();
    expect(r!.original).toBe("*word*");
    expect(r!.replacement).toBe("<em>word</em>");
  });

  it("does not italicize space-padded content ('* x *')", () => {
    expect(detectMarkdown("a * x *")).toBeNull();
  });

  it("lets **bold** win instead of italicizing a stray '*' before it", () => {
    const r = detectMarkdown("a * b then **bold**");
    expect(r).not.toBeNull();
    expect(r!.replacement).toBe("<strong>bold</strong>");
    expect(r!.original).toBe("**bold**");
  });

  it("still italicizes a plain *word*", () => {
    const r = detectMarkdown("*word*");
    expect(r!.replacement).toBe("<em>word</em>");
  });

  it("still italicizes a multi-word *a b* span (flanked by non-space)", () => {
    const r = detectMarkdown("say *a b* now");
    expect(r!.original).toBe("*a b*");
    expect(r!.replacement).toBe("<em>a b</em>");
  });

  it("inline code ignores an earlier stray backtick", () => {
    const r = detectMarkdown("x ` y `code`");
    expect(r!.original).toBe("`code`");
    expect(r!.replacement).toBe("<code>code</code>");
  });

  it("still forms plain `code`", () => {
    const r = detectMarkdown("run `npm test`");
    expect(r!.original).toBe("`npm test`");
    expect(r!.replacement).toBe("<code>npm test</code>");
  });
});
