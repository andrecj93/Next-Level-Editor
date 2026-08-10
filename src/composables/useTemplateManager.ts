import type { Ref } from "vue";

interface TemplateManagerOptions {
  editorContent: Ref<HTMLElement | null>;
  captureSnapshot: () => void;
  /**
   * Sanitize a template's HTML before it reaches the DOM. Template content can
   * be host- or plugin-supplied, and assigning it to innerHTML raw executed
   * any `<img onerror=…>` it carried — bypassing the sanitizer that guards
   * every other ingestion path. Optional for back-compat; always wire it.
   */
  sanitize?: (html: string) => string;
  /**
   * Run after the document has been replaced, so the host can re-bind comment
   * highlights and embeds, refresh the writing stats and re-sync the code pane
   * — the same contract useEditorContent and useFindReplace already expose.
   */
  onContentReplaced?: () => void;
}

interface Template {
  content: string;
  name?: string;
  description?: string;
}

/**
 * Composable for template management functionality
 * Provides template selection and application to the editor
 */
export function useTemplateManager(options: TemplateManagerOptions) {
  const { editorContent, captureSnapshot, sanitize, onContentReplaced } =
    options;

  /**
   * Apply a template to the editor
   * @param template - The template object to apply
   */
  const handleSelectTemplate = (template: Template) => {
    if (!editorContent.value) return;

    editorContent.value.innerHTML = sanitize
      ? sanitize(template.content)
      : template.content;
    captureSnapshot();
    // A template REPLACES the whole document, so it owes the same contract as
    // undo/redo, a model load and Replace All. Skipping it left the writing
    // stats reporting the replaced document and — in code/split view — the
    // textarea showing the OLD html, which the next keystroke wrote straight
    // back over the template. #R23-34 #R23-43 #R23-44
    onContentReplaced?.();
  };

  /**
   * Get current editor content as a template
   */
  const getCurrentAsTemplate = (): Template | null => {
    if (!editorContent.value) return null;

    return {
      content: editorContent.value.innerHTML,
    };
  };

  /**
   * Clear editor and apply blank template
   */
  const applyBlankTemplate = () => {
    if (!editorContent.value) return;

    editorContent.value.innerHTML = "";
    captureSnapshot();
  };

  return {
    handleSelectTemplate,
    getCurrentAsTemplate,
    applyBlankTemplate,
  };
}
