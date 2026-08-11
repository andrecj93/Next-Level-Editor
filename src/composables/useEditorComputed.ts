import { computed, type Ref, type ComputedRef } from "vue";
import { getWordCount, getCharacterCount } from "../utils/commands";

interface EditorComputedOptions {
  theme: Ref<"light" | "dark">;
  /** Reactive so changing the width/height prop re-styles the editor live. */
  width: Ref<string | undefined>;
  height: Ref<string | undefined>;
  editorContent: Ref<HTMLElement | null>;
  htmlContent: Ref<string>;
}

/**
 * Composable for editor computed properties
 * Manages derived state like theme class, editor styles, word count, etc.
 *
 * This composable used to also register a modelValue watcher and an autosave
 * watcher — both exact duplicates of the ones in useEditorContent, which meant
 * every keystroke paid for four full-document sanitize passes instead of two
 * and every external modelValue change was applied twice. The single source of
 * truth for content synchronization is useEditorContent.
 */
export function useEditorComputed(options: EditorComputedOptions) {
  const { theme, width, height, editorContent, htmlContent } = options;

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

  return {
    themeClass,
    editorStyles,
    wordCount,
    characterCount,
  };
}
