import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

describe("useHtmlSanitizer block-level style handling", () => {
  let sanitizer: ReturnType<typeof useHtmlSanitizer>;

  beforeEach(() => {
    sanitizer = useHtmlSanitizer();
  });

  describe("preserves text-align on block tags", () => {
    it("keeps text-align on a heading", () => {
      const html = '<h1 style="text-align: center;">Title</h1>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<h1");
      expect(result).toContain("text-align: center");
      expect(result).toContain("Title");
    });

    it("keeps text-align on a list item", () => {
      const html = '<ul><li style="text-align: right;">Item</li></ul>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<li");
      expect(result).toContain("text-align: right");
      expect(result).toContain("Item");
    });

    it("keeps text-align on a blockquote", () => {
      const html = '<blockquote style="text-align: center;">Quote</blockquote>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("<blockquote");
      expect(result).toContain("text-align: center");
      expect(result).toContain("Quote");
    });

    it("keeps text-align on ul and ol containers", () => {
      const html =
        '<ul style="text-align: center;"><li>A</li></ul><ol style="text-align: right;"><li>B</li></ol>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("text-align: center");
      expect(result).toContain("text-align: right");
    });

    it("survives a model round-trip", () => {
      const html = '<h2 style="text-align: right;">Heading</h2>';
      const firstPass = sanitizer.sanitizeHtml(html);
      const secondPass = sanitizer.sanitizeHtml(firstPass);
      expect(secondPass).toContain("text-align: right");
      expect(secondPass).toBe(firstPass);
    });
  });

  describe("keeps other allowlisted properties", () => {
    it("keeps color, background-color and font-size", () => {
      const html =
        '<h3 style="color: rgb(1, 2, 3); background-color: yellow; font-size: 20px;">Styled</h3>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("color: rgb(1, 2, 3)");
      expect(result).toContain("background-color: yellow");
      expect(result).toContain("font-size: 20px");
    });
  });

  describe("drops dangerous or non-allowlisted declarations", () => {
    it("drops position from a block tag", () => {
      const html =
        '<h1 style="position: fixed; text-align: center;">Title</h1>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("position");
      expect(result).toContain("text-align: center");
    });

    it("drops a url() background value", () => {
      const html =
        '<blockquote style="background-color: url(javascript:alert(1));">Quote</blockquote>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("url(");
      expect(result).not.toContain("javascript:");
    });

    it("drops an expression() value", () => {
      const html = '<li style="color: expression(alert(1));">Item</li>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("expression");
    });

    it("removes the style attribute entirely when nothing safe remains", () => {
      const html = '<h1 style="position: absolute; z-index: 999;">Title</h1>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).not.toContain("style=");
      expect(result).not.toContain("position");
      expect(result).not.toContain("z-index");
      expect(result).toContain("Title");
    });

    it("keeps safe declarations while dropping unsafe ones on the same element", () => {
      const html =
        '<h2 style="text-align: center; behavior: url(evil.htc); font-size: 14px;">Mix</h2>';
      const result = sanitizer.sanitizeHtml(html);
      expect(result).toContain("text-align: center");
      expect(result).toContain("font-size: 14px");
      expect(result).not.toContain("behavior");
      expect(result).not.toContain("url(");
    });
  });
});
