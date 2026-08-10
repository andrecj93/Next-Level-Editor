<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay nle-chrome"
        :class="theme"
        @click="handleOverlayClick"
      >
        <div
          ref="modalContent"
          class="modal-content html-code-modal"
          role="dialog"
          aria-labelledby="html-code-modal-title"
          aria-modal="true"
          @click.stop
        >
          <div class="modal-header">
            <h3 id="html-code-modal-title">HTML Code</h3>
            <button
              class="close-btn"
              aria-label="Close modal"
              @click="close"
            >
              ✕
            </button>
          </div>

          <div class="modal-body">
            <div class="code-section">
              <div class="code-header">
                <span class="code-label">Formatted HTML Code:</span>
                <button
                  class="btn btn-copy"
                  @click="copyToClipboard"
                >
                  {{ copyButtonText }}
                </button>
              </div>
              <div class="code-display">
                <pre><code
                  class="language-html"
                  v-html="highlightedHtml"
                /></pre>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="btn btn-primary"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Prism from "prismjs";
import { useModalDialog } from "../composables/useModalDialog";
import "prismjs/themes/prism-tomorrow.css";
// Import markup-templating first (required for template languages in HTML)
import "prismjs/components/prism-markup-templating";
// Import markup language for HTML syntax highlighting
import "prismjs/components/prism-markup";

interface Props {
  show: boolean;
  htmlContent: string;
  theme?: string;
}

type Emits = (e: "close") => void;

const props = withDefaults(defineProps<Props>(), {
  theme: "theme-light",
});
const emit = defineEmits<Emits>();

const copyButtonText = ref("📋 Copy");
const modalContent = ref<HTMLElement | null>(null);

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.show,
  container: modalContent,
  onClose: () => emit("close"),
});

const highlightedHtml = computed(() => {
  if (!props.htmlContent) return "";
  try {
    // HTML highlighting is provided through the markup language in Prism.js
    if (Prism.languages.markup) {
      return Prism.highlight(
        props.htmlContent,
        Prism.languages.markup,
        "markup"
      );
    } else {
      // Fallback: return escaped HTML for display
      return props.htmlContent.replace("<", "&lt;").replace(">", "&gt;");
    }
  } catch (error) {
    console.error("Failed to highlight HTML:", error);
    // Fallback: return escaped HTML for display
    return props.htmlContent.replace("<", "&lt;").replace(">", "&gt;");
  }
});

const close = () => {
  emit("close");
};

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close();
  }
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.htmlContent);
    copyButtonText.value = "✓ Copied!";
    setTimeout(() => {
      copyButtonText.value = "📋 Copy";
    }, 2000);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    copyButtonText.value = "✗ Failed";
    setTimeout(() => {
      copyButtonText.value = "📋 Copy";
    }, 2000);
  }
};

// Reset copy button text when modal is closed
watch(
  () => props.show,
  (newShow) => {
    if (!newShow) {
      copyButtonText.value = "📋 Copy";
    }
  }
);
</script>

<style scoped>
/* Dialog skeleton. Every sibling modal defines its own scoped
   .modal-overlay/.modal-content/.modal-header block and there is no global
   modal stylesheet — this file shipped WITHOUT one, so the teleported
   "HTML Code" dialog rendered as an unstyled block at the end of <body>.
   Mirrors CodeBlockModal (tokens are global, so the theme class bound on
   the overlay root flips them for dark mode). */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay-backdrop);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10050; /* above floating panels/FABs (9998-9999) */
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast, 150ms) ease;
}

.close-btn:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 150ms) ease;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
}

.html-code-modal {
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.code-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 14px;
}

.btn-copy {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-copy:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-copy:active {
  transform: translateY(0);
}

.code-display {
  flex: 1;
  overflow: auto;
  /* Fixed dark code viewer: pairs with the Prism "tomorrow" theme whose
     token colors are light-on-dark, so this surface stays dark in both themes. */
  background: #2d2d2d;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--color-border);
}

.code-display pre {
  margin: 0;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
    monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-display code {
  display: block;
  color: #f8f8f2;
}
</style>
