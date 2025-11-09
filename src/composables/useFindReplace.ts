import type { Ref } from "vue";

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
   * Search and replace text in HTML content
   */
  const searchAndReplace = (
    html: string,
    findText: string,
    replaceText: string,
    options: { caseSensitive: boolean; wholeWord: boolean }
  ): string => {
    let flags = "g";
    if (!options.caseSensitive) {
      flags += "i";
    }

    let pattern = findText;
    if (options.wholeWord) {
      pattern = `\\b${findText}\\b`;
    }

    // Escape special regex characters
    pattern = pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

    const regex = new RegExp(pattern, flags);
    return html.replace(regex, replaceText);
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

    // Using non-standard window.find() - widely supported but deprecated
    // Modern alternative would require manual text search and highlighting
    try {
      // @ts-expect-error - window.find is non-standard but widely supported
      globalThis.find(
        data.findText,
        false,
        data.direction === "previous",
        false,
        false,
        true,
        false
      );
    } catch (error) {
      console.warn("Find operation not supported in this browser:", error);
    }
  };

  /**
   * Replace text in the editor
   * @param data - Replace operation data
   */
  const handleReplace = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    if (!editorContent.value) return;

    const html = editorContent.value.innerHTML;
    const newHtml = searchAndReplace(
      html,
      data.findText,
      data.replaceText,
      data.options
    );
    editorContent.value.innerHTML = newHtml;
    captureSnapshot();
  };

  /**
   * Replace all occurrences of text in the editor
   * @param data - Replace all operation data
   */
  const handleReplaceAll = (data: {
    findText: string;
    replaceText: string;
    options: { caseSensitive: boolean; wholeWord: boolean };
  }) => {
    handleReplace(data);
  };

  return {
    handleFind,
    handleReplace,
    handleReplaceAll,
    searchAndReplace,
  };
}
