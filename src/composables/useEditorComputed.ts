import { computed, watch, nextTick, type Ref, type ComputedRef } from "vue";
import { getWordCount, getCharacterCount } from "../utils/commands";
import { useHtmlSanitizer } from "./useHtmlSanitizer";

interface EditorComputedOptions {
  theme: Ref<"light" | "dark">;
  width?: string;
  height?: string;
  modelValue: string;
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
    if (width) {
      styles.width = width;
    }
    if (height) {
      styles.height = height;
    }
    return styles;
  });

  /**
   * Computed word count from editor content
   */
  const wordCount: ComputedRef<number> = computed(() => {
    const content = htmlContent.value || editorContent.value?.innerHTML || "";
    return getWordCount(content);
  });

  /**
   * Computed character count from editor content
   */
  const characterCount: ComputedRef<number> = computed(() => {
    const content = htmlContent.value || editorContent.value?.innerHTML || "";
    return getCharacterCount(content);
  });

  /**
   * Watch modelValue changes and update editor content
   */
  watch(
    () => modelValue,
    (newValue) => {
      if (!editorContent.value) return;
      if (isApplyingHistory.value) return;

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
