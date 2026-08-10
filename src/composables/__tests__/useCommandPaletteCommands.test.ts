import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCommandPaletteCommands } from "../useCommandPaletteCommands";

function createMockCallbacks() {
  return {
    handleInlineAction: vi.fn(),
    handleBlockAction: vi.fn(),
    handleListAction: vi.fn(),
    insertLink: vi.fn(),
    insertImage: vi.fn(),
    openTableModal: vi.fn(),
    openCodeBlockModal: vi.fn(),
    toggleEmojiPicker: vi.fn(),
    handleInsertHR: vi.fn(),
    handleInsertPageBreak: vi.fn(),
    handleInsertTOC: vi.fn(),
    openFindReplaceModal: vi.fn(),
    handleCopyFormat: vi.fn(),
    openTemplateModal: vi.fn(),
    handleToggleSpellCheck: vi.fn(),
    toggleTheme: vi.fn(),
    toggleFullScreen: vi.fn(),
    toggleFocusMode: vi.fn(),
    handleExportHtml: vi.fn(),
    handleExportMarkdown: vi.fn(),
    handleExportPdf: vi.fn(),
    handleExportWord: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

describe("useCommandPaletteCommands", () => {
  let mockCallbacks: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = createMockCallbacks();
  });

  describe("commands computed", () => {
    it("should return all 28 commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      expect(commands.value).toHaveLength(29);
    });

    it("should have correct command structure", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const firstCommand = commands.value[0];

      expect(firstCommand).toHaveProperty("id");
      expect(firstCommand).toHaveProperty("name");
      expect(firstCommand).toHaveProperty("description");
      expect(firstCommand).toHaveProperty("icon");
      expect(firstCommand).toHaveProperty("category");
      expect(firstCommand).toHaveProperty("action");
      expect(typeof firstCommand.action).toBe("function");
    });

    it("should include formatting commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const formattingCommands = commands.value.filter(
        (c) => c.category === "Formatting"
      );

      expect(formattingCommands).toHaveLength(3);
      expect(formattingCommands.map((c) => c.id)).toEqual([
        "format-bold",
        "format-italic",
        "format-underline",
      ]);
    });

    it("should include structure commands (headings)", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const structureCommands = commands.value.filter(
        (c) => c.category === "Structure"
      );

      expect(structureCommands).toHaveLength(3);
      expect(structureCommands.map((c) => c.id)).toEqual([
        "heading-1",
        "heading-2",
        "heading-3",
      ]);
    });

    it("should include list commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const listCommands = commands.value.filter((c) => c.category === "Lists");

      expect(listCommands).toHaveLength(2);
      expect(listCommands.map((c) => c.id)).toEqual([
        "list-bullet",
        "list-numbered",
      ]);
    });

    it("should include insert commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const insertCommands = commands.value.filter(
        (c) => c.category === "Insert"
      );

      expect(insertCommands).toHaveLength(8);
      expect(insertCommands.map((c) => c.id)).toContain("insert-link");
      expect(insertCommands.map((c) => c.id)).toContain("insert-image");
      expect(insertCommands.map((c) => c.id)).toContain("insert-table");
    });

    it("should include tool commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const toolCommands = commands.value.filter((c) => c.category === "Tools");

      expect(toolCommands).toHaveLength(4);
      expect(toolCommands.map((c) => c.id)).toEqual([
        "find-replace",
        "format-painter-copy",
        "templates",
        "toggle-spell-check",
      ]);
    });

    it("should include view commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const viewCommands = commands.value.filter((c) => c.category === "View");

      expect(viewCommands).toHaveLength(3);
      expect(viewCommands.map((c) => c.id)).toEqual([
        "toggle-theme",
        "focus-mode",
        "fullscreen",
      ]);
    });

    it("should include export commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const exportCommands = commands.value.filter(
        (c) => c.category === "Export"
      );

      expect(exportCommands).toHaveLength(4);
      expect(exportCommands.map((c) => c.id)).toEqual([
        "export-html",
        "export-markdown",
        "export-pdf",
        "export-word",
      ]);
    });

    it("should include history commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const historyCommands = commands.value.filter(
        (c) => c.category === "History"
      );

      expect(historyCommands).toHaveLength(2);
      expect(historyCommands.map((c) => c.id)).toEqual(["undo", "redo"]);
    });

    it("should have shortcuts for common commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const boldCommand = commands.value.find((c) => c.id === "format-bold");
      const linkCommand = commands.value.find((c) => c.id === "insert-link");

      expect(boldCommand?.shortcut).toBe("Ctrl+B");
      expect(linkCommand?.shortcut).toBe("Ctrl+K");
    });
  });

  describe("command actions - formatting (modern APIs)", () => {
    it("should execute bold command", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const boldCommand = commands.value.find((c) => c.id === "format-bold");

      // These commands require editorContent.value to be set
      // We're just verifying they don't throw errors
      expect(() => boldCommand?.action()).not.toThrow();
    });

    it("should execute italic command", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const italicCommand = commands.value.find(
        (c) => c.id === "format-italic"
      );

      expect(() => italicCommand?.action()).not.toThrow();
    });

    it("should execute underline command", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const underlineCommand = commands.value.find(
        (c) => c.id === "format-underline"
      );

      expect(() => underlineCommand?.action()).not.toThrow();
    });

    it("should execute heading commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const h1 = commands.value.find((c) => c.id === "heading-1");
      const h2 = commands.value.find((c) => c.id === "heading-2");
      const h3 = commands.value.find((c) => c.id === "heading-3");

      expect(() => h1?.action()).not.toThrow();
      expect(() => h2?.action()).not.toThrow();
      expect(() => h3?.action()).not.toThrow();
    });

    it("should execute list commands", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const bulletList = commands.value.find((c) => c.id === "list-bullet");
      const numberedList = commands.value.find((c) => c.id === "list-numbered");

      expect(() => bulletList?.action()).not.toThrow();
      expect(() => numberedList?.action()).not.toThrow();
    });
  });

  describe("command actions - custom callbacks", () => {
    it("should call insertLink callback", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const linkCommand = commands.value.find((c) => c.id === "insert-link");

      linkCommand?.action();

      expect(mockCallbacks.insertLink).toHaveBeenCalledTimes(1);
    });

    it("should call insertImage callback", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const imageCommand = commands.value.find((c) => c.id === "insert-image");

      imageCommand?.action();

      expect(mockCallbacks.insertImage).toHaveBeenCalledTimes(1);
    });

    it("should call openTableModal callback", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const tableCommand = commands.value.find((c) => c.id === "insert-table");

      tableCommand?.action();

      expect(mockCallbacks.openTableModal).toHaveBeenCalledTimes(1);
    });

    it("should call all insert callbacks", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "insert-code")?.action();
      expect(mockCallbacks.openCodeBlockModal).toHaveBeenCalled();

      commands.value.find((c) => c.id === "insert-emoji")?.action();
      expect(mockCallbacks.toggleEmojiPicker).toHaveBeenCalled();

      commands.value.find((c) => c.id === "insert-hr")?.action();
      expect(mockCallbacks.handleInsertHR).toHaveBeenCalled();

      commands.value.find((c) => c.id === "insert-page-break")?.action();
      expect(mockCallbacks.handleInsertPageBreak).toHaveBeenCalled();

      commands.value.find((c) => c.id === "insert-toc")?.action();
      expect(mockCallbacks.handleInsertTOC).toHaveBeenCalled();
    });

    it("should call all tool callbacks", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "find-replace")?.action();
      expect(mockCallbacks.openFindReplaceModal).toHaveBeenCalled();

      commands.value.find((c) => c.id === "format-painter-copy")?.action();
      expect(mockCallbacks.handleCopyFormat).toHaveBeenCalled();

      commands.value.find((c) => c.id === "templates")?.action();
      expect(mockCallbacks.openTemplateModal).toHaveBeenCalled();

      commands.value.find((c) => c.id === "toggle-spell-check")?.action();
      expect(mockCallbacks.handleToggleSpellCheck).toHaveBeenCalled();
    });

    it("should call view callbacks", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "toggle-theme")?.action();
      expect(mockCallbacks.toggleTheme).toHaveBeenCalled();

      commands.value.find((c) => c.id === "fullscreen")?.action();
      expect(mockCallbacks.toggleFullScreen).toHaveBeenCalled();
    });

    it("should call export callbacks", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "export-html")?.action();
      expect(mockCallbacks.handleExportHtml).toHaveBeenCalled();

      commands.value.find((c) => c.id === "export-markdown")?.action();
      expect(mockCallbacks.handleExportMarkdown).toHaveBeenCalled();

      commands.value.find((c) => c.id === "export-pdf")?.action();
      expect(mockCallbacks.handleExportPdf).toHaveBeenCalled();

      commands.value.find((c) => c.id === "export-word")?.action();
      expect(mockCallbacks.handleExportWord).toHaveBeenCalled();
    });

    it("should call history callbacks", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "undo")?.action();
      expect(mockCallbacks.undo).toHaveBeenCalled();

      commands.value.find((c) => c.id === "redo")?.action();
      expect(mockCallbacks.redo).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should return consistent commands on multiple accesses", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const firstAccess = commands.value;
      const secondAccess = commands.value;

      expect(firstAccess).toHaveLength(secondAccess.length);
      expect(firstAccess[0].id).toBe(secondAccess[0].id);
    });

    it("should have unique command IDs", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);
      const ids = commands.value.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have all commands with non-empty names", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.forEach((command) => {
        expect(command.name.length).toBeGreaterThan(0);
        expect(command.description.length).toBeGreaterThan(0);
      });
    });

    it("should execute multiple commands in sequence", () => {
      const { commands } = useCommandPaletteCommands(mockCallbacks);

      commands.value.find((c) => c.id === "format-bold")?.action();
      commands.value.find((c) => c.id === "insert-link")?.action();
      commands.value.find((c) => c.id === "undo")?.action();

      // Verify callbacks were called (bold doesn't call any callback with null editorContent)
      expect(mockCallbacks.insertLink).toHaveBeenCalled();
      expect(mockCallbacks.undo).toHaveBeenCalled();
    });

    it("should work with partial options", () => {
      const partialCallbacks = {
        ...mockCallbacks,
        insertLink: () => {},
      };

      const { commands } = useCommandPaletteCommands(partialCallbacks);
      const linkCommand = commands.value.find((c) => c.id === "insert-link");

      expect(linkCommand?.action).toBeDefined();
      expect(() => linkCommand?.action()).not.toThrow();
    });
  });
});
