import type { Ref } from "vue";

interface TemplateManagerOptions {
  editorContent: Ref<HTMLElement | null>;
  captureSnapshot: () => void;
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
  const { editorContent, captureSnapshot } = options;

  /**
   * Apply a template to the editor
   * @param template - The template object to apply
   */
  const handleSelectTemplate = (template: Template) => {
    if (!editorContent.value) return;

    editorContent.value.innerHTML = template.content;
    captureSnapshot();
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
