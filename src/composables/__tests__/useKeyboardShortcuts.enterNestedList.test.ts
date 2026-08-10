import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * #26: pressing Enter on an EMPTY nested list item should outdent it one level
 * (like Shift+Tab), matching Word/Docs. Instead, the empty-item branch inserted
 * the break-out <p> into grandParent — which, for a nested item, is the parent
 * <li> — leaving an invalid <p> inside the <li> and the caret stranded indented.
 * Only a TOP-LEVEL empty item should exit the list to a paragraph.
 */
describe("Enter on an empty nested list item outdents (#26)", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
    window.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  const build = () =>
    useKeyboardShortcuts({
      editorContent: ref(editor),
      onInput: vi.fn(),
      onCaptureSnapshot: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      openCommandMenu: vi.fn(),
      insertLink: vi.fn(),
      openFindReplaceModal: vi.fn(),
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
    });

  const caretInto = (el: Element) => {
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const pressEnter = () =>
    build().handleKeydown(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
    );

  it("promotes the empty item to the parent list instead of a <p>-in-<li>", () => {
    editor.innerHTML = "<ul><li>A<ul><li></li></ul></li></ul>";
    const emptyLi = editor.querySelectorAll("li")[1]!; // the nested empty one
    caretInto(emptyLi);

    pressEnter();

    // No paragraph nested inside a list item.
    expect(editor.querySelector("li p")).toBeNull();
    // The inner list is gone; a single list remains…
    expect(editor.querySelectorAll("ul")).toHaveLength(1);
    // …with the empty item promoted to sit beside A at the top level.
    const topItems = Array.from(editor.querySelectorAll(":scope > ul > li"));
    expect(topItems).toHaveLength(2);
    expect(topItems[0].textContent).toBe("A");
  });

  it("still breaks a TOP-LEVEL empty item out to a paragraph", () => {
    editor.innerHTML = "<ul><li>A</li><li></li></ul>";
    const emptyLi = editor.querySelectorAll("li")[1]!;
    caretInto(emptyLi);

    pressEnter();

    // The paragraph is a sibling of the list, never inside an <li>.
    expect(editor.querySelector("li p")).toBeNull();
    const para = editor.querySelector("p");
    expect(para).not.toBeNull();
    expect(para!.parentElement).toBe(editor);
    // The list keeps only the non-empty item.
    expect(editor.querySelectorAll("li")).toHaveLength(1);
    expect(editor.querySelector("li")!.textContent).toBe("A");
  });
});
