import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useSlashCommands } from "../useSlashCommands";
import type { UseSlashCommandsOptions } from "../useSlashCommands";

/**
 * openCommandMenu() deletes the trigger "/" from the document (the menu
 * re-inserts a block on selection). If the user instead dismisses the menu by
 * pressing Space — wanting literal "/ " text — the slash was gone and only a
 * space was left. The space branch must restore the "/" at the caret.
 */
describe("useSlashCommands: dismissing with Space restores the slash", () => {
  let container: HTMLDivElement;
  let editorElement: HTMLDivElement;
  let options: UseSlashCommandsOptions;

  const setCaret = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = globalThis.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  beforeEach(() => {
    container = document.createElement("div");
    container.className = "next-level-editor";
    editorElement = document.createElement("div");
    editorElement.className = "editor-content";
    editorElement.setAttribute("contenteditable", "true");
    container.appendChild(editorElement);
    document.body.appendChild(container);

    options = {
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
      handleListAction: vi.fn(),
      insertLink: vi.fn(),
      insertImage: vi.fn(),
      openTableModal: vi.fn(),
      openCodeBlockModal: vi.fn(),
      handleInsertHR: vi.fn(),
      performWithSelection: vi.fn((cb) => cb(editorElement)),
    };
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("re-inserts the '/' and closes the menu on Space", async () => {
    // Realistic flow: text "x/" with the caret right after the slash.
    editorElement.innerHTML = "<p>x/</p>";
    const textNode = editorElement.querySelector("p")!.firstChild as Text;
    setCaret(textNode, 2);

    const { openCommandMenu, handleMenuKeydown, showCommandMenu } =
      useSlashCommands(options);

    // Opening the menu strips the trigger slash from the DOM.
    openCommandMenu();
    await nextTick();
    expect(showCommandMenu.value).toBe(true);
    expect(editorElement.textContent).toBe("x");

    // The user presses Space to bail out and keep typing literal text.
    const handled = handleMenuKeydown(
      new KeyboardEvent("keydown", { key: " ", cancelable: true })
    );

    // The handler lets the space type (returns false) but has restored the "/".
    expect(handled).toBe(false);
    expect(showCommandMenu.value).toBe(false);
    expect(editorElement.textContent).toBe("x/");
  });
});
