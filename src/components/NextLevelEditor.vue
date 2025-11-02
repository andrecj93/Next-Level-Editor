<template>
  <div :class="['next-level-editor', themeClass, { fullscreen: isFullScreen }]">
    <!-- Modern Horizontal Toolbar -->
    <div class="editor-toolbar-modern">
      <!-- Format Dropdown -->
      <ToolbarDropdown
        label="Format"
        icon="¶"
        tooltip="Paragraph format"
        :items="formatDropdownItems"
      />

      <!-- Text Formatting (Inline Buttons) -->
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <button
          v-for="action in inlineFormatActions"
          :key="action.id"
          :class="['toolbar-btn-modern', { active: action.isActive?.() }]"
          :data-tooltip="action.tooltip"
          :aria-label="action.label"
          :aria-pressed="action.isActive?.() || false"
          @mousedown.prevent="rememberSelection"
          @click="action.onClick"
        >
          <span v-html="action.icon" />
        </button>
      </div>

      <!-- Alignment Dropdown -->
      <div class="toolbar-divider" />
      <ToolbarDropdown
        label="Align"
        icon="☰"
        tooltip="Text alignment"
        :items="alignmentDropdownItems"
      />

      <!-- Lists (Inline Buttons) -->
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <button
          v-for="action in listActions"
          :key="action.id"
          :class="['toolbar-btn-modern', { active: action.isActive?.() }]"
          :data-tooltip="action.tooltip"
          :aria-label="action.label"
          :aria-pressed="action.isActive?.() || false"
          @mousedown.prevent="rememberSelection"
          @click="action.onClick"
        >
          <span v-html="action.icon" />
        </button>
      </div>

      <!-- Insert Dropdown -->
      <div class="toolbar-divider" />
      <ToolbarDropdown
        label="Insert"
        icon="+"
        tooltip="Insert content"
        :items="insertDropdownItems"
      />

      <!-- Colors Dropdown -->
      <div class="toolbar-divider" />
      <div class="toolbar-dropdown">
        <button
          class="dropdown-trigger"
          :class="{ open: showColorsDropdown }"
          data-tooltip="Text & background colors"
          @click.stop="showColorsDropdown = !showColorsDropdown"
        >
          <span class="dropdown-icon">🎨</span>
          <span class="dropdown-label">Colors</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <transition name="dropdown-fade">
          <div
            v-if="showColorsDropdown"
            class="dropdown-menu colors-menu"
            @click.stop
          >
            <div class="color-picker-wrapper">
              <ColorPicker
                v-model="textColor"
                label="Text Color"
                icon="A"
                @update:model-value="handleTextColor"
              />
            </div>
            <div class="color-picker-wrapper">
              <ColorPicker
                v-model="backgroundColor"
                label="Highlight"
                icon="◼"
                @update:model-value="handleBackgroundColor"
              />
            </div>
          </div>
        </transition>
      </div>

      <!-- Font Size Dropdown -->
      <div class="toolbar-divider" />
      <div class="toolbar-dropdown">
        <button
          class="dropdown-trigger"
          :class="{ open: showFontSizeDropdown }"
          data-tooltip="Font size"
          @click.stop="showFontSizeDropdown = !showFontSizeDropdown"
        >
          <span class="dropdown-icon">Aa</span>
          <span class="dropdown-label">Size</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <transition name="dropdown-fade">
          <div
            v-if="showFontSizeDropdown"
            class="dropdown-menu"
            @click.stop
          >
            <div class="font-size-wrapper">
              <FontSizeSelector
                v-model="fontSize"
                @update:model-value="handleFontSize"
              />
            </div>
          </div>
        </transition>
      </div>

      <!-- Tools (Inline Buttons) -->
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <button
          v-for="action in toolActions"
          :key="action.id"
          :class="['toolbar-btn-modern', { active: action.isActive?.() }]"
          :data-tooltip="action.tooltip"
          :aria-label="action.label"
          :aria-pressed="action.isActive?.() || false"
          @mousedown.prevent="rememberSelection"
          @click="action.onClick"
        >
          <span v-html="action.icon" />
        </button>
      </div>

      <!-- Theme Toggle -->
      <div class="toolbar-divider" />
      <button
        class="toolbar-btn-modern theme-toggle"
        data-tooltip="Toggle theme"
        aria-label="Toggle dark/light theme"
        @click="toggleTheme"
      >
        <span v-if="theme === 'dark'">☀️</span>
        <span v-else>🌙</span>
      </button>
    </div>

    <transition name="command-menu">
      <div
        v-if="showCommandMenu"
        class="command-menu"
        :style="{ top: `${commandMenuPosition.top}px`, left: `${commandMenuPosition.left}px` }"
      >
        <div class="command-menu-header">
          Quick Actions
        </div>
        <ul>
          <li
            v-for="option in commandOptions"
            :key="option.id"
            @mousedown.prevent
            @click="() => handleCommandOption(option)"
          >
            <div class="command-title">
              {{ option.label }}
            </div>
            <div class="command-description">
              {{ option.description }}
            </div>
          </li>
        </ul>
      </div>
    </transition>

    <div
      v-if="history.length > 1"
      class="history-panel"
    >
      <div class="history-header">
        <span>History</span>
        <div class="history-controls">
          <button
            class="toolbar-btn"
            data-tooltip="Undo (Ctrl+Z)"
            @click="undo"
          >
            ⟲
          </button>
          <button
            class="toolbar-btn"
            data-tooltip="Redo (Ctrl+Shift+Z)"
            @click="redo"
          >
            ⟳
          </button>
        </div>
      </div>
      <div class="history-timeline">
        <button
          v-for="(entry, index) in history"
          :key="entry.id"
          :class="['history-entry', { active: index === historyIndex }]"
          @click="jumpToHistory(index)"
        >
          <span class="history-step">#{{ index + 1 }}</span>
          <span class="history-snippet">{{ entry.preview }}</span>
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
      @mouseup="onMouseUp"
    />

    <!-- Word Count Footer -->
    <div class="editor-footer">
      <span class="word-count">{{ wordCount }} words</span>
      <span class="char-count">{{ characterCount }} characters</span>
    </div>

    <!-- Floating Toolbar -->
    <FloatingToolbar
      :show="showFloatingToolbar"
      :actions="floatingActions"
    />

    <!-- Table Modal -->
    <TableModal
      :show="showTableModal"
      @close="closeTableModal"
      @insert="handleInsertTable"
    />

    <!-- Find & Replace Modal -->
    <FindReplaceModal
      :show="showFindReplaceModal"
      :content="editorContent?.innerHTML || ''"
      @close="closeFindReplaceModal"
      @find="handleFind"
      @replace="handleReplace"
    />

    <!-- Code Block Modal -->
    <CodeBlockModal
      :show="showCodeBlockModal"
      @close="closeCodeBlockModal"
      @insert="handleInsertCodeBlock"
    />

    <!-- Emoji Picker -->
    <div
      v-if="showEmojiPicker"
      class="emoji-picker-container"
    >
      <EmojiPicker
        :show="showEmojiPicker"
        @select="handleInsertEmoji"
        @close="showEmojiPicker = false"
      />
    </div>

    <!-- Image Upload Modal -->
    <ImageUploadModal
      :is-open="showImageUploadModal"
      @close="closeImageUploadModal"
      @insert="handleInsertImage"
    />

    <!-- Embed Modal -->
    <EmbedModal
      :is-open="showEmbedModal"
      @close="closeEmbedModal"
      @insert="handleInsertEmbed"
    />

    <!-- Auto-save Indicator -->
    <div
      v-if="isSaving || lastSaved"
      class="auto-save-indicator"
    >
      <span
        v-if="isSaving"
        class="saving"
      >💾 Saving...</span>
      <span
        v-else-if="lastSaved"
        class="saved"
      >✓ Saved at {{ lastSaved.toLocaleTimeString() }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue'
import {
  applyInlineStyle,
  insertImage as insertImageUtil,
  insertLink as insertLinkUtil,
  isBlockActive,
  isInlineStyleActive,
  isListActive,
  restoreSelection,
  saveSelection,
  toggleBlock,
  toggleList,
  getSelectionRange,
} from '../utils/formatting'
import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
  insertHorizontalRule,
  insertTable as insertTableUtil,
  getWordCount,
  getCharacterCount,
  searchAndReplace,
} from '../utils/commands'
import { exportAsHtml, exportAsMarkdown } from '../utils/export'
import { useTheme } from '../composables/useTheme'
import { useAutoSave } from '../composables/useAutoSave'
import ColorPicker from './ColorPicker.vue'
import FloatingToolbar from './FloatingToolbar.vue'
import FontSizeSelector from './FontSizeSelector.vue'
import TableModal from './TableModal.vue'
import FindReplaceModal from './FindReplaceModal.vue'
import CodeBlockModal from './CodeBlockModal.vue'
import EmojiPicker from './EmojiPicker.vue'
import ImageUploadModal from './ImageUploadModal.vue'
import EmbedModal from './EmbedModal.vue'
import ToolbarDropdown from './ToolbarDropdown.vue'

interface Props {
  modelValue?: string
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

interface ToolbarAction {
  id: string
  label: string
  tooltip: string
  icon?: string
  onClick: () => void
  isActive?: () => boolean
}

type HistoryEntry = { id: string; html: string; preview: string }

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Start typing...',
})

const emit = defineEmits<Emits>()

const editorContent = ref<HTMLDivElement | null>(null)
const savedRange = ref<Range | null>(null)

// Theme and UI state using composable
const { theme, toggleTheme: toggleThemeComposable } = useTheme()
// Group collapse state for future grouped toolbar UI
// const collapsedGroups = reactive<Record<string, boolean>>({
//   text: false,
//   structure: false,
//   inserts: false,
//   cleanup: false,
//   colors: false,
//   alignment: false,
//   advanced: false,
//   formatting: false,
// })

const themeClass = computed(() => (theme.value === 'dark' ? 'theme-dark' : 'theme-light'))

// Color picker state
const textColor = ref('#000000')
const backgroundColor = ref('#ffff00')

// Font size state
const fontSize = ref('normal')

// Table modal state
const showTableModal = ref(false)

// Find & Replace modal state
const showFindReplaceModal = ref(false)

// Code block modal state
const showCodeBlockModal = ref(false)

// Image upload modal state
const showImageUploadModal = ref(false)

// Embed modal state
const showEmbedModal = ref(false)

// Emoji picker state
const showEmojiPicker = ref(false)

// Full screen state
const isFullScreen = ref(false)

// Floating toolbar state
const showFloatingToolbar = ref(false)
const floatingToolbarTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Dropdown states for modern toolbar
const showColorsDropdown = ref(false)
const showFontSizeDropdown = ref(false)

// Auto-save
const { isSaving, lastSaved, triggerAutoSave } = useAutoSave(
  async (content) => {
    // Emit the content for parent to save
    emit('update:modelValue', content)
    console.log('Auto-saved at:', new Date().toLocaleTimeString())
  },
  2000 // 2 second delay
)

// Word count state
const wordCount = computed(() => {
  if (!editorContent.value) return 0
  return getWordCount(editorContent.value.innerHTML)
})

const characterCount = computed(() => {
  if (!editorContent.value) return 0
  return getCharacterCount(editorContent.value.innerHTML)
})

// History state
const history = ref<HistoryEntry[]>([])
const historyIndex = ref(-1)
const isApplyingHistory = ref(false)

// Command menu state
const showCommandMenu = ref(false)
const commandMenuPosition = ref({ top: 0, left: 0 })

// HTML Sanitization (from PR #6)
const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'EM', 'H1', 'H2', 'H3', 'HR', 'I', 'IMG',
  'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'UL'
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
  if (!value.trim()) return ''
  if (typeof window === 'undefined' || typeof document === 'undefined') return value

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
    if (!parent) return
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

// Selection management
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
  captureSnapshot()
}

// Toolbar actions
const handleInlineAction = (tag: string) => {
  performWithSelection((root) => applyInlineStyle(root, tag))
}

const handleBlockAction = (tag: string, fallback = 'p') => {
  performWithSelection((root) => toggleBlock(root, tag, fallback))
}

const handleListAction = (tag: 'ul' | 'ol') => {
  performWithSelection((root) => toggleList(root, tag))
}

const insertLink = () => {
  const url = prompt('Enter the URL:')
  if (url) {
    performWithSelection((root) => insertLinkUtil(root, url))
  }
}

const insertImage = () => {
  showImageUploadModal.value = true
}

const handleInsertImage = (url: string, alt: string) => {
  performWithSelection((root) => insertImageUtil(root, url, alt))
  showImageUploadModal.value = false
}

const closeImageUploadModal = () => {
  showImageUploadModal.value = false
}

const openEmbedModal = () => {
  showEmbedModal.value = true
}

const handleInsertEmbed = (html: string) => {
  if (!editorContent.value) return
  performWithSelection(() => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return
    
    const range = selection.getRangeAt(0)
    range.deleteContents()
    
    // Create a temporary container to parse the HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Insert the content
    const fragment = document.createDocumentFragment()
    while (temp.firstChild) {
      fragment.appendChild(temp.firstChild)
    }
    range.insertNode(fragment)
    
    // Move cursor after inserted content
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  })
  showEmbedModal.value = false
}

const closeEmbedModal = () => {
  showEmbedModal.value = false
}

// Clear formatting function (for future cleanup toolbar)
// const clearFormatting = () => {
//   performWithSelection((root) => clearFormattingUtil(root))
// }

const toggleTheme = () => {
  toggleThemeComposable()
}

// Text alignment actions
const handleTextAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
  performWithSelection((root) => applyTextAlignment(root, alignment))
}

// Color actions
const handleTextColor = (color: string) => {
  performWithSelection((root) => applyTextColor(root, color))
}

const handleBackgroundColor = (color: string) => {
  performWithSelection((root) => applyBackgroundColor(root, color))
}

// Font size action
const handleFontSize = (size: string) => {
  if (size === 'small' || size === 'normal' || size === 'large' || size === 'huge') {
    performWithSelection((root) => applyFontSize(root, size))
  }
}

// Insert horizontal rule
const handleInsertHR = () => {
  performWithSelection((root) => insertHorizontalRule(root))
}

// Table actions
const openTableModal = () => {
  showTableModal.value = true
}

const closeTableModal = () => {
  showTableModal.value = false
}

const handleInsertTable = (data: { rows: number; cols: number; includeHeader: boolean }) => {
  performWithSelection((root) => insertTableUtil(root, data.rows, data.cols, data.includeHeader))
}

// Find & Replace actions
const openFindReplaceModal = () => {
  showFindReplaceModal.value = true
}

const closeFindReplaceModal = () => {
  showFindReplaceModal.value = false
}

const handleFind = (data: { findText: string; direction: 'next' | 'previous' }) => {
  // Basic find implementation - highlight matching text
  if (!editorContent.value) return
  
  const selection = window.getSelection()
  if (!selection) return
  
  // For now, we'll just select the first match
  // A more advanced implementation would track position
  // @ts-ignore - window.find is non-standard but widely supported
  window.find(data.findText, false, data.direction === 'previous', false, false, true, false)
}

const handleReplace = (data: { findText: string; replaceText: string; options: { caseSensitive: boolean; wholeWord: boolean } }) => {
  if (!editorContent.value) return
  
  const html = editorContent.value.innerHTML
  const newHtml = searchAndReplace(html, data.findText, data.replaceText, data.options)
  editorContent.value.innerHTML = newHtml
  captureSnapshot()
}

// Code block actions
const openCodeBlockModal = () => {
  showCodeBlockModal.value = true
}

const closeCodeBlockModal = () => {
  showCodeBlockModal.value = false
}

const handleInsertCodeBlock = (data: { code: string; language: string }) => {
  performWithSelection((_root) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    
    const pre = document.createElement('pre')
    pre.style.margin = '16px 0'
    
    const code = document.createElement('code')
    code.className = `language-${data.language}`
    code.textContent = data.code
    
    pre.appendChild(code)
    
    range.deleteContents()
    range.insertNode(pre)
    
    // Move cursor after code block
    const newRange = document.createRange()
    newRange.setStartAfter(pre)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
  })
}

// Export actions
const handleExportHtml = () => {
  if (!editorContent.value) return
  exportAsHtml(editorContent.value.innerHTML)
}

const handleExportMarkdown = () => {
  if (!editorContent.value) return
  exportAsMarkdown(editorContent.value.innerHTML)
}

// Emoji picker actions
const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
}

const handleInsertEmoji = (emoji: string) => {
  performWithSelection((_root) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const textNode = document.createTextNode(emoji)
    
    range.deleteContents()
    range.insertNode(textNode)
    
    // Move cursor after emoji
    range.setStartAfter(textNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  })
  
  showEmojiPicker.value = false
}

// Full screen actions
const toggleFullScreen = () => {
  isFullScreen.value = !isFullScreen.value
  
  if (isFullScreen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// Floating toolbar management
const updateFloatingToolbar = () => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0 && !selection.isCollapsed) {
    if (floatingToolbarTimer.value) {
      clearTimeout(floatingToolbarTimer.value)
    }
    floatingToolbarTimer.value = setTimeout(() => {
      showFloatingToolbar.value = true
    }, 100)
  } else {
    showFloatingToolbar.value = false
    if (floatingToolbarTimer.value) {
      clearTimeout(floatingToolbarTimer.value)
    }
  }
}

// Active state detection
const isInlineActionActive = (tag: string): boolean => {
  if (!editorContent.value) return false
  return isInlineStyleActive(editorContent.value, tag)
}

const isBlockActionActive = (tag: string): boolean => {
  if (!editorContent.value) return false
  return isBlockActive(editorContent.value, tag)
}

const isListActionActive = (tag: 'ul' | 'ol'): boolean => {
  if (!editorContent.value) return false
  return isListActive(editorContent.value, tag)
}


// Modern toolbar dropdown configurations
const formatDropdownItems = computed(() => [
  {
    id: 'paragraph',
    label: 'Paragraph',
    icon: '¶',
    onClick: () => handleBlockAction('p'),
    isActive: () => isBlockActionActive('p'),
  },
  { divider: true },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: 'H1',
    shortcut: 'Ctrl+Alt+1',
    onClick: () => handleBlockAction('h1'),
    isActive: () => isBlockActionActive('h1'),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: 'H2',
    shortcut: 'Ctrl+Alt+2',
    onClick: () => handleBlockAction('h2'),
    isActive: () => isBlockActionActive('h2'),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: 'H3',
    shortcut: 'Ctrl+Alt+3',
    onClick: () => handleBlockAction('h3'),
    isActive: () => isBlockActionActive('h3'),
  },
])

const inlineFormatActions = computed(() => [
  {
    id: 'bold',
    label: 'Bold',
    icon: '<strong>B</strong>',
    tooltip: 'Bold (Ctrl+B)',
    onClick: () => handleInlineAction('strong'),
    isActive: () => isInlineActionActive('strong'),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: '<em>I</em>',
    tooltip: 'Italic (Ctrl+I)',
    onClick: () => handleInlineAction('em'),
    isActive: () => isInlineActionActive('em'),
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: '<u>U</u>',
    tooltip: 'Underline (Ctrl+U)',
    onClick: () => handleInlineAction('u'),
    isActive: () => isInlineActionActive('u'),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: '<s>S</s>',
    tooltip: 'Strikethrough',
    onClick: () => handleInlineAction('s'),
    isActive: () => isInlineActionActive('s'),
  },
])

const alignmentDropdownItems = computed(() => [
  {
    id: 'align-left',
    label: 'Align Left',
    icon: '⬅',
    onClick: () => handleTextAlignment('left'),
  },
  {
    id: 'align-center',
    label: 'Center',
    icon: '↔',
    onClick: () => handleTextAlignment('center'),
  },
  {
    id: 'align-right',
    label: 'Align Right',
    icon: '➡',
    onClick: () => handleTextAlignment('right'),
  },
  {
    id: 'align-justify',
    label: 'Justify',
    icon: '⬌',
    onClick: () => handleTextAlignment('justify'),
  },
])

const listActions = computed(() => [
  {
    id: 'bullet-list',
    label: 'Bullet List',
    icon: '• List',
    tooltip: 'Bullet list',
    onClick: () => handleListAction('ul'),
    isActive: () => isListActionActive('ul'),
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    icon: '1. List',
    tooltip: 'Numbered list',
    onClick: () => handleListAction('ol'),
    isActive: () => isListActionActive('ol'),
  },
])

const insertDropdownItems = computed(() => [
  {
    id: 'link',
    label: 'Link',
    icon: '🔗',
    shortcut: 'Ctrl+K',
    onClick: insertLink,
  },
  {
    id: 'image',
    label: 'Image',
    icon: '🖼️',
    onClick: insertImage,
  },
  {
    id: 'video',
    label: 'Video',
    icon: '🎬',
    onClick: openEmbedModal,
  },
  { divider: true },
  {
    id: 'table',
    label: 'Table',
    icon: '⊞',
    onClick: openTableModal,
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: '</>',
    onClick: openCodeBlockModal,
  },
  {
    id: 'hr',
    label: 'Horizontal Rule',
    icon: '—',
    onClick: handleInsertHR,
  },
  {
    id: 'emoji',
    label: 'Emoji',
    icon: '😀',
    onClick: toggleEmojiPicker,
  },
])

const toolActions = computed(() => [
  {
    id: 'find',
    label: 'Find & Replace',
    icon: '🔍',
    tooltip: 'Find & Replace (Ctrl+F)',
    onClick: openFindReplaceModal,
  },
  {
    id: 'export-html',
    label: 'Export HTML',
    icon: '📄',
    tooltip: 'Export as HTML',
    onClick: handleExportHtml,
  },
  {
    id: 'export-md',
    label: 'Export Markdown',
    icon: '📝',
    tooltip: 'Export as Markdown',
    onClick: handleExportMarkdown,
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    icon: '⛶',
    tooltip: 'Toggle fullscreen',
    onClick: toggleFullScreen,
    isActive: () => isFullScreen.value,
  },
])

// Toolbar sections organized by category (for future grouped toolbar UI)
// const toolbarSections = [
//   {
//     id: 'text',
//     label: 'Text',
//     description: 'Inline styles',
//     actions: _formatActions,
//   },
//   {
//     id: 'structure',
//     label: 'Structure',
//     description: 'Headings and paragraphs',
//     actions: _headingActions,
//   },
//   {
//     id: 'alignment',
//     label: 'Alignment',
//     description: 'Text alignment',
//     actions: _alignmentActions,
//   },
//   {
//     id: 'inserts',
//     label: 'Insert',
//     description: 'Lists, links, media, videos',
//     actions: _insertActions,
//   },
//   {
//     id: 'advanced',
//     label: 'Advanced',
//     description: 'Code, Find, Emoji, Fullscreen',
//     actions: _advancedActions,
//   },
//   {
//     id: 'cleanup',
//     label: 'Cleanup',
//     description: 'Normalize content',
//     actions: _cleanupActions,
//   },
// ]

// Floating toolbar actions (subset of main toolbar)
const floatingActions = computed<ToolbarAction[]>(() => [
  {
    id: 'bold',
    label: 'Bold',
    icon: '<strong>B</strong>',
    tooltip: 'Bold (Ctrl+B)',
    onClick: () => handleInlineAction('strong'),
    isActive: () => isInlineActionActive('strong'),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: '<em>I</em>',
    tooltip: 'Italic (Ctrl+I)',
    onClick: () => handleInlineAction('em'),
    isActive: () => isInlineActionActive('em'),
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: '<u>U</u>',
    tooltip: 'Underline (Ctrl+U)',
    onClick: () => handleInlineAction('u'),
    isActive: () => isInlineActionActive('u'),
  },
  {
    id: 'link',
    label: 'Link',
    icon: '🔗',
    tooltip: 'Insert link',
    onClick: insertLink,
  },
])

// Toggle group collapse state (for future grouped toolbar UI)
// const toggleGroup = (id: string) => {
//   collapsedGroups[id] = !collapsedGroups[id]
// }

// History management (from PR #7)
const buildPreview = (html: string) => {
  const temp = document.createElement('div')
  temp.innerHTML = html
  const text = temp.innerText.replace(/\s+/g, ' ').trim()
  return text.length > 60 ? `${text.slice(0, 57)}...` : text || 'Empty content'
}

const captureSnapshot = (emitUpdate = true) => {
  if (!editorContent.value || isApplyingHistory.value) return
  const html = editorContent.value.innerHTML
  const preview = buildPreview(html)
  const current = history.value[historyIndex.value]
  if (current && current.html === html) {
    if (emitUpdate) {
      const sanitized = sanitizeHtml(html)
      emit('update:modelValue', sanitized)
    }
    return
  }
  history.value = history.value.slice(0, historyIndex.value + 1)
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    html,
    preview,
  }
  history.value.push(entry)
  historyIndex.value = history.value.length - 1
  if (emitUpdate) {
    const sanitized = sanitizeHtml(html)
    emit('update:modelValue', sanitized)
  }
}

const applyHistoryEntry = (entry: HistoryEntry | undefined) => {
  if (!entry || !editorContent.value) return
  isApplyingHistory.value = true
  editorContent.value.innerHTML = entry.html
  const sanitized = sanitizeHtml(entry.html)
  emit('update:modelValue', sanitized)
  nextTick(() => {
    isApplyingHistory.value = false
  })
}

const undo = () => {
  if (historyIndex.value <= 0) return
  historyIndex.value -= 1
  applyHistoryEntry(history.value[historyIndex.value])
}

const redo = () => {
  if (historyIndex.value >= history.value.length - 1) return
  historyIndex.value += 1
  applyHistoryEntry(history.value[historyIndex.value])
}

const jumpToHistory = (index: number) => {
  if (index < 0 || index >= history.value.length) return
  historyIndex.value = index
  applyHistoryEntry(history.value[index])
}

// Command menu (from PR #7)
const insertBlockquote = () => {
  performWithSelection((root) => {
    const range = getSelectionRange()
    if (!range || !root.contains(range.commonAncestorContainer)) return
    const quote = document.createElement('blockquote')
    const content = range.cloneContents()
    if (!content.textContent?.trim()) {
      quote.textContent = 'Type your quote here'
    } else {
      quote.appendChild(content)
    }
    range.deleteContents()
    range.insertNode(quote)
  })
}

// Alternative code block insertion (currently using modal for better UX)
// const insertCodeBlock = () => {
//   performWithSelection((root) => {
//     const range = getSelectionRange()
//     if (!range || !root.contains(range.commonAncestorContainer)) return
//     const pre = document.createElement('pre')
//     const code = document.createElement('code')
//     const content = range.cloneContents()
//     const text = content.textContent || ''
//     code.textContent = text || 'console.log("Hello World")'
//     pre.appendChild(code)
//     range.deleteContents()
//     range.insertNode(pre)
//   })
// }

const removeSlashTrigger = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const container = range.startContainer
  if (container.nodeType === Node.TEXT_NODE) {
    const textNode = container as Text
    const index = range.startOffset - 1
    if (index >= 0 && textNode.data[index] === '/') {
      textNode.deleteData(index, 1)
      const newRange = document.createRange()
      newRange.setStart(textNode, index)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
    }
  }
}

const openCommandMenu = () => {
  nextTick(() => {
    const range = getSelectionRange()
    if (!range) return
    const rect = range.getBoundingClientRect()
    showCommandMenu.value = true
    commandMenuPosition.value = {
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    }
  })
}

const closeCommandMenu = () => {
  showCommandMenu.value = false
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!showCommandMenu.value) return
  const target = event.target as HTMLElement
  if (!target.closest('.command-menu')) {
    closeCommandMenu()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeCommandMenu()
  }
}

const commandOptions = [
  {
    id: 'slash-h1',
    label: 'Heading 1',
    description: 'Large section heading',
    action: () => handleBlockAction('h1'),
  },
  {
    id: 'slash-h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    action: () => handleBlockAction('h2'),
  },
  {
    id: 'slash-h3',
    label: 'Heading 3',
    description: 'Small section heading',
    action: () => handleBlockAction('h3'),
  },
  {
    id: 'slash-paragraph',
    label: 'Paragraph',
    description: 'Regular text paragraph',
    action: () => handleBlockAction('p'),
  },
  {
    id: 'slash-bold',
    label: 'Bold',
    description: 'Make text bold',
    action: () => handleInlineAction('strong'),
  },
  {
    id: 'slash-italic',
    label: 'Italic',
    description: 'Make text italic',
    action: () => handleInlineAction('em'),
  },
  {
    id: 'slash-bullet',
    label: 'Bullet List',
    description: 'Create an unordered list',
    action: () => handleListAction('ul'),
  },
  {
    id: 'slash-numbered',
    label: 'Numbered List',
    description: 'Create an ordered list',
    action: () => handleListAction('ol'),
  },
  {
    id: 'slash-quote',
    label: 'Quote',
    description: 'Insert a blockquote',
    action: insertBlockquote,
  },
  {
    id: 'slash-code',
    label: 'Code Block',
    description: 'Insert code with syntax highlighting',
    action: openCodeBlockModal,
  },
  {
    id: 'slash-link',
    label: 'Link',
    description: 'Insert a hyperlink',
    action: insertLink,
  },
  {
    id: 'slash-image',
    label: 'Image',
    description: 'Insert an image',
    action: insertImage,
  },
  {
    id: 'slash-table',
    label: 'Table',
    description: 'Insert a table',
    action: openTableModal,
  },
  {
    id: 'slash-divider',
    label: 'Divider',
    description: 'Insert horizontal rule',
    action: handleInsertHR,
  },
]

const handleCommandOption = (option: typeof commandOptions[number]) => {
  removeSlashTrigger()
  option.action()
  closeCommandMenu()
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    openCommandMenu()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    insertLink()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    openFindReplaceModal()
    return
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        handleInlineAction('strong')
        return
      case 'i':
        event.preventDefault()
        handleInlineAction('em')
        return
      case 'u':
        event.preventDefault()
        handleInlineAction('u')
        return
    }
  }

  if ((event.ctrlKey || event.metaKey) && event.altKey) {
    switch (event.key) {
      case '1':
        event.preventDefault()
        handleBlockAction('h1')
        break
      case '2':
        event.preventDefault()
        handleBlockAction('h2')
        break
      case '3':
        event.preventDefault()
        handleBlockAction('h3')
        break
    }
  }
}

// Event handlers
const onInput = () => {
  captureSnapshot()
  updateFloatingToolbar()
}

const onFocus = () => {
  savedRange.value = saveSelection()
  emit('focus')
}

const onBlur = () => {
  // Delay hiding floating toolbar to allow clicks
  setTimeout(() => {
    showFloatingToolbar.value = false
  }, 200)
  emit('blur')
}

const onMouseUp = () => {
  updateFloatingToolbar()
}

const onSelectionChange = () => {
  updateFloatingToolbar()
}

// Lifecycle and watchers
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorContent.value) return
    if (isApplyingHistory.value) return
    if (editorContent.value.innerHTML !== newValue) {
      isApplyingHistory.value = true
      applySanitizedContent(newValue)
      nextTick(() => {
        isApplyingHistory.value = false
        captureSnapshot(false)
      })
    }
  },
  { immediate: true }
)

// Watch for content changes and trigger auto-save
watch(
  () => editorContent.value?.innerHTML,
  (newContent) => {
    if (newContent && !isApplyingHistory.value) {
      triggerAutoSave(newContent)
    }
  }
)

onMounted(() => {
  if (editorContent.value) {
    applySanitizedContent(props.modelValue)
    captureSnapshot(false)
    editorContent.value.addEventListener('keydown', handleKeydown)
  }
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('selectionchange', onSelectionChange)
})

onBeforeUnmount(() => {
  if (editorContent.value) {
    editorContent.value.removeEventListener('keydown', handleKeydown)
  }
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('selectionchange', onSelectionChange)
  if (floatingToolbarTimer.value) {
    clearTimeout(floatingToolbarTimer.value)
  }
})
</script>

<style scoped>
.next-level-editor {
  --editor-bg: #ffffff;
  --editor-border: #d8dde6;
  --toolbar-bg: #f8f9fb;
  --toolbar-text: #1f2937;
  --toolbar-accent: #3b82f6;
  --toolbar-hover: rgba(59, 130, 246, 0.12);
  --content-color: #1f2937;
  --placeholder-color: #9ca3af;
  --tooltip-bg: rgba(17, 24, 39, 0.92);
  --tooltip-text: #f9fafb;
  --history-bg: rgba(59, 130, 246, 0.08);
  --history-active: #3b82f6;
  --checklist-border: #d1d5db;
  border: 1px solid var(--editor-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--editor-bg);
  box-shadow: 0 18px 40px -24px rgba(30, 64, 175, 0.45);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

.next-level-editor.theme-dark {
  --editor-bg: #0f172a;
  --editor-border: #1e293b;
  --toolbar-bg: #111827;
  --toolbar-text: #e2e8f0;
  --toolbar-accent: #60a5fa;
  --toolbar-hover: rgba(96, 165, 250, 0.2);
  --content-color: #e2e8f0;
  --placeholder-color: #475569;
  --tooltip-bg: rgba(15, 23, 42, 0.95);
  --tooltip-text: #e2e8f0;
  --history-bg: rgba(96, 165, 250, 0.12);
  --history-active: #60a5fa;
  --checklist-border: #334155;
}

.editor-toolbar {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--editor-border);
}

.toolbar-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--editor-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.theme-dark .toolbar-section {
  background: rgba(15, 23, 42, 0.6);
}

.toolbar-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--toolbar-text);
  font-weight: 600;
  cursor: pointer;
}

.toolbar-section:hover {
  border-color: var(--toolbar-accent);
}

.section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-description {
  font-size: 12px;
  opacity: 0.65;
}

.chevron {
  transform: rotate(-90deg);
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(0deg);
}

.toolbar-section-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.theme-dark .toolbar-section-body {
  background: rgba(15, 23, 42, 0.7);
}

.toolbar-btn {
  position: relative;
  min-width: 38px;
  min-height: 38px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--toolbar-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  border-color: var(--toolbar-accent);
  background: var(--toolbar-hover);
}

.toolbar-btn.active {
  background: var(--toolbar-accent);
  color: #fff;
}

.toolbar-btn[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--tooltip-bg);
  color: var(--tooltip-text);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 20;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
}

.toolbar-btn[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: var(--tooltip-bg) transparent transparent transparent;
  z-index: 21;
}

.command-menu {
  position: absolute;
  width: 280px;
  background: var(--editor-bg);
  border: 1px solid var(--editor-border);
  border-radius: 12px;
  box-shadow: 0 24px 40px -20px rgba(15, 23, 42, 0.45);
  overflow: hidden;
  z-index: 50;
}

.command-menu-header {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--toolbar-text);
  background: rgba(59, 130, 246, 0.08);
}

.command-menu ul {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.command-menu li {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.2s ease;
}

.command-menu li:hover {
  background: var(--toolbar-hover);
}

.command-title {
  font-weight: 600;
  color: var(--toolbar-text);
}

.command-description {
  font-size: 12px;
  opacity: 0.7;
  color: var(--toolbar-text);
}

.history-panel {
  padding: 12px 16px;
  border-bottom: 1px solid var(--editor-border);
  background: rgba(59, 130, 246, 0.04);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: var(--toolbar-text);
  font-weight: 600;
}

.history-controls {
  display: flex;
  gap: 8px;
}

.history-controls .toolbar-btn {
  min-width: 32px;
  min-height: 32px;
  font-size: 16px;
}

.history-timeline {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.history-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--history-bg);
  color: var(--toolbar-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.history-entry:hover {
  border-color: var(--toolbar-accent);
  transform: translateY(-2px);
}

.history-entry.active {
  border-color: var(--history-active);
  background: rgba(59, 130, 246, 0.18);
}

.history-step {
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.history-snippet {
  font-size: 12px;
  opacity: 0.75;
}

.editor-content {
  position: relative;
  min-height: 240px;
  max-height: 640px;
  overflow-y: auto;
  padding: 20px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--content-color);
  outline: none;
}

.editor-content:empty:before {
  content: attr(placeholder);
  color: var(--placeholder-color);
  pointer-events: none;
}

.editor-content:focus {
  outline: none;
}

.editor-content :deep(h1),
.editor-content :deep(h2),
.editor-content :deep(h3),
.editor-content :deep(h4),
.editor-content :deep(h5),
.editor-content :deep(h6) {
  margin: 18px 0 10px;
  font-weight: 700;
  line-height: 1.25;
}

.editor-content :deep(h1) {
  font-size: 2.2em;
}

.editor-content :deep(h2) {
  font-size: 1.8em;
}

.editor-content :deep(h3) {
  font-size: 1.4em;
}

.editor-content :deep(p) {
  margin: 10px 0;
}

.editor-content :deep(ul),
.editor-content :deep(ol) {
  margin: 12px 0;
  padding-left: 26px;
}

.editor-content :deep(li) {
  margin: 4px 0;
}

.editor-content :deep(a) {
  color: var(--toolbar-accent);
  text-decoration: underline;
}

.editor-content :deep(a):hover {
  color: #1d4ed8;
}

.editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 6px;
}

.editor-content :deep(code) {
  background: rgba(15, 23, 42, 0.08);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.92em;
}

.theme-dark .editor-content :deep(code) {
  background: rgba(148, 163, 184, 0.2);
}

.editor-content :deep(pre) {
  background: rgba(15, 23, 42, 0.08);
  padding: 16px;
  border-radius: 10px;
  overflow: auto;
}

.theme-dark .editor-content :deep(pre) {
  background: rgba(148, 163, 184, 0.12);
}

.editor-content :deep(blockquote) {
  border-left: 4px solid var(--toolbar-accent);
  margin: 16px 0;
  padding-left: 16px;
  color: var(--toolbar-text);
  font-style: italic;
  background: rgba(59, 130, 246, 0.06);
}

.theme-dark .editor-content :deep(blockquote) {
  background: rgba(59, 130, 246, 0.12);
}

.editor-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 0.95em;
}

.editor-content :deep(table th) {
  background: rgba(59, 130, 246, 0.08);
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--editor-border);
}

.theme-dark .editor-content :deep(table th) {
  background: rgba(96, 165, 250, 0.12);
}

.editor-content :deep(table td) {
  padding: 8px 12px;
  border: 1px solid var(--editor-border);
}

.editor-content :deep(table tr:hover) {
  background: rgba(59, 130, 246, 0.03);
}

.theme-dark .editor-content :deep(table tr:hover) {
  background: rgba(96, 165, 250, 0.05);
}

.toolbar-collapse-enter-active,
.toolbar-collapse-leave-active {
  transition: all 0.2s ease;
}

.toolbar-collapse-enter-from,
.toolbar-collapse-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.command-menu-enter-active,
.command-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.2s ease;
}

.command-menu-enter-from,
.command-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Editor Footer */
.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid var(--editor-border);
  background: var(--toolbar-bg);
  font-size: 12px;
  color: var(--toolbar-text);
  opacity: 0.7;
}

.word-count,
.char-count {
  font-weight: 500;
}

/* Color Section */
.color-section .toolbar-section-body {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Horizontal Rule Styles */
.editor-content :deep(hr) {
  border: none;
  border-top: 2px solid var(--editor-border);
  margin: 24px 0;
  opacity: 0.5;
}

.theme-dark .editor-content :deep(hr) {
  opacity: 0.3;
}

/* Fullscreen Mode */
.next-level-editor.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--editor-bg);
  display: flex;
  flex-direction: column;
}

.next-level-editor.fullscreen .editor-content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 48px 24px;
}

/* Emoji Picker Container */
.emoji-picker-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
}

/* Auto-save Indicator */
.auto-save-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-lg, 10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 13px;
  z-index: 100;
  transition: opacity var(--transition-fast, 150ms) ease;
}

.theme-dark .auto-save-indicator {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

.auto-save-indicator .saving {
  color: #3b82f6;
}

.auto-save-indicator .saved {
  color: #10b981;
}

/* Modern Toolbar Styles */
.editor-toolbar-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--editor-border);
  min-height: 48px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--editor-border);
  margin: 0 4px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-btn-modern {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--toolbar-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
  position: relative;
}

.toolbar-btn-modern:hover {
  background: var(--toolbar-hover);
  border-color: var(--toolbar-accent);
}

.toolbar-btn-modern.active {
  background: var(--toolbar-hover);
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
}

.toolbar-btn-modern:focus {
  outline: 2px solid var(--toolbar-accent);
  outline-offset: 2px;
}

/* Tooltips for modern toolbar */
.toolbar-btn-modern[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  background: var(--tooltip-bg);
  color: var(--tooltip-text);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
}

.toolbar-btn-modern[data-tooltip]:hover::after {
  opacity: 1;
}

/* Theme toggle specific styles */
.toolbar-btn-modern.theme-toggle {
  font-size: 18px;
}

/* Dropdown styles for embedded pickers */
.toolbar-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--editor-border);
  background: var(--editor-bg);
  color: var(--toolbar-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  min-height: 32px;
}

.dropdown-trigger:hover {
  background: var(--toolbar-hover);
  border-color: var(--toolbar-accent);
}

.dropdown-trigger.open {
  background: var(--toolbar-hover);
  border-color: var(--toolbar-accent);
  color: var(--toolbar-accent);
}

.dropdown-icon {
  font-size: 16px;
  line-height: 1;
}

.dropdown-label {
  white-space: nowrap;
  font-weight: 500;
}

.dropdown-arrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.2s;
}

.dropdown-trigger.open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--editor-bg);
  border: 1px solid var(--editor-border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 8px;
  min-width: 200px;
}

.dropdown-menu.colors-menu {
  min-width: 280px;
}

.color-picker-wrapper {
  margin-bottom: 8px;
}

.color-picker-wrapper:last-child {
  margin-bottom: 0;
}

.font-size-wrapper {
  padding: 4px;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .editor-toolbar-modern {
    gap: 2px;
    padding: 6px 8px;
  }
  
  .toolbar-divider {
    display: none;
  }
  
  .dropdown-label {
    display: none;
  }
  
  .toolbar-btn-modern {
    min-width: 36px;
    height: 36px;
  }
}
</style>

