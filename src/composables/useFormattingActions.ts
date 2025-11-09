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
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    applyTextColor(editorContent.value, color);
    captureSnapshot();
  };

  const handleBackgroundColor = (color: string) => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    applyBackgroundColor(editorContent.value, color);
    captureSnapshot();
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
    if (!selection || selection.rangeCount === 0) return;
    copyFormat(selection);
  };

  const handlePasteFormat = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    pasteFormat(selection);
    captureSnapshot();
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
