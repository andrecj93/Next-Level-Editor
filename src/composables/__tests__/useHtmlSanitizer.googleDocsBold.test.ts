import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * Google Docs wraps its entire clipboard payload in a neutralizing bold tag:
 * <b style="font-weight:normal" id="docs-internal-guid-...">…</b>. The sanitizer
 * kept <b> (allowed) but stripped its style/id, so the "font-weight:normal"
 * reset vanished while the <b> survived — turning the whole pasted passage bold,
 * the opposite of the source. A <b>/<strong> whose OWN inline font-weight is
 * non-bold is a fake-bold wrapper and must be unwrapped.
 */
describe("useHtmlSanitizer - non-bold <b>/<strong> wrappers are unwrapped", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  it("unwraps the Google Docs font-weight:normal <b> wrapper", () => {
    const html =
      '<b style="font-weight:normal" id="docs-internal-guid-abc">' +
      "<p>Just a normal paragraph.</p></b>";
    const result = sanitizer.sanitizeHtml(html);

    expect(result).not.toContain("<b>");
    expect(result).not.toContain("<b ");
    expect(result).toContain("Just a normal paragraph.");
  });

  it("unwraps a strong with a numeric non-bold weight", () => {
    const html = '<strong style="font-weight:400">plain text</strong>';
    const result = sanitizer.sanitizeHtml(html);
    expect(result).not.toContain("<strong>");
    expect(result).not.toContain("<strong ");
    expect(result).toContain("plain text");
  });

  it("KEEPS a genuine bold tag (no neutralizing weight)", () => {
    const html = "<p>a <b>really bold</b> word</p>";
    const result = sanitizer.sanitizeHtml(html);
    expect(result).toContain("<b>really bold</b>");
  });

  it("KEEPS a <b> whose inline weight is actually bold", () => {
    const html = '<b style="font-weight:700">still bold</b>';
    const result = sanitizer.sanitizeHtml(html);
    expect(result).toContain("<b>still bold</b>");
  });
});
