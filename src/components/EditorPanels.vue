<template>
  <div :class="['editor-container', `view-mode-${viewMode}`]">
    <!-- WYSIWYG Editor Panel (editor mode) -->
    <!--
      @compositionend re-emits as 'input': the host's onInput skips mutating
      passes while event.isComposing (IME safety), so it needs one deferred
      run once the composition commits — a compositionend event carries no
      isComposing=true flag, letting it through the host guard.
    -->
    <div v-if="viewMode === 'editor'" class="editor-panel">
      <div
        ref="editorRef"
        class="editor-content"
        :contenteditable="editable ? 'true' : 'false'"
        :placeholder="placeholder"
        @input="$emit('input', $event)"
        @compositionend="$emit('input', $event)"
        @paste="$emit('paste', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @mousedown="$emit('mousedown', $event)"
        @mouseup="$emit('mouseup', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </div>

    <!-- Code Editor Panel (code/split view) -->
    <div
      v-if="viewMode === 'code' || viewMode === 'split'"
      class="editor-panel"
    >
      <!-- Code editor (textarea) for code/split view -->
      <textarea
        ref="codeEditorRef"
        class="code-editor"
        :value="codeContent"
        :readonly="!editable"
        spellcheck="false"
        @input="$emit('code-input', $event)"
        @blur="$emit('code-blur', $event)"
      />

      <!-- Hidden WYSIWYG editor to maintain functionality -->
      <div
        ref="editorRef"
        class="editor-content"
        :contenteditable="editable ? 'true' : 'false'"
        :placeholder="placeholder"
        style="display: none"
        @input="$emit('input', $event)"
        @compositionend="$emit('input', $event)"
        @paste="$emit('paste', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @mousedown="$emit('mousedown', $event)"
        @mouseup="$emit('mouseup', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </div>

    <div v-if="viewMode === 'split'" class="split-divider" />

    <!-- Right panel in split view - toggle between Preview and Editor -->
    <div v-if="viewMode === 'split'" class="split-right-panel">
      <!-- Toggle buttons -->
      <div class="split-panel-toggle">
        <button
          :class="[
            'split-toggle-btn',
            { active: splitRightMode === 'preview' },
          ]"
          @click="$emit('split-right-mode-change', 'preview')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 5h12M2 8h12M2 11h12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Preview
        </button>
        <button
          :class="['split-toggle-btn', { active: splitRightMode === 'editor' }]"
          @click="$emit('split-right-mode-change', 'editor')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3h10M3 6h10M3 9h10M3 12h10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Editor
        </button>
      </div>

      <!-- Preview mode -->
      <div v-if="splitRightMode === 'preview'" class="preview-panel">
        <div
          class="preview-content-wrapper"
          v-html="
            htmlContent ||
            '<p class=\'empty-preview\'>Start typing to see preview...</p>'
          "
        />
      </div>

      <!-- Editor mode -->
      <div v-if="splitRightMode === 'editor'" class="split-editor-panel">
        <div
          ref="splitEditorRef"
          class="editor-content"
          contenteditable="true"
          :placeholder="placeholder"
          @input="$emit('split-editor-input', $event)"
          @compositionend="$emit('split-editor-input', $event)"
          @paste="$emit('paste', $event)"
          @blur="$emit('blur', $event)"
          @focus="$emit('focus', $event)"
          @mousedown="$emit('mousedown', $event)"
          @mouseup="$emit('mouseup', $event)"
          @contextmenu="$emit('contextmenu', $event)"
        />
      </div>
    </div>

    <!-- Preview Panel (standalone preview mode) -->
    <div v-if="viewMode === 'preview'" class="preview-panel">
      <div class="preview-header">Preview</div>
      <div
        class="preview-content-wrapper"
        v-html="
          htmlContent ||
          '<p class=\'empty-preview\'>Start typing to see preview...</p>'
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  viewMode: "editor" | "code" | "split" | "preview";
  placeholder?: string;
  codeContent?: string;
  htmlContent?: string;
  splitRightMode?: "preview" | "editor";
  /** When false, the editing surfaces are contenteditable=false / readonly. */
  editable?: boolean;
}

withDefaults(defineProps<Props>(), {
  placeholder: "Start typing...",
  codeContent: "",
  htmlContent: "",
  splitRightMode: "preview",
  editable: true,
});

defineEmits<{
  input: [event: Event];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
  mousedown: [event: MouseEvent];
  mouseup: [event: MouseEvent];
  contextmenu: [event: MouseEvent];
  paste: [event: ClipboardEvent];
  "code-input": [event: Event];
  "code-blur": [event: FocusEvent];
  "split-right-mode-change": [mode: "preview" | "editor"];
  "split-editor-input": [event: Event];
}>();

const editorRef = ref<HTMLDivElement>();
const codeEditorRef = ref<HTMLTextAreaElement>();
const splitEditorRef = ref<HTMLDivElement>();

defineExpose({
  editorRef,
  codeEditorRef,
  splitEditorRef,
});
</script>

<style scoped>
.split-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.split-panel-toggle {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--editor-bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.split-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.split-toggle-btn:hover {
  background: white;
  border-color: #3b82f6;
  color: #3b82f6;
}

.split-toggle-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}

.split-toggle-btn svg {
  width: 16px;
  height: 16px;
}

.split-editor-panel {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.split-editor-panel .editor-content {
  min-height: 100%;
  outline: none;
}
</style>
