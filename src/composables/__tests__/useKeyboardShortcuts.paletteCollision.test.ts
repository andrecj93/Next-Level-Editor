import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * Ctrl+Shift+K is the command-palette shortcut (the Shift was ADDED to it
 * precisely to stop colliding with Ctrl+K = Insert Link). But the editor's
 * link handler matched any Ctrl/Cmd+K regardless of Shift, so one press of
 * Ctrl+Shift+K opened the Link modal AND the palette on top of each other.
 * The link shortcut must ignore the shifted combo.
 */
describe("useKeyboardShortcuts: Ctrl+Shift+K does not open the Link modal", () => {
  let editorElement: HTMLDivElement;
  const insertLink = vi.fn();

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.contentEditable = "true";
    document.body.appendChild(editorElement);
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  const build = () =>
    useKeyboardShortcuts({
      editorContent: ref(editorElement),
      onInput: vi.fn(),
      onCaptureSnapshot: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      openCommandMenu: vi.fn(),
      insertLink,
      openFindReplaceModal: vi.fn(),
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
    });

  it("leaves Ctrl+Shift+K to the command palette", () => {
    const { handleKeydown } = build();
    handleKeydown(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        shiftKey: true,
        cancelable: true,
      })
    );
    expect(insertLink).not.toHaveBeenCalled();
  });

  it("still opens the Link modal on plain Ctrl+K", () => {
    const { handleKeydown } = build();
    handleKeydown(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        cancelable: true,
      })
    );
    expect(insertLink).toHaveBeenCalledTimes(1);
  });
});
