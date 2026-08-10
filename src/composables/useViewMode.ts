import { ref, watch, nextTick, type Ref } from "vue";
import { formatHtml } from "../utils/export";
import { initializeEmbeddedElements } from "../utils/embeddedResizable";

interface ViewModeOptions {
  editorContent: Ref<HTMLElement | null>;
  htmlContent: Ref<string>;
  codeContent: Ref<string>;
  /**
   * Optionally supply the viewMode ref instead of creating one here — lets the
   * host declare it early (e.g. so an active-editable computed can close over
   * it before this composable is initialized).
   */
  viewModeRef?: Ref<"editor" | "code" | "split" | "preview">;
}

/**
 * Composable for managing editor view modes (editor, code, split, preview)
 * Handles mode switching and content synchronization between modes
 */
export function useViewMode(options: ViewModeOptions) {
  const { editorContent, htmlContent, codeContent } = options;

  const viewMode =
    options.viewModeRef ??
    ref<"editor" | "code" | "split" | "preview">("editor");

  /**
   * Restore editor content from stored HTML if empty
   */
  const restoreEditorContent = () => {
    if (
      editorContent.value &&
      !editorContent.value.innerHTML.trim() &&
      htmlContent.value
    ) {
      editorContent.value.innerHTML = htmlContent.value;
      // A view-mode switch unmounts one editable surface and mounts a fresh one,
      // so these are brand-new element instances: without re-initializing, an
      // embed rendered fine but was dead (no selection, no handles, no
      // Delete/resize) until a reload. The WeakSet is keyed by instance, so this
      // can't double-bind existing nodes.
      initializeEmbeddedElements(editorContent.value);
    }
  };

  /**
   * Sync code editor with current HTML content
   */
  const syncCodeEditor = () => {
    if (!editorContent.value) return;
    const currentHtml =
      editorContent.value.innerHTML || htmlContent.value || "";
    codeContent.value = formatHtml(currentHtml);
  };

  /**
   * Save current editor content to htmlContent
   */
  const saveEditorContent = () => {
    if (editorContent.value) {
      htmlContent.value = editorContent.value.innerHTML;
    }
  };

  /**
   * Handle switching to editor mode
   */
  const handleSwitchToEditor = (oldMode: string) => {
    if (!editorContent.value) return;
    if (oldMode === "preview" || oldMode === "code" || oldMode === "split") {
      restoreEditorContent();
    }
  };

  /**
   * Handle switching to code/split mode
   */
  const handleSwitchToCode = (oldMode: string) => {
    if (!editorContent.value) return;
    if (oldMode === "preview" || oldMode === "editor") {
      restoreEditorContent();
    }
    syncCodeEditor();
  };

  // Watch viewMode changes to restore content when switching between modes
  watch(viewMode, (newMode, oldMode) => {
    // Handle content restoration and synchronization when switching view modes
    nextTick(() => {
      if (newMode === "editor") {
        handleSwitchToEditor(oldMode);
      } else if (newMode === "code" || newMode === "split") {
        handleSwitchToCode(oldMode);
      } else if (newMode === "preview") {
        saveEditorContent();
      }
    });
  });

  return {
    viewMode,
    restoreEditorContent,
    syncCodeEditor,
    saveEditorContent,
  };
}
