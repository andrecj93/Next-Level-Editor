import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useFormattingHandlers } from "../useFormattingHandlers";
import * as formatting from "../../utils/formatting";

// Mock the formatting utilities
vi.mock("../../utils/formatting", () => ({
  applyInlineStyle: vi.fn(),
  toggleBlock: vi.fn(),
  toggleList: vi.fn(),
}));

describe("useFormattingHandlers", () => {
  let mockPerformWithSelection: (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => void;
  let mockCaptureSnapshot: (shouldEmit?: boolean) => void;
  let mockHandleTextColorBase: (color: string) => void;
  let mockHandleBackgroundColorBase: (color: string) => void;
  let mockHandlePasteFormatBase: () => void;
  let showColorsDropdown: Ref<boolean>;
  let formatPainterActive: Ref<boolean>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformWithSelection = vi.fn(
      (action: (root: HTMLElement) => void, afterAction?: () => void) => {
        // Simulate calling the action with a mock root element
        const mockRoot = document.createElement("div");
        action(mockRoot);
        if (afterAction) afterAction();
      }
    );
    mockCaptureSnapshot = vi.fn();
    mockHandleTextColorBase = vi.fn();
    mockHandleBackgroundColorBase = vi.fn();
    mockHandlePasteFormatBase = vi.fn();
    showColorsDropdown = ref<boolean>(false);
    formatPainterActive = ref<boolean>(false);

    // Use fake timers for testing setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("handleInlineAction", () => {
    it("should call applyInlineStyle with correct tag", () => {
      const { handleInlineAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleInlineAction("strong");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(1);
      expect(formatting.applyInlineStyle).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "strong"
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should apply italic style", () => {
      const { handleInlineAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleInlineAction("em");

      expect(formatting.applyInlineStyle).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "em"
      );
    });

    it("should apply underline style", () => {
      const { handleInlineAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleInlineAction("u");

      expect(formatting.applyInlineStyle).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "u"
      );
    });

    it("should handle multiple inline actions in sequence", () => {
      const { handleInlineAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleInlineAction("strong");
      handleInlineAction("em");
      handleInlineAction("u");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(3);
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(3);
    });
  });

  describe("handleBlockAction", () => {
    it("should call toggleBlock with correct tag", () => {
      const { handleBlockAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBlockAction("h1");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(1);
      expect(formatting.toggleBlock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "h1",
        "p"
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should use custom fallback tag", () => {
      const { handleBlockAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBlockAction("h2", "div");

      expect(formatting.toggleBlock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "h2",
        "div"
      );
    });

    it("should apply h3 heading", () => {
      const { handleBlockAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBlockAction("h3");

      expect(formatting.toggleBlock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "h3",
        "p"
      );
    });

    it("should apply blockquote", () => {
      const { handleBlockAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBlockAction("blockquote");

      expect(formatting.toggleBlock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "blockquote",
        "p"
      );
    });

    it("should handle multiple block actions", () => {
      const { handleBlockAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBlockAction("h1");
      handleBlockAction("h2");
      handleBlockAction("p");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(3);
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(3);
    });
  });

  describe("handleListAction", () => {
    it("should call toggleList with ul", () => {
      const { handleListAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleListAction("ul");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(1);
      expect(formatting.toggleList).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "ul"
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should call toggleList with ol", () => {
      const { handleListAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleListAction("ol");

      expect(formatting.toggleList).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        "ol"
      );
    });

    it("should toggle between ul and ol", () => {
      const { handleListAction } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleListAction("ul");
      handleListAction("ol");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(2);
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleTextColor", () => {
    it("should call handleTextColorBase with color", () => {
      const { handleTextColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleTextColor("#ff0000");

      expect(mockHandleTextColorBase).toHaveBeenCalledWith("#ff0000");
    });

    it("should keep the colors dropdown open after applying a color", () => {
      // The dropdown must stay open so the user can keep fine-tuning the color
      // (drag/HEX input). It is dismissed only by an outside click or Escape,
      // handled at the editor level — never auto-closed on each value change.
      showColorsDropdown.value = true;

      const { handleTextColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleTextColor("#00ff00");

      expect(showColorsDropdown.value).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(showColorsDropdown.value).toBe(true);
    });

    it("should not close dropdown immediately", () => {
      showColorsDropdown.value = true;

      const { handleTextColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleTextColor("#0000ff");

      expect(showColorsDropdown.value).toBe(true);

      vi.advanceTimersByTime(299);
      expect(showColorsDropdown.value).toBe(true);
    });

    it("should handle multiple color changes", () => {
      const { handleTextColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleTextColor("#ff0000");
      handleTextColor("#00ff00");
      handleTextColor("#0000ff");

      expect(mockHandleTextColorBase).toHaveBeenCalledTimes(3);
    });
  });

  describe("handleBackgroundColor", () => {
    it("should call handleBackgroundColorBase with color", () => {
      const { handleBackgroundColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBackgroundColor("#ffcc00");

      expect(mockHandleBackgroundColorBase).toHaveBeenCalledWith("#ffcc00");
    });

    it("should keep the colors dropdown open after applying a background color", () => {
      showColorsDropdown.value = true;

      const { handleBackgroundColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBackgroundColor("#ccff00");

      expect(showColorsDropdown.value).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(showColorsDropdown.value).toBe(true);
    });

    it("should not close dropdown immediately", () => {
      showColorsDropdown.value = true;

      const { handleBackgroundColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBackgroundColor("#00ccff");

      vi.advanceTimersByTime(299);
      expect(showColorsDropdown.value).toBe(true);
    });

    it("should handle multiple background color changes", () => {
      const { handleBackgroundColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleBackgroundColor("#ff00ff");
      handleBackgroundColor("#ffff00");
      handleBackgroundColor("#00ffff");

      expect(mockHandleBackgroundColorBase).toHaveBeenCalledTimes(3);
    });
  });

  describe("handlePasteFormat", () => {
    it("should call handlePasteFormatBase", () => {
      const { handlePasteFormat } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handlePasteFormat();

      expect(mockHandlePasteFormatBase).toHaveBeenCalledTimes(1);
    });

    it("should deactivate format painter", () => {
      formatPainterActive.value = true;

      const { handlePasteFormat } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handlePasteFormat();

      expect(formatPainterActive.value).toBe(false);
    });

    it("should deactivate format painter when already inactive", () => {
      formatPainterActive.value = false;

      const { handlePasteFormat } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handlePasteFormat();

      expect(formatPainterActive.value).toBe(false);
      expect(mockHandlePasteFormatBase).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple paste format operations", () => {
      formatPainterActive.value = true;

      const { handlePasteFormat } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handlePasteFormat();
      formatPainterActive.value = true;
      handlePasteFormat();

      expect(mockHandlePasteFormatBase).toHaveBeenCalledTimes(2);
      expect(formatPainterActive.value).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid formatting operations", () => {
      const { handleInlineAction, handleBlockAction, handleListAction } =
        useFormattingHandlers({
          performWithSelection: mockPerformWithSelection,
          captureSnapshot: mockCaptureSnapshot,
          handleTextColorBase: mockHandleTextColorBase,
          handleBackgroundColorBase: mockHandleBackgroundColorBase,
          handlePasteFormatBase: mockHandlePasteFormatBase,
          showColorsDropdown,
          formatPainterActive,
        });

      handleInlineAction("strong");
      handleBlockAction("h1");
      handleListAction("ul");
      handleInlineAction("em");
      handleBlockAction("p");

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(5);
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(5);
    });

    it("should handle color changes while format painter is active", () => {
      formatPainterActive.value = true;
      showColorsDropdown.value = true;

      const { handleTextColor, handleBackgroundColor } = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handleTextColor("#ff0000");
      handleBackgroundColor("#00ff00");

      vi.advanceTimersByTime(1000);

      expect(mockHandleTextColorBase).toHaveBeenCalledWith("#ff0000");
      expect(mockHandleBackgroundColorBase).toHaveBeenCalledWith("#00ff00");
      expect(showColorsDropdown.value).toBe(true); // Stays open for fine-tuning
      expect(formatPainterActive.value).toBe(true); // Should not be affected
    });

    it("should handle all handlers together", () => {
      const handlers = useFormattingHandlers({
        performWithSelection: mockPerformWithSelection,
        captureSnapshot: mockCaptureSnapshot,
        handleTextColorBase: mockHandleTextColorBase,
        handleBackgroundColorBase: mockHandleBackgroundColorBase,
        handlePasteFormatBase: mockHandlePasteFormatBase,
        showColorsDropdown,
        formatPainterActive,
      });

      handlers.handleInlineAction("strong");
      handlers.handleBlockAction("h1");
      handlers.handleListAction("ul");
      handlers.handleTextColor("#ff0000");
      handlers.handleBackgroundColor("#00ff00");
      handlers.handlePasteFormat();

      expect(mockPerformWithSelection).toHaveBeenCalledTimes(3);
      expect(mockHandleTextColorBase).toHaveBeenCalledTimes(1);
      expect(mockHandleBackgroundColorBase).toHaveBeenCalledTimes(1);
      expect(mockHandlePasteFormatBase).toHaveBeenCalledTimes(1);
    });
  });
});
