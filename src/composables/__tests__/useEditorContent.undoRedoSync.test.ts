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

  it("can undo the first edit back to an initially-empty document", () => {
    // Replicates the mount sequence (useEditorSetup.onMounted): the empty
    // baseline is captured via captureAndEmit(false) BEFORE any typing, so the
    // first edit is undoable back to empty.
    const editorRef = ref<HTMLDivElement | null>(editor);
    const modelValue = ref("");
    const onUpdate = vi.fn();
    const { applySanitizedContent, captureAndEmit, undo, htmlContent } =
      useEditorContent({ editorContent: editorRef, modelValue, onUpdate });

    // Mount baseline for an empty document.
    applySanitizedContent("");
    captureAndEmit(false);
    expect(editor.innerHTML).toBe("");

    // User types the first content.
    editor.innerHTML = "<p>Hello</p>";
    captureAndEmit();
    expect(editor.innerHTML).toBe("<p>Hello</p>");

    // Undo must return to the empty baseline, not stay on the first edit.
    undo();
    expect(editor.innerHTML).toBe("");
    expect(htmlContent.value).toBe("");
  });

  // Replacing innerHTML discards the listeners bound to live nodes. Embeds are
  // re-initialized here directly; comments re-bind through onContentReplaced.
  // Without it a comment highlight survived the round-trip but went inert — the
  // click did nothing and the sidebar scrolled to a detached node.
  describe("onContentReplaced", () => {
    const setup = () => {
      const onContentReplaced = vi.fn();
      const api = useEditorContent({
        editorContent: ref<HTMLDivElement | null>(editor),
        modelValue: ref(""),
        onUpdate: vi.fn(),
        onContentReplaced,
      });
      return { ...api, onContentReplaced };
    };

    it("fires when a history snapshot is restored (undo/redo)", () => {
      const { captureAndEmit, undo, onContentReplaced } = setup();
      editor.innerHTML = "<p>one</p>";
      captureAndEmit();
      editor.innerHTML = "<p>two</p>";
      captureAndEmit();
      onContentReplaced.mockClear();

      undo();

      expect(onContentReplaced).toHaveBeenCalled();
    });

    it("fires when sanitized model content is applied", () => {
      const { applySanitizedContent, onContentReplaced } = setup();
      onContentReplaced.mockClear();

      applySanitizedContent("<p>from the host</p>");

      expect(onContentReplaced).toHaveBeenCalled();
    });

    it("does not fire on a plain edit (no innerHTML replacement)", () => {
      const { captureAndEmit, onContentReplaced } = setup();
      onContentReplaced.mockClear();

      editor.innerHTML = "<p>typed</p>";
      captureAndEmit();

      expect(onContentReplaced).not.toHaveBeenCalled();
    });
  });
});
