import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useContextMenu } from "../useContextMenu";

// Mock commands utils so table resolution never fires in these tests.
vi.mock("../../utils/commands", () => ({
  getSelectedTable: vi.fn(() => null),
  getSelectedCell: vi.fn(() => null),
}));

// Controllable clipboard mock. writeText backs plain-text copy; write backs
// HTML copy via ClipboardItem; readText backs paste.
const mockClipboard = {
  writeText: vi.fn(() => Promise.resolve()),
  write: vi.fn(() => Promise.resolve()),
  readText: vi.fn(() => Promise.resolve("")),
};

/**
 * Tests for the clipboard + persistence behaviour of the context menu:
 * - #13 copy/cut preserve HTML formatting
 * - #14 cut captures an undo snapshot and emits the content change
 * - #28 paste inserts clipboard text and persists it
 * - #30 the menu origin is clamped to the viewport
 */
describe("useContextMenu - clipboard, persistence and clamping", () => {
  let editorElement: HTMLDivElement;
  let editorContent: Ref<HTMLElement | null>;
  let showTableDesigner: Ref<boolean>;
  let currentTable: Ref<HTMLTableElement | null>;
  let currentCell: Ref<HTMLTableCellElement | null>;
  let tableDesignerPosition: Ref<{ x: number; y: number }>;
  let captureSnapshot: ReturnType<typeof vi.fn<() => void>>;
  let emitUpdate: ReturnType<typeof vi.fn<(html: string) => void>>;

  const makeOptions = () => ({
    editorContent,
    handleInlineAction: vi.fn<(tag: string) => void>(),
    insertLink: vi.fn<() => void>(),
    insertImage: vi.fn<() => void>(),
    rememberSelection: vi.fn<() => void>(),
    showTableDesigner,
    currentTable,
    currentCell,
    tableDesignerPosition,
    captureSnapshot,
    emitUpdate,
  });

  // Select the whole <strong> inside the editor's first paragraph.
  const selectBoldWord = () => {
    const strong = editorElement.querySelector("strong");
    const range = document.createRange();
    if (strong) {
      range.selectNode(strong);
    }
    const selection = globalThis.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
    // Provide a ClipboardItem so copyHtmlToClipboard takes the HTML path.
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem =
      class {
        constructor(public items: Record<string, Blob>) {}
      };

    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Hello <strong>bold</strong> world</p>";
    document.body.appendChild(editorElement);

    editorContent = ref<HTMLElement | null>(editorElement);
    showTableDesigner = ref(false);
    currentTable = ref<HTMLTableElement | null>(null);
    currentCell = ref<HTMLTableCellElement | null>(null);
    tableDesignerPosition = ref({ x: 0, y: 0 });
    captureSnapshot = vi.fn<() => void>();
    emitUpdate = vi.fn<(html: string) => void>();

    mockClipboard.writeText.mockClear();
    mockClipboard.write.mockClear();
    mockClipboard.readText.mockClear();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("#13 copy preserves HTML", () => {
    it.each([
      ['<p>A <strong><em>quiet</em></strong> town.</p>', 'em', '<strong><em>qui</em></strong>'],
      ['<p>A <span style="color: red">quiet</span> town.</p>', 'span', '<span style="color: red">qui</span>'],
      ['<p>A <a href="https://example.com/story">quiet</a> town.</p>', 'a', '<a href="https://example.com/story">qui</a>'],
    ])('preserves inline ancestors for a word copied from %s', async (html, selector, expected) => {
      editorElement.innerHTML = html;
      const text = editorElement.querySelector(selector)!.firstChild!;
      const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 3);
      window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
      const { contextMenuItems } = useContextMenu(makeOptions());
      await contextMenuItems.value.find(item => item.id === 'copy')!.onClick!();
      const [items] = mockClipboard.write.mock.calls[0] as unknown as [Array<{ items: Record<string, Blob> }>];
      expect(await items[0].items['text/html'].text()).toBe(expected);
      expect(await items[0].items['text/plain'].text()).toBe('qui');
    });

    it('does not copy a selection outside this editor', async () => {
      const outside = document.createElement('p'); outside.textContent = 'Another document.';
      document.body.appendChild(outside);
      const range = document.createRange(); range.selectNodeContents(outside);
      window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
      try {
        const { contextMenuItems } = useContextMenu(makeOptions());
        await contextMenuItems.value.find(item => item.id === 'copy')!.onClick!();
        expect(mockClipboard.write).not.toHaveBeenCalled();
        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      } finally { outside.remove(); }
    });

    it("copies the selection as HTML (not just plain text)", async () => {
      selectBoldWord();

      const { contextMenuItems } = useContextMenu(makeOptions());
      const copyItem = contextMenuItems.value.find((i) => i.id === "copy");
      await copyItem?.onClick?.();

      // The HTML clipboard path (navigator.clipboard.write with a ClipboardItem)
      // must have been used, carrying the <strong> markup.
      expect(mockClipboard.write).toHaveBeenCalledTimes(1);
      const [items] = mockClipboard.write.mock.calls[0] as unknown as [
        Array<{ items: Record<string, Blob> }>
      ];
      const htmlBlob = items[0].items["text/html"];
      const html = await htmlBlob.text();
      expect(html).toContain("<strong>");
      expect(html).toContain("bold");
    });
  });

  describe("#14 cut captures a snapshot and emits the change", () => {
    it('can copy and cut a selected image without a text label', async () => {
      editorElement.innerHTML = '<p><img src="https://example.com/sketch.png" alt="A sketch"></p>';
      const range = document.createRange(); range.selectNode(editorElement.querySelector('img')!);
      window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
      const { contextMenuItems, handleContextMenu } = useContextMenu(makeOptions());
      handleContextMenu(new MouseEvent('contextmenu'));
      expect(contextMenuItems.value.find(item => item.id === 'copy')!.disabled).toBe(false);
      expect(contextMenuItems.value.find(item => item.id === 'cut')!.disabled).toBe(false);
      await contextMenuItems.value.find(item => item.id === 'cut')!.onClick!();
      const [items] = mockClipboard.write.mock.calls[0] as unknown as [Array<{ items: Record<string, Blob> }>];
      expect(await items[0].items['text/html'].text()).toContain('<img');
      expect(editorElement.querySelector('img')).toBeNull();
      expect(captureSnapshot).toHaveBeenCalledOnce();
    });

    it('keeps Copy available while all editing commands respect the host readonly state', async () => {
      selectBoldWord();
      const editable = ref(false);
      const options = makeOptions();
      const { contextMenuItems, handleContextMenu } = useContextMenu({ ...options, canEdit: () => editable.value });
      handleContextMenu(new MouseEvent('contextmenu'));
      const before = editorElement.innerHTML;
      expect(contextMenuItems.value.find(item => item.id === 'copy')!.disabled).toBe(false);
      for (const item of contextMenuItems.value.filter(item => !item.divider && item.id !== 'copy')) {
        expect(item.disabled).toBe(true);
        await item.onClick!();
      }
      expect(editorElement.innerHTML).toBe(before);
      expect(mockClipboard.write).not.toHaveBeenCalled();
      expect(mockClipboard.readText).not.toHaveBeenCalled();
      expect(options.handleInlineAction).not.toHaveBeenCalled();
      expect(options.insertLink).not.toHaveBeenCalled();
      expect(options.insertImage).not.toHaveBeenCalled();
      editable.value = true;
      expect(contextMenuItems.value.find(item => item.id === 'cut')!.disabled).toBe(false);
    });

    it.each(['selection', 'content', 'document', 'readonly', 'disconnected'])(
      'does not delete after the writing %s changes during a clipboard write', async change => {
        selectBoldWord();
        let finish!: () => void;
        mockClipboard.write.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
        const { contextMenuItems } = useContextMenu(makeOptions());
        const pending = contextMenuItems.value.find(item => item.id === 'cut')!.onClick!();
        if (change === 'selection') {
          const range = document.createRange();
          range.selectNodeContents(editorElement.querySelector('p')!.lastChild!);
          window.getSelection()!.removeAllRanges();
          window.getSelection()!.addRange(range);
        }
        if (change === 'content') editorElement.querySelector('p')!.firstChild!.textContent = 'A newer thought ';
        if (change === 'document') editorContent.value = document.createElement('div');
        if (change === 'readonly') editorElement.contentEditable = 'false';
        if (change === 'disconnected') editorElement.remove();
        const before = editorElement.innerHTML;
        finish();
        await pending;
        expect(editorElement.innerHTML).toBe(before);
        expect(captureSnapshot).not.toHaveBeenCalled();
        expect(emitUpdate).not.toHaveBeenCalled();
      }
    );

    it('refuses Cut in a read-only document even when called directly', async () => {
      selectBoldWord();
      editorElement.contentEditable = 'false';
      const before = editorElement.innerHTML;
      const { contextMenuItems } = useContextMenu(makeOptions());
      await contextMenuItems.value.find(item => item.id === 'cut')!.onClick!();
      expect(editorElement.innerHTML).toBe(before);
      expect(mockClipboard.write).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("copies HTML, deletes the selection, then snapshots and emits", async () => {
      selectBoldWord();

      const { contextMenuItems } = useContextMenu(makeOptions());
      const cutItem = contextMenuItems.value.find((i) => i.id === "cut");
      await cutItem?.onClick?.();

      // HTML was placed on the clipboard.
      expect(mockClipboard.write).toHaveBeenCalledTimes(1);
      // Undo snapshot captured and content change emitted exactly once each.
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
      expect(emitUpdate).toHaveBeenCalledTimes(1);
      // The emitted content reflects the deletion (bold word removed).
      const emitted = emitUpdate.mock.calls[0][0] as string;
      expect(emitted).not.toContain("<strong>bold</strong>");
      expect(emitted).toContain("Hello");
    });

    it("does not snapshot or emit when the clipboard write fails", async () => {
      selectBoldWord();
      mockClipboard.write.mockRejectedValueOnce(new Error("denied"));
      mockClipboard.writeText.mockRejectedValueOnce(new Error("denied"));

      const { contextMenuItems } = useContextMenu(makeOptions());
      const cutItem = contextMenuItems.value.find((i) => i.id === "cut");
      await cutItem?.onClick?.();

      // copyHtmlToClipboard falls back to the textarea path; if even that
      // reports failure the selection stays and nothing is committed.
      expect(captureSnapshot).not.toHaveBeenCalled();
      expect(emitUpdate).not.toHaveBeenCalled();
    });
  });

  describe("#28 paste", () => {
    it("is enabled when the Clipboard read API is available", () => {
      const { contextMenuItems } = useContextMenu(makeOptions());
      const pasteItem = contextMenuItems.value.find((i) => i.id === "paste");
      expect(pasteItem?.disabled).toBe(false);
    });

    it("inserts clipboard text at the caret and persists it", async () => {
      mockClipboard.readText.mockResolvedValueOnce("PASTED");

      // Collapse the caret to the end of the paragraph.
      const p = editorElement.querySelector("p") as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const { contextMenuItems } = useContextMenu(makeOptions());
      const pasteItem = contextMenuItems.value.find((i) => i.id === "paste");
      await pasteItem?.onClick?.();

      expect(editorElement.textContent).toContain("PASTED");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
      expect(emitUpdate).toHaveBeenCalledTimes(1);
    });

    it("is disabled and inert when the Clipboard read API is unavailable", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn(), write: vi.fn() },
        writable: true,
        configurable: true,
      });

      const { contextMenuItems } = useContextMenu(makeOptions());
      const pasteItem = contextMenuItems.value.find((i) => i.id === "paste");
      expect(pasteItem?.disabled).toBe(true);

      await pasteItem?.onClick?.();
      expect(captureSnapshot).not.toHaveBeenCalled();
      expect(emitUpdate).not.toHaveBeenCalled();
    });
  });

  describe("#30 viewport clamping", () => {
    it("clamps a bottom-right click so the menu stays on-screen", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 800,
        configurable: true,
      });

      const { handleContextMenu, contextMenuPosition } =
        useContextMenu(makeOptions());

      // Click in the far bottom-right corner.
      handleContextMenu(
        new MouseEvent("contextmenu", { clientX: 995, clientY: 795 })
      );

      // The menu (estimated 220x320) must not overflow the 1000x800 viewport.
      expect(contextMenuPosition.value.left).toBeLessThanOrEqual(1000 - 220);
      expect(contextMenuPosition.value.top).toBeLessThanOrEqual(800 - 320);
    });

    it("leaves an interior click unchanged", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 800,
        configurable: true,
      });

      const { handleContextMenu, contextMenuPosition } =
        useContextMenu(makeOptions());

      handleContextMenu(
        new MouseEvent("contextmenu", { clientX: 150, clientY: 250 })
      );

      expect(contextMenuPosition.value).toEqual({ left: 150, top: 250 });
    });
  });
});
