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
  /**
   * Is there a live selection anchored OUTSIDE this editor instance? That is
   * the dangerous case — applying a formatting command against it mutates the
   * host page's DOM. (No selection at all is harmless: the apply* helpers
   * no-op internally.)
   */
  const selectionIsForeign = (): boolean => {
    const root = editorContent.value;
    if (!root) return false;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    // A range over DETACHED nodes is stale, not foreign — nothing in the live
    // document can be mutated through it, so let the apply* helpers handle it.
    const foreign = (node: Node) =>
      node.isConnected && !root.contains(node);
    return foreign(range.startContainer) || foreign(range.endContainer);
  };

  const handleTextAlignment = (alignment: TextAlignment) => {
    if (!editorContent.value) return;
    // Clicking a toolbar control can leave the LIVE selection outside the
    // editor (host-page text, a modal input). Applying against it mutated the
    // HOST PAGE's DOM. Route through the remembered editor selection when a
    // restorer is wired; otherwise refuse to touch foreign DOM.
    if (selectionIsForeign()) {
      if (performWithSelection) {
        performWithSelection(
          (root) => applyTextAlignment(root, alignment),
          captureSnapshot
        );
      }
      return;
    }
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
    // Same containment rule as alignment: applyFontSize wraps the live
    // selection in styled spans, which with a foreign selection inserted
    // spans into arbitrary out-of-editor DOM.
    if (selectionIsForeign()) {
      if (performWithSelection) {
        performWithSelection(
          (root) => applyFontSize(root, size),
          captureSnapshot
        );
      }
      return;
    }
    applyFontSize(editorContent.value, size);
    captureSnapshot();
  };

  const handleCopyFormat = () => {
    if (!editorContent.value) return;
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    // Pass the editor root so tag/inline-style detection stops there — a host
    // page wrapping the editor in <b> or an inline color must not become part
    // of the copied format. #r16-6
    const result = copyFormat(selection, editorContent.value);
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
    // Only paint into THIS editor — never a selection elsewhere on the host page
    // (a modal input, the toolbar, other page text). Painting a foreign range
    // would wrap host-page nodes in styled spans. #8
    if (
      !editorContent.value.contains(selection.anchorNode) ||
      !editorContent.value.contains(selection.focusNode)
    ) {
      return;
    }
    // Pass the editor root so the paint is applied PER-BLOCK (never extracting
    // across block/cell boundaries). #r15-5/6/8
    const success = pasteFormat(selection, editorContent.value);
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
