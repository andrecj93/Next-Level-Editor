<template>
  <div class="next-level-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          v-for="action in formatActions"
          :key="action.key"
          :class="['toolbar-btn', { active: isInlineActionActive(action) }]"
          :title="action.title"
          @mousedown.prevent="rememberSelection"
          @click="handleInlineAction(action)"
        >
          <span v-html="action.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          v-for="heading in headingActions"
          :key="heading.key"
          :class="['toolbar-btn', { active: isBlockActionActive(heading) }]"
          :title="heading.title"
          @mousedown.prevent="rememberSelection"
          @click="handleHeadingAction(heading)"
        >
          <span v-html="heading.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          v-for="list in listActions"
          :key="list.key"
          :class="['toolbar-btn', { active: isListActionActive(list) }]"
          :title="list.title"
          @mousedown.prevent="rememberSelection"
          @click="handleListAction(list)"
        >
          <span v-html="list.icon" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          title="Insert Link"
          @mousedown.prevent="rememberSelection"
          @click="insertLink"
        >
          <span v-html="'🔗'" />
        </button>
        <button
          class="toolbar-btn"
          title="Insert Image"
          @mousedown.prevent="rememberSelection"
          @click="insertImage"
        >
          <span v-html="'🖼️'" />
        </button>
      </div>
      
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          title="Clear Formatting"
          @mousedown.prevent="rememberSelection"
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
import { ref, watch, onMounted } from 'vue'
import {
  applyInlineStyle,
  clearFormatting as clearFormattingUtil,
  insertImage as insertImageUtil,
  insertLink as insertLinkUtil,
  isBlockActive,
  isInlineStyleActive,
  isListActive,
  restoreSelection,
  saveSelection,
  toggleBlock,
  toggleList,
} from '../utils/formatting'

interface Props {
  modelValue?: string
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

interface InlineAction {
  key: string
  title: string
  icon: string
  tag: string
}

interface HeadingAction {
  key: string
  title: string
  icon: string
  tag: string
  fallback?: string
}

interface ListAction {
  key: string
  title: string
  icon: string
  tag: 'ul' | 'ol'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Start typing...'
})

const emit = defineEmits<Emits>()

const editorContent = ref<HTMLDivElement | null>(null)
const savedRange = ref<Range | null>(null)

const formatActions: InlineAction[] = [
  { key: 'bold', title: 'Bold (Ctrl+B)', icon: '<strong>B</strong>', tag: 'strong' },
  { key: 'italic', title: 'Italic (Ctrl+I)', icon: '<em>I</em>', tag: 'em' },
  { key: 'underline', title: 'Underline (Ctrl+U)', icon: '<u>U</u>', tag: 'u' },
  { key: 'strikeThrough', title: 'Strikethrough', icon: '<s>S</s>', tag: 's' }
]

const headingActions: HeadingAction[] = [
  { key: 'h1', tag: 'h1', title: 'Heading 1', icon: '<strong>H1</strong>', fallback: 'p' },
  { key: 'h2', tag: 'h2', title: 'Heading 2', icon: '<strong>H2</strong>', fallback: 'p' },
  { key: 'h3', tag: 'h3', title: 'Heading 3', icon: '<strong>H3</strong>', fallback: 'p' },
  { key: 'p', tag: 'p', title: 'Paragraph', icon: 'P', fallback: 'p' }
]

const listActions: ListAction[] = [
  { key: 'unordered', title: 'Bullet List', icon: '• List', tag: 'ul' },
  { key: 'ordered', title: 'Numbered List', icon: '1. List', tag: 'ol' }
]

const rememberSelection = () => {
  savedRange.value = saveSelection()
}

const performWithSelection = (action: (root: HTMLElement) => void) => {
  const root = editorContent.value
  if (!root) return

  if (savedRange.value) {
    restoreSelection(savedRange.value)
  }

  try {
    action(root)
  } catch (error) {
    console.warn('Formatting action failed', error)
  }

  savedRange.value = saveSelection()
  root.focus()
  emit('update:modelValue', root.innerHTML)
}

const handleInlineAction = (action: InlineAction) => {
  performWithSelection((root) => applyInlineStyle(root, action.tag))
}

const handleHeadingAction = (action: HeadingAction) => {
  performWithSelection((root) => toggleBlock(root, action.tag, action.fallback))
}

const handleListAction = (action: ListAction) => {
  performWithSelection((root) => toggleList(root, action.tag))
}

const insertLink = () => {
  const url = prompt('Enter the URL:')
  if (url) {
    performWithSelection((root) => insertLinkUtil(root, url))
  }
}

const insertImage = () => {
  const url = prompt('Enter the image URL:')
  if (url) {
    performWithSelection((root) => insertImageUtil(root, url))
  }
}

const clearFormatting = () => {
  performWithSelection((root) => clearFormattingUtil(root))
}

const isInlineActionActive = (action: InlineAction): boolean => {
  if (!editorContent.value) return false
  return isInlineStyleActive(editorContent.value, action.tag)
}

const isBlockActionActive = (action: HeadingAction): boolean => {
  if (!editorContent.value) return false
  return isBlockActive(editorContent.value, action.tag)
}

const isListActionActive = (action: ListAction): boolean => {
  if (!editorContent.value) return false
  return isListActive(editorContent.value, action.tag)
}

const onInput = () => {
  if (editorContent.value) {
    emit('update:modelValue', editorContent.value.innerHTML)
  }
}

const onFocus = () => {
  savedRange.value = saveSelection()
  emit('focus')
}

const onBlur = () => {
  emit('blur')
}

watch(() => props.modelValue, (newValue) => {
  if (editorContent.value && editorContent.value.innerHTML !== newValue) {
    editorContent.value.innerHTML = newValue
  }
})

onMounted(() => {
  if (editorContent.value && props.modelValue) {
    editorContent.value.innerHTML = props.modelValue
  }
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
