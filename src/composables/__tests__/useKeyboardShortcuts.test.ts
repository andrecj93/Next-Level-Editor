import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import * as formatting from "../../utils/formatting";

vi.mock("../../utils/formatting", () => ({
  indentListItem: vi.fn(() => true),
  outdentListItem: vi.fn(() => true),
}));

describe("useKeyboardShortcuts", () => {
  let editorElement: HTMLDivElement;
  let mockOnInput: () => void;
  let mockOnCaptureSnapshot: () => void;
  let mockUndo: () => void;
  let mockRedo: () => void;
  let mockOpenCommandMenu: () => void;
  let mockInsertLink: () => void;
  let mockOpenFindReplaceModal: () => void;
  let mockHandleInlineAction: () => void;
  let mockHandleBlockAction: () => void;

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.contentEditable = "true";
    document.body.appendChild(editorElement);

    mockOnInput = vi.fn();
    mockOnCaptureSnapshot = vi.fn();
    mockUndo = vi.fn();
    mockRedo = vi.fn();
    mockOpenCommandMenu = vi.fn();
    mockInsertLink = vi.fn();
    mockOpenFindReplaceModal = vi.fn();
    mockHandleInlineAction = vi.fn();
    mockHandleBlockAction = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    editorElement.remove();
  });

  describe("Enter Key Handling", () => {
    it("should create new paragraph on Enter key", () => {
      const p = document.createElement("p");
      p.textContent = "Test";
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(p.firstChild!, 4);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(editorElement.querySelectorAll("p").length).toBeGreaterThanOrEqual(
        2
      );
    });

    it("should create new list item in list on Enter", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "Item 1";
      ul.appendChild(li);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li.firstChild!, 6);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(ul.querySelectorAll("li").length).toBe(2);
    });

    it("should handle Enter with selected content", () => {
      const p = document.createElement("p");
      p.textContent = "Hello World";
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(p.firstChild!, 0);
      range.setEnd(p.firstChild!, 5);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(editorElement.textContent).not.toContain("Hello");
    });

    it("should not handle Enter with Shift key", () => {
      const p = document.createElement("p");
      p.textContent = "Test";
      editorElement.appendChild(p);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      handleKeydown(event);

      // Should not create new paragraph with Shift+Enter
      expect(editorElement.querySelectorAll("p").length).toBe(1);
    });

    it("should handle Enter in heading", () => {
      const h1 = document.createElement("h1");
      h1.textContent = "Heading";
      editorElement.appendChild(h1);

      const range = document.createRange();
      range.setStart(h1.firstChild!, 7);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(editorElement.querySelector("p")).toBeTruthy();
    });

    const buildShortcuts = () =>
      useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

    const setCaret = (node: Node, offset: number) => {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    it("keeps the heading tag when splitting a heading mid-content", () => {
      const h2 = document.createElement("h2");
      h2.textContent = "Heading";
      editorElement.appendChild(h2);
      setCaret(h2.firstChild!, 3); // "Hea|ding"

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter" })
      );

      // Both halves stay headings (NOT demoted to <p>).
      const headings = editorElement.querySelectorAll("h2");
      expect(headings.length).toBe(2);
      expect(headings[0].textContent).toBe("Hea");
      expect(headings[1].textContent).toBe("ding");
      expect(editorElement.querySelector("p")).toBeNull();
    });

    it("starts a fresh paragraph when Enter is at the END of a heading", () => {
      const h2 = document.createElement("h2");
      h2.textContent = "Title";
      editorElement.appendChild(h2);
      setCaret(h2.firstChild!, 5); // caret at end

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter" })
      );

      expect(editorElement.querySelectorAll("h2").length).toBe(1);
      expect(editorElement.querySelector("p")).toBeTruthy();
    });

    it("splits the list when Enter lands on an empty MIDDLE item", () => {
      editorElement.innerHTML =
        "<ul><li>A</li><li><br></li><li>B</li></ul>";
      const emptyLi = editorElement.querySelectorAll("li")[1];
      setCaret(emptyLi, 0);

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter" })
      );

      // [A] / paragraph / [B] — two lists split by a paragraph.
      const lists = editorElement.querySelectorAll("ul");
      expect(lists.length).toBe(2);
      expect(lists[0].textContent).toBe("A");
      expect(lists[1].textContent).toBe("B");
      const p = editorElement.querySelector("p");
      expect(p).toBeTruthy();
      // Order: ul(A) -> p -> ul(B)
      expect(lists[0].nextElementSibling).toBe(p);
      expect(p!.nextElementSibling).toBe(lists[1]);
    });

    it("does NOT split when Enter lands on an empty TRAILING item (exits list)", () => {
      editorElement.innerHTML = "<ul><li>A</li><li><br></li></ul>";
      const emptyLi = editorElement.querySelectorAll("li")[1];
      setCaret(emptyLi, 0);

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter" })
      );

      // One list ([A]) followed by a paragraph — the e2e-locked behavior.
      const lists = editorElement.querySelectorAll("ul");
      expect(lists.length).toBe(1);
      expect(lists[0].textContent).toBe("A");
      expect(lists[0].nextElementSibling).toBe(editorElement.querySelector("p"));
    });

    it("should handle Enter without block element", () => {
      editorElement.textContent = "Plain text";

      const range = document.createRange();
      range.setStart(editorElement.firstChild!, 5);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(editorElement.querySelectorAll("p").length).toBeGreaterThanOrEqual(
        1
      );
    });
  });

  describe("Slash Command", () => {
    it("should open command menu on slash at start", () => {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(p, 0);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "/" });
      handleKeydown(event);

      expect(mockOpenCommandMenu).toHaveBeenCalledTimes(1);
    });

    it("should not open command menu with modifier keys", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "/", ctrlKey: true });
      handleKeydown(event);

      expect(mockOpenCommandMenu).not.toHaveBeenCalled();
    });

    it("should open command menu with trailing whitespace before cursor", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("Hello ");
      p.appendChild(text);
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(text, 6); // Position after space
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "/" });
      handleKeydown(event);

      // Should open command menu because there's trailing whitespace
      expect(mockOpenCommandMenu).toHaveBeenCalled();
    });

    it("should not open command menu without text before cursor (non-whitespace)", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("HelloWorld");
      p.appendChild(text);
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(text, 5); // Position after "Hello" without space
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "/" });
      handleKeydown(event);

      // Should NOT open command menu because there's no whitespace
      expect(mockOpenCommandMenu).not.toHaveBeenCalled();
    });
  });

  describe("Tab Key - List Indentation", () => {
    it("should indent list item on Tab", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "Item 1";
      ul.appendChild(li);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li.firstChild!, 3);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      let inputCount = 0;
      editorElement.addEventListener("input", () => inputCount++);

      const event = new KeyboardEvent("keydown", { key: "Tab" });
      handleKeydown(event);

      expect(formatting.indentListItem).toHaveBeenCalledWith(editorElement);
      // The dispatched input event IS the emit path (host @input pipeline
      // snapshots + emits); a separate snapshot call would double-emit.
      expect(inputCount).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("should outdent list item on Shift+Tab", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "Item 1";
      ul.appendChild(li);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li.firstChild!, 3);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      let inputCount = 0;
      editorElement.addEventListener("input", () => inputCount++);

      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
      });
      handleKeydown(event);

      expect(formatting.outdentListItem).toHaveBeenCalledWith(editorElement);
      expect(inputCount).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("should not handle Tab outside of list", () => {
      const p = document.createElement("p");
      p.textContent = "Test";
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(p.firstChild!, 2);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Tab" });
      handleKeydown(event);

      expect(formatting.indentListItem).not.toHaveBeenCalled();
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("should not dispatch input or capture snapshot if indentation fails", () => {
      vi.mocked(formatting.indentListItem).mockReturnValue(false);

      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "Item 1";
      ul.appendChild(li);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li.firstChild!, 3);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      let inputCount = 0;
      editorElement.addEventListener("input", () => inputCount++);

      const event = new KeyboardEvent("keydown", { key: "Tab" });
      handleKeydown(event);

      expect(inputCount).toBe(0);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Tab Key - Table Cell Navigation", () => {
    const buildShortcuts = () =>
      useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

    const caretIn = (cell: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const activeCell = () => {
      const node = globalThis.getSelection()!.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      return el?.closest("td, th") ?? null;
    };

    it("Tab moves the caret to the next cell (and prevents default focus-out)", () => {
      editorElement.innerHTML =
        "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
      const cells = editorElement.querySelectorAll("td");
      caretIn(cells[0]);

      const { handleKeydown } = buildShortcuts();
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        cancelable: true,
      });
      handleKeydown(event);

      expect(event.defaultPrevented).toBe(true);
      expect(activeCell()).toBe(cells[1]);
    });

    it("Shift+Tab moves the caret to the previous cell", () => {
      editorElement.innerHTML =
        "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
      const cells = editorElement.querySelectorAll("td");
      caretIn(cells[1]);

      const { handleKeydown } = buildShortcuts();
      handleKeydown(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true })
      );

      expect(activeCell()).toBe(cells[0]);
    });

    it("Tab in the last cell appends a new row and lands in its first cell", () => {
      editorElement.innerHTML =
        "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
      const lastCell = editorElement.querySelectorAll("td")[1];
      caretIn(lastCell);

      let inputCount = 0;
      editorElement.addEventListener("input", () => inputCount++);

      const { handleKeydown } = buildShortcuts();
      handleKeydown(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));

      const rows = editorElement.querySelectorAll("tr");
      expect(rows.length).toBe(2); // a new row was added
      expect(rows[1].children.length).toBe(2); // mirrors the column count
      expect(activeCell()).toBe(rows[1].children[0]);
      expect(inputCount).toBe(1); // host input pipeline fired
    });
  });

  describe("Enter Key - table / blockquote / checklist context", () => {
    const buildShortcuts = () =>
      useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

    const placeCaret = (node: Node, offset: number) => {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    it("Enter inside a table cell inserts a line break and keeps the table intact", () => {
      editorElement.innerHTML =
        "<p>Intro</p><table><tbody><tr><td>hello</td><td>world</td></tr></tbody></table>";
      const cell = editorElement.querySelector("td")!;
      placeCaret(cell.firstChild!, 3); // caret mid "hello"

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
      );

      // The catastrophic old behavior nested <p> in <td>, wrapped <p> around the
      // table, and split it. None of that must happen.
      expect(editorElement.querySelectorAll("table").length).toBe(1);
      expect(editorElement.querySelector("td p")).toBeNull();
      expect(editorElement.querySelector("p table")).toBeNull();
      expect(cell.querySelector("br")).not.toBeNull();
      // The intro paragraph and the cell text survive.
      expect(editorElement.querySelector("p")?.textContent).toBe("Intro");
      expect(cell.textContent).toContain("hello");
    });

    it("Enter mid-blockquote continues the quote instead of stripping it", () => {
      editorElement.innerHTML = "<blockquote>Hello world</blockquote>";
      const quote = editorElement.querySelector("blockquote")!;
      placeCaret(quote.firstChild!, 5); // caret after "Hello"

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
      );

      // Both halves stay blockquotes (no <p> tail stealing the quote styling).
      const quotes = editorElement.querySelectorAll("blockquote");
      expect(quotes.length).toBe(2);
      expect(editorElement.querySelector("p")).toBeNull();
      expect(quotes[0].textContent).toBe("Hello");
      expect(quotes[1].textContent).toContain("world");
    });

    it("Enter in a checklist item creates a new item with checkbox semantics", () => {
      editorElement.innerHTML =
        '<ul class="checklist"><li data-checked="false" role="checkbox" aria-checked="false">Buy milk</li></ul>';
      const li = editorElement.querySelector("li")!;
      placeCaret(li.firstChild!, li.firstChild!.textContent!.length);

      buildShortcuts().handleKeydown(
        new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
      );

      const items = editorElement.querySelectorAll("ul.checklist > li");
      expect(items.length).toBe(2);
      const newItem = items[1];
      expect(newItem.getAttribute("data-checked")).toBe("false");
      expect(newItem.getAttribute("role")).toBe("checkbox");
      expect(newItem.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("Single Emit Per Enter (no double-emit)", () => {
    const createShortcuts = () =>
      useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

    const placeCaret = (node: Node, offset: number) => {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const countInputs = () => {
      let count = 0;
      editorElement.addEventListener("input", () => count++);
      return () => count;
    };

    it("dispatches exactly ONE input event and never calls onCaptureSnapshot on Enter in a paragraph", () => {
      const p = document.createElement("p");
      p.textContent = "Test";
      editorElement.appendChild(p);
      placeCaret(p.firstChild!, 4);

      const { handleKeydown } = createShortcuts();
      const inputs = countInputs();

      handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));

      // The dispatched input runs the host's full @input pipeline (snapshot +
      // sanitize + emit + auto-save); a second onCaptureSnapshot would emit
      // update:modelValue and auto-save TWICE per Enter.
      expect(inputs()).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("dispatches exactly ONE input event and never calls onCaptureSnapshot on Enter in a list item", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "Item 1";
      ul.appendChild(li);
      editorElement.appendChild(ul);
      placeCaret(li.firstChild!, 6);

      const { handleKeydown } = createShortcuts();
      const inputs = countInputs();

      handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(ul.querySelectorAll("li").length).toBe(2);
      expect(inputs()).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("dispatches exactly ONE input event and never calls onCaptureSnapshot on Enter in an EMPTY list item (list exit)", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      ul.appendChild(li);
      editorElement.appendChild(ul);
      placeCaret(li, 0);

      const { handleKeydown } = createShortcuts();
      const inputs = countInputs();

      handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(inputs()).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("dispatches exactly ONE input event and never calls onCaptureSnapshot on Enter in a heading", () => {
      const h1 = document.createElement("h1");
      h1.textContent = "Heading";
      editorElement.appendChild(h1);
      placeCaret(h1.firstChild!, 7);

      const { handleKeydown } = createShortcuts();
      const inputs = countInputs();

      handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(inputs()).toBe(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Undo/Redo Shortcuts", () => {
    it("should call undo on Ctrl+Z", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
      handleKeydown(event);

      expect(mockUndo).toHaveBeenCalledTimes(1);
      expect(mockRedo).not.toHaveBeenCalled();
    });

    it("should call redo on Ctrl+Shift+Z", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        shiftKey: true,
      });
      handleKeydown(event);

      expect(mockRedo).toHaveBeenCalledTimes(1);
      expect(mockUndo).not.toHaveBeenCalled();
    });

    it("should call redo on Ctrl+Y", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "y", ctrlKey: true });
      handleKeydown(event);

      expect(mockRedo).toHaveBeenCalledTimes(1);
    });

    it("should work with Meta key on Mac", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "z", metaKey: true });
      handleKeydown(event);

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe("Text Formatting Shortcuts", () => {
    it("should apply bold on Ctrl+B", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });
      handleKeydown(event);

      expect(mockHandleInlineAction).toHaveBeenCalledWith("strong");
    });

    it("should apply italic on Ctrl+I", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "i", ctrlKey: true });
      handleKeydown(event);

      expect(mockHandleInlineAction).toHaveBeenCalledWith("em");
    });

    it("should apply underline on Ctrl+U", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "u", ctrlKey: true });
      handleKeydown(event);

      expect(mockHandleInlineAction).toHaveBeenCalledWith("u");
    });

    it("should work with Meta key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "b", metaKey: true });
      handleKeydown(event);

      expect(mockHandleInlineAction).toHaveBeenCalledWith("strong");
    });

    it("should not format without modifier key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "b" });
      handleKeydown(event);

      expect(mockHandleInlineAction).not.toHaveBeenCalled();
    });
  });

  describe("Heading Shortcuts", () => {
    it("should apply H1 on Ctrl+Alt+1", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "1",
        ctrlKey: true,
        altKey: true,
      });
      handleKeydown(event);

      expect(mockHandleBlockAction).toHaveBeenCalledWith("h1");
    });

    it("should apply H2 on Ctrl+Alt+2", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "2",
        ctrlKey: true,
        altKey: true,
      });
      handleKeydown(event);

      expect(mockHandleBlockAction).toHaveBeenCalledWith("h2");
    });

    it("should apply H3 on Ctrl+Alt+3", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "3",
        ctrlKey: true,
        altKey: true,
      });
      handleKeydown(event);

      expect(mockHandleBlockAction).toHaveBeenCalledWith("h3");
    });

    it("should work with Meta key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "1",
        metaKey: true,
        altKey: true,
      });
      handleKeydown(event);

      expect(mockHandleBlockAction).toHaveBeenCalledWith("h1");
    });

    it("should not apply heading without Alt key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "1", ctrlKey: true });
      handleKeydown(event);

      expect(mockHandleBlockAction).not.toHaveBeenCalled();
    });

    it("should not apply heading for unsupported numbers", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", {
        key: "4",
        ctrlKey: true,
        altKey: true,
      });
      handleKeydown(event);

      expect(mockHandleBlockAction).not.toHaveBeenCalled();
    });
  });

  describe("Special Action Shortcuts", () => {
    it("should insert link on Ctrl+K", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
      handleKeydown(event);

      expect(mockInsertLink).toHaveBeenCalledTimes(1);
    });

    it("should open find/replace on Ctrl+F", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true });
      handleKeydown(event);

      expect(mockOpenFindReplaceModal).toHaveBeenCalledTimes(1);
    });

    it("should work with Meta key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      handleKeydown(event);

      expect(mockInsertLink).toHaveBeenCalledTimes(1);
    });

    it("should not trigger without modifier key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "k" });
      handleKeydown(event);

      expect(mockInsertLink).not.toHaveBeenCalled();
    });
  });

  describe("IME Composition Guard", () => {
    const createShortcuts = () =>
      useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

    /**
     * Build a keydown event that reports an active IME composition. The
     * KeyboardEvent constructor accepts isComposing, but happy-dom may not
     * carry it through — fall back to defining the property directly.
     */
    const composingKeydown = (
      init: KeyboardEventInit & { keyCode?: number }
    ) => {
      const event = new KeyboardEvent("keydown", {
        cancelable: true,
        ...init,
      });
      if (init.isComposing && !event.isComposing) {
        Object.defineProperty(event, "isComposing", { value: true });
      }
      if (init.keyCode !== undefined && event.keyCode !== init.keyCode) {
        Object.defineProperty(event, "keyCode", { value: init.keyCode });
      }
      return event;
    };

    const placeCaretIn = (p: HTMLElement, offset: number) => {
      const range = document.createRange();
      range.setStart(p.firstChild!, offset);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    it("must NOT intercept Enter while composing (candidate commit)", () => {
      const p = document.createElement("p");
      p.textContent = "こんにちは";
      editorElement.appendChild(p);
      placeCaretIn(p, 3);

      const { handleKeydown } = createShortcuts();

      const event = composingKeydown({ key: "Enter", isComposing: true });
      const preventSpy = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      // Enter must reach the IME: no preventDefault, no block split.
      expect(preventSpy).not.toHaveBeenCalled();
      expect(editorElement.querySelectorAll("p").length).toBe(1);
      expect(editorElement.textContent).toBe("こんにちは");
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("must NOT intercept Enter when keyCode is 229 (legacy IME signal)", () => {
      const p = document.createElement("p");
      p.textContent = "input";
      editorElement.appendChild(p);
      placeCaretIn(p, 5);

      const { handleKeydown } = createShortcuts();

      const event = composingKeydown({ key: "Enter", keyCode: 229 });
      const preventSpy = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(preventSpy).not.toHaveBeenCalled();
      expect(editorElement.querySelectorAll("p").length).toBe(1);
    });

    it("does not open the slash menu while composing", () => {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      editorElement.appendChild(p);

      const range = document.createRange();
      range.setStart(p, 0);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = createShortcuts();

      handleKeydown(composingKeydown({ key: "/", isComposing: true }));

      expect(mockOpenCommandMenu).not.toHaveBeenCalled();
    });

    it("does not run formatting shortcuts while composing", () => {
      const { handleKeydown } = createShortcuts();

      handleKeydown(
        composingKeydown({ key: "b", ctrlKey: true, isComposing: true })
      );

      expect(mockHandleInlineAction).not.toHaveBeenCalled();
    });

    it("still handles Enter normally when NOT composing", () => {
      const p = document.createElement("p");
      p.textContent = "Test";
      editorElement.appendChild(p);
      placeCaretIn(p, 4);

      const { handleKeydown } = createShortcuts();

      handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(editorElement.querySelectorAll("p").length).toBeGreaterThanOrEqual(
        2
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle null editor content gracefully", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(null),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Tab" });
      expect(() => handleKeydown(event)).not.toThrow();
    });

    it("should handle no selection for Enter key", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      globalThis.getSelection()?.removeAllRanges();

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      expect(() => handleKeydown(event)).not.toThrow();
    });

    it("should handle multiple shortcut combinations", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      // Bold
      handleKeydown(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
      // Undo
      handleKeydown(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
      // Insert link
      handleKeydown(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));

      expect(mockHandleInlineAction).toHaveBeenCalledWith("strong");
      expect(mockUndo).toHaveBeenCalledTimes(1);
      expect(mockInsertLink).toHaveBeenCalledTimes(1);
    });

    it("should handle empty list item", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.innerHTML = "<br>";
      ul.appendChild(li);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li, 0);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      expect(() => handleKeydown(event)).not.toThrow();
    });

    it("should handle blockquote element", () => {
      const blockquote = document.createElement("blockquote");
      blockquote.textContent = "Quote";
      editorElement.appendChild(blockquote);

      const range = document.createRange();
      range.setStart(blockquote.firstChild!, 5);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleKeydown(event);

      expect(editorElement.querySelector("p")).toBeTruthy();
    });

    it("should handle nested list items", () => {
      const ul = document.createElement("ul");
      const li1 = document.createElement("li");
      li1.textContent = "Item 1";
      const nestedUl = document.createElement("ul");
      const li2 = document.createElement("li");
      li2.textContent = "Nested item";
      nestedUl.appendChild(li2);
      li1.appendChild(nestedUl);
      ul.appendChild(li1);
      editorElement.appendChild(ul);

      const range = document.createRange();
      range.setStart(li2.firstChild!, 6);
      range.collapse(true);

      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      const event = new KeyboardEvent("keydown", { key: "Tab" });
      handleKeydown(event);

      expect(formatting.indentListItem).toHaveBeenCalled();
    });

    it("should handle all heading levels", () => {
      const headings = ["h1", "h2", "h3", "h4", "h5", "h6"];

      headings.forEach((tag) => {
        const heading = document.createElement(tag);
        heading.textContent = `${tag} text`;
        editorElement.appendChild(heading);

        const range = document.createRange();
        range.setStart(heading.firstChild!, 3);
        range.collapse(true);

        const selection = globalThis.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        const { handleKeydown } = useKeyboardShortcuts({
          editorContent: ref(editorElement),
          onInput: mockOnInput,
          onCaptureSnapshot: mockOnCaptureSnapshot,
          undo: mockUndo,
          redo: mockRedo,
          openCommandMenu: mockOpenCommandMenu,
          insertLink: mockInsertLink,
          openFindReplaceModal: mockOpenFindReplaceModal,
          handleInlineAction: mockHandleInlineAction,
          handleBlockAction: mockHandleBlockAction,
        });

        const event = new KeyboardEvent("keydown", { key: "Enter" });
        handleKeydown(event);
      });

      // A mid-content split keeps BOTH halves the same heading level (no
      // demotion to <p>), so each of h1–h6 becomes two elements of its tag.
      headings.forEach((tag) => {
        expect(editorElement.querySelectorAll(tag).length).toBe(2);
      });
      expect(editorElement.querySelector("p")).toBeNull();
    });

    it("should handle case-insensitive key matching", () => {
      const { handleKeydown } = useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });

      // Test uppercase
      handleKeydown(new KeyboardEvent("keydown", { key: "B", ctrlKey: true }));
      expect(mockHandleInlineAction).toHaveBeenCalledWith("strong");

      // Test uppercase Z
      handleKeydown(new KeyboardEvent("keydown", { key: "Z", ctrlKey: true }));
      expect(mockUndo).toHaveBeenCalled();
    });
  });

  describe("Block-Boundary Backspace/Delete (normalized merge)", () => {
    const setup = () => {
      return useKeyboardShortcuts({
        editorContent: ref(editorElement),
        onInput: mockOnInput,
        onCaptureSnapshot: mockOnCaptureSnapshot,
        undo: mockUndo,
        redo: mockRedo,
        openCommandMenu: mockOpenCommandMenu,
        insertLink: mockInsertLink,
        openFindReplaceModal: mockOpenFindReplaceModal,
        handleInlineAction: mockHandleInlineAction,
        handleBlockAction: mockHandleBlockAction,
      });
    };

    const placeCaret = (node: Node, offset: number) => {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    it("Backspace at the start of the second <p> merges into the first and dispatches exactly one input event", () => {
      editorElement.innerHTML = "<p>Hello</p><p>World</p>";
      const second = editorElement.children[1] as HTMLElement;
      placeCaret(second.firstChild!, 0);

      const inputSpy = vi.fn();
      editorElement.addEventListener("input", inputSpy);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>HelloWorld</p>");
      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(mockOnCaptureSnapshot).not.toHaveBeenCalled();

      // Caret lands exactly at the join point.
      const selection = globalThis.getSelection()!;
      expect(selection.getRangeAt(0).startOffset).toBe(5);
      expect(selection.getRangeAt(0).startContainer.textContent).toBe(
        "HelloWorld"
      );
    });

    it("Backspace mid-text does NOT preventDefault (native handles in-block deletion)", () => {
      editorElement.innerHTML = "<p>Hello</p>";
      const p = editorElement.children[0] as HTMLElement;
      placeCaret(p.firstChild!, 3);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).not.toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>Hello</p>");
    });

    it("Delete at the end of a block pulls the next paragraph up", () => {
      editorElement.innerHTML = "<p>Hello</p><p>World</p>";
      const first = editorElement.children[0] as HTMLElement;
      placeCaret(first.firstChild!, 5);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", { key: "Delete" });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>HelloWorld</p>");
    });

    it("modified Backspace (Ctrl) keeps native semantics", () => {
      editorElement.innerHTML = "<p>Hello</p><p>World</p>";
      const second = editorElement.children[1] as HTMLElement;
      placeCaret(second.firstChild!, 0);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", {
        key: "Backspace",
        ctrlKey: true,
      });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).not.toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>Hello</p><p>World</p>");
    });

    it("Backspace during IME composition is ignored entirely (guard runs first)", () => {
      editorElement.innerHTML = "<p>Hello</p><p>World</p>";
      const second = editorElement.children[1] as HTMLElement;
      placeCaret(second.firstChild!, 0);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", {
        key: "Backspace",
        isComposing: true,
      });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).not.toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>Hello</p><p>World</p>");
    });

    it("Backspace at the start of the FIRST block falls through to native (no-op)", () => {
      editorElement.innerHTML = "<p>Hello</p>";
      const p = editorElement.children[0] as HTMLElement;
      placeCaret(p.firstChild!, 0);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).not.toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>Hello</p>");
    });

    it("Backspace inside a list item does not trigger block merging", () => {
      editorElement.innerHTML = "<p>Above</p><ul><li>Item</li></ul>";
      const li = editorElement.querySelector("li")!;
      placeCaret(li.firstChild!, 0);

      const { handleKeydown } = setup();
      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      const prevented = vi.spyOn(event, "preventDefault");
      handleKeydown(event);

      expect(prevented).not.toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<p>Above</p><ul><li>Item</li></ul>");
    });
  });
});
