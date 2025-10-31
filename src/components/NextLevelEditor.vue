<template>
  <div class="next-level-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          v-for="action in formatActions"
          :key="action.command"
          :class="['toolbar-btn', { active: isActive(action.command) }]"
          :title="action.title"
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
          :class="['toolbar-btn', { active: isActive(heading.tag) }]"
          :title="heading.title"
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
          :class="['toolbar-btn', { active: isActive(list.command) }]"
          :title="list.title"
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
import { ref, watch, onMounted } from 'vue'

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

const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'EM',
  'H1',
  'H2',
  'H3',
  'HR',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRONG',
  'SUB',
  'SUP',
  'U',
  'UL'
])

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['title'])

const UNWRAP_TAGS = new Set(['DIV'])

const ELEMENT_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target', 'title']),
  img: new Set(['alt', 'src', 'title'])
}

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|tel):|\/\/|\/|#)/i
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:[a-z0-9.+-]+);base64,/i

const sanitizeHtml = (input?: string | null): string => {
  const value = input ?? ''

  if (!value.trim()) {
    return ''
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return value
  }

  const workingDocument = document.implementation.createHTMLDocument('sanitizer')
  workingDocument.body.innerHTML = value

  const sanitizeTree = (root: HTMLElement) => {
    let child: ChildNode | null = root.firstChild

    while (child) {
      const next = child.nextSibling

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement

        if (!ALLOWED_TAGS.has(element.tagName)) {
          if (UNWRAP_TAGS.has(element.tagName)) {
            unwrapElement(element)
          } else {
            element.remove()
          }
        } else {
          sanitizeAttributes(element)
          sanitizeTree(element)
        }
      }

      child = next
    }
  }

  const sanitizeAttributes = (element: HTMLElement) => {
    const allowed = new Set(GLOBAL_ALLOWED_ATTRIBUTES)
    const elementSpecific = ELEMENT_ALLOWED_ATTRIBUTES[element.tagName.toLowerCase()]

    if (elementSpecific) {
      elementSpecific.forEach((attr) => allowed.add(attr))
    }

    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase()

      if (!allowed.has(attributeName)) {
        element.removeAttribute(attribute.name)
        return
      }

      const attributeValue = attribute.value.trim()

      if (attributeName === 'href') {
        if (!SAFE_URL_PATTERN.test(attributeValue)) {
          element.removeAttribute(attribute.name)
        }
      } else if (attributeName === 'src') {
        if (!SAFE_URL_PATTERN.test(attributeValue) && !SAFE_DATA_IMAGE_PATTERN.test(attributeValue)) {
          element.removeAttribute(attribute.name)
        }
      } else if (attributeName === 'target') {
        if (attributeValue !== '_blank' && attributeValue !== '_self') {
          element.setAttribute(attribute.name, '_self')
        }
      }
    })

    if (element.tagName === 'A') {
      if (element.hasAttribute('href')) {
        const rel = element.getAttribute('rel') ?? ''
        const relTokens = new Set(rel.split(/\s+/).filter(Boolean))
        relTokens.add('noopener')
        relTokens.add('noreferrer')
        element.setAttribute('rel', Array.from(relTokens).join(' '))
      } else {
        element.removeAttribute('target')
        element.removeAttribute('rel')
      }
    }
  }

  const unwrapElement = (element: HTMLElement) => {
    const parent = element.parentNode

    if (!parent) {
      return
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element)
    }

    parent.removeChild(element)
  }

  const wrapOrphanTextNodes = (root: HTMLElement) => {
    const nodes = Array.from(root.childNodes)

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent ?? ''

        if (!textContent.trim()) {
          root.removeChild(node)
          return
        }

        const paragraph = workingDocument.createElement('p')
        paragraph.textContent = textContent.trim()
        root.replaceChild(paragraph, node)
      }
    })
  }

  const convertDivsToParagraphs = (root: HTMLElement) => {
    const divs = Array.from(root.querySelectorAll('div'))

    divs.forEach((div) => {
      const paragraph = workingDocument.createElement('p')

      while (div.firstChild) {
        paragraph.appendChild(div.firstChild)
      }

      if (!paragraph.innerHTML.trim()) {
        paragraph.innerHTML = '<br>'
      }

      div.replaceWith(paragraph)
    })
  }

  const normalizeLists = (root: HTMLElement) => {
    const lists = Array.from(root.querySelectorAll('ul, ol'))

    lists.forEach((list) => {
      const children = Array.from(list.childNodes)

      children.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const textContent = child.textContent?.trim() ?? ''

          if (textContent) {
            const listItem = workingDocument.createElement('li')
            listItem.textContent = textContent
            list.replaceChild(listItem, child)
          } else {
            list.removeChild(child)
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as HTMLElement

          if (childElement.tagName !== 'LI') {
            const listItem = workingDocument.createElement('li')
            childElement.replaceWith(listItem)
            listItem.appendChild(childElement)
          }
        }
      })

      Array.from(list.querySelectorAll('li')).forEach((listItem) => {
        if (!listItem.innerHTML.trim()) {
          listItem.innerHTML = '<br>'
        }
      })
    })
  }

  const ensureBlockLineBreaks = (root: HTMLElement) => {
    const blocks = root.querySelectorAll('p, li')

    blocks.forEach((block) => {
      if (!block.innerHTML.trim()) {
        block.innerHTML = '<br>'
      }
    })
  }

  sanitizeTree(workingDocument.body)
  wrapOrphanTextNodes(workingDocument.body)
  convertDivsToParagraphs(workingDocument.body)
  normalizeLists(workingDocument.body)
  ensureBlockLineBreaks(workingDocument.body)
  workingDocument.body.normalize()

  return workingDocument.body.innerHTML
}

const applySanitizedContent = (value?: string | null) => {
  const sanitized = sanitizeHtml(value)

  if (sanitized !== (value ?? '')) {
    emit('update:modelValue', sanitized)
  }

  if (editorContent.value && editorContent.value.innerHTML !== sanitized) {
    editorContent.value.innerHTML = sanitized
  }
}

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

const execCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value)
  editorContent.value?.focus()
}

const isActive = (command: string): boolean => {
  return document.queryCommandState(command)
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
  if (!editorContent.value) {
    return
  }

  const sanitized = sanitizeHtml(editorContent.value.innerHTML)
  emit('update:modelValue', sanitized)
}

const onFocus = () => {
  emit('focus')
}

const onBlur = () => {
  emit('blur')
}

watch(
  () => props.modelValue,
  (newValue) => {
    applySanitizedContent(newValue)
  }
)

onMounted(() => {
  applySanitizedContent(props.modelValue)
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
