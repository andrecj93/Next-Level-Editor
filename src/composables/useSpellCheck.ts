import type { Ref } from "vue";
import {
  enableSpellCheck as enableSpellCheckUtil,
  toggleSpellCheck as toggleSpellCheckUtil,
} from "../utils/spellChecker";

interface SpellCheckOptions {
  editorContent: Ref<HTMLElement | null>;
  spellCheckEnabled: Ref<boolean>;
}

/**
 * Composable for spell check functionality
 * Provides spell check enable/disable and toggle operations
 */
export function useSpellCheck(options: SpellCheckOptions) {
  const { editorContent, spellCheckEnabled } = options;

  /**
   * Enable spell check on the editor
   */
  const enableSpellCheck = () => {
    if (!editorContent.value) return;
    enableSpellCheckUtil(editorContent.value);
    spellCheckEnabled.value = true;
  };

  /**
   * Toggle spell check on/off
   */
  const handleToggleSpellCheck = () => {
    if (!editorContent.value) return;
    const newState = toggleSpellCheckUtil(editorContent.value);
    spellCheckEnabled.value = newState;
  };

  /**
   * Disable spell check on the editor
   */
  const disableSpellCheck = () => {
    if (!editorContent.value) return;
    editorContent.value.setAttribute("spellcheck", "false");
    spellCheckEnabled.value = false;
  };

  return {
    enableSpellCheck,
    handleToggleSpellCheck,
    disableSpellCheck,
    spellCheckEnabled,
  };
}
