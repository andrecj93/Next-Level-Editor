import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * The TOC feature stamps `id="heading-N-slug"` on every heading and generates
 * `<a href="#heading-N-slug">` links. The sanitizer preserved the TOC nav and
 * its fragment links — but h1-h6 only allowlisted `style`, so every heading id
 * was stripped on the v-model round-trip and every TOC link died after
 * save/reload. TOC-format ids must survive; arbitrary ids stay stripped (DOM
 * clobbering: an id like "location" can shadow window globals).
 */
describe("useHtmlSanitizer - TOC heading ids survive the round-trip", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  it("keeps TOC-format ids on headings", () => {
    const html =
      '<h2 id="heading-0-introduction">Introduction</h2>' +
      '<h3 id="heading-1-details">Details</h3>';
    const result = sanitizer.sanitizeHtml(html);
    expect(result).toContain('id="heading-0-introduction"');
    expect(result).toContain('id="heading-1-details"');
  });

  it("keeps the TOC nav's fragment links pointing at those ids", () => {
    const html =
      '<nav class="table-of-contents"><h2>Table of Contents</h2>' +
      '<ul><li><a href="#heading-0-introduction">Introduction</a></li></ul></nav>' +
      '<h2 id="heading-0-introduction">Introduction</h2>';
    const result = sanitizer.sanitizeHtml(html);
    expect(result).toContain('href="#heading-0-introduction"');
    expect(result).toContain('id="heading-0-introduction"');
  });

  it("still strips ARBITRARY heading ids (DOM-clobbering guard)", () => {
    const result = sanitizer.sanitizeHtml('<h2 id="location">evil</h2>');
    expect(result).not.toContain("id=");
    expect(result).toContain("evil");
  });

  it("strips ids from non-heading elements as before", () => {
    const result = sanitizer.sanitizeHtml('<p id="heading-0-x">text</p>');
    expect(result).not.toContain("id=");
  });
});
