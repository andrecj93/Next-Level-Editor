import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * Pasted-content fidelity: semantic block wrappers, full heading range,
 * table caption/colgroup/col, and highlight-pill style round-trips.
 * Each fix ships with proof that dangerous content is still stripped.
 */
describe("useHtmlSanitizer - pasted content fidelity", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  describe("Semantic Container Unwrapping", () => {
    it("should unwrap figure/figcaption and keep the image and caption text", () => {
      const html =
        '<figure><img src="https://example.com/img.jpg" alt="Pic"><figcaption>Cap</figcaption></figure>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("<figure");
      expect(result).not.toContain("<figcaption");
      expect(result).toContain('src="https://example.com/img.jpg"');
      expect(result).toContain("Cap");
    });

    it("should unwrap section and keep its paragraphs", () => {
      const html = "<section><p>Para</p></section>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("<section");
      expect(result).toContain("<p>Para</p>");
    });

    it("should unwrap article, header, footer, main, aside and nav", () => {
      const html =
        "<article><header><p>Head</p></header><main><p>Body</p></main>" +
        "<aside><p>Side</p></aside><nav><p>Nav</p></nav>" +
        "<footer><p>Foot</p></footer></article>";
      const result = sanitizer.sanitizeHtml(html);
      for (const tag of [
        "article",
        "header",
        "footer",
        "main",
        "aside",
        "nav",
      ]) {
        expect(result).not.toContain(`<${tag}`);
      }
      expect(result).toContain("<p>Head</p>");
      expect(result).toContain("<p>Body</p>");
      expect(result).toContain("<p>Side</p>");
      expect(result).toContain("<p>Nav</p>");
      expect(result).toContain("<p>Foot</p>");
    });

    it("should unwrap description lists and keep term and definition text", () => {
      const html = "<dl><dt>Term</dt><dd>Definition</dd></dl>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("<dl");
      expect(result).not.toContain("<dt");
      expect(result).not.toContain("<dd");
      expect(result).toContain("Term");
      expect(result).toContain("Definition");
    });

    it("should recursively sanitize children of unwrapped containers", () => {
      const html =
        '<section><p onclick="alert(1)">Safe</p><script>alert("XSS")</script></section>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Safe");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("should strip attributes from unwrapped containers along with the tag", () => {
      const html = '<figure onmouseover="alert(1)"><p>Content</p></figure>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("onmouseover");
      expect(result).toContain("<p>Content</p>");
    });
  });

  describe("Extended Headings (H4-H6)", () => {
    it("should preserve h4, h5 and h6 with their text", () => {
      const html = "<h4>H4</h4><h5>H5</h5><h6>H6</h6>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<h4>H4</h4>");
      expect(result).toContain("<h5>H5</h5>");
      expect(result).toContain("<h6>H6</h6>");
    });

    it("should allow style on h4-h6 like h1-h3", () => {
      const html =
        '<h4 style="text-align: center;">A</h4><h5 style="color: red;">B</h5><h6 style="font-size: 12px;">C</h6>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('<h4 style="text-align: center">A</h4>');
      expect(result).toContain('<h5 style="color: red">B</h5>');
      expect(result).toContain('<h6 style="font-size: 12px">C</h6>');
    });

    it("should strip event handlers and unknown attributes from h4-h6", () => {
      const html = '<h4 onclick="alert(1)" data-evil="x">Heading</h4>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<h4");
      expect(result).toContain("Heading");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("data-evil");
    });
  });

  describe("Table Caption and Column Groups", () => {
    it("should preserve table caption text", () => {
      const html =
        "<table><caption>Quarterly results</caption><tbody><tr><td>Cell</td></tr></tbody></table>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<caption>Quarterly results</caption>");
      expect(result).toContain("<td>Cell</td>");
    });

    it("should preserve colgroup/col with span and style", () => {
      const html =
        '<table><colgroup span="2"><col span="2" style="width: 50%;"><col style="background-color: yellow;"></colgroup><tbody><tr><td>A</td><td>B</td><td>C</td></tr></tbody></table>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<colgroup");
      expect(result).toContain('span="2"');
      expect(result).toContain('<col span="2" style="width: 50%">');
      expect(result).toContain('style="background-color: yellow"');
    });

    it("should strip disallowed attributes from caption, colgroup and col", () => {
      const html =
        '<table><caption onclick="alert(1)">Cap</caption><colgroup onload="alert(2)"><col width="100" onerror="alert(3)"></colgroup><tbody><tr><td>Cell</td></tr></tbody></table>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Cap");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain('width="100"');
    });
  });

  describe("Highlight Pill Style Round-Trip", () => {
    it("should preserve padding and border-radius on highlight spans", () => {
      const html =
        '<p><span style="background-color: rgb(255, 235, 59); padding: 2px 4px; border-radius: 3px;">Highlighted</span></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("background-color: rgb(255, 235, 59)");
      expect(result).toContain("padding: 2px 4px");
      expect(result).toContain("border-radius: 3px");
    });

    it("should survive a second sanitize pass unchanged (v-model round-trip)", () => {
      const html =
        '<p><span style="background-color: rgb(255, 235, 59); padding: 2px 4px; border-radius: 3px;">Highlighted</span></p>';
      const once = sanitizer.sanitizeHtml(html);
      const twice = sanitizer.sanitizeHtml(once);
      expect(twice).toBe(once);
      expect(twice).toContain("padding: 2px 4px");
      expect(twice).toContain("border-radius: 3px");
    });

    it("should still drop dangerous values in padding/border-radius declarations", () => {
      const html =
        '<p><span style="padding: url(javascript:alert(1)); border-radius: expression(alert(1));">Text</span></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("url(");
      expect(result).not.toContain("expression(");
      expect(result).toContain("Text");
    });

    it("should still drop disallowed style properties", () => {
      const html =
        '<p><span style="position: fixed; padding: 4px;">Text</span></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("position");
      expect(result).toContain("padding: 4px");
    });
  });

  describe("Security Regressions After Widening", () => {
    it("should still remove script tags entirely", () => {
      const html = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Safe");
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("should still strip onclick and other event handlers", () => {
      const html = '<p onclick="alert(1)" onmouseover="alert(2)">Text</p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onmouseover");
      expect(result).toContain("Text");
    });

    it("should still strip javascript: URLs", () => {
      const html = '<p><a href="javascript:alert(1)">Bad</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("javascript:");
    });

    it("should still remove non-YouTube/Vimeo iframes", () => {
      const html = '<iframe src="https://evil.example.com/embed"></iframe>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("iframe");
      expect(result).not.toContain("evil.example.com");
    });

    it("should still remove script hidden inside an unwrapped semantic container", () => {
      const html =
        '<article><figure><script>alert("XSS")</script><img src="https://example.com/a.png"></figure></article>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
      expect(result).toContain('src="https://example.com/a.png"');
    });

    it("should still remove unknown tags with their subtree", () => {
      const html = "<p>Keep</p><object data='x'><param name='a'></object>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Keep");
      expect(result).not.toContain("object");
      expect(result).not.toContain("param");
    });
  });

  // Insert outputs that MUST survive a v-model round-trip. Before these fixes
  // the page break was unwrapped to a bare span+hr and the TOC nav was
  // stripped, so a consumer persisting the emitted HTML silently lost both.
  describe("Insert-output round-trips", () => {
    it("preserves a page break and regenerates its known-safe structure", () => {
      const html =
        '<p>a</p><div class="page-break" contenteditable="false"><span class="page-break-label">Page Break</span><hr class="page-break-line"></div><p>b</p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('class="page-break"');
      expect(result).toContain('contenteditable="false"');
      expect(result).toContain('class="page-break-label"');
      expect(result).toContain('class="page-break-line"');
      // Idempotent: a second pass produces the same output.
      expect(sanitizer.sanitizeHtml(result)).toBe(result);
    });

    it("rebuilds a page break from a tampered one (drops injected attributes)", () => {
      const html =
        '<div class="page-break" onclick="alert(1)" data-x="y"><span class="page-break-label">Page Break</span><hr class="page-break-line"></div>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('class="page-break"');
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("data-x");
    });

    it("preserves the table-of-contents nav wrapper and its links", () => {
      const html =
        '<nav class="table-of-contents"><h2>Table of Contents</h2><ul>' +
        '<li style="margin-left: 0px;"><a href="#h0">Intro</a></li>' +
        '<li style="margin-left: 20px;"><a href="#h1">Details</a></li></ul></nav>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('class="table-of-contents"');
      expect(result).toContain("<nav");
      expect(result).toContain('href="#h0"');
      expect(result).toContain('href="#h1"');
      // Indentation (margin-left) is preserved for nested headings.
      expect(result).toContain("margin-left: 20px");
    });

    it("still unwraps a plain nav (no toc class) and drops scripts inside a toc nav", () => {
      const plain = sanitizer.sanitizeHtml("<nav><p>Menu</p></nav>");
      expect(plain).not.toContain("<nav");
      expect(plain).toContain("<p>Menu</p>");

      const evil = sanitizer.sanitizeHtml(
        '<nav class="table-of-contents"><script>alert(1)</script><ul><li><a href="#x">X</a></li></ul></nav>'
      );
      expect(evil).toContain('class="table-of-contents"');
      expect(evil).not.toContain("script");
      expect(evil).not.toContain("alert");
    });

    it("strips a spoofed toc nav attribute but keeps the wrapper", () => {
      const html =
        '<nav class="table-of-contents" onmouseover="steal()"><ul><li><a href="#x">X</a></li></ul></nav>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('class="table-of-contents"');
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("steal");
    });
  });
});
