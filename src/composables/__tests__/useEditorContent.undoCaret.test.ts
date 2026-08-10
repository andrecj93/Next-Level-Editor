import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useEditorContent } from "../useEditorContent";
import { getCaretOffsets } from "../../utils/caretOffset";

/**
 * Undo/redo replaced innerHTML wholesale, which destroyed the live selection
 * and dropped the caret to the very top of the document — so after every
 * Ctrl+Z the user had to hunt for their place again. Each snapshot now records
 * the caret as text offsets and restores it on the way back.
 */
describe("useEditorContent restores the caret on undo/redo", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    editor.remove();
    window.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  const putCaret = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  it("returns the caret to where it was in the undone state, not the top", () => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    const modelValue = ref("");
    const onUpdate = vi.fn();
    const { captureAndEmit, undo } = useEditorContent({
      editorContent: editorRef,
      modelValue,
      onUpdate,
    });

    // State 1: two paragraphs, caret parked mid-way through the second one.
    editor.innerHTML = "<p>Hello</p><p>World</p>";
    putCaret(editor.querySelectorAll("p")[1].firstChild!, 3); // after "Wor"
    captureAndEmit();

    // State 2: user types more; caret at the end.
    editor.innerHTML = "<p>Hello</p><p>World again</p>";
    putCaret(editor.querySelectorAll("p")[1].firstChild!, 11);
    captureAndEmit();

    // Undo back to state 1 — the caret must return to offset 8 ("Wor|"),
    // NOT collapse to offset 0.
    undo();

    expect(editor.innerHTML).toBe("<p>Hello</p><p>World</p>");
    const offsets = getCaretOffsets(editor);
    expect(offsets).toEqual({ start: 8, end: 8 });
    const sel = window.getSelection()!;
    expect(sel.getRangeAt(0).startContainer.textContent).toBe("World");
    expect(sel.getRangeAt(0).startOffset).toBe(3);
  });

  it("restores the caret on redo as well", () => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    const modelValue = ref("");
    const onUpdate = vi.fn();
    const { captureAndEmit, undo, redo } = useEditorContent({
      editorContent: editorRef,
      modelValue,
      onUpdate,
    });

    editor.innerHTML = "<p>alpha</p>";
    putCaret(editor.querySelector("p")!.firstChild!, 2);
    captureAndEmit();

    editor.innerHTML = "<p>alpha beta</p>";
    putCaret(editor.querySelector("p")!.firstChild!, 10); // within "alpha beta"
    captureAndEmit();

    undo();
    redo();

    expect(editor.innerHTML).toBe("<p>alpha beta</p>");
    expect(getCaretOffsets(editor)).toEqual({ start: 10, end: 10 });
  });
});
