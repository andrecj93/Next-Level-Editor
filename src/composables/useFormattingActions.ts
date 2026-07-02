import { type Ref } from "vue";
import { copyFormat, pasteFormat } from "../utils/formatPainter";

type FontSize = "small" | "normal" | "large" | "huge";
type TextAlignment = "left" | "center" | "right" | "justify";

type PerformWithSelection = (
  action: (root: HTMLElement) => void,
  afterAction?: () => void
) => void;

export function useFormattingActions(
  editorContent: Ref<HTMLElement | null>,
  fontSize: Ref<FontSize>,
  captureSnapshot: () => void,
  applyTextAlignment: (root: HTMLElement, alignment: TextAlignment) => void,
  applyTextColor: (root: HTMLElement, color: string) => void,
  applyBackgroundColor: (root: HTMLElement, color: string) => void,
  applyFontSize: (root: HTMLElement, size: FontSize) => void,
  performWithSelection?: PerformWithSelection
) {
  const handleTextAlignment = (alignment: TextAlignment) => {
    if (!editorContent.value) return;
    applyTextAlignment(editorContent.value, alignment);
    captureSnapshot();
  };

  const handleTextColor = (color: string) => {
    if (!editorContent.value) return;
    // Route through the remembered selection so the color lands where the user
    // last had the caret/selection in the editor. The color picker's HEX input
    // steals focus, wiping the live selection, so reading it directly (as the
    // old focus()+setTimeout path did) applied color to the wrong place.
    if (performWithSelection) {
      performWithSelection((root) => applyTextColor(root, color), captureSnapshot);
      return;
    }
    // Fallback when no selection restorer is wired in.
    editorContent.value.focus();
    const root = editorContent.value;
    setTimeout(() => {
      const selection = globalThis.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      applyTextColor(root, color);
      captureSnapshot();
    }, 10);
  };

  const handleBackgroundColor = (color: string) => {
    if (!editorContent.value) return;
    // See handleTextColor: apply against the remembered selection instead of the
    // live one (which the color picker's HEX input has already stolen).
    if (performWithSelection) {
      performWithSelection(
        (root) => applyBackgroundColor(root, color),
        captureSnapshot
      );
      return;
    }
    // Fallback when no selection restorer is wired in.
    editorContent.value.focus();
    const root = editorContent.value;
    setTimeout(() => {
      const selection = globalThis.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      applyBackgroundColor(root, color);
      captureSnapshot();
    }, 10);
  };

  const handleFontSize = (size: FontSize) => {
    if (!editorContent.value) return;
    fontSize.value = size;
    applyFontSize(editorContent.value, size);
    captureSnapshot();
  };

  const handleCopyFormat = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const result = copyFormat(selection);
    if (result && editorContent.value) {
      // Change cursor to indicate format painter is active
      editorContent.value.style.cursor = "copy";
      setTimeout(() => {
        if (editorContent.value) {
          editorContent.value.style.cursor = "";
        }
      }, 3000);
    }
  };

  const handlePasteFormat = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const success = pasteFormat(selection);
    if (success) {
      captureSnapshot();
      // Reset cursor
      if (editorContent.value) {
        editorContent.value.style.cursor = "";
      }
    }
  };

  return {
    handleTextAlignment,
    handleTextColor,
    handleBackgroundColor,
    handleFontSize,
    handleCopyFormat,
    handlePasteFormat,
  };
}
