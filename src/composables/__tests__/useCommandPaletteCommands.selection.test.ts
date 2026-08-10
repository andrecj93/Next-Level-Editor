import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCommandPaletteCommands } from "../useCommandPaletteCommands";

/**
 * Regression tests for the command-palette formatting/heading/list commands.
 *
 * Opening the command palette moves focus to its search input, which collapses
 * the live editor selection. Previously these commands acted on the (now lost)
 * live selection by calling the raw formatting utils against editorContent,
 * so they did nothing or threw. The fix routes them through the same
 * handleInlineAction / handleBlockAction / handleListAction handlers the
 * toolbar and slash menu use, which restore the editor selection via
 * performWithSelection before acting.
 */
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

describe("useCommandPaletteCommands - selection-aware formatting", () => {
  let mockCallbacks: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = createMockCallbacks();
  });

  const runAction = (id: string) => {
    const { commands } = useCommandPaletteCommands(mockCallbacks);
    commands.value.find((c) => c.id === id)?.action();
  };

  it("routes Bold through handleInlineAction with 'strong'", () => {
    runAction("format-bold");
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledTimes(1);
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledWith("strong");
  });

  it("routes Italic through handleInlineAction with 'em'", () => {
    runAction("format-italic");
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledTimes(1);
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledWith("em");
  });

  it("routes Underline through handleInlineAction with 'u'", () => {
    runAction("format-underline");
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledTimes(1);
    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledWith("u");
  });

  it("routes headings through handleBlockAction with the right tag", () => {
    runAction("heading-1");
    runAction("heading-2");
    runAction("heading-3");

    expect(mockCallbacks.handleBlockAction).toHaveBeenNthCalledWith(1, "h1");
    expect(mockCallbacks.handleBlockAction).toHaveBeenNthCalledWith(2, "h2");
    expect(mockCallbacks.handleBlockAction).toHaveBeenNthCalledWith(3, "h3");
  });

  it("routes lists through handleListAction with the right tag", () => {
    runAction("list-bullet");
    runAction("list-numbered");

    expect(mockCallbacks.handleListAction).toHaveBeenNthCalledWith(1, "ul");
    expect(mockCallbacks.handleListAction).toHaveBeenNthCalledWith(2, "ol");
  });

  it("does not act on a raw editor element directly (selection is restored by the handler)", () => {
    // The formatting commands must not require or touch a live editor selection
    // themselves — they delegate to the selection-aware handlers. Executing them
    // must never throw even though the palette has collapsed the live selection.
    expect(() => runAction("format-bold")).not.toThrow();
    expect(() => runAction("heading-1")).not.toThrow();
    expect(() => runAction("list-bullet")).not.toThrow();

    expect(mockCallbacks.handleInlineAction).toHaveBeenCalledWith("strong");
    expect(mockCallbacks.handleBlockAction).toHaveBeenCalledWith("h1");
    expect(mockCallbacks.handleListAction).toHaveBeenCalledWith("ul");
  });
});
