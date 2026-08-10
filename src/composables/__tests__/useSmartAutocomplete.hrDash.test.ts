import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

/**
 * The '---' horizontal-rule shortcut was unreachable: the em-dash rule fires on
 * the 2nd '-' (turning "--" into "—"), so by the time the 3rd '-' is typed the
 * line reads "—-" and the "^---$" rule could never match. Rather than disable
 * the (intended) bare "--" → em-dash conversion, the HR rule now also accepts
 * the post-em-dash form "—-".
 */
describe("useSmartAutocomplete '---' horizontal rule reachability", () => {
  const { detectSmartPunctuation, detectAutocomplete, detectMarkdown } =
    useSmartAutocomplete(ref<HTMLElement | null>(null));

  it("still converts a bare '--' to an em dash (unchanged)", () => {
    const r = detectSmartPunctuation("--");
    expect(r).not.toBeNull();
    expect(r!.replacement).toBe("—");
  });

  it("turns the post-em-dash form '—-' into a horizontal rule", () => {
    const r = detectAutocomplete("—-");
    expect(r).not.toBeNull();
    expect(r!.replacement).toBe("<hr>");
    expect(detectMarkdown("—-")!.replacement).toBe("<hr>");
  });

  it("still turns a literal '---' into a horizontal rule", () => {
    expect(detectAutocomplete("---")!.replacement).toBe("<hr>");
  });

  it("does not treat a mid-line '—-' (with leading text) as a rule", () => {
    // The rule is line-anchored, so "a—-" must not become an <hr>.
    expect(detectMarkdown("a—-")).toBeNull();
  });
});
