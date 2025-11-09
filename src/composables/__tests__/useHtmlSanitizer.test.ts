import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

describe("useHtmlSanitizer", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  describe("Basic Sanitization", () => {
    it("should return empty string for null input", () => {
      expect(sanitizer.sanitizeHtml(null)).toBe("");
    });

    it("should return empty string for empty input", () => {
      expect(sanitizer.sanitizeHtml("")).toBe("");
    });

    it("should return empty string for whitespace-only input", () => {
      expect(sanitizer.sanitizeHtml("   \n\t  ")).toBe("");
    });

    it("should preserve allowed tags", () => {
      const html = "<p>Hello</p><strong>World</strong>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>Hello</p>");
      expect(result).toContain("<strong>World</strong>");
    });

    it("should remove disallowed tags", () => {
      const html =
        '<p>Safe</p><script>alert("XSS")</script><style>body{color:red}</style>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Safe");
      expect(result).not.toContain("script");
      expect(result).not.toContain("style");
      expect(result).not.toContain("alert");
    });

    it("should preserve text content when removing tags", () => {
      const html = "<p>Safe <script>unsafe</script> content</p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Safe");
      expect(result).toContain("content");
      expect(result).not.toContain("unsafe");
    });
  });

  describe("Allowed Tags", () => {
    it("should allow basic formatting tags", () => {
      const html = "<b>Bold</b> <i>Italic</i> <u>Underline</u> <s>Strike</s>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<b>Bold</b>");
      expect(result).toContain("<i>Italic</i>");
      expect(result).toContain("<u>Underline</u>");
      expect(result).toContain("<s>Strike</s>");
    });

    it("should allow heading tags", () => {
      const html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<h1>H1</h1>");
      expect(result).toContain("<h2>H2</h2>");
      expect(result).toContain("<h3>H3</h3>");
    });

    it("should allow list tags", () => {
      const html =
        "<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Item A</li></ol>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
      expect(result).toContain("</ul>");
      expect(result).toContain("<ol>");
    });

    it("should allow table tags", () => {
      const html =
        "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("<th>");
      expect(result).toContain("<td>");
    });

    it("should allow code and pre tags", () => {
      const html = "<pre><code>const x = 5;</code></pre>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
      expect(result).toContain("const x = 5;");
    });

    it("should allow blockquote", () => {
      const html = "<blockquote>Quote text</blockquote>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<blockquote>");
      expect(result).toContain("Quote text");
    });

    it("should allow br and hr", () => {
      const html = "<p>Line 1<br>Line 2</p><hr>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<br>");
      expect(result).toContain("<hr>");
    });

    it("should allow sup and sub", () => {
      const html = "<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<sub>2</sub>");
      expect(result).toContain("<sup>2</sup>");
    });
  });

  describe("Attribute Sanitization", () => {
    it("should allow safe href in anchor tags", () => {
      const html = '<p><a href="https://example.com">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('href="https://example.com"');
    });

    it("should remove dangerous href protocols", () => {
      const html = '<p><a href="javascript:alert(1)">Bad</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("javascript:");
    });

    it("should allow relative URLs in href", () => {
      const html = '<p><a href="/page">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('href="/page"');
    });

    it("should allow hash URLs in href", () => {
      const html = '<p><a href="#section">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('href="#section"');
    });

    it("should allow mailto links", () => {
      const html = '<p><a href="mailto:test@example.com">Email</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("mailto:test@example.com");
    });

    it("should allow tel links", () => {
      const html = '<p><a href="tel:+1234567890">Call</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("tel:+1234567890");
    });

    it("should add noopener and noreferrer to anchor tags with href", () => {
      const html = '<p><a href="https://example.com">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("noopener");
      expect(result).toContain("noreferrer");
    });

    it("should preserve existing rel attributes and add security tokens", () => {
      const html =
        '<p><a href="https://example.com" rel="external">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("noopener");
      expect(result).toContain("noreferrer");
      expect(result).toContain("external");
    });

    it("should remove target and rel from anchors without href", () => {
      const html = '<p><a target="_blank" rel="external">No href</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("target");
      expect(result).not.toContain("rel");
    });

    it("should allow safe src in img tags", () => {
      const html =
        '<p><img src="https://example.com/image.jpg" alt="Image"></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('src="https://example.com/image.jpg"');
    });

    it("should allow data URI images", () => {
      const html = '<p><img src="data:image/png;base64,iVBORw0KGgoAAAANS"></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("data:image/png;base64");
    });

    it("should remove dangerous src in img tags", () => {
      const html = '<p><img src="javascript:alert(1)"></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("javascript:");
    });

    it("should allow img alt, width, height attributes", () => {
      const html =
        '<p><img src="https://example.com/img.jpg" alt="Test" width="100" height="50"></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('alt="Test"');
      expect(result).toContain('width="100"');
      expect(result).toContain('height="50"');
    });

    it("should allow title attribute globally", () => {
      const html = '<p title="Tooltip">Text</p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('title="Tooltip"');
    });

    it("should allow style attribute for allowed elements", () => {
      const html = '<p style="color: red;">Styled</p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("style=");
    });

    it("should allow table attributes", () => {
      const html =
        '<table border="1" cellpadding="5" cellspacing="0"><tbody><tr><td colspan="2">Cell</td></tr></tbody></table>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('border="1"');
      expect(result).toContain('cellpadding="5"');
      expect(result).toContain('cellspacing="0"');
      expect(result).toContain('colspan="2"');
    });

    it("should normalize target attribute to _self or _blank", () => {
      const html =
        '<p><a href="https://example.com" target="_parent">Link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain('target="_self"');
    });

    it("should remove disallowed attributes", () => {
      const html = '<p onclick="alert(1)" data-custom="value">Text</p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("data-custom");
    });
  });

  describe("DIV Unwrapping", () => {
    it("should unwrap DIV tags", () => {
      const html = "<div>Content</div>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("<div>");
      expect(result).not.toContain("</div>");
      expect(result).toContain("Content");
    });

    it("should convert nested DIVs to paragraphs", () => {
      const html = "<div><div>Inner</div></div>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>");
      expect(result).toContain("Inner");
    });

    it("should preserve content when unwrapping DIVs", () => {
      const html = "<div><strong>Bold</strong> text</div>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<strong>Bold</strong>");
      expect(result).toContain("text");
    });
  });

  describe("Text Node Normalization", () => {
    it("should wrap orphan text nodes in paragraphs", () => {
      const html = "Plain text without wrapper";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>");
      expect(result).toContain("Plain text without wrapper");
    });

    it("should remove whitespace-only text nodes", () => {
      const html = "   <p>Content</p>   ";
      const result = sanitizer.sanitizeHtml(html);
      // Should not create empty paragraphs for whitespace
      expect(result).toContain("<p>Content</p>");
    });

    it("should trim text content before wrapping", () => {
      const html = "   Text with spaces   ";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Text with spaces");
      expect(result).not.toMatch(/^\s+/);
    });
  });

  describe("List Normalization", () => {
    it("should wrap direct text nodes in list items", () => {
      const html = "<ul>Direct text</ul>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<li>");
      expect(result).toContain("Direct text");
    });

    it("should wrap non-LI elements in LI tags", () => {
      const html = "<ul><p>Wrong element</p></ul>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<li>");
      expect(result).toContain("<p>");
      expect(result).toContain("Wrong element");
    });

    it("should ensure list items have content", () => {
      const html = "<ul><li></li><li>Text</li></ul>";
      const result = sanitizer.sanitizeHtml(html);
      // Empty list items get <br>
      expect(result).toContain("<br>");
    });

    it("should handle nested lists", () => {
      const html = "<ul><li>Item 1<ul><li>Sub item</li></ul></li></ul>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Item 1");
      expect(result).toContain("Sub item");
    });

    it("should remove empty text nodes in lists", () => {
      const html = "<ul>   <li>Item</li>   </ul>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Item");
      // Should not create empty list items
    });
  });

  describe("Block Element Normalization", () => {
    it("should ensure empty paragraphs have br tags", () => {
      const html = "<p></p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p><br></p>");
    });

    it("should ensure empty list items have br tags", () => {
      const html = "<ul><li></li></ul>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<li><br></li>");
    });

    it("should not add br to non-empty blocks", () => {
      const html = "<p>Text</p>";
      const result = sanitizer.sanitizeHtml(html);
      // Should only have one Text, not Text<br>
      expect(result).toBe("<p>Text</p>");
    });
  });

  describe("DIV to Paragraph Conversion", () => {
    it("should unwrap divs and wrap text in paragraphs", () => {
      const html = "<div>Content in div</div>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>");
      expect(result).toContain("Content in div");
    });

    it("should handle empty divs gracefully", () => {
      const html = "<div></div>";
      const result = sanitizer.sanitizeHtml(html);
      // Empty divs get unwrapped and removed
      expect(result).toBe("");
    });

    it("should preserve nested content when unwrapping divs", () => {
      const html = "<div><strong>Bold</strong> <em>Italic</em></div>";
      const result = sanitizer.sanitizeHtml(html);
      // DIVs are unwrapped, content preserved
      expect(result).toContain("<strong>Bold</strong>");
      expect(result).toContain("<em>Italic</em>");
    });
  });

  describe("Complex HTML Structures", () => {
    it("should handle deeply nested structures", () => {
      const html = "<p><strong><em><u>Nested</u></em></strong></p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("<u>");
      expect(result).toContain("Nested");
    });

    it("should handle mixed content", () => {
      const html = '<p>Text <strong>bold</strong> <a href="/link">link</a></p>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Text");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain('href="/link"');
    });

    it("should handle table with complex structure", () => {
      const html = `
        <table>
          <thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>
          <tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody>
        </table>
      `;
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<th>Header 1</th>");
      expect(result).toContain("<td>Cell 1</td>");
    });

    it("should sanitize multiple paragraphs", () => {
      const html = "<p>Para 1</p><p>Para 2</p><p>Para 3</p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>Para 1</p>");
      expect(result).toContain("<p>Para 2</p>");
      expect(result).toContain("<p>Para 3</p>");
    });
  });

  describe("Edge Cases", () => {
    it("should handle HTML with unicode characters", () => {
      const html = "<p>Hello 世界 🌍</p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Hello 世界 🌍");
    });

    it("should handle HTML entities", () => {
      const html = "<p>&lt;script&gt; &amp; &quot;</p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<p>");
    });

    it("should handle malformed HTML", () => {
      const html = "<p>Unclosed paragraph";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Unclosed paragraph");
    });

    it("should handle very long content", () => {
      const html = "<p>" + "Lorem ipsum ".repeat(100) + "</p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Lorem ipsum");
      expect(result.length).toBeGreaterThan(1000);
    });

    it("should handle empty tags with whitespace", () => {
      const html = "<p>   </p>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<br>");
    });

    it("should handle multiple dangerous elements", () => {
      const html =
        '<script>alert(1)</script><iframe src="evil"></iframe><embed src="bad">';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("script");
      expect(result).not.toContain("iframe");
      expect(result).not.toContain("embed");
    });

    it("should preserve allowed content within unwrapped divs", () => {
      const html = "<div><p>Good</p></div>";
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("Good");
      expect(result).toContain("<p>");
    });
  });
});
