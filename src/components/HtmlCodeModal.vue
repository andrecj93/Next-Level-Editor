<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay"
        :class="theme"
        @click="handleOverlayClick"
      >
        <div
          class="modal-content html-code-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3>HTML Code</h3>
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
