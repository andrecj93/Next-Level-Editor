import { describe, it, expect } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * #19: Word/Google-Docs paste leaves behind empty <span> wrappers — the
 * sanitizer strips their class/lang/style but keeps the now-attribute-less,
 * childless <span></span>, which then survives every round-trip as noise.
 * A generic span that ends up empty with no attributes is dropped.
 */
describe("sanitizeHtml drops empty Word/Docs span wrappers (#19)", () => {
  const { sanitizeHtml } = useHtmlSanitizer();

  const text = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent;
  };

  it("removes an empty <span> but keeps the surrounding text", () => {
    const out = sanitizeHtml("<p>Hello <span></span>world</p>");
    expect(out).not.toContain("<span");
    expect(text(out)).toBe("Hello world");
  });

  it("removes a span left empty after its Word attributes are stripped", () => {
    const out = sanitizeHtml(
      '<p><span class="MsoNormal" lang="EN-US" style=""></span>Text</p>'
    );
    expect(out).not.toContain("<span");
    expect(text(out)).toBe("Text");
  });

  it("keeps a span that still has text content", () => {
    const out = sanitizeHtml("<p><span>kept</span></p>");
    expect(text(out)).toBe("kept");
  });

  it("does not disturb a variable pill span", () => {
    const out = sanitizeHtml(
      '<p><span class="editor-variable" data-variable="name">{{name}}</span></p>'
    );
    // The pill keeps its marker class (pills are validated on their own path).
    expect(out).toContain("editor-variable");
  });
});
