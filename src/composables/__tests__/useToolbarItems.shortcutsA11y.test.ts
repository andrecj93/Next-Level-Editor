import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useToolbarItems } from "../useToolbarItems";

/**
 * Build a full set of no-op options so useToolbarItems can be instantiated.
 * Individual tests override only the fields they care about.
 */
function createOptions(overrides: Record<string, unknown> = {}) {
  const noop = () => {};
  return {
    editorContent: ref<HTMLDivElement | null>(null),
    fontSize: ref<"small" | "normal" | "large" | "huge">("normal"),
    handleBlockAction: noop,
    handleInlineAction: noop,
    handleListAction: noop,
    handleTextAlignment: noop,
    handleFontSize: noop,
    handleInsertHR: noop,
    handleInsertPageBreak: noop,
    handleInsertTOC: noop,
    isBlockActionActive: () => false,
    isInlineActionActive: () => false,
    isListActionActive: () => false,
    insertLink: noop,
    insertImage: noop,
    openFileManagerModal: noop,
    openEmbedModal: noop,
    openTableModal: noop,
    openCodeBlockModal: noop,
    openHtmlCodeModal: noop,
    openFindReplaceModal: noop,
    openTemplateModal: noop,
    toggleEmojiPicker: noop,
    handleToggleSpellCheck: noop,
    handleExportHtml: noop,
    handleExportMarkdown: noop,
    handleExportPdf: noop,
    handleExportWord: noop,
    handleCopyFormat: noop,
    handlePasteFormat: noop,
    hasFormatCopied: () => false,
    spellCheckEnabled: ref(false),
    captureSnapshot: noop,
    toggleHistoryTimeline: noop,
    ...overrides,
  };
}

interface TestItem {
  id?: string;
  label?: string;
  icon?: string;
  divider?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const asItems = (items: unknown[]): TestItem[] => items as TestItem[];

describe("useToolbarItems - Paste Format disabled state", () => {
  it("reads the copied-format state lazily so the flag stays current", () => {
    // Simulates the format painter's non-reactive module-level state.
    let copied = false;
    const { productivityDropdownItems } = useToolbarItems(
      createOptions({ hasFormatCopied: () => copied })
    );

    const pasteItem = () =>
      asItems(productivityDropdownItems.value).find(
        (item) => item.id === "format-painter-paste"
      )!;

    // Nothing copied yet -> disabled.
    expect(pasteItem().disabled).toBe(true);

    // Copy Format happens (no reactive dependency changes). Reading the same
    // item again must reflect the new state without any recompute trigger.
    copied = true;
    expect(pasteItem().disabled).toBe(false);

    copied = false;
    expect(pasteItem().disabled).toBe(true);
  });

  it("keeps Copy Format always enabled", () => {
    const { productivityDropdownItems } = useToolbarItems(
      createOptions({ hasFormatCopied: () => false })
    );
    const copyItem = asItems(productivityDropdownItems.value).find(
      (item) => item.id === "format-painter-copy"
    )!;
    expect(copyItem.disabled).toBeUndefined();
  });
});

describe("useToolbarItems - Keyboard Shortcuts entry", () => {
  it("adds a Keyboard Shortcuts item to the Tools dropdown when a handler is wired", () => {
    const openShortcutHelpModal = vi.fn();
    const { productivityDropdownItems } = useToolbarItems(
      createOptions({ openShortcutHelpModal })
    );

    const item = asItems(productivityDropdownItems.value).find(
      (entry) => entry.id === "keyboard-shortcuts"
    );
    expect(item).toBeDefined();
    expect(item!.label).toBe("Keyboard Shortcuts");
    // Stroke icon, no emoji in UI chrome.
    expect(item!.icon).toContain("stroke=\"currentColor\"");

    item!.onClick!();
    expect(openShortcutHelpModal).toHaveBeenCalledTimes(1);
  });

  it("omits the item when the host does not provide a handler", () => {
    const { productivityDropdownItems } = useToolbarItems(createOptions());
    const item = asItems(productivityDropdownItems.value).find(
      (entry) => entry.id === "keyboard-shortcuts"
    );
    expect(item).toBeUndefined();
  });
});
