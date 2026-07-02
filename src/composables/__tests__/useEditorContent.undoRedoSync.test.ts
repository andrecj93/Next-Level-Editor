import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useEditorContent } from "../useEditorContent";

// Regression for #13: undo/redo must update the reactive htmlContent/codeContent
// (which drive the live preview and the footer word/character counts), not just
// the contenteditable's innerHTML. Previously the preview and counts stayed
// stale after an undo until the next keystroke.
describe("useEditorContent undo/redo reactive sync", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
    vi.clearAllMocks();
  });

  it("updates htmlContent and codeContent on undo and redo", () => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    const modelValue = ref("");
    const onUpdate = vi.fn();
    const { captureAndEmit, undo, redo, htmlContent, codeContent } =
      useEditorContent({ editorContent: editorRef, modelValue, onUpdate });

    editor.innerHTML = "<p>one</p>";
    captureAndEmit();
    editor.innerHTML = "<p>two</p>";
    captureAndEmit();

    undo();
    expect(editor.innerHTML).toBe("<p>one</p>");
    expect(htmlContent.value).toBe("<p>one</p>");
    expect(codeContent.value).toBe("<p>one</p>");

    redo();
    expect(editor.innerHTML).toBe("<p>two</p>");
    expect(htmlContent.value).toBe("<p>two</p>");
    expect(codeContent.value).toBe("<p>two</p>");
  });
});
