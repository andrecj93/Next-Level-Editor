import { afterEach, describe, expect, it, vi } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sanitizer result reuse", () => {
  it("validates each changed input while reusing identical history and model snapshots", () => {
    const createDocument = vi.spyOn(document.implementation, "createHTMLDocument");
    const { sanitizeHtml } = useHtmlSanitizer();
    const malicious = '<p>Draft</p><img src="https://example.com/a.png" onerror="unsafe()"><script>unsafe()</script>';
    const clean = sanitizeHtml(malicious);
    expect(clean).not.toMatch(/onerror|script|unsafe/);
    expect(sanitizeHtml(malicious)).toBe(clean);
    expect(sanitizeHtml(malicious)).toBe(clean);
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(sanitizeHtml('<p onclick="unsafe()">Changed</p>')).toBe("<p>Changed</p>");
    expect(createDocument).toHaveBeenCalledTimes(2);
    expect(sanitizeHtml(malicious)).toBe(clean);
    expect(createDocument).toHaveBeenCalledTimes(3);
  });

  it("keeps results per editor and never serves a browser result during SSR", () => {
    const createDocument = vi.spyOn(document.implementation, "createHTMLDocument");
    const first = useHtmlSanitizer(), second = useHtmlSanitizer();
    const html = "<p>Private draft</p>";
    expect(first.sanitizeHtml(html)).toBe(html);
    expect(second.sanitizeHtml(html)).toBe(html);
    expect(createDocument).toHaveBeenCalledTimes(2);
    vi.stubGlobal("window", undefined);
    expect(first.sanitizeHtml(html)).toBe("");
  });

  it("revalidates when the DOM environment changes", () => {
    const { sanitizeHtml } = useHtmlSanitizer();
    const html = "<p>Draft</p>";
    expect(sanitizeHtml(html)).toBe(html);
    const replacement = document.implementation.createHTMLDocument("replacement");
    const createDocument = vi.spyOn(replacement.implementation, "createHTMLDocument");
    vi.stubGlobal("document", replacement);
    expect(sanitizeHtml(html)).toBe(html);
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it("bounds retained input and output instead of caching large documents", () => {
    const createDocument = vi.spyOn(document.implementation, "createHTMLDocument");
    const { sanitizeHtml } = useHtmlSanitizer();
    const html = `<p>${"x".repeat(500_000)}</p>`;
    expect(sanitizeHtml(html)).toBe(html);
    expect(sanitizeHtml(html)).toBe(html);
    expect(createDocument).toHaveBeenCalledTimes(2);
  });
});
