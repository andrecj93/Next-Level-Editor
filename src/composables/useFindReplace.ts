import type { Ref } from "vue";
import { smoothScrollIntoView } from "../utils/scroll";

interface FindReplaceOptions {
  editorContent: Ref<HTMLElement | null>;
  captureSnapshot: () => void;
}

/**
 * Composable for handling find and replace functionality
 * Provides search and replace operations within the editor
 */
export function useFindReplace(options: FindReplaceOptions) {
  const { editorContent, captureSnapshot } = options;

  /**
   * Build a search regex source for findText.
   * Escapes regex metacharacters FIRST, then wraps in word boundaries — doing
   * it the other way round would escape the backslash of `\b` into a literal
   * "\\b" and whole-word matching would never match anything.
   */
  const buildPattern = (findText: string, wholeWord: boolean): string => {
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    return wholeWord ? String.raw`\b${escaped}\b` : escaped;
  };

  /**
   * Search and replace text in HTML content.
   * @param replaceAll - when false, only the first match is replaced (single
   *   "Replace"); when true, every match is replaced ("Replace All").
   */
  const searchAndReplace = (
    html: string,
    findText: string,
    replaceText: string,
    options: { caseSensitive: boolean; wholeWord: boolean },
    replaceAll = true
  ): string => {
    if (!findText) return html;

    let flags = "";
    if (replaceAll) flags += "g";
    if (!options.caseSensitive) flags += "i";

    const regex = new RegExp(buildPattern(findText, options.wholeWord), flags);

    // Use a function replacement so `$`-sequences (e.g. "$&", "$1") inside
    // replaceText are inserted literally instead of being interpreted.
    return html.replace(regex, () => replaceText);
  };

  // Tracks the currently-applied temporary find highlight so a second Find on
  // the same/overlapping element can't capture the highlight color as the
  // "original" background and leave it permanently applied in saved content.
  let pendingHighlight: {
    el: HTMLElement;
    originalBg: string;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  const clearPendingHighlight = () => {
    if (pendingHighlight) {
      clearTimeout(pendingHighlight.timer);
      pendingHighlight.el.style.backgroundColor = pendingHighlight.originalBg;
      pendingHighlight = null;
    }
  };

  /**
   * Find text in the editor
   * @param data - Find operation data
   */
  const handleFind = (data: {
    findText: string;
    direction: "next" | "previous";
  }) => {
    if (!editorContent.value) return;

    const selection = globalThis.getSelection();
    if (!selection) return;

    try {
      // Using native window.find() to search in the editor
      // @ts-expect-error - window.find is non-standard but widely supported
      const found = globalThis.find(
        data.findText,
        false,
        data.direction === "previous",
        false,
        false,
        true,
        false
      );

      // If found, scroll the selected element into view
      if (found && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Get the element containing the match
        let element: HTMLElement | null = null;
        if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
          element = range.startContainer as HTMLElement;
        } else if (range.startContainer.parentElement) {
          element = range.startContainer.parentElement;
        }

        // Scroll to the match with better visibility
        if (element) {
          // Use smoothScrollIntoView for cross-browser compatibility
          smoothScrollIntoView(element, {
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          // Restore any previous highlight before capturing this element's
          // true background, so a still-pending highlight can never be
          // captured as the original and leaked into saved content.
          clearPendingHighlight();
          const highlightEl = element;
          const originalBg = highlightEl.style.backgroundColor;
          highlightEl.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
          const timer = setTimeout(() => {
            highlightEl.style.backgroundColor = originalBg;
            pendingHighlight = null;
          }, 1000);
          pendingHighlight = { el: highlightEl, originalBg, timer };
        }
      }
    } catch (error) {
      console.warn("Find operation not supported in this browser:", error);
    }
  };

  /**
   * Replace only the first matching occurrence (single "Replace").
   * @param data - Replace operation data
   */
  const handleReplace = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    if (!editorContent.value) return;

    // A still-pending find highlight is inline style on a live element; it
    // must be unwound BEFORE innerHTML is read, or the temporary yellow gets
    // baked into the replaced content (and its restore timer would fire
    // against a detached node, a no-op).
    clearPendingHighlight();

    const html = editorContent.value.innerHTML;
    const newHtml = searchAndReplace(
      html,
      data.findText,
      data.replaceText,
      data.options,
      false
    );
    editorContent.value.innerHTML = newHtml;
    captureSnapshot();
  };

  /**
   * Replace all occurrences of text in the editor ("Replace All").
   * @param data - Replace all operation data
   */
  const handleReplaceAll = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    if (!editorContent.value) return;

    // Same as handleReplace: unwind any pending find highlight before the
    // innerHTML round-trip so it can't be baked into the replaced content.
    clearPendingHighlight();

    const html = editorContent.value.innerHTML;
    const newHtml = searchAndReplace(
      html,
      data.findText,
      data.replaceText,
      data.options,
      true
    );
    editorContent.value.innerHTML = newHtml;
    captureSnapshot();
  };

  return {
    handleFind,
    handleReplace,
    handleReplaceAll,
    searchAndReplace,
    clearPendingHighlight,
  };
}
