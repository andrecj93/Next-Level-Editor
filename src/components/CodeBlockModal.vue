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
          ref="modalContent"
          class="modal-content code-block-modal"
          role="dialog"
          aria-labelledby="code-block-modal-title"
          aria-modal="true"
          @click.stop
        >
          <div class="modal-header">
            <h3 id="code-block-modal-title">Insert Code Block</h3>
            <button
              class="close-btn"
              aria-label="Close modal"
              @click="close"
            >
              ✕
            </button>
          </div>
          
          <div class="modal-body">
            <div class="input-group">
              <label for="language-select">Language</label>
              <select
                id="language-select"
                v-model="selectedLanguage"
                class="language-select"
              >
                <option
                  v-for="lang in languages"
                  :key="lang.value"
                  :value="lang.value"
                >
                  {{ lang.label }}
                </option>
              </select>
            </div>
            
            <div class="input-group">
              <label for="code-input">Code</label>
              <textarea
                id="code-input"
                ref="codeInput"
                v-model="code"
                class="code-textarea"
                placeholder="Paste your code here..."
                spellcheck="false"
                @keydown.tab.prevent="handleTab"
              />
            </div>
            
            <div
              v-if="code"
              class="preview-section"
            >
              <div class="preview-label">
                Preview:
              </div>
              <div class="code-preview">
                <pre><code
:class="`language-${selectedLanguage}`"
                           v-html="highlightedCode"
                /></pre>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button
              class="btn btn-cancel"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :disabled="!code"
              @click="insertCode"
            >
              Insert Code
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import Prism from 'prismjs'
import { useModalDialog } from '../composables/useModalDialog'
import 'prismjs/themes/prism-tomorrow.css'

// Import markup-templating (required for PHP and other template languages)
import 'prismjs/components/prism-markup-templating'

// Import common language support
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-bash'

interface Props {
  show: boolean
  theme?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'insert', data: { code: string; language: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'theme-light'
})
const emit = defineEmits<Emits>()

const codeInput = ref<HTMLTextAreaElement | null>(null)
const modalContent = ref<HTMLElement | null>(null)
const selectedLanguage = ref('javascript')
const code = ref('')

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.show,
  container: modalContent,
  // `close` (defined below) also clears the draft code, matching Cancel.
  onClose: () => close(),
  initialFocus: () => codeInput.value,
})

const languages = [
  { label: 'Plain Text', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSX', value: 'jsx' },
  { label: 'TSX', value: 'tsx' },
  { label: 'HTML', value: 'markup' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Bash', value: 'bash' },
]

const highlightedCode = computed(() => {
  if (!code.value) return ''
  
  try {
    const grammar = Prism.languages[selectedLanguage.value] || Prism.languages.plaintext
    return Prism.highlight(code.value, grammar, selectedLanguage.value)
  } catch {
    return code.value
  }
})

const close = () => {
  code.value = ''
  emit('close')
}

const handleOverlayClick = () => {
  close()
}

const handleTab = (e: KeyboardEvent) => {
  const textarea = e.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  code.value = code.value.substring(0, start) + '  ' + code.value.substring(end)
  
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2
  })
}

const insertCode = () => {
  if (!code.value) return
  
  emit('insert', {
    code: code.value,
    language: selectedLanguage.value
  })
  close()
}

</script>

<style scoped>
.code-block-modal {
  /* Cap the floor to the viewport (overlay has 20px padding per side) so the
     dialog — including the close ✕ and footer buttons — stays fully reachable
     on narrow/mobile screens instead of overflowing both edges. */
  min-width: min(600px, calc(100vw - 40px));
  max-width: 800px;
}

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

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.language-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.language-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.code-textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  background: var(--color-background);
  color: var(--color-text);
  font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.code-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.preview-section {
  margin-top: 24px;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.code-preview {
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.code-preview pre {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  overflow-x: auto;
}

.code-preview code {
  font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  /* Let the buttons stack rather than force the modal wider than tiny (320px)
     viewports. */
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.btn-cancel:hover {
  background: var(--color-border);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
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
</style>
