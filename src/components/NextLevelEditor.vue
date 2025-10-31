<template>
  <div class="next-level-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          v-for="action in formatActions"
          :key="action.command"
          :class="['toolbar-btn', { active: isInlineStyleActive(action.command) }]"
          :title="action.title"
          :aria-pressed="isInlineStyleActive(action.command)"
          :aria-label="`${action.title}${isInlineStyleActive(action.command) ? ' (active)' : ''}`"
          @mousedown.prevent
          @click="execCommand(action.command, action.value)"
        >
          <span v-html="action.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          v-for="heading in headingActions"
          :key="heading.command"
          :class="['toolbar-btn', { active: isBlockActive(heading.tag) }]"
          :title="heading.title"
          :aria-pressed="isBlockActive(heading.tag)"
          :aria-label="`${heading.title}${isBlockActive(heading.tag) ? ' (active)' : ''}`"
          @mousedown.prevent
          @click="execCommand('formatBlock', heading.tag)"
        >
          <span v-html="heading.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          v-for="list in listActions"
          :key="list.command"
          :class="['toolbar-btn', { active: isListCommandActive(list.command) }]"
          :title="list.title"
          :aria-pressed="isListCommandActive(list.command)"
          :aria-label="`${list.title}${isListCommandActive(list.command) ? ' (active)' : ''}`"
          @mousedown.prevent
          @click="execCommand(list.command)"
        >
          <span v-html="list.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          title="Insert Link"
          @mousedown.prevent
          @click="insertLink"
        >
          <span v-html="'🔗'" />
        </button>
        <button
          class="toolbar-btn"
          title="Insert Image"
          @mousedown.prevent
          @click="insertImage"
        >
          <span v-html="'🖼️'" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          title="Clear Formatting"
          @mousedown.prevent
          @click="clearFormatting"
        >
          <span v-html="'🧹'" />
        </button>
      </div>
    </div>
    
    <div
      ref="editorContent"
      class="editor-content"
      contenteditable="true"
      :placeholder="placeholder"
      @input="onInput"
      @blur="onBlur"
      @focus="onFocus"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, reactive } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Start typing...'
})

const emit = defineEmits<Emits>()

const editorContent = ref<HTMLDivElement | null>(null)

const formatActions = [
  { command: 'bold', title: 'Bold (Ctrl+B)', icon: '<strong>B</strong>', value: undefined },
  { command: 'italic', title: 'Italic (Ctrl+I)', icon: '<em>I</em>', value: undefined },
  { command: 'underline', title: 'Underline (Ctrl+U)', icon: '<u>U</u>', value: undefined },
  { command: 'strikeThrough', title: 'Strikethrough', icon: '<s>S</s>', value: undefined }
]

const headingActions = [
  { command: 'formatBlock', tag: 'h1', title: 'Heading 1', icon: '<strong>H1</strong>' },
  { command: 'formatBlock', tag: 'h2', title: 'Heading 2', icon: '<strong>H2</strong>' },
  { command: 'formatBlock', tag: 'h3', title: 'Heading 3', icon: '<strong>H3</strong>' },
  { command: 'formatBlock', tag: 'p', title: 'Paragraph', icon: 'P' }
]

const listActions = [
  { command: 'insertUnorderedList', title: 'Bullet List', icon: '• List' },
  { command: 'insertOrderedList', title: 'Numbered List', icon: '1. List' }
]

type ListType = 'ordered' | 'unordered' | ''

const selectionState = reactive<{ block: string; inlineStyles: string[]; listType: ListType }>(
  {
    block: 'p',
    inlineStyles: [],
    listType: '',
  }
)

const updateSelectionState = () => {
  const selection = window.getSelection()
  const content = editorContent.value

  if (!selection || selection.rangeCount === 0 || !content) {
    selectionState.block = 'p'
    selectionState.inlineStyles = []
    selectionState.listType = ''
    return
  }

  const anchorNode = selection.anchorNode
  const anchorElement =
    anchorNode?.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : (anchorNode as HTMLElement | null)

  if (!anchorElement || !content.contains(anchorElement)) {
    selectionState.block = 'p'
    selectionState.inlineStyles = []
    selectionState.listType = ''
    return
  }

  const blockValue = document.queryCommandValue('formatBlock')
  selectionState.block = typeof blockValue === 'string'
    ? blockValue.replace(/[<>]/g, '').toLowerCase()
    : 'p'

  selectionState.inlineStyles = formatActions
    .filter((action) => document.queryCommandState(action.command))
    .map((action) => action.command)

  if (document.queryCommandState('insertOrderedList')) {
    selectionState.listType = 'ordered'
  } else if (document.queryCommandState('insertUnorderedList')) {
    selectionState.listType = 'unordered'
  } else {
    selectionState.listType = ''
  }
}

const execCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value)
  editorContent.value?.focus()
  updateSelectionState()
}

const isInlineStyleActive = (command: string) => selectionState.inlineStyles.includes(command)

const isBlockActive = (tag: string) => selectionState.block === tag

const isListCommandActive = (command: string) => {
  if (command === 'insertOrderedList') {
    return selectionState.listType === 'ordered'
  }

  if (command === 'insertUnorderedList') {
    return selectionState.listType === 'unordered'
  }

  return false
}

const insertLink = () => {
  const url = prompt('Enter the URL:')
  if (url) {
    execCommand('createLink', url)
  }
}

const insertImage = () => {
  const url = prompt('Enter the image URL:')
  if (url) {
    execCommand('insertImage', url)
  }
}

const clearFormatting = () => {
  execCommand('removeFormat')
}

const onInput = () => {
  if (editorContent.value) {
    emit('update:modelValue', editorContent.value.innerHTML)
  }
}

const onFocus = () => {
  emit('focus')
}

const onBlur = () => {
  emit('blur')
}

watch(() => props.modelValue, (newValue) => {
  if (editorContent.value && editorContent.value.innerHTML !== newValue) {
    editorContent.value.innerHTML = newValue
    updateSelectionState()
  }
})

onMounted(() => {
  if (editorContent.value && props.modelValue) {
    editorContent.value.innerHTML = props.modelValue
  }
  document.addEventListener('selectionchange', updateSelectionState)
  updateSelectionState()
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', updateSelectionState)
})
</script>

<style scoped>
.next-level-editor {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  padding-right: 8px;
  border-right: 1px solid #e0e0e0;
}

.toolbar-group:last-child {
  border-right: none;
}

.toolbar-btn {
  min-width: 36px;
  height: 36px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.toolbar-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.toolbar-btn.active:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.editor-content {
  min-height: 200px;
  max-height: 600px;
  overflow-y: auto;
  padding: 16px;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  outline: none;
}

.editor-content:empty:before {
  content: attr(placeholder);
  color: #999;
  pointer-events: none;
}

.editor-content:focus {
  outline: none;
}

/* Styling for content inside the editor */
.editor-content :deep(h1),
.editor-content :deep(h2),
.editor-content :deep(h3),
.editor-content :deep(h4),
.editor-content :deep(h5),
.editor-content :deep(h6) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.3;
}

.editor-content :deep(h1) {
  font-size: 2em;
}

.editor-content :deep(h2) {
  font-size: 1.5em;
}

.editor-content :deep(h3) {
  font-size: 1.25em;
}

.editor-content :deep(p) {
  margin: 8px 0;
}

.editor-content :deep(ul),
.editor-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.editor-content :deep(li) {
  margin: 4px 0;
}

.editor-content :deep(a) {
  color: #007bff;
  text-decoration: underline;
}

.editor-content :deep(a):hover {
  color: #0056b3;
}

.editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
  border-radius: 4px;
}

.editor-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.editor-content :deep(blockquote) {
  border-left: 4px solid #007bff;
  margin: 12px 0;
  padding-left: 16px;
  color: #666;
  font-style: italic;
}
</style>
