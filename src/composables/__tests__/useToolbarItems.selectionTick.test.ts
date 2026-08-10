import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useToolbarItems } from "../useToolbarItems";
import { useActiveStates, selectionTick } from "../useActiveStates";

/**
 * The align / font-size isActive closures read the LIVE DOM selection, which
 * Vue cannot track. They must therefore touch the shared `selectionTick` that
 * useActiveStates bumps on every document `selectionchange`, so components
 * that call them during render (ToolbarDropdown's hasActiveItem/displayLabel)
 * re-evaluate as the caret moves between differently-styled blocks.
 */

/** Minimal no-op options; tests override nothing else. */
function createOptions(editor: HTMLDivElement) {
  const noop = () => {};
  return {
    editorContent: ref<HTMLDivElement | null>(editor),
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
  };
}

interface TestItem {
  id?: string;
  isActive?: () => boolean;
}

const placeCaretIn = (node: Node) => {
  const sel = window.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

describe("useToolbarItems selectionTick reactivity (align + font size)", () => {
  let editor: HTMLDivElement;
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  /** Mount a component that renders one item's isActive() result. */
  const mountFlag = (
    pick: (items: ReturnType<typeof useToolbarItems>) => TestItem,
    withActiveStates = false
  ) => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    const TestComponent = defineComponent({
      setup() {
        if (withActiveStates) {
          // Registers the document selectionchange listener that bumps the tick.
          useActiveStates(editorRef);
        }
        const items = useToolbarItems(createOptions(editor));
        const item = pick(items);
        return () =>
          h("span", { class: "flag" }, String(item.isActive!()));
      },
    });
    wrapper = mount(TestComponent);
    return wrapper;
  };

  const pickById =
    (
      list: "alignmentDropdownItems" | "fontSizeDropdownItems",
      id: string
    ) =>
    (items: ReturnType<typeof useToolbarItems>): TestItem =>
      (items[list].value as TestItem[]).find((i) => i.id === id)!;

  it("re-evaluates align-center isActive when the tick bumps after a caret move", async () => {
    editor.innerHTML =
      '<p id="left">plain</p><p id="center" style="text-align: center">centered</p>';
    placeCaretIn(editor.querySelector("#left")!.firstChild!);

    const w = mountFlag(pickById("alignmentDropdownItems", "align-center"));
    expect(w.find(".flag").text()).toBe("false");

    // Move the caret without any Vue-visible signal, then bump the tick the
    // way useActiveStates' selectionchange listener does.
    placeCaretIn(editor.querySelector("#center")!.firstChild!);
    selectionTick.value++;
    await nextTick();
    expect(w.find(".flag").text()).toBe("true");
  });

  it("re-evaluates size-large isActive when the tick bumps after a caret move", async () => {
    editor.innerHTML =
      '<p id="plain">normal</p><p><span id="big" style="font-size: 1.25em">large</span></p>';
    placeCaretIn(editor.querySelector("#plain")!.firstChild!);

    const w = mountFlag(pickById("fontSizeDropdownItems", "size-large"));
    expect(w.find(".flag").text()).toBe("false");

    placeCaretIn(editor.querySelector("#big")!.firstChild!);
    selectionTick.value++;
    await nextTick();
    expect(w.find(".flag").text()).toBe("true");
  });

  it("tracks the caret end-to-end via useActiveStates' selectionchange listener", async () => {
    editor.innerHTML =
      '<p id="left">plain</p><p id="center" style="text-align: center">centered</p>';
    placeCaretIn(editor.querySelector("#left")!.firstChild!);

    const w = mountFlag(
      pickById("alignmentDropdownItems", "align-center"),
      true
    );
    expect(w.find(".flag").text()).toBe("false");

    placeCaretIn(editor.querySelector("#center")!.firstChild!);
    // happy-dom does not always fire selectionchange itself; dispatch like the
    // browser would — the listener registered by useActiveStates bumps the tick.
    document.dispatchEvent(new Event("selectionchange"));
    await nextTick();
    expect(w.find(".flag").text()).toBe("true");

    placeCaretIn(editor.querySelector("#left")!.firstChild!);
    document.dispatchEvent(new Event("selectionchange"));
    await nextTick();
    expect(w.find(".flag").text()).toBe("false");
  });

  it("useActiveStates returns the shared module-level tick", () => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    let returned: unknown;
    const TestComponent = defineComponent({
      setup() {
        returned = useActiveStates(editorRef).selectionTick;
        return () => h("div");
      },
    });
    wrapper = mount(TestComponent);
    expect(returned).toBe(selectionTick);
  });
});
