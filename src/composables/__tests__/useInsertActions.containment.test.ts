import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useInsertActions } from "../useInsertActions";

// NOTE: unlike useInsertActions.test.ts, this suite intentionally does NOT mock
// ../../utils/pageManagement so it can assert the real DOM containment behavior
// of page break / TOC insertion (issues #9 and #22).

describe("useInsertActions containment (page break & TOC)", () => {
  let editorContent: Ref<HTMLElement | null>;
  let editorElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  const buildActions = () =>
    useInsertActions({
      editorContent,
      performWithSelection: vi.fn((cb: (root: HTMLElement) => void) =>
        cb(editorElement)
      ),
      captureSnapshot: vi.fn(),
      showToast: vi.fn(),
      openLinkModal: vi.fn(),
      openImageUploadModal: vi.fn(),
      closeImageUploadModal: vi.fn(),
      closeEmbedModal: vi.fn(),
      closeFileManagerModal: vi.fn(),
      closeEmojiPicker: vi.fn(),
    });

  const placeCaretInEditor = () => {
    const range = document.createRange();
    const textNode = editorElement.querySelector("p")?.firstChild;
    if (!textNode) throw new Error("expected editor paragraph text node");
    range.setStart(textNode, 0);
    range.collapse(true);
    const selection = globalThis.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const placeCaretOutsideEditor = () => {
    const range = document.createRange();
    const textNode = outsideElement.firstChild;
    if (!textNode) throw new Error("expected outside text node");
    range.setStart(textNode, 0);
    range.collapse(true);
    const selection = globalThis.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    outsideElement = document.createElement("div");
    outsideElement.textContent = "Outside the editor";
    document.body.appendChild(outsideElement);

    editorContent = ref<HTMLElement | null>(editorElement);
  });

  afterEach(() => {
    editorElement.remove();
    outsideElement.remove();
    globalThis.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  describe("handleInsertPageBreak", () => {
    it("inserts the page break inside the editor with a valid in-editor caret", () => {
      const { handleInsertPageBreak } = buildActions();
      placeCaretInEditor();

      handleInsertPageBreak();

      expect(editorElement.querySelector(".page-break")).not.toBeNull();
      // No page break should have leaked into the surrounding DOM.
      expect(outsideElement.querySelector(".page-break")).toBeNull();
    });

    it("falls back to appending inside the editor when the caret is outside", () => {
      const { handleInsertPageBreak } = buildActions();
      placeCaretOutsideEditor();

      handleInsertPageBreak();

      // The insertion must be contained to the editor root, never the
      // out-of-editor selection.
      expect(editorElement.querySelector(".page-break")).not.toBeNull();
      expect(outsideElement.querySelector(".page-break")).toBeNull();
      expect(outsideElement.textContent).toBe("Outside the editor");
    });

    it("falls back to appending inside the editor when there is no selection", () => {
      const { handleInsertPageBreak } = buildActions();
      globalThis.getSelection()?.removeAllRanges();

      handleInsertPageBreak();

      expect(editorElement.querySelector(".page-break")).not.toBeNull();
      expect(outsideElement.querySelector(".page-break")).toBeNull();
    });

    it("does nothing when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertPageBreak } = buildActions();

      expect(() => handleInsertPageBreak()).not.toThrow();
      expect(outsideElement.querySelector(".page-break")).toBeNull();
    });
  });

  describe("handleInsertTOC", () => {
    beforeEach(() => {
      editorElement.innerHTML =
        "<h1>Title</h1><p>Body</p><h2>Section</h2><p>More</p>";
    });

    it("inserts the TOC inside the editor with a valid in-editor caret", () => {
      const { handleInsertTOC } = buildActions();
      const range = document.createRange();
      const heading = editorElement.querySelector("p");
      if (heading?.firstChild) {
        range.setStart(heading.firstChild, 0);
        range.collapse(true);
        const selection = globalThis.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      handleInsertTOC();

      expect(editorElement.querySelector(".table-of-contents")).not.toBeNull();
      expect(outsideElement.querySelector(".table-of-contents")).toBeNull();
    });

    it("falls back to appending inside the editor when the caret is outside", () => {
      const { handleInsertTOC } = buildActions();
      placeCaretOutsideEditor();

      handleInsertTOC();

      // TOC must land inside the editor root, not at the stray selection.
      expect(editorElement.querySelector(".table-of-contents")).not.toBeNull();
      expect(outsideElement.querySelector(".table-of-contents")).toBeNull();
      expect(outsideElement.textContent).toBe("Outside the editor");
    });

    it("falls back to appending inside the editor when there is no selection", () => {
      const { handleInsertTOC } = buildActions();
      globalThis.getSelection()?.removeAllRanges();

      handleInsertTOC();

      expect(editorElement.querySelector(".table-of-contents")).not.toBeNull();
      expect(outsideElement.querySelector(".table-of-contents")).toBeNull();
    });

    it("does nothing when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertTOC } = buildActions();

      expect(() => handleInsertTOC()).not.toThrow();
      expect(outsideElement.querySelector(".table-of-contents")).toBeNull();
    });
  });
});
