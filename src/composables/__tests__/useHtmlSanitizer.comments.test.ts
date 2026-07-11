import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

// Comment-highlight spans (span.comment-highlight[data-thread-id]) are
// special-cased in the sanitizer so their anchoring markup survives the
// v-model / persist round-trip instead of being stripped to a bare <span>.
describe("useHtmlSanitizer - comment highlights", () => {
  let sanitize: (input: string | null) => string;

  const parse = (html: string): HTMLElement => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host;
  };

  beforeEach(() => {
    sanitize = useHtmlSanitizer().sanitizeHtml;
  });

  it("preserves the class + thread-id attributes of a highlight span", () => {
    const html =
      '<p>Ship <span class="comment-highlight" data-thread-id="1720-abc123" data-comment-thread="1720-abc123">this</span> today</p>';
    const span = parse(sanitize(html)).querySelector("span")!;
    expect(span).toBeTruthy();
    expect(span.getAttribute("class")).toBe("comment-highlight");
    expect(span.getAttribute("data-thread-id")).toBe("1720-abc123");
    expect(span.getAttribute("data-comment-thread")).toBe("1720-abc123");
    expect(span.textContent).toBe("this");
  });

  it("keeps the resolved modifier class", () => {
    const html =
      '<span class="comment-highlight comment-highlight-resolved" data-thread-id="a1">x</span>';
    const span = parse(sanitize(html)).querySelector("span")!;
    expect(span.getAttribute("class")).toBe(
      "comment-highlight comment-highlight-resolved"
    );
    expect(span.getAttribute("data-thread-id")).toBe("a1");
  });

  it("recovers the thread id from data-comment-thread alone", () => {
    const html =
      '<span class="comment-highlight" data-comment-thread="z9">x</span>';
    const span = parse(sanitize(html)).querySelector("span")!;
    expect(span.getAttribute("data-thread-id")).toBe("z9");
  });

  it("strips a highlight span with no/invalid thread id to a bare span", () => {
    const html =
      '<span class="comment-highlight" data-thread-id="bad id!">x</span>';
    const span = parse(sanitize(html)).querySelector("span")!;
    expect(span.getAttribute("class")).toBeNull();
    expect(span.getAttribute("data-thread-id")).toBeNull();
    expect(span.textContent).toBe("x");
  });

  it("does not let a spoofed highlight smuggle other attributes through", () => {
    const html =
      '<span class="comment-highlight" data-thread-id="ok1" onclick="alert(1)" style="position:fixed">x</span>';
    const span = parse(sanitize(html)).querySelector("span")!;
    expect(span.getAttribute("onclick")).toBeNull();
    expect(span.getAttribute("style")).toBeNull();
    expect(span.getAttribute("data-thread-id")).toBe("ok1");
  });

  it("sanitizes children inside a highlight", () => {
    const html =
      '<span class="comment-highlight" data-thread-id="ok"><img src="x" onerror="alert(1)">text</span>';
    const out = sanitize(html);
    expect(out).not.toContain("onerror");
  });
});
