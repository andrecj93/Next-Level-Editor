import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useFormattingActions } from "../useFormattingActions";

// Mock format painter (imported transitively by the composable)
vi.mock("../../utils/formatPainter", () => ({
  copyFormat: vi.fn(),
  pasteFormat: vi.fn(),
}));

type FontSize = "small" | "normal" | "large" | "huge";
type TextAlignment = "left" | "center" | "right" | "justify";

/**
 * These tests assert the CORRECTED behavior for finding #38:
 * handleTextColor / handleBackgroundColor must route the color application
 * through the remembered selection (performWithSelection) instead of reading
 * the LIVE selection after a focus()+setTimeout. The live selection is already
 * lost to the color picker's HEX input by the time the timeout fires, so the
 * color landed in the wrong place. Routing through performWithSelection (like
 * handleInlineAction) restores the saved range before applying color.
 */
describe("useFormattingActions - color via remembered selection (#38)", () => {
  let editorContent: Ref<HTMLElement | null>;
  let fontSize: Ref<FontSize>;
  let editorElement: HTMLElement;
  let captureSnapshot: () => void;
  let applyTextAlignment: (root: HTMLElement, alignment: TextAlignment) => void;
  let applyTextColor: (root: HTMLElement, color: string) => void;
  let applyBackgroundColor: (root: HTMLElement, color: string) => void;
  let applyFontSize: (root: HTMLElement, size: FontSize) => void;
  // Simulates useSelection.performWithSelection: restores the saved range then
  // runs the action against the editor root, then invokes the afterAction.
  let savedRange: Range | null;
  let performWithSelection: (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => void;

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    editorContent = ref<HTMLElement | null>(editorElement);
    fontSize = ref<FontSize>("normal");

    captureSnapshot = vi.fn();
    applyTextAlignment = vi.fn();
    applyTextColor = vi.fn();
    applyBackgroundColor = vi.fn();
    applyFontSize = vi.fn();

    // Remember a selection (as if the user selected text before opening the
    // color picker), then blow away the LIVE selection to emulate the HEX
    // input stealing focus.
    savedRange = document.createRange();
    const textNode = editorElement.querySelector("p")?.firstChild;
    if (textNode) {
      savedRange.setStart(textNode, 0);
      savedRange.setEnd(textNode, 4);
    }
    const selection = globalThis.getSelection();
    selection?.removeAllRanges();

    performWithSelection = vi.fn(
      (action: (root: HTMLElement) => void, afterAction?: () => void) => {
        const root = editorContent.value;
        if (!root) return;
        // Restore the remembered selection before applying the action.
        if (savedRange) {
          const sel = globalThis.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(savedRange.cloneRange());
        }
        action(root);
        afterAction?.();
      }
    );
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  const build = () =>
    useFormattingActions(
      editorContent,
      fontSize,
      captureSnapshot,
      applyTextAlignment,
      applyTextColor,
      applyBackgroundColor,
      applyFontSize,
      performWithSelection
    );

  describe("handleTextColor", () => {
    it("applies color through performWithSelection (remembered selection) without a timeout", () => {
      const { handleTextColor } = build();

      // No live selection exists (HEX input stole it) yet the color must apply.
      expect(globalThis.getSelection()?.rangeCount).toBe(0);

      handleTextColor("#ff0000");

      // Applied synchronously via the restorer, not after a setTimeout.
      expect(performWithSelection).toHaveBeenCalledTimes(1);
      expect(applyTextColor).toHaveBeenCalledWith(editorElement, "#ff0000");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("applies color against the restored range, not the (empty) live selection", () => {
      let selectedTextAtApply: string | null = null;
      applyTextColor = vi.fn(() => {
        const sel = globalThis.getSelection();
        selectedTextAtApply = sel && sel.rangeCount > 0 ? sel.toString() : null;
      });

      const { handleTextColor } = build();
      handleTextColor("#123456");

      // The remembered selection ("Test") was restored before applying color.
      expect(selectedTextAtApply).toBe("Test");
    });

    it("applies multiple colors, each through the restorer", () => {
      const { handleTextColor } = build();

      handleTextColor("#00ff00");
      handleTextColor("#0000ff");

      expect(applyTextColor).toHaveBeenCalledTimes(2);
      expect(applyTextColor).toHaveBeenNthCalledWith(1, editorElement, "#00ff00");
      expect(applyTextColor).toHaveBeenNthCalledWith(2, editorElement, "#0000ff");
      expect(captureSnapshot).toHaveBeenCalledTimes(2);
    });

    it("does not apply color when editorContent is null", () => {
      editorContent.value = null;
      const { handleTextColor } = build();

      handleTextColor("#ff0000");

      expect(performWithSelection).not.toHaveBeenCalled();
      expect(applyTextColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("handleBackgroundColor", () => {
    it("applies background color through performWithSelection without a timeout", () => {
      const { handleBackgroundColor } = build();

      expect(globalThis.getSelection()?.rangeCount).toBe(0);

      handleBackgroundColor("#ffff00");

      expect(performWithSelection).toHaveBeenCalledTimes(1);
      expect(applyBackgroundColor).toHaveBeenCalledWith(editorElement, "#ffff00");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("applies background color against the restored range", () => {
      let selectedTextAtApply: string | null = null;
      applyBackgroundColor = vi.fn(() => {
        const sel = globalThis.getSelection();
        selectedTextAtApply = sel && sel.rangeCount > 0 ? sel.toString() : null;
      });

      const { handleBackgroundColor } = build();
      handleBackgroundColor("#abcdef");

      expect(selectedTextAtApply).toBe("Test");
    });

    it("does not apply background color when editorContent is null", () => {
      editorContent.value = null;
      const { handleBackgroundColor } = build();

      handleBackgroundColor("#ffff00");

      expect(performWithSelection).not.toHaveBeenCalled();
      expect(applyBackgroundColor).not.toHaveBeenCalled();
      expect(captureSnapshot).not.toHaveBeenCalled();
    });
  });
});
