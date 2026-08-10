import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useInsertActions } from "../useInsertActions";
import * as pageManagement from "../../utils/pageManagement";

// Mock the utility modules
vi.mock("../../utils/pageManagement", () => ({
  insertPageBreak: vi.fn(),
  // Returns whether a TOC was actually inserted — false when the document has
  // no headings, in which case the caller toasts and skips the snapshot. #R23-39
  insertTableOfContents: vi.fn(() => true),
}));

describe("useInsertActions", () => {
  let editorContent: Ref<HTMLElement | null>;
  let editorElement: HTMLDivElement;
  let performWithSelection: (
    callback: (root: HTMLElement) => void,
    afterCallback?: () => void
  ) => void;
  let captureSnapshot: () => void;
  let showToast: (message: string, type?: "success" | "error") => void;
  let openLinkModal: () => void;
  let openImageUploadModal: () => void;
  let closeImageUploadModal: () => void;
  let closeEmbedModal: () => void;
  let closeFileManagerModal: () => void;
  let closeEmojiPicker: () => void;

  beforeEach(() => {
    // Create editor element
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    editorContent = ref<HTMLElement | null>(editorElement);

    // Create mock functions
    performWithSelection = vi.fn((callback: (root: HTMLElement) => void) =>
      callback(editorElement)
    );
    captureSnapshot = vi.fn();
    showToast = vi.fn();
    openLinkModal = vi.fn();
    openImageUploadModal = vi.fn();
    closeImageUploadModal = vi.fn();
    closeEmbedModal = vi.fn();
    closeFileManagerModal = vi.fn();
    closeEmojiPicker = vi.fn();

    // Mock window.prompt
    globalThis.prompt = vi.fn();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("insertLink", () => {
    const build = () =>
      useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

    it("opens the styled link modal (no native prompt)", () => {
      const { insertLink } = build();
      insertLink();
      expect(openLinkModal).toHaveBeenCalledTimes(1);
    });

    it("handleInsertLink inserts at the remembered selection", () => {
      const { handleInsertLink } = build();
      const p = editorElement.querySelector("p")!;
      const range = document.createRange();
      range.setStart(p.firstChild!, 0);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      handleInsertLink("https://example.com", "Click");
      expect(performWithSelection).toHaveBeenCalledTimes(1);
      const link = editorElement.querySelector("a");
      expect(link).toBeTruthy();
      expect(link!.getAttribute("href")).toBe("https://example.com");
      expect(link!.textContent).toBe("Click");
    });

    it("handleInsertLink ignores an empty URL", () => {
      const { handleInsertLink } = build();
      handleInsertLink("");
      expect(performWithSelection).not.toHaveBeenCalled();
    });
  });

  describe("insertImage", () => {
    it("should open image upload modal", () => {
      const { insertImage } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      insertImage();

      expect(openImageUploadModal).toHaveBeenCalled();
    });
  });

  describe("handleInsertImage", () => {
    it("should insert image with URL and alt text", () => {
      const { handleInsertImage } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertImage("https://example.com/image.jpg", "Test image");

      expect(performWithSelection).toHaveBeenCalled();
      expect(closeImageUploadModal).toHaveBeenCalled();
    });

    it("should close image upload modal after insertion", () => {
      const { handleInsertImage } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertImage("https://example.com/image.jpg", "Alt text");

      expect(closeImageUploadModal).toHaveBeenCalled();
    });
  });

  describe("handleInsertEmbed", () => {
    it("should insert embed HTML content", () => {
      const { handleInsertEmbed } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      handleInsertEmbed('<iframe src="https://example.com"></iframe>');

      expect(performWithSelection).toHaveBeenCalled();
      expect(closeEmbedModal).toHaveBeenCalled();
    });

    it("should close embed modal after insertion", () => {
      const { handleInsertEmbed } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertEmbed("<div>Embed content</div>");

      expect(closeEmbedModal).toHaveBeenCalled();
    });

    it("should not insert when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertEmbed } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertEmbed("<div>Test</div>");

      expect(performWithSelection).not.toHaveBeenCalled();
    });
  });

  describe("handleInsertFile", () => {
    it("should insert image file as image", () => {
      const { handleInsertFile } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection inside the editor
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      const imageFile = {
        type: "image/png",
        url: "https://example.com/image.png",
        name: "image.png",
      };

      handleInsertFile(imageFile);

      expect(performWithSelection).toHaveBeenCalled();
      expect(closeFileManagerModal).toHaveBeenCalled();
    });

    it("should insert non-image file as link", () => {
      const { handleInsertFile } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      const pdfFile = {
        type: "application/pdf",
        url: "https://example.com/document.pdf",
        name: "document.pdf",
      };

      handleInsertFile(pdfFile);

      expect(performWithSelection).toHaveBeenCalled();
      expect(closeFileManagerModal).toHaveBeenCalled();
    });

    it("should close file manager modal after insertion", () => {
      const { handleInsertFile } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection inside the editor
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      const file = {
        type: "image/jpeg",
        url: "https://example.com/photo.jpg",
        name: "photo.jpg",
      };

      handleInsertFile(file);

      expect(closeFileManagerModal).toHaveBeenCalled();
    });

    it("should not insert when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertFile } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertFile({
        type: "image/png",
        url: "test.png",
        name: "test.png",
      });

      expect(performWithSelection).not.toHaveBeenCalled();
    });
  });

  describe("handleInsertEmoji", () => {
    it("should insert emoji at cursor position", () => {
      const { handleInsertEmoji } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      handleInsertEmoji("😀");

      expect(performWithSelection).toHaveBeenCalled();
      expect(closeEmojiPicker).toHaveBeenCalled();
    });

    it("should close emoji picker after insertion", () => {
      const { handleInsertEmoji } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertEmoji("👍");

      expect(closeEmojiPicker).toHaveBeenCalled();
    });
  });

  describe("handleInsertPageBreak", () => {
    it("should insert page break", () => {
      const { handleInsertPageBreak } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertPageBreak();

      expect(vi.mocked(pageManagement.insertPageBreak)).toHaveBeenCalled();
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should not insert when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertPageBreak } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertPageBreak();

      expect(vi.mocked(pageManagement.insertPageBreak)).not.toHaveBeenCalled();
    });
  });

  describe("handleInsertCodeBlock", () => {
    it("splits the paragraph so <pre> is never nested inside <p>", () => {
      editorElement.innerHTML = "<p>foobar</p>";
      const p = editorElement.querySelector("p")!;
      const range = document.createRange();
      range.setStart(p.firstChild!, 3); // caret between "foo" and "bar"
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const { handleInsertCodeBlock } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertCodeBlock({ code: "const x = 1;", language: "js" });

      // <pre> nested in a <p> is foster-parented out on the next round-trip,
      // orphaning the trailing text. It must be a block-level sibling.
      expect(editorElement.querySelector("p pre")).toBeNull();
      const pre = editorElement.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.querySelector("code")?.textContent).toBe("const x = 1;");
      expect(editorElement.textContent).toContain("foo");
      expect(editorElement.textContent).toContain("bar");
      expect(captureSnapshot).toHaveBeenCalled();
    });
  });

  describe("handleInsertTOC", () => {
    it("should insert table of contents", () => {
      const { handleInsertTOC } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertTOC();

      expect(
        vi.mocked(pageManagement.insertTableOfContents)
      ).toHaveBeenCalled();
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should not insert when editorContent is null", () => {
      editorContent.value = null;
      const { handleInsertTOC } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertTOC();

      expect(
        vi.mocked(pageManagement.insertTableOfContents)
      ).not.toHaveBeenCalled();
    });
  });

  describe("handleInsertHR", () => {
    it("should insert horizontal rule", () => {
      const { handleInsertHR } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      handleInsertHR();

      expect(performWithSelection).toHaveBeenCalled();
    });
  });

  describe("handleInsertTable", () => {
    it("should insert table with specified dimensions", () => {
      const { handleInsertTable } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      const tableData = { rows: 3, cols: 4, includeHeader: true };
      handleInsertTable(tableData);

      expect(performWithSelection).toHaveBeenCalled();
    });

    it("should show success toast after table insertion", () => {
      const { handleInsertTable } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      const tableData = { rows: 2, cols: 3, includeHeader: false };
      handleInsertTable(tableData);

      expect(showToast).toHaveBeenCalledWith(
        "✓ Table (2×3) inserted successfully!"
      );
    });

    it("should handle table with header", () => {
      const { handleInsertTable } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      const tableData = { rows: 5, cols: 5, includeHeader: true };
      handleInsertTable(tableData);

      expect(performWithSelection).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        "✓ Table (5×5) inserted successfully!"
      );
    });

    it("should handle table without header", () => {
      const { handleInsertTable } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      const tableData = { rows: 2, cols: 2, includeHeader: false };
      handleInsertTable(tableData);

      expect(performWithSelection).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        "✓ Table (2×2) inserted successfully!"
      );
    });
  });

  describe("handleInsertCodeBlock", () => {
    it("should insert code block with language", () => {
      const { handleInsertCodeBlock } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Create a selection
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      const codeData = { code: 'console.log("Hello")', language: "javascript" };
      handleInsertCodeBlock(codeData);

      expect(performWithSelection).toHaveBeenCalled();
    });

    it("should insert code block with different languages", () => {
      const { handleInsertCodeBlock } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      const pythonCode = { code: 'print("Hello")', language: "python" };
      handleInsertCodeBlock(pythonCode);

      expect(performWithSelection).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple insertions in sequence", () => {
      const actions = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      actions.handleInsertHR();
      actions.handleInsertEmoji("🎉");
      actions.handleInsertPageBreak();

      expect(performWithSelection).toHaveBeenCalledTimes(2);
      expect(captureSnapshot).toHaveBeenCalledTimes(2);
    });

    it("should handle empty URL in insertLink", () => {
      const { insertLink } = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      globalThis.prompt = vi.fn(() => "");
      insertLink();

      expect(performWithSelection).not.toHaveBeenCalled();
    });

    it("should handle all insert operations without errors", () => {
      const actions = useInsertActions({
        editorContent,
        performWithSelection,
        captureSnapshot,
        showToast,
        openLinkModal,
        openImageUploadModal,
        closeImageUploadModal,
        closeEmbedModal,
        closeFileManagerModal,
        closeEmojiPicker,
      });

      // Test all operations don't throw
      expect(() => {
        actions.insertImage();
        actions.handleInsertHR();
        actions.handleInsertEmoji("😀");
      }).not.toThrow();
    });
  });
});
