<template>
  <div :class="['editor-container', `view-mode-${viewMode}`]">
    <!-- WYSIWYG Editor Panel (editor mode) -->
    <div
      v-if="viewMode === 'editor'"
      class="editor-panel"
    >
      <div
        ref="editorRef"
        class="editor-content"
        contenteditable="true"
        :placeholder="placeholder"
        @input="$emit('input', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
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
        spellcheck="false"
        @input="$emit('code-input', $event)"
        @blur="$emit('code-blur', $event)"
      />
      
      <!-- Hidden WYSIWYG editor to maintain functionality -->
      <div
        ref="editorRef"
        class="editor-content"
        contenteditable="true"
        :placeholder="placeholder"
        style="display: none;"
        @input="$emit('input', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @mouseup="$emit('mouseup', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </div>

    <div
      v-if="viewMode === 'split'"
      class="split-divider"
    />

    <div
      v-if="viewMode === 'preview' || viewMode === 'split'"
      class="preview-panel"
    >
      <div class="preview-header">
        Preview
      </div>
      <div
        class="preview-content-wrapper"
        v-html="htmlContent || '<p class=\'empty-preview\'>Start typing to see preview...</p>'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  viewMode: 'editor' | 'code' | 'split' | 'preview'
  placeholder?: string
  codeContent?: string
  htmlContent?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Start typing...',
  codeContent: '',
  htmlContent: '',
})

defineEmits<{
  input: [event: Event]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  mouseup: [event: MouseEvent]
  contextmenu: [event: MouseEvent]
  'code-input': [event: Event]
  'code-blur': [event: FocusEvent]
}>()

const editorRef = ref<HTMLDivElement>()
const codeEditorRef = ref<HTMLTextAreaElement>()

defineExpose({
  editorRef,
  codeEditorRef,
})
</script>
