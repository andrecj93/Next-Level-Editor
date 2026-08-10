import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useTemplateManager } from "../useTemplateManager";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * handleSelectTemplate wrote template.content straight into innerHTML, so a
 * template carrying `<img src=x onerror=…>` executed on insertion, bypassing
 * the sanitizer that guards every other HTML ingestion path. When a sanitize
 * function is supplied it must run BEFORE the content reaches the DOM.
 */
describe("useTemplateManager sanitizes template content", () => {
  let editorContent: import("vue").Ref<HTMLElement | null>;
  const captureSnapshot = vi.fn();
  const { sanitizeHtml } = useHtmlSanitizer();

  beforeEach(() => {
    editorContent = ref<HTMLElement | null>(document.createElement("div"));
    editorContent.value!.innerHTML = "<p>original</p>";
    captureSnapshot.mockClear();
  });

  it("strips a script/onerror payload before it reaches the DOM", () => {
    const tm = useTemplateManager({
      editorContent,
      captureSnapshot,
      sanitize: sanitizeHtml,
    });

    tm.handleSelectTemplate({
      content: '<p>hi</p><img src=x onerror="window.__pwn=1">',
    });

    const html = editorContent.value!.innerHTML;
    expect(html).not.toContain("onerror");
    expect(editorContent.value!.querySelector("[onerror]")).toBeNull();
    // Legitimate template content survives.
    expect(html).toContain("hi");
    expect(captureSnapshot).toHaveBeenCalledTimes(1);
  });

  it("still inserts content verbatim when no sanitizer is wired (back-compat)", () => {
    const tm = useTemplateManager({ editorContent, captureSnapshot });
    tm.handleSelectTemplate({ content: "<h1>Title</h1>" });
    expect(editorContent.value!.innerHTML).toBe("<h1>Title</h1>");
  });
});
