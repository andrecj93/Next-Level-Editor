import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * Coverage for `stripUrlControlChars` — the sanitizer's defence against a
 * scheme obfuscated with characters the URL parser ignores.
 *
 * The bypass it closes: `href="java\nscript:alert(1)"` matches neither
 * SAFE_URL_PATTERN nor (without the stripper) URL_SCHEME_PATTERN, since `\n` is
 * outside `[a-z0-9+.-]`. It would therefore be classed a RELATIVE reference and
 * kept — while the browser, which drops ASCII whitespace and control characters
 * when reading a scheme, executes it as javascript:.
 *
 * There was no test for any obfuscated form, only for bare `javascript:`. That
 * matters more than usual here: the character class is written with literal
 * control BYTES rather than escapes (a NUL among them, which is why this file's
 * diffs needed a .gitattributes override to stay reviewable), so anyone tidying
 * it up is editing something they cannot see. These tests are the guard rail.
 */
describe("useHtmlSanitizer - obfuscated URL schemes", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  const blocked: Array<[string, string]> = [
    ["a newline inside the scheme", "java\nscript:alert(1)"],
    ["a carriage return inside the scheme", "java\rscript:alert(1)"],
    ["a tab inside the scheme", "java\tscript:alert(1)"],
    ["a form feed inside the scheme", "java\fscript:alert(1)"],
    ["leading whitespace", "   javascript:alert(1)"],
    ["a leading newline", "\njavascript:alert(1)"],
    ["several controls at once", " ja\tva\nscri\rpt:alert(1)"],
  ];

  it.each(blocked)("refuses a link with %s", (_label, href) => {
    const out = sanitizer.sanitizeHtml(`<p><a href="${href}">Bad</a></p>`);

    expect(out).not.toContain("alert");
    expect(out.replace(/[\s]/g, "").toLowerCase()).not.toContain(
      "javascript:"
    );
  });

  it.each(blocked)("refuses an image src with %s", (_label, src) => {
    const out = sanitizer.sanitizeHtml(`<p><img src="${src}" alt="x" /></p>`);

    expect(out).not.toContain("alert");
    expect(out.replace(/[\s]/g, "").toLowerCase()).not.toContain(
      "javascript:"
    );
  });

  it("refuses other executable schemes hidden the same way", () => {
    const out = sanitizer.sanitizeHtml(
      '<p><a href="da\nta:text/html;base64,PHNjcmlwdD4=">Bad</a></p>'
    );

    expect(out.replace(/[\s]/g, "").toLowerCase()).not.toContain("data:text");
  });

  describe("legitimate URLs are untouched (controls)", () => {
    it("keeps a relative path", () => {
      const out = sanitizer.sanitizeHtml('<p><a href="docs/guide.md">Doc</a></p>');
      expect(out).toContain('href="docs/guide.md"');
    });

    it("keeps a root-relative path and an anchor", () => {
      expect(sanitizer.sanitizeHtml('<p><a href="/about">A</a></p>')).toContain(
        'href="/about"'
      );
      expect(
        sanitizer.sanitizeHtml('<p><a href="#section-2">B</a></p>')
      ).toContain('href="#section-2"');
    });

    it("keeps an https URL", () => {
      const out = sanitizer.sanitizeHtml(
        '<p><a href="https://example.com/x">E</a></p>'
      );
      expect(out).toContain("https://example.com/x");
    });
  });
});
