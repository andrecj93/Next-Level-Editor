import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useFormattingActions } from "../useFormattingActions";
import * as formatPainter from "../../utils/formatPainter";

// Mock format painter
vi.mock("../../utils/formatPainter", () => ({
  copyFormat: vi.fn(),
  pasteFormat: vi.fn(),
}));

type FontSize = "small" | "normal" | "large" | "huge";
type TextAlignment = "left" | "center" | "right" | "justify";

describe("useFormattingActions", () => {
  let editorContent: Ref<HTMLElement | null>;
  let fontSize: Ref<FontSize>;
  let editorElement: HTMLElement;
  let captureSnapshot: () => void;
  let applyTextAlignment: (root: HTMLElement, alignment: TextAlignment) => void;
  let applyTextColor: (root: HTMLElement, color: string) => void;
  let applyBackgroundColor: (root: HTMLElement, color: string) => void;
  let applyFontSize: (root: HTMLElement, size: FontSize) => void;

  beforeEach(() => {
    // Create editor element
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    editorContent = ref<HTMLElement | null>(editorElement);
    fontSize = ref<"small" | "normal" | "large" | "huge">("normal");

    // Setup mock functions
    captureSnapshot = vi.fn();
    applyTextAlignment = vi.fn();
    applyTextColor = vi.fn();
    applyBackgroundColor = vi.fn();
    applyFontSize = vi.fn();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("handleTextAlignment", () => {
    it("should apply left alignment", () => {
      const { handleTextAlignment } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextAlignment("left");

      expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "left");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply center alignment", () => {
      const { handleTextAlignment } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextAlignment("center");

      expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "center");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply right alignment", () => {
      const { handleTextAlignment } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextAlignment("right");

      expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "right");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply justify alignment", () => {
      const { handleTextAlignment } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextAlignment("justify");

      expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "justify");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should not apply alignment when editorContent is null", () => {
      editorContent.value = null;

      const { handleTextAlignment } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextAlignment("center");

      expect(applyTextAlignment).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("handleTextColor", () => {
    beforeEach(() => {
      vi.useFakeTimers();
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
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should apply text color", async () => {
      const { handleTextColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextColor("#ff0000");

      // Wait for setTimeout to complete
      await vi.runAllTimersAsync();

      expect(applyTextColor).toHaveBeenCalledWith(editorElement, "#ff0000");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply multiple colors", async () => {
      const { handleTextColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextColor("#00ff00");
      handleTextColor("#0000ff");

      // Wait for all setTimeout calls to complete
      await vi.runAllTimersAsync();

      expect(applyTextColor).toHaveBeenCalledTimes(2);
      expect(applyTextColor).toHaveBeenCalledWith(editorElement, "#00ff00");
      expect(applyTextColor).toHaveBeenCalledWith(editorElement, "#0000ff");
    });

    it("should not apply color when editorContent is null", () => {
      editorContent.value = null;

      const { handleTextColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextColor("#ff0000");

      expect(applyTextColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should not apply color when no selection exists", () => {
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const { handleTextColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleTextColor("#ff0000");

      expect(applyTextColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("handleBackgroundColor", () => {
    beforeEach(() => {
      vi.useFakeTimers();
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
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should apply background color", async () => {
      const { handleBackgroundColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleBackgroundColor("#ffff00");

      // Wait for setTimeout to complete
      await vi.runAllTimersAsync();

      expect(applyBackgroundColor).toHaveBeenCalledWith(
        editorElement,
        "#ffff00"
      );
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply multiple background colors", async () => {
      const { handleBackgroundColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleBackgroundColor("#ffff00");
      handleBackgroundColor("#ff00ff");

      // Wait for all setTimeout calls to complete
      await vi.runAllTimersAsync();

      expect(applyBackgroundColor).toHaveBeenCalledTimes(2);
      expect(applyBackgroundColor).toHaveBeenNthCalledWith(
        1,
        editorElement,
        "#ffff00"
      );
      expect(applyBackgroundColor).toHaveBeenNthCalledWith(
        2,
        editorElement,
        "#ff00ff"
      );
    });

    it("should not apply background color when editorContent is null", () => {
      editorContent.value = null;

      const { handleBackgroundColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleBackgroundColor("#ffff00");

      expect(applyBackgroundColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should not apply background color when no selection exists", () => {
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const { handleBackgroundColor } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleBackgroundColor("#ffff00");

      expect(applyBackgroundColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("handleFontSize", () => {
    it("should apply small font size", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("small");

      expect(fontSize.value).toBe("small");
      expect(applyFontSize).toHaveBeenCalledWith(editorElement, "small");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply normal font size", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("normal");

      expect(fontSize.value).toBe("normal");
      expect(applyFontSize).toHaveBeenCalledWith(editorElement, "normal");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply large font size", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("large");

      expect(fontSize.value).toBe("large");
      expect(applyFontSize).toHaveBeenCalledWith(editorElement, "large");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should apply huge font size", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("huge");

      expect(fontSize.value).toBe("huge");
      expect(applyFontSize).toHaveBeenCalledWith(editorElement, "huge");
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should update fontSize ref when changing size", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      expect(fontSize.value).toBe("normal");

      handleFontSize("large");
      expect(fontSize.value).toBe("large");

      handleFontSize("small");
      expect(fontSize.value).toBe("small");
    });

    it("should not apply font size when editorContent is null", () => {
      editorContent.value = null;

      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("large");

      expect(applyFontSize).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
      expect(fontSize.value).toBe("normal");
    });
  });

  describe("handleCopyFormat", () => {
    beforeEach(() => {
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
    });

    it("should copy format from selection", () => {
      const { handleCopyFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleCopyFormat();

      const selection = globalThis.getSelection();
      expect(formatPainter.copyFormat).toHaveBeenCalledWith(selection);
    });

    it("should not copy format when editorContent is null", () => {
      editorContent.value = null;

      const { handleCopyFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleCopyFormat();

      expect(formatPainter.copyFormat).not.toHaveBeenCalled();
    });

    it("should not copy format when no selection exists", () => {
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const { handleCopyFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleCopyFormat();

      expect(formatPainter.copyFormat).not.toHaveBeenCalled();
    });
  });

  describe("handlePasteFormat", () => {
    beforeEach(() => {
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
    });

    it("should paste format to selection", () => {
      const { handlePasteFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handlePasteFormat();

      const selection = globalThis.getSelection();
      expect(formatPainter.pasteFormat).toHaveBeenCalledWith(selection);
      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should not paste format when editorContent is null", () => {
      editorContent.value = null;

      const { handlePasteFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handlePasteFormat();

      expect(formatPainter.pasteFormat).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should not paste format when no selection exists", () => {
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const { handlePasteFormat } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handlePasteFormat();

      expect(formatPainter.pasteFormat).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should handle all formatting operations in sequence", async () => {
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

      const actions = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      expect(() => {
        actions.handleTextAlignment("center");
        actions.handleTextColor("#ff0000");
        actions.handleBackgroundColor("#ffff00");
        actions.handleFontSize("large");
        actions.handleCopyFormat();
        actions.handlePasteFormat();
      }).not.toThrow();

      // Wait for all setTimeout calls
      await vi.runAllTimersAsync();

      expect(applyTextAlignment).toHaveBeenCalled();
      expect(applyTextColor).toHaveBeenCalled();
      expect(applyBackgroundColor).toHaveBeenCalled();
      expect(applyFontSize).toHaveBeenCalled();
      expect(formatPainter.copyFormat).toHaveBeenCalled();
      expect(formatPainter.pasteFormat).toHaveBeenCalled();
    });

    it("should handle all operations without editor content", () => {
      editorContent.value = null;

      const actions = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      expect(() => {
        actions.handleTextAlignment("left");
        actions.handleTextColor("#000000");
        actions.handleBackgroundColor("#ffffff");
        actions.handleFontSize("normal");
        actions.handleCopyFormat();
        actions.handlePasteFormat();
      }).not.toThrow();

      expect(applyTextAlignment).not.toHaveBeenCalled();
      expect(applyTextColor).not.toHaveBeenCalled();
      expect(applyBackgroundColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });

    it("should handle rapid font size changes", () => {
      const { handleFontSize } = useFormattingActions(
        editorContent,
        fontSize,
        captureSnapshot,
        applyTextAlignment,
        applyTextColor,
        applyBackgroundColor,
        applyFontSize
      );

      handleFontSize("small");
      handleFontSize("normal");
      handleFontSize("large");
      handleFontSize("huge");

      expect(fontSize.value).toBe("huge");
      expect(applyFontSize).toHaveBeenCalledTimes(4);
      expect(captureSnapshot).toHaveBeenCalledTimes(4);
    });
  });
});
