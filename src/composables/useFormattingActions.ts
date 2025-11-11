import { type Ref } from "vue";
import { copyFormat, pasteFormat } from "../utils/formatPainter";

type FontSize = "small" | "normal" | "large" | "huge";
type TextAlignment = "left" | "center" | "right" | "justify";

export function useFormattingActions(
  editorContent: Ref<HTMLElement | null>,
  fontSize: Ref<FontSize>,
  captureSnapshot: () => void,
  applyTextAlignment: (root: HTMLElement, alignment: TextAlignment) => void,
  applyTextColor: (root: HTMLElement, color: string) => void,
  applyBackgroundColor: (root: HTMLElement, color: string) => void,
  applyFontSize: (root: HTMLElement, size: FontSize) => void
) {
  const handleTextAlignment = (alignment: TextAlignment) => {
    if (!editorContent.value) return;
    applyTextAlignment(editorContent.value, alignment);
    captureSnapshot();
  };

  const handleTextColor = (color: string) => {
    if (!editorContent.value) return;
    // Focus the editor first to restore selection
    editorContent.value.focus();
    const root = editorContent.value;
    // Small delay to ensure focus is applied
    setTimeout(() => {
      const selection = globalThis.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      applyTextColor(root, color);
      captureSnapshot();
    }, 10);
  };

  const handleBackgroundColor = (color: string) => {
    if (!editorContent.value) return;
    // Focus the editor first to restore selection
    editorContent.value.focus();
    const root = editorContent.value;
    // Small delay to ensure focus is applied
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
