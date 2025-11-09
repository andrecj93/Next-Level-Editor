import { type Ref } from "vue";
import { applyInlineStyle, toggleBlock, toggleList } from "../utils/formatting";

interface UseFormattingHandlersParams {
  performWithSelection: (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => void;
  captureSnapshot: (shouldEmit?: boolean) => void;
  handleTextColorBase: (color: string) => void;
  handleBackgroundColorBase: (color: string) => void;
  handlePasteFormatBase: () => void;
  showColorsDropdown: Ref<boolean>;
  formatPainterActive: Ref<boolean>;
}

export function useFormattingHandlers({
  performWithSelection,
  captureSnapshot,
  handleTextColorBase,
  handleBackgroundColorBase,
  handlePasteFormatBase,
  showColorsDropdown,
  formatPainterActive,
}: UseFormattingHandlersParams) {
  /**
   * Apply inline style (bold, italic, underline, etc.)
   */
  const handleInlineAction = (tag: string) => {
    performWithSelection(
      (root) => applyInlineStyle(root, tag),
      captureSnapshot
    );
  };

  /**
   * Toggle block-level formatting (h1, h2, p, etc.)
   */
  const handleBlockAction = (tag: string, fallback = "p") => {
    performWithSelection(
      (root) => toggleBlock(root, tag, fallback),
      captureSnapshot
    );
  };

  /**
   * Toggle list formatting (ul, ol)
   */
  const handleListAction = (tag: "ul" | "ol") => {
    performWithSelection((root) => toggleList(root, tag), captureSnapshot);
  };

  /**
   * Apply text color and close dropdown after a delay
   */
  const handleTextColor = (color: string) => {
    handleTextColorBase(color);
    setTimeout(() => {
      showColorsDropdown.value = false;
    }, 300);
  };

  /**
   * Apply background color and close dropdown after a delay
   */
  const handleBackgroundColor = (color: string) => {
    handleBackgroundColorBase(color);
    setTimeout(() => {
      showColorsDropdown.value = false;
    }, 300);
  };

  /**
   * Paste format and deactivate format painter
   */
  const handlePasteFormat = () => {
    handlePasteFormatBase();
    formatPainterActive.value = false;
  };

  return {
    handleInlineAction,
    handleBlockAction,
    handleListAction,
    handleTextColor,
    handleBackgroundColor,
    handlePasteFormat,
  };
}
