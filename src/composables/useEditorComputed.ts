import { computed, watch, nextTick, type Ref, type ComputedRef } from "vue";
import { getTextStatistics } from "../utils/commands";
import { useHtmlSanitizer } from "./useHtmlSanitizer";

interface EditorComputedOptions {
  theme: Ref<"light" | "dark">;
  /** Reactive so changing the width/height prop re-styles the editor live. */
  width: Ref<string | undefined>;
  height: Ref<string | undefined>;
  modelValue: Ref<string>;
  editorContent: Ref<HTMLElement | null>;
  htmlContent: Ref<string>;
  isApplyingHistory: Ref<boolean>;
  applySanitizedContent: (content: string) => void;
  captureSnapshot: (addToHistory?: boolean) => void;
  triggerAutoSave: (content: string) => void;
}

/**
 * Composable for editor computed properties and watchers
 * Manages derived state like theme class, editor styles, word count, etc.
 */
export function useEditorComputed(options: EditorComputedOptions) {
  const {
    theme,
    width,
    height,
    modelValue,
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
  } = options;

  const { sanitizeHtml } = useHtmlSanitizer();

  /**
   * Computed theme class for styling
   */
  const themeClass: ComputedRef<string> = computed(() =>
    theme.value === "dark" ? "theme-dark" : "theme-light"
  );

  /**
   * Computed editor styles for width and height
   */
  const editorStyles: ComputedRef<Record<string, string>> = computed(() => {
    const styles: Record<string, string> = {};
    if (width.value) {
      styles.width = width.value;
    }
    if (height.value) {
      styles.height = height.value;
    }
    return styles;
  });

  /**
   * Computed word count from editor content
   */
  const textStatistics = computed(() => {
    const content = htmlContent.value || editorContent.value?.innerHTML || "";
    const root = editorContent.value;
    // Ordinary input has already produced this DOM. Read it without cloning
    // it; source/preview and externally changed HTML still use the string.
    return getTextStatistics(content, root && root.innerHTML === content ? root : undefined);
  });
  const wordCount: ComputedRef<number> = computed(() => textStatistics.value.wordCount);

  /**
   * Computed character count from editor content
   */
  const characterCount: ComputedRef<number> = computed(() => textStatistics.value.characterCount);

  /**
   * Watch modelValue changes and update editor content
   */
  watch(
    modelValue,
    (newValue) => {
      if (!editorContent.value) return;
      if (isApplyingHistory.value) return;

      // A host's exact v-model echo needs no DOM reconciliation. Changed input
      // still goes through the sanitized comparison and ingestion path below.
      if (newValue === editorContent.value.innerHTML) return;

      // Compare sanitized versions to avoid unnecessary innerHTML updates that destroy cursor position
      const currentSanitized = sanitizeHtml(editorContent.value.innerHTML);
      const newSanitized = sanitizeHtml(newValue);

      if (currentSanitized !== newSanitized) {
        isApplyingHistory.value = true;
        applySanitizedContent(newValue);
        htmlContent.value = newValue; // Update stored HTML
        nextTick(() => {
          isApplyingHistory.value = false;
          captureSnapshot(false);
        });
      }
    },
    { immediate: true }
  );

  /**
   * Watch for content changes and trigger auto-save
   */
  watch(
    () => editorContent.value?.innerHTML,
    (newContent) => {
      if (newContent && !isApplyingHistory.value) {
        triggerAutoSave(newContent);
      }
    }
  );

  return {
    themeClass,
    editorStyles,
    wordCount,
    characterCount,
  };
}
