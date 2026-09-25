import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSlashCommands } from "../useSlashCommands";
import type { UseSlashCommandsOptions } from "../useSlashCommands";
import { insertHorizontalRule } from "../../utils/commands";

/**
 * Regression tests for the slash-menu QA cluster:
 * 1. The body-teleported menu uses viewport coordinates, so editor offsets
 *    and clipping containers cannot defeat the viewport clamp.
 * 2. Typing while the menu is open filters the items instead of leaking
 *    keystrokes into the document.
 * 3. Quote/Divider insert block elements as siblings of the paragraph
 *    (splitting it), never nested inside it (invalid HTML).
 */
describe("useSlashCommands (QA fixes)", () => {
  let options: UseSlashCommandsOptions;
  let container: HTMLDivElement;
  let editorElement: HTMLDivElement;

  const setCaret = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = globalThis.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const keydown = (key: string, init: KeyboardEventInit = {}) =>
    new KeyboardEvent("keydown", { key, cancelable: true, ...init });

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
      performWithSelection: vi.fn((callback) => callback(editorElement)),
    };
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe("menu positioning", () => {
    const rect = (partial: Partial<DOMRect>): DOMRect =>
      ({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...partial,
      }) as DOMRect;

    it("keeps fixed menu coordinates independent of the editor container", async () => {
      (window as unknown as { innerHeight: number }).innerHeight = 900;
      (window as unknown as { innerWidth: number }).innerWidth = 1200;

      editorElement.innerHTML = "<p>hello</p>";
      const paragraph = editorElement.querySelector("p")!;
      // The editor sits 500px down the page (like the playground layout).
      container.getBoundingClientRect = () => rect({ top: 500, left: 100 });
      // Caret line is at viewport y=600..620 (a 0x0 caret rect falls back to
      // the closest element rect).
      paragraph.getBoundingClientRect = () =>
        rect({ top: 600, bottom: 620, left: 150, height: 20 });

      setCaret(paragraph.firstChild!, 2);

      const { openCommandMenu, commandMenuPosition, showCommandMenu } =
        useSlashCommands(options);
      openCommandMenu();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(showCommandMenu.value).toBe(true);
      expect(commandMenuPosition.value.top).toBe(572);
      expect(commandMenuPosition.value.left).toBe(150);
      expect(commandMenuPosition.value.top + 320).toBeLessThan(900);
    });
  });

  describe("type-to-filter", () => {
    it("filters the options as the user types and consumes the keystrokes", () => {
      const { showCommandMenu, commandOptions, handleMenuKeydown } =
        useSlashCommands(options);
      showCommandMenu.value = true;

      for (const key of "head") {
        const event = keydown(key);
        expect(handleMenuKeydown(event)).toBe(true);
        expect(event.defaultPrevented).toBe(true);
      }

      expect(commandOptions.map((o) => o.label)).toEqual([
        "Heading 1",
        "Heading 2",
        "Heading 3",
      ]);
    });

    it("resets the selection highlight when the filter changes", () => {
      const { showCommandMenu, selectedIndex, handleMenuKeydown } =
        useSlashCommands(options);
      showCommandMenu.value = true;
      handleMenuKeydown(keydown("ArrowDown"));
      handleMenuKeydown(keydown("ArrowDown"));
      expect(selectedIndex.value).toBe(2);

      handleMenuKeydown(keydown("q"));
      expect(selectedIndex.value).toBe(0);
    });

    it("runs the first filtered command on Enter", () => {
      const { showCommandMenu, handleMenuKeydown } = useSlashCommands(options);
      showCommandMenu.value = true;

      for (const key of "table") handleMenuKeydown(keydown(key));
      handleMenuKeydown(keydown("Enter"));

      expect(options.openTableModal).toHaveBeenCalled();
    });

    it("erases filter characters with Backspace and closes when empty", () => {
      const { showCommandMenu, commandOptions, handleMenuKeydown } =
        useSlashCommands(options);
      showCommandMenu.value = true;

      handleMenuKeydown(keydown("q"));
      expect(commandOptions).toHaveLength(1);

      expect(handleMenuKeydown(keydown("Backspace"))).toBe(true);
      expect(commandOptions).toHaveLength(14);
      expect(showCommandMenu.value).toBe(true);

      // Backspace with no query cancels the menu.
      expect(handleMenuKeydown(keydown("Backspace"))).toBe(true);
      expect(showCommandMenu.value).toBe(false);
    });

    it("shows no options for a non-matching query and Enter just closes", () => {
      const { showCommandMenu, commandOptions, handleMenuKeydown } =
        useSlashCommands(options);
      showCommandMenu.value = true;

      for (const key of "zzz") handleMenuKeydown(keydown(key));
      expect(commandOptions).toHaveLength(0);

      const enter = keydown("Enter");
      expect(handleMenuKeydown(enter)).toBe(true);
      expect(enter.defaultPrevented).toBe(true);
      expect(showCommandMenu.value).toBe(false);
      expect(options.handleBlockAction).not.toHaveBeenCalled();
    });

    it("lets a leading space through and closes the menu", () => {
      const { showCommandMenu, handleMenuKeydown } = useSlashCommands(options);
      showCommandMenu.value = true;

      const event = keydown(" ");
      expect(handleMenuKeydown(event)).toBe(false);
      expect(event.defaultPrevented).toBe(false);
      expect(showCommandMenu.value).toBe(false);
    });

    it("does not swallow modifier chords", () => {
      const { showCommandMenu, handleMenuKeydown } = useSlashCommands(options);
      showCommandMenu.value = true;

      const event = keydown("b", { ctrlKey: true });
      expect(handleMenuKeydown(event)).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    });

    it("resets the filter every time the menu opens", async () => {
      editorElement.innerHTML = "<p>hello</p>";
      setCaret(editorElement.querySelector("p")!.firstChild!, 0);

      const { showCommandMenu, commandOptions, handleMenuKeydown, openCommandMenu } =
        useSlashCommands(options);
      showCommandMenu.value = true;
      for (const key of "head") handleMenuKeydown(keydown(key));
      expect(commandOptions).toHaveLength(3);

      openCommandMenu();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(commandOptions).toHaveLength(14);
    });
  });

  describe("block-level insertion (valid HTML nesting)", () => {
    const run = (id: string, composable: ReturnType<typeof useSlashCommands>) =>
      composable.commandOptions.find((cmd) => cmd.id === id)!.action();

    it("splits the paragraph when inserting a quote mid-text", () => {
      editorElement.innerHTML = "<p>hello world</p>";
      setCaret(editorElement.querySelector("p")!.firstChild!, 5);

      run("slash-quote", useSlashCommands(options));

      expect(editorElement.innerHTML).toBe(
        "<p>hello</p><blockquote>Type your quote here</blockquote><p> world</p>"
      );
    });

    it("replaces an empty paragraph with the quote plus an editable tail", () => {
      editorElement.innerHTML = "<p><br></p>";
      setCaret(editorElement.querySelector("p")!, 0);

      run("slash-quote", useSlashCommands(options));

      expect(editorElement.innerHTML).toBe(
        "<blockquote>Type your quote here</blockquote><p><br></p>"
      );
    });

    it("wraps selected text in the quote without nesting it in the paragraph", () => {
      editorElement.innerHTML = "<p>hello world</p>";
      const text = editorElement.querySelector("p")!.firstChild!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      run("slash-quote", useSlashCommands(options));

      expect(editorElement.innerHTML).toBe(
        "<blockquote>hello</blockquote><p> world</p>"
      );
    });

    it("inserts the divider as a sibling of the paragraph, not inside it", () => {
      options.handleInsertHR = vi.fn(() => insertHorizontalRule());
      editorElement.innerHTML = "<p><br></p>";
      setCaret(editorElement.querySelector("p")!, 0);

      run("slash-divider", useSlashCommands(options));

      expect(options.handleInsertHR).toHaveBeenCalled();
      expect(editorElement.innerHTML).toBe("<hr><p><br></p>");
    });

    it("splits a paragraph in two around the divider", () => {
      options.handleInsertHR = vi.fn(() => insertHorizontalRule());
      editorElement.innerHTML = "<p>ab</p>";
      setCaret(editorElement.querySelector("p")!.firstChild!, 1);

      run("slash-divider", useSlashCommands(options));

      expect(editorElement.innerHTML).toBe("<p>a</p><hr><p>b</p>");
    });

    it("produces markup that survives a parse round-trip unchanged", () => {
      editorElement.innerHTML = "<p><br></p>";
      setCaret(editorElement.querySelector("p")!, 0);

      run("slash-quote", useSlashCommands(options));

      const reparsed = document.createElement("div");
      reparsed.innerHTML = editorElement.innerHTML;
      expect(reparsed.innerHTML).toBe(editorElement.innerHTML);
    });
  });
});
