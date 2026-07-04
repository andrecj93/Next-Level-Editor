import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import {
  useToolbarItems,
  getCaretAlignment,
  getCaretFontSize,
  canIndentListItem,
  canOutdentListItem,
} from "../useToolbarItems";

/**
 * Build a full set of no-op options so useToolbarItems can be instantiated.
 * Individual tests override only the fields they care about.
 */
function createOptions(editor: HTMLDivElement | null) {
  const noop = () => {};
  return {
    editorContent: ref(editor),
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
    toggleFullScreen: noop,
    handleToggleSpellCheck: noop,
    handleExportHtml: noop,
    handleExportMarkdown: noop,
    handleExportPdf: noop,
    handleExportWord: noop,
    handleCopyFormat: noop,
    handlePasteFormat: noop,
    hasFormatCopied: () => false,
    isFullScreen: ref(false),
    spellCheckEnabled: ref(false),
    captureSnapshot: noop,
    toggleHistoryTimeline: noop,
  };
}

/** Permissive shape for asserting against heterogeneous toolbar item arrays. */
interface TestItem {
  id?: string;
  label?: string;
  divider?: boolean;
  onClick?: () => void;
  isActive?: () => boolean;
  isDisabled?: () => boolean;
}

const asItems = (items: unknown[]): TestItem[] => items as TestItem[];

function selectContents(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

describe("useToolbarItems", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    document.body.removeChild(editor);
    window.getSelection()?.removeAllRanges();
  });

  describe("getCaretAlignment (#20)", () => {
    it("returns left for an unaligned block", () => {
      editor.innerHTML = "<p>Text</p>";
      selectContents(editor.querySelector("p")!.firstChild!);
      expect(getCaretAlignment(editor)).toBe("left");
    });

    it("reflects an explicit center alignment", () => {
      editor.innerHTML = '<p style="text-align: center">Text</p>';
      selectContents(editor.querySelector("p")!.firstChild!);
      expect(getCaretAlignment(editor)).toBe("center");
    });

    it("reflects alignment on a list item", () => {
      editor.innerHTML = '<ul><li style="text-align: right">Item</li></ul>';
      selectContents(editor.querySelector("li")!.firstChild!);
      expect(getCaretAlignment(editor)).toBe("right");
    });

    it("returns null when there is no selection", () => {
      editor.innerHTML = "<p>Text</p>";
      window.getSelection()!.removeAllRanges();
      expect(getCaretAlignment(editor)).toBeNull();
    });

    it("returns null for a null root", () => {
      expect(getCaretAlignment(null)).toBeNull();
    });
  });

  describe("alignmentDropdownItems isActive (#20)", () => {
    it("marks only the active alignment as active", () => {
      editor.innerHTML = '<p style="text-align: justify">Text</p>';
      selectContents(editor.querySelector("p")!.firstChild!);

      const options = createOptions(editor);
      const { alignmentDropdownItems } = useToolbarItems(options);

      const byId = Object.fromEntries(
        asItems(alignmentDropdownItems.value).map((i) => [i.id, i])
      );
      expect(byId["align-justify"].isActive!()).toBe(true);
      expect(byId["align-left"].isActive!()).toBe(false);
      expect(byId["align-center"].isActive!()).toBe(false);
      expect(byId["align-right"].isActive!()).toBe(false);
    });

    it("defaults to left when no alignment is set", () => {
      editor.innerHTML = "<p>Text</p>";
      selectContents(editor.querySelector("p")!.firstChild!);

      const options = createOptions(editor);
      const { alignmentDropdownItems } = useToolbarItems(options);
      const left = asItems(alignmentDropdownItems.value).find(
        (i) => i.id === "align-left"
      )!;
      expect(left.isActive!()).toBe(true);
    });
  });

  describe("canIndentListItem / canOutdentListItem (#21)", () => {
    it("cannot indent when there is no preceding sibling", () => {
      editor.innerHTML = "<ul><li>Only</li></ul>";
      selectContents(editor.querySelector("li")!.firstChild!);
      expect(canIndentListItem(editor)).toBe(false);
    });

    it("can indent when a preceding sibling item exists", () => {
      editor.innerHTML = "<ul><li>First</li><li>Second</li></ul>";
      const items = editor.querySelectorAll("li");
      selectContents(items[1].firstChild!);
      expect(canIndentListItem(editor)).toBe(true);
    });

    it("cannot outdent a top-level list item", () => {
      editor.innerHTML = "<ul><li>First</li><li>Second</li></ul>";
      const items = editor.querySelectorAll("li");
      selectContents(items[1].firstChild!);
      expect(canOutdentListItem(editor)).toBe(false);
    });

    it("can outdent a nested list item", () => {
      editor.innerHTML =
        "<ul><li>Parent<ul><li>Child</li></ul></li></ul>";
      const child = editor.querySelectorAll("li")[1];
      selectContents(child.firstChild!);
      expect(canOutdentListItem(editor)).toBe(true);
    });

    it("returns false outside any list item", () => {
      editor.innerHTML = "<p>Text</p>";
      selectContents(editor.querySelector("p")!.firstChild!);
      expect(canIndentListItem(editor)).toBe(false);
      expect(canOutdentListItem(editor)).toBe(false);
    });
  });

  describe("indent/outdent items isDisabled (#21)", () => {
    it("disables indent and outdent for a lone top-level item", () => {
      editor.innerHTML = "<ul><li>Only</li></ul>";
      selectContents(editor.querySelector("li")!.firstChild!);

      const options = createOptions(editor);
      const { listActions } = useToolbarItems(options);
      const byId = Object.fromEntries(
        asItems(listActions.value).map((i) => [i.id, i])
      );

      expect(byId["increase-indent"].isDisabled!()).toBe(true);
      expect(byId["decrease-indent"].isDisabled!()).toBe(true);
    });

    it("enables indent for a second sibling item", () => {
      editor.innerHTML = "<ul><li>First</li><li>Second</li></ul>";
      selectContents(editor.querySelectorAll("li")[1].firstChild!);

      const options = createOptions(editor);
      const { listActions } = useToolbarItems(options);
      const indent = asItems(listActions.value).find(
        (i) => i.id === "increase-indent"
      )!;
      expect(indent.isDisabled!()).toBe(false);
    });

    it("indent onClick is a no-op when not indentable", () => {
      editor.innerHTML = "<ul><li>Only</li></ul>";
      const before = editor.innerHTML;
      selectContents(editor.querySelector("li")!.firstChild!);

      let snapshotted = false;
      const options = createOptions(editor);
      options.captureSnapshot = () => {
        snapshotted = true;
      };
      const { listActions } = useToolbarItems(options);
      const indent = asItems(listActions.value).find(
        (i) => i.id === "increase-indent"
      )!;
      indent.onClick!();

      expect(snapshotted).toBe(false);
      expect(editor.innerHTML).toBe(before);
    });
  });

  describe("getCaretFontSize (#19/#24)", () => {
    it("returns the bucket for a sized span", () => {
      editor.innerHTML = '<p><span style="font-size: 1.25em">Big</span></p>';
      selectContents(editor.querySelector("span")!.firstChild!);
      expect(getCaretFontSize(editor)).toBe("large");
    });

    it("returns null when the caret is not inside a sized span", () => {
      editor.innerHTML = "<p>Plain</p>";
      selectContents(editor.querySelector("p")!.firstChild!);
      expect(getCaretFontSize(editor)).toBeNull();
    });
  });

  describe("fontSizeDropdownItems isActive (#19/#24)", () => {
    it("uses the caret's font size when available", () => {
      editor.innerHTML = '<p><span style="font-size: 1.75em">Huge</span></p>';
      selectContents(editor.querySelector("span")!.firstChild!);

      const options = createOptions(editor);
      const { fontSizeDropdownItems } = useToolbarItems(options);
      const byId = Object.fromEntries(
        asItems(fontSizeDropdownItems.value).map((i) => [i.id, i])
      );
      expect(byId["size-huge"].isActive!()).toBe(true);
      expect(byId["size-normal"].isActive!()).toBe(false);
    });

    it("falls back to the last applied size when caret is unsized", () => {
      editor.innerHTML = "<p>Plain</p>";
      selectContents(editor.querySelector("p")!.firstChild!);

      const options = createOptions(editor);
      options.fontSize.value = "small";
      const { fontSizeDropdownItems } = useToolbarItems(options);
      const small = asItems(fontSizeDropdownItems.value).find(
        (i) => i.id === "size-small"
      )!;
      expect(small.isActive!()).toBe(true);
    });
  });

  describe("Tools dropdown spell check isActive (#26)", () => {
    it("reflects the enabled spellcheck state", () => {
      const options = createOptions(editor);
      options.spellCheckEnabled.value = true;
      const { productivityDropdownItems } = useToolbarItems(options);
      const spell = asItems(productivityDropdownItems.value).find(
        (i) => i.id === "spell-check"
      )!;
      expect(spell.isActive!()).toBe(true);
    });

    it("reports inactive when spellcheck is off", () => {
      const options = createOptions(editor);
      options.spellCheckEnabled.value = false;
      const { productivityDropdownItems } = useToolbarItems(options);
      const spell = asItems(productivityDropdownItems.value).find(
        (i) => i.id === "spell-check"
      )!;
      expect(spell.isActive!()).toBe(false);
    });
  });
});
