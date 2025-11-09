<template>
  <div
    :class="['next-level-editor', themeClass, { fullscreen: isFullScreen }]"
    :style="editorStyles"
  >
    <!-- Context Hints (Smart Toolbar Feature) -->
    <div
      v-if="getContextHints().length > 0"
      class="context-hints"
    >
      <span
        v-for="(hint, index) in getContextHints()"
        :key="index"
        class="context-hint"
      >
        💡 {{ hint }}
      </span>
    </div>

    <!-- Modern Horizontal Toolbar -->
    <div class="editor-toolbar-modern">
      <!-- Format Dropdown -->
      <div
        v-if="isToolbarSectionVisible('format')"
        @mousedown.prevent="rememberSelection"
      >
        <ToolbarDropdown
          label="Format"
          icon="<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 16 16&quot; fill=&quot;currentColor&quot;><path d=&quot;M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z&quot;/></svg>"
          tooltip="Paragraph format"
          :items="formatDropdownItems"
        />
      </div>

      <!-- Text Formatting (Inline Buttons) -->
      <template v-if="isToolbarSectionVisible('textFormatting')">
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
      </template>

      <!-- Alignment Dropdown -->
      <template v-if="isToolbarSectionVisible('alignment')">
        <div class="toolbar-divider" />
        <div @mousedown.prevent="rememberSelection">
          <ToolbarDropdown
            label="Align"
            icon="<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 16 16&quot; fill=&quot;currentColor&quot;><path d=&quot;M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h12v1H2V8zm0 3h12v1H2v-1z&quot;/></svg>"
            tooltip="Text alignment"
            :items="alignmentDropdownItems"
          />
        </div>
      </template>

      <!-- Lists (Inline Buttons) -->
      <template v-if="isToolbarSectionVisible('lists')">
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
      </template>

      <!-- Insert Dropdown -->
      <template v-if="isToolbarSectionVisible('insert')">
        <div class="toolbar-divider" />
        <div @mousedown.prevent="rememberSelection">
          <ToolbarDropdown
            label="Insert"
            icon="<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 16 16&quot; fill=&quot;currentColor&quot;><path d=&quot;M8 3v5H3v1h5v5h1V9h5V8H9V3H8z&quot;/></svg>"
            tooltip="Insert content"
            :items="insertDropdownItems"
          />
        </div>
      </template>

      <!-- Colors Dropdown -->
      <div class="toolbar-divider" />
      <div class="toolbar-dropdown">
        <button
          class="dropdown-trigger"
          :class="{ open: showColorsDropdown }"
          data-tooltip="Text & background colors"
          @mousedown.prevent="rememberSelection"
          @click.stop="showColorsDropdown = !showColorsDropdown"
        >
          <span class="dropdown-icon"><svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M8 1l6 6-3 3-6-6 3-3zm-1 7l-5 5a1 1 0 0 0 0 1.5 1 1 0 0 0 1.5 0l5-5-1.5-1.5z" /><circle
            cx="13"
            cy="13"
            r="2"
          /></svg></span>
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
      <div @mousedown.prevent="rememberSelection">
        <ToolbarDropdown
          label="Size"
          icon="<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 16 16&quot; fill=&quot;currentColor&quot;><path d=&quot;M2 2h6v2H6v8H4V4H2V2zm6 4h6v2h-2v6h-2V8h-2V6z&quot;/></svg>"
          tooltip="Font size"
          :items="fontSizeDropdownItems"
        />
      </div>

      <!-- History Controls (Undo/Redo) -->
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <button
          class="toolbar-btn-modern"
          data-tooltip="Undo (Ctrl+Z)"
          aria-label="Undo"
          :disabled="historyIndex <= 0"
          @click="undo"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM3 8a5 5 0 0 1 8-4l-3 3h4V3l-1.5 1.5A6 6 0 1 0 14 8h-1a5 5 0 0 1-5 5" /></svg>
        </button>
        <button
          class="toolbar-btn-modern"
          data-tooltip="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          :disabled="historyIndex >= history.length - 1"
          @click="redo"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M8 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm5 5a5 5 0 0 0-8-4l3 3H4V3l1.5 1.5A6 6 0 1 1 2 8h1a5 5 0 0 0 5 5" /></svg>
        </button>
      </div>

      <!-- Tools (Inline Buttons) -->
      <div class="toolbar-divider" />
      <div @mousedown.prevent="rememberSelection">
        <ToolbarDropdown
          label="Tools"
          icon="<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 16 16&quot; fill=&quot;currentColor&quot;><path d=&quot;M1 1h6v1H2v13h12V9h1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5zm8 0l5.5 5.5-1 1L12 6v4h-1V6L9.5 7.5l-1-1L14 1h-5z&quot;/></svg>"
          tooltip="Productivity tools"
          :items="productivityDropdownItems"
        />
      </div>

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

      <!-- View Mode Toggle with Text Labels -->
      <div class="toolbar-divider" />
      <div class="view-mode-group">
        <button
          :class="['view-mode-btn', 'with-text', { active: viewMode === 'editor' }]"
          data-tooltip="WYSIWYG Editor - Edit with visual formatting"
          aria-label="Editor view"
          @click="viewMode = 'editor'"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M12.146 1.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-4 2a.5.5 0 0 1-.65-.65l2-4a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zM12.5 5.207L10.207 2.914 3 10.121V11h.879l7.621-5.793z" /></svg>
          <span class="btn-label">Editor</span>
        </button>
        <button
          :class="['view-mode-btn', 'with-text', { active: viewMode === 'code' }]"
          data-tooltip="HTML Source Code - Edit raw HTML"
          aria-label="Code view"
          @click="viewMode = 'code'"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5z" /></svg>
          <span class="btn-label">Code</span>
        </button>
        <button
          :class="['view-mode-btn', 'with-text', { active: viewMode === 'split' }]"
          data-tooltip="Split View - Editor and code side by side"
          aria-label="Split view"
          @click="viewMode = 'split'"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><path d="M1 2h6v12H1V2zm1 1v10h4V3H2zm7-1h6v12H9V2zm1 1v10h4V3h-4z" /></svg>
          <span class="btn-label">Split</span>
        </button>
        <button
          :class="['view-mode-btn', 'with-text', { active: viewMode === 'preview' }]"
          data-tooltip="Preview - View final output without editing"
          aria-label="Preview view"
          @click="viewMode = 'preview'"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          ><circle
            cx="8"
            cy="8"
            r="2"
          /><path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /></svg>
          <span class="btn-label">Preview</span>
        </button>
      </div>

      <!-- Format HTML Button (visible in code/split view) -->
      <button
        v-if="viewMode === 'code' || viewMode === 'split'"
        class="toolbar-btn-modern"
        data-tooltip="Format HTML (pretty-print)"
        aria-label="Format HTML"
        @click="handleFormatHtml"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        ><path d="M8 2l1 1-1 1-1-1 1-1zm-3 3l1 1-1 1-1-1 1-1zm6 0l1 1-1 1-1-1 1-1zM5 8l1 1-1 1-1-1 1-1zm6 0l1 1-1 1-1-1 1-1zM8 11l1 1-1 1-1-1 1-1z" /></svg>
      </button>

      <!-- Theme Toggle -->
      <div class="toolbar-divider" />
      <button
        class="toolbar-btn-modern theme-toggle"
        data-tooltip="Toggle theme"
        aria-label="Toggle dark/light theme"
        @click="toggleTheme"
      >
        <span v-if="theme === 'dark'"><svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        ><circle
          cx="8"
          cy="8"
          r="3"
        /><path d="M8 1v2M8 13v2M15 8h-2M3 8H1M13 3l-1.5 1.5M4.5 11.5L3 13M13 13l-1.5-1.5M4.5 4.5L3 3" /></svg></span>
        <span v-else><svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        ><path d="M8 1a7 7 0 1 0 5 11.9A7 7 0 0 1 8 1z" /></svg></span>
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

    <!-- Editor and Preview Container -->
    <div :class="['editor-container', `view-mode-${viewMode}`]">
      <!-- WYSIWYG Editor Panel (editor mode) -->
      <div
        v-if="viewMode === 'editor'"
        class="editor-panel"
      >
        <div
          ref="editorContent"
          class="editor-content"
          contenteditable="true"
          :placeholder="placeholder"
          @input="onInput"
          @blur="onBlur"
          @focus="onFocus"
          @mouseup="onMouseUp"
          @contextmenu="handleContextMenu"
        />
      </div>

      <!-- Code Editor Panel (code/split view) -->
      <div
        v-if="viewMode === 'code' || viewMode === 'split'"
        class="editor-panel"
      >
        <!-- Code editor (textarea) for code/split view -->
        <textarea
          ref="codeEditor"
          class="code-editor"
          :value="codeContent"
          spellcheck="false"
          @input="onCodeInput"
          @blur="onCodeBlur"
        />
        
        <!-- Hidden WYSIWYG editor to maintain functionality -->
        <div
          ref="editorContent"
          class="editor-content"
          contenteditable="true"
          :placeholder="placeholder"
          style="display: none;"
          @input="onInput"
          @blur="onBlur"
          @focus="onFocus"
          @mouseup="onMouseUp"
          @contextmenu="handleContextMenu"
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

    <!-- Context Menu -->
    <ContextMenu
      :show="showContextMenu"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      @close="closeContextMenu"
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

    <!-- Table Designer -->
    <TableDesigner
      :show="showTableDesigner"
      :x="tableDesignerPosition.x"
      :y="tableDesignerPosition.y"
      @add-row-above="handleAddRowAbove"
      @add-row-below="handleAddRowBelow"
      @add-column-left="handleAddColumnLeft"
      @add-column-right="handleAddColumnRight"
      @remove-row="handleRemoveRow"
      @remove-column="handleRemoveColumn"
      @cell-properties="handleCellProperties"
      @table-properties="handleTableProperties"
      @delete-table="handleDeleteTable"
    />

    <!-- Table Properties Modal -->
    <TablePropertiesModal
      :show="showTablePropertiesModal"
      :mode="tablePropertiesMode"
      :initial-cell-props="initialCellProps"
      :initial-table-props="initialTableProps"
      @close="closeTablePropertiesModal"
      @apply="handleApplyTableProperties"
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

    <!-- File Manager Modal -->
    <FileManagerModal
      :is-open="showFileManagerModal"
      @close="closeFileManagerModal"
      @insert="handleInsertFile"
    />

    <!-- Template Modal -->
    <TemplateModal
      :show="showTemplateModal"
      @close="closeTemplateModal"
      @select="handleSelectTemplate"
    />

    <!-- HTML Code Modal -->
    <HtmlCodeModal
      :show="showHtmlCodeModal"
      :html-content="formatHtml(htmlContent || editorContent?.innerHTML || '')"
      @close="closeHtmlCodeModal"
    />

    <!-- Command Palette -->
    <CommandPalette
      :show="showCommandPalette"
      :commands="commandPaletteCommands"
      @close="closeCommandPalette"
      @execute="handleCommandExecute"
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
        :key="lastSaved.getTime()"
        class="saved"
      >✓ Saved at {{ lastSaved.toLocaleTimeString() }}</span>
    </div>

    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div
        v-if="showToast"
        :class="['toast-notification', toastType]"
      >
        {{ toastMessage }}
      </div>
    </transition>
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
  isBlockActive,
  isInlineStyleActive,
  isListActive,
  restoreSelection,
  saveSelection,
  applyInlineStyle,
  toggleBlock,
  toggleList,
  insertLink as insertLinkUtil,
  insertImage as insertImageUtil,
  indentListItem,
  outdentListItem,
} from '../utils/formatting'
import {
  getWordCount,
  getCharacterCount,
  getSelectedTable,
  getSelectedCell,
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
  insertHorizontalRule,
  insertTable as insertTableUtil,
  searchAndReplace,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  deleteTable,
  applyCellProperties,
  applyTableProperties,
  getCellProperties,
  getTableProperties,
} from '../utils/commands'
import { useTheme } from '../composables/useTheme'
import { useAutoSave } from '../composables/useAutoSave'
import { useSmartToolbar } from '../composables/useSmartToolbar'
import { hasFormatCopied, copyFormat, pasteFormat } from '../utils/formatPainter'
import { enableSpellCheck, toggleSpellCheck } from '../utils/spellChecker'
import { exportAsHtml, exportAsMarkdown, exportAsPdf, exportAsWord, formatHtml } from '../utils/export'
import { insertPageBreak, insertTableOfContents } from '../utils/pageManagement'
import { useCommandPalette } from '../composables/useCommandPalette'
import { useSlashCommands } from '../composables/useSlashCommands'
import type { ToolbarAction } from '../types/toolbar'
import ColorPicker from './ColorPicker.vue'
import FloatingToolbar from './FloatingToolbar.vue'
import TableModal from './TableModal.vue'
import TableDesigner from './TableDesigner.vue'
import TablePropertiesModal from './TablePropertiesModal.vue'
import FindReplaceModal from './FindReplaceModal.vue'
import CodeBlockModal from './CodeBlockModal.vue'
import EmojiPicker from './EmojiPicker.vue'
import ImageUploadModal from './ImageUploadModal.vue'
import EmbedModal from './EmbedModal.vue'
import FileManagerModal from './FileManagerModal.vue'
import ToolbarDropdown from './ToolbarDropdown.vue'
import ContextMenu, { type ContextMenuItem } from './ContextMenu.vue'
import TemplateModal from './TemplateModal.vue'
import CommandPalette from './CommandPalette.vue'
import HtmlCodeModal from './HtmlCodeModal.vue'

interface Props {
  modelValue?: string
  placeholder?: string
  width?: string
  height?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

type HistoryEntry = { id: string; html: string; preview: string }

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Start typing...',
  width: undefined,
  height: undefined,
})

const emit = defineEmits<Emits>()

const editorContent = ref<HTMLDivElement | null>(null)
const codeEditor = ref<HTMLTextAreaElement | null>(null)
const savedRange = ref<Range | null>(null)
const codeContent = ref('')

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

// Editor styles for width and height
const editorStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.width) {
    styles.width = props.width
  }
  if (props.height) {
    styles.height = props.height
  }
  return styles
})

// Color picker state
const textColor = ref('#000000')
const backgroundColor = ref('#ffff00')

// Command Palette
const {
  showCommandPalette,
  closeCommandPalette,
  addToRecent,
} = useCommandPalette()

// Smart Toolbar
const {
  updateContext: updateToolbarContext,
  isVisible: isToolbarSectionVisible,
  getContextHints
} = useSmartToolbar()

// View mode state (editor, code, split, preview)
const viewMode = ref<'editor' | 'code' | 'split' | 'preview'>('editor')

// Store HTML content for preview when editor is not rendered
const htmlContent = ref('')

// Floating toolbar state
const showFloatingToolbar = ref(false)
const floatingToolbarTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Dropdown states for modern toolbar
const showColorsDropdown = ref(false)

// Modal states
const showImageUploadModal = ref(false)
const showEmbedModal = ref(false)
const showFileManagerModal = ref(false)
const showEmojiPicker = ref(false)
const showTemplateModal = ref(false)
const showHtmlCodeModal = ref(false)
const showFindReplaceModal = ref(false)
const showCodeBlockModal = ref(false)
const showTableModal = ref(false)
const showTableDesigner = ref(false)
const showTablePropertiesModal = ref(false)

// Auto-save
const { isSaving, lastSaved, triggerAutoSave } = useAutoSave(
  async (content: string, version: number) => {
    // Emit the content for parent to save
    emit('update:modelValue', content)
    console.log('Auto-saved at:', new Date().toLocaleTimeString())
    return { success: true, serverVersion: version + 1 }
  },
  { delay: 2000 } // 2 second delay
)

// Word count state
const wordCount = computed(() => {
  const content = htmlContent.value || editorContent.value?.innerHTML || ''
  return getWordCount(content)
})

const characterCount = computed(() => {
  const content = htmlContent.value || editorContent.value?.innerHTML || ''
  return getCharacterCount(content)
})

// History state
const history = ref<Array<{ id: string; html: string; preview: string }>>([])
const historyIndex = ref(-1)
const isApplyingHistory = ref(false)

// Context menu state
const showContextMenu = ref(false)
const contextMenuPosition = ref({ top: 0, left: 0 })

// UI state
const isFullScreen = ref(false)
const fontSize = ref<'small' | 'normal' | 'large' | 'huge'>('normal')
const spellCheckEnabled = ref(false)
const formatPainterActive = ref(false)
const currentTable = ref<HTMLTableElement | null>(null)
const currentCell = ref<HTMLTableCellElement | null>(null)
const tableDesignerPosition = ref({ x: 0, y: 0 })
const tablePropertiesMode = ref<'cell' | 'table' | 'both'>('both')
const initialCellProps = ref({})
const initialTableProps = ref({})

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

// Constants for block-level elements
const BLOCK_ELEMENT_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote']

// Selection management
const rememberSelection = () => {
  savedRange.value = saveSelection()
  // Hide floating toolbar when interacting with main toolbar to prevent pointer event interference
  showFloatingToolbar.value = false
}

/**
 * Checks if an element or document fragment has no meaningful text content.
 * @param element - The HTMLElement or DocumentFragment to check
 * @returns true if the element contains only whitespace or no content
 */
const isEmptyContent = (element: HTMLElement | DocumentFragment): boolean => {
  let content: string | null | undefined
  
  if (element instanceof DocumentFragment) {
    content = Array.from(element.childNodes).map(n => n.textContent).join('')
  } else {
    content = element.textContent
  }
  
  return !content?.trim()
}

/**
 * Ensures an element is visible in the editor by adding a <br> tag if it's empty.
 * This is necessary because empty block elements collapse and become invisible.
 * @param element - The HTMLElement to make visible
 */
const ensureVisibleElement = (element: HTMLElement) => {
  if (isEmptyContent(element) && !element.querySelector('br')) {
    element.innerHTML = '<br>'
  }
}

/**
 * Populates a new element with extracted content, ensuring it remains visible.
 * @param element - The element to populate
 * @param content - The DocumentFragment containing extracted content
 */
const populateNewElement = (element: HTMLElement, content: DocumentFragment) => {
  if (content.childNodes.length === 0) {
    element.innerHTML = '<br>'
  } else {
    element.appendChild(content)
    ensureVisibleElement(element)
  }
}

const createFallbackSelection = (root: HTMLElement) => {
  const selection = window.getSelection()
  if (selection) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false) // Collapse to end
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

const performWithSelection = (action: (root: HTMLElement) => void) => {
  const root = editorContent.value
  if (!root) return

  // Check if there's currently a selection in the editor
  const currentSelection = window.getSelection()
  const hasActiveSelection = currentSelection && 
                             currentSelection.rangeCount > 0 && 
                             !currentSelection.isCollapsed &&
                             root.contains(currentSelection.anchorNode)

  // If there's an active selection in the editor, use it (don't restore saved)
  // Otherwise, try to restore the saved selection
  if (!hasActiveSelection && savedRange.value) {
    try {
      // Verify the range is still valid and within the editor
      if (savedRange.value.startContainer && root.contains(savedRange.value.startContainer)) {
        restoreSelection(savedRange.value)
      } else {
        // If saved range is invalid, focus the editor at the end
        root.focus()
        createFallbackSelection(root)
      }
    } catch (error) {
      console.warn('Failed to restore saved selection, falling back to end of editor', error)
      root.focus()
      createFallbackSelection(root)
    }
  } else if (!hasActiveSelection) {
    // No saved selection and no active selection, place cursor at end
    root.focus()
    createFallbackSelection(root)
  } else {
    // There's an active selection, just ensure editor has focus
    root.focus()
  }

  try {
    action(root)
  } catch (error) {
    console.warn('Formatting action failed', error)
  }

  // Save the new selection state after the action
  savedRange.value = saveSelection()
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

const openFileManagerModal = () => {
  showFileManagerModal.value = true
}

const closeFileManagerModal = () => {
  showFileManagerModal.value = false
}

const handleInsertFile = (file: any) => {
  if (!editorContent.value) return
  
  // Insert file based on its type
  if (file.type.startsWith('image/')) {
    // Insert as image
    performWithSelection((root) => insertImageUtil(root, file.url, file.name))
  } else {
    // Insert as link for other file types
    performWithSelection(() => {
      const selection = window.getSelection()
      if (!selection || !selection.rangeCount) return
      
      const range = selection.getRangeAt(0)
      const link = document.createElement('a')
      link.href = file.url
      link.textContent = file.name
      link.download = file.name
      link.target = '_blank'
      
      range.deleteContents()
      range.insertNode(link)
      range.collapse(false)
    })
  }
  
  showFileManagerModal.value = false
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
  // Close colors dropdown after a short delay for better visual feedback
  setTimeout(() => {
    showColorsDropdown.value = false
  }, 300)
}

const handleBackgroundColor = (color: string) => {
  performWithSelection((root) => applyBackgroundColor(root, color))
  // Close colors dropdown after a short delay for better visual feedback
  setTimeout(() => {
    showColorsDropdown.value = false
  }, 300)
}

// Font size action
const handleFontSize = (size: 'small' | 'normal' | 'large' | 'huge') => {
  fontSize.value = size
  performWithSelection((root) => applyFontSize(root, size))
}

// Format Painter actions
const handleCopyFormat = () => {
  const selection = window.getSelection()
  copyFormat(selection)
  formatPainterActive.value = true
}

const handlePasteFormat = () => {
  if (!editorContent.value) return
  const selection = window.getSelection()
  const success = pasteFormat(selection)
  if (success) {
    formatPainterActive.value = false
    captureSnapshot()
  }
}

// Template actions
const openTemplateModal = () => {
  showTemplateModal.value = true
}

const closeTemplateModal = () => {
  showTemplateModal.value = false
}

const handleSelectTemplate = (template: any) => {
  if (editorContent.value) {
    editorContent.value.innerHTML = template.content
    captureSnapshot()
  }
}

// HTML code modal actions
const openHtmlCodeModal = () => {
  showHtmlCodeModal.value = true
}

const closeHtmlCodeModal = () => {
  showHtmlCodeModal.value = false
}

// Page management actions
const handleInsertPageBreak = () => {
  if (!editorContent.value) return
  const selection = window.getSelection()
  insertPageBreak(selection)
  captureSnapshot()
}

const handleInsertTOC = () => {
  if (!editorContent.value) return
  const selection = window.getSelection()
  insertTableOfContents(editorContent.value, selection)
  captureSnapshot()
}

// Spell check actions
const handleToggleSpellCheck = () => {
  if (!editorContent.value) return
  const newState = toggleSpellCheck(editorContent.value)
  spellCheckEnabled.value = newState
}

// Insert horizontal rule
const handleInsertHR = () => {
  performWithSelection(() => insertHorizontalRule())
}

// Table actions
const openTableModal = () => {
  showTableModal.value = true
}

const closeTableModal = () => {
  showTableModal.value = false
}

const handleInsertTable = (data: { rows: number; cols: number; includeHeader: boolean }) => {
  performWithSelection((root) => {
    insertTableUtil(root, data.rows, data.cols, data.includeHeader)
    
    // Show success notification
    showToastNotification(`✓ Table (${data.rows}×${data.cols}) inserted successfully!`)
    
    // Find the newly inserted table and scroll to it
    nextTick(() => {
      const tables = editorContent.value?.querySelectorAll('table')
      if (tables && tables.length > 0) {
        const lastTable = tables[tables.length - 1]
        lastTable.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  })
}

// Table designer actions
const handleAddRowAbove = () => {
  if (!currentTable.value || !currentCell.value) return
  const row = currentCell.value.parentElement as HTMLTableRowElement
  const tbody = row.parentElement as HTMLTableSectionElement
  if (!tbody) return
  
  const rowIndex = Array.from(tbody.rows).indexOf(row)
  addTableRow(currentTable.value, rowIndex)
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleAddRowBelow = () => {
  if (!currentTable.value || !currentCell.value) return
  const row = currentCell.value.parentElement as HTMLTableRowElement
  const tbody = row.parentElement as HTMLTableSectionElement
  if (!tbody) return
  
  const rowIndex = Array.from(tbody.rows).indexOf(row)
  addTableRow(currentTable.value, rowIndex + 1)
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleAddColumnLeft = () => {
  if (!currentTable.value || !currentCell.value) return
  const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
  addTableColumn(currentTable.value, cellIndex)
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleAddColumnRight = () => {
  if (!currentTable.value || !currentCell.value) return
  const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
  addTableColumn(currentTable.value, cellIndex + 1)
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleRemoveRow = () => {
  if (!currentTable.value || !currentCell.value) return
  const row = currentCell.value.parentElement as HTMLTableRowElement
  const tbody = row.parentElement as HTMLTableSectionElement
  if (!tbody) return
  
  const rowIndex = Array.from(tbody.rows).indexOf(row)
  removeTableRow(currentTable.value, rowIndex)
  showTableDesigner.value = false
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleRemoveColumn = () => {
  if (!currentTable.value || !currentCell.value) return
  const cellIndex = Array.from(currentCell.value.parentElement?.children || []).indexOf(currentCell.value)
  removeTableColumn(currentTable.value, cellIndex)
  showTableDesigner.value = false
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

const handleDeleteTable = () => {
  if (!currentTable.value) return
  deleteTable(currentTable.value)
  showTableDesigner.value = false
  currentTable.value = null
  currentCell.value = null
  emit('update:modelValue', editorContent.value?.innerHTML || '')
}

// Table properties handlers
const handleCellProperties = () => {
  if (!currentCell.value) return
  
  initialCellProps.value = getCellProperties(currentCell.value)
  tablePropertiesMode.value = 'cell'
  showTablePropertiesModal.value = true
}

const handleTableProperties = () => {
  if (!currentTable.value) return
  
  initialTableProps.value = getTableProperties(currentTable.value)
  tablePropertiesMode.value = 'table'
  showTablePropertiesModal.value = true
}

const closeTablePropertiesModal = () => {
  showTablePropertiesModal.value = false
}

const handleApplyTableProperties = (data: {
  cellProps?: {
    backgroundColor?: string
    textAlign?: string
    verticalAlign?: string
    padding?: number
    width?: string
    height?: string
  }
  tableProps?: {
    borderStyle?: string
    borderWidth?: number
    borderColor?: string
    width?: string
    backgroundColor?: string
    borderCollapse?: boolean
  }
}) => {
  if (data.cellProps && currentCell.value) {
    applyCellProperties(currentCell.value, data.cellProps)
  }
  
  if (data.tableProps && currentTable.value) {
    applyTableProperties(currentTable.value, data.tableProps)
  }
  
  emit('update:modelValue', editorContent.value?.innerHTML || '')
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
  // Using non-standard window.find() - widely supported but deprecated
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
  performWithSelection(() => {
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

// Toast notification state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const showToastNotification = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000) // Hide after 3 seconds
}

// Export actions
const handleExportHtml = () => {
  if (!editorContent.value) return
  try {
    exportAsHtml(editorContent.value.innerHTML)
    showToastNotification('✓ HTML file exported successfully!')
  } catch (error) {
    console.error('Failed to export HTML:', error)
    showToastNotification('✗ Failed to export HTML file', 'error')
  }
}

const handleExportMarkdown = () => {
  if (!editorContent.value) return
  try {
    exportAsMarkdown(editorContent.value.innerHTML)
    showToastNotification('✓ Markdown file exported successfully!')
  } catch (error) {
    console.error('Failed to export Markdown:', error)
    showToastNotification('✗ Failed to export Markdown file', 'error')
  }
}

// Format HTML action
const handleFormatHtml = () => {
  if (!editorContent.value) return
  const formatted = formatHtml(editorContent.value.innerHTML)
  editorContent.value.innerHTML = formatted
  htmlContent.value = formatted
  captureSnapshot()
}

const handleExportPdf = async () => {
  if (!editorContent.value) return
  try {
    await exportAsPdf(editorContent.value)
    showToastNotification('✓ PDF file exported successfully!')
  } catch (error) {
    console.error('Failed to export PDF:', error)
    showToastNotification('✗ Failed to export PDF file', 'error')
  }
}

const handleExportWord = async () => {
  if (!editorContent.value) return
  try {
    await exportAsWord(editorContent.value.innerHTML)
    showToastNotification('✓ Word document exported successfully!')
  } catch (error) {
    console.error('Failed to export Word:', error)
    showToastNotification('✗ Failed to export Word document', 'error')
  }
}

// Emoji picker actions
const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
}

const handleInsertEmoji = (emoji: string) => {
  performWithSelection(() => {
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
  
  // Clear any existing timer
  if (floatingToolbarTimer.value) {
    clearTimeout(floatingToolbarTimer.value)
    floatingToolbarTimer.value = null
  }
  
  // Check if we have a valid text selection
  if (selection && !selection.isCollapsed) {
    const selectedText = selection.toString().trim()
    // Show toolbar immediately if there's selected text (even short selections)
    if (selectedText.length > 0) {
      showFloatingToolbar.value = true
    } else {
      showFloatingToolbar.value = false
    }
  } else {
    // No selection or collapsed - hide toolbar
    showFloatingToolbar.value = false
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
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/></svg>',
    onClick: () => handleBlockAction('p'),
    isActive: () => isBlockActionActive('p'),
  },
  { divider: true },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 10v2h2v-2h-2zm0-3v2h2V9h-2z"/></svg>',
    shortcut: 'Ctrl+Alt+1',
    onClick: () => handleBlockAction('h1'),
    isActive: () => isBlockActionActive('h1'),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 10v2h4v-2l-2-2.5a1 1 0 0 1 1-1.5h1V9h-2a2 2 0 0 0-2 3.5L13 14h-1z"/></svg>',
    shortcut: 'Ctrl+Alt+2',
    onClick: () => handleBlockAction('h2'),
    isActive: () => isBlockActionActive('h2'),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v5h4V2h2v12h-2V9H4v5H2V2zm10 7a1.5 1.5 0 0 0 0 3h1v2h-2v-1h-1v2h4v-3a1.5 1.5 0 0 0 0-3h-1V8h2V7h-3v2z"/></svg>',
    shortcut: 'Ctrl+Alt+3',
    onClick: () => handleBlockAction('h3'),
    isActive: () => isBlockActionActive('h3'),
  },
])

const inlineFormatActions = computed(() => [
  {
    id: 'bold',
    label: 'Bold',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h5a3.5 3.5 0 0 1 2.5 6A3.5 3.5 0 0 1 9 14H4V2zm5 5.5A1.5 1.5 0 0 0 9 4H6v3h3zm0 5A1.5 1.5 0 0 0 9 10H6v3h3z"/></svg>',
    tooltip: 'Bold (Ctrl+B)',
    onClick: () => handleInlineAction('strong'),
    isActive: () => isInlineActionActive('strong'),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2h6v2H9.5l-2 8H10v2H4v-2h2.5l2-8H6V2z"/></svg>',
    tooltip: 'Italic (Ctrl+I)',
    onClick: () => handleInlineAction('em'),
    isActive: () => isInlineActionActive('em'),
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 14v-1h10v1H3zm5-12v7a2 2 0 1 0 4 0V2h2v7a4 4 0 1 1-8 0V2h2z"/></svg>',
    tooltip: 'Underline (Ctrl+U)',
    onClick: () => handleInlineAction('u'),
    isActive: () => isInlineActionActive('u'),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h12v1H2V8zm6-6a3.5 3.5 0 0 0-3.5 3.5H3A5 5 0 0 1 8 .5a5 5 0 0 1 4.027 2H10.5A3.5 3.5 0 0 0 8 2zm0 12a3.5 3.5 0 0 1-3.5-3.5H3A5 5 0 0 0 8 15.5a5 5 0 0 0 4.027-2H10.5A3.5 3.5 0 0 1 8 14z"/></svg>',
    tooltip: 'Strikethrough',
    onClick: () => handleInlineAction('s'),
    isActive: () => isInlineActionActive('s'),
  },
])

const alignmentDropdownItems = computed(() => [
  {
    id: 'align-left',
    label: 'Align Left',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h8v1H2V5zm0 3h12v1H2V8zm0 3h8v1H2v-1zm0 3h12v1H2v-1z"/></svg>',
    onClick: () => handleTextAlignment('left'),
  },
  {
    id: 'align-center',
    label: 'Center',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm2 3h8v1H4V5zm-2 3h12v1H2V8zm2 3h8v1H4v-1zm-2 3h12v1H2v-1z"/></svg>',
    onClick: () => handleTextAlignment('center'),
  },
  {
    id: 'align-right',
    label: 'Align Right',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm4 3h8v1H6V5zm-4 3h12v1H2V8zm4 3h8v1H6v-1zm-4 3h12v1H2v-1z"/></svg>',
    onClick: () => handleTextAlignment('right'),
  },
  {
    id: 'align-justify',
    label: 'Justify',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h12v1H2V8zm0 3h12v1H2v-1zm0 3h12v1H2v-1z"/></svg>',
    onClick: () => handleTextAlignment('justify'),
  },
])

const fontSizeDropdownItems = computed(() => [
  {
    id: 'size-small',
    label: 'Small',
    onClick: () => handleFontSize('small'),
    isActive: () => fontSize.value === 'small',
  },
  {
    id: 'size-normal',
    label: 'Normal',
    onClick: () => handleFontSize('normal'),
    isActive: () => fontSize.value === 'normal',
  },
  {
    id: 'size-large',
    label: 'Large',
    onClick: () => handleFontSize('large'),
    isActive: () => fontSize.value === 'large',
  },
  {
    id: 'size-huge',
    label: 'Huge',
    onClick: () => handleFontSize('huge'),
    isActive: () => fontSize.value === 'huge',
  },
])

const listActions = computed(() => [
  {
    id: 'bullet-list',
    label: 'Bullet List',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="2.5" cy="3.5" r="1.5"/><path d="M5 3h9v1H5V3z"/><circle cx="2.5" cy="8" r="1.5"/><path d="M5 7.5h9v1H5v-1z"/><circle cx="2.5" cy="12.5" r="1.5"/><path d="M5 12h9v1H5v-1z"/></svg>',
    tooltip: 'Bullet list',
    onClick: () => handleListAction('ul'),
    isActive: () => isListActionActive('ul'),
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h1v3H2V2zm0 4h1v1H1v-.5L2 6H1V5h2v1zM1 10h2v1H1v1h2v1H1v-3zm4-7h9v1H5V3zm0 4.5h9v1H5v-1zm0 4.5h9v1H5v-1z"/></svg>',
    tooltip: 'Numbered list',
    onClick: () => handleListAction('ol'),
    isActive: () => isListActionActive('ol'),
  },
  {
    id: 'increase-indent',
    label: 'Increase Indent',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h10v1H3V2zm0 3h10v1H3V5zm0 3h10v1H3V8zm0 3h10v1H3v-1zm0 3h10v1H3v-1zM1 5.5l2 2-2 2v-4z"/></svg>',
    tooltip: 'Increase indent (Tab)',
    onClick: () => {
      if (editorContent.value && indentListItem(editorContent.value)) {
        captureSnapshot()
      }
    },
  },
  {
    id: 'decrease-indent',
    label: 'Decrease Indent',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h10v1H3V2zm0 3h10v1H3V5zm0 3h10v1H3V8zm0 3h10v1H3v-1zm0 3h10v1H3v-1zM3 5.5l-2 2 2 2v-4z"/></svg>',
    tooltip: 'Decrease indent (Shift+Tab)',
    onClick: () => {
      if (editorContent.value && outdentListItem(editorContent.value)) {
        captureSnapshot()
      }
    },
  },
])

const insertDropdownItems = computed(() => [
  {
    id: 'link',
    label: 'Link',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 11a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1h-3zm-2-3a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8zm-2-3a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1h-1V5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v1h-1a2 2 0 0 1-2-2V5z"/></svg>',
    shortcut: 'Ctrl+K',
    onClick: insertLink,
  },
  {
    id: 'image',
    label: 'Image',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 1v7.5l3-3 2.5 2.5 4-4L14 7.5V3H3zm8.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
    onClick: insertImage,
  },
  {
    id: 'file-manager',
    label: 'File Manager',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a1 1 0 0 1 1-1h4l1 1h5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2zm2 1v8h9V4H7L6 3H4z"/></svg>',
    onClick: openFileManagerModal,
  },
  {
    id: 'video',
    label: 'Video',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm9 1v8l4-4-4-4z"/></svg>',
    onClick: openEmbedModal,
  },
  { divider: true },
  {
    id: 'table',
    label: 'Table',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v12H2V2zm1 1v3h4V3H3zm5 0v3h5V3H8zM3 7v3h4V7H3zm5 0v3h5V7H8zM3 11v2h4v-2H3zm5 0v2h5v-2H8z"/></svg>',
    onClick: openTableModal,
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5zM7 6h2v1H7V6zm0 2h2v1H7V8zm0 2h2v1H7v-1z"/></svg>',
    onClick: openCodeBlockModal,
  },
  {
    id: 'hr',
    label: 'Horizontal Rule',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h12v1H2V8z"/></svg>',
    onClick: handleInsertHR,
  },
  {
    id: 'page-break',
    label: 'Page Break',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v1H2V2zm7 0h5v1H9V2zM2 6h1v1H2V6zm3 0h1v1H5V6zm3 0h1v1H8V6zm3 0h1v1h-1V6zm3 0h1v1h-1V6zM2 8h12v1H2V8zm0 4h5v1H2v-1zm7 0h5v1H9v-1z"/></svg>',
    onClick: handleInsertPageBreak,
  },
  {
    id: 'toc',
    label: 'Table of Contents',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h2v2H2V2zm3 0h9v2H5V2zM2 6h2v2H2V6zm3 0h9v2H5V6zM2 10h2v2H2v-2zm3 0h9v2H5v-2z"/></svg>',
    onClick: handleInsertTOC,
  },
  {
    id: 'emoji',
    label: 'Emoji',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/><path d="M5 10c0 1.5 1.3 3 3 3s3-1.5 3-3H5z"/></svg>',
    onClick: toggleEmojiPicker,
  },
])

const toolActions = computed(() => [
  {
    id: 'view-html',
    label: 'View HTML Code',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5z"/></svg>',
    tooltip: 'View formatted HTML code',
    onClick: openHtmlCodeModal,
  },
  {
    id: 'find',
    label: 'Find & Replace',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    tooltip: 'Find & Replace (Ctrl+F)',
    onClick: openFindReplaceModal,
  },
  {
    id: 'spell-check-toggle',
    label: 'Toggle Spell Check',
    icon: spellCheckEnabled.value ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 3l-8 8-3-3-1 1 4 4 9-9-1-1z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v1H3V3zm0 3h10v1H3V6zm0 3h10v1H3V9zm0 3h6v1H3v-1z"/></svg>',
    tooltip: spellCheckEnabled.value ? 'Disable Spell Check' : 'Enable Spell Check',
    onClick: handleToggleSpellCheck,
    isActive: () => spellCheckEnabled.value,
  },
  {
    id: 'export-html',
    label: 'Export HTML',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="1" y="12" font-size="10" font-weight="bold" fill="currentColor">HTML</text></svg>',
    tooltip: 'Export as HTML (.html)',
    onClick: handleExportHtml,
  },
  {
    id: 'export-md',
    label: 'Export Markdown',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="2" y="12" font-size="11" font-weight="bold" fill="currentColor">MD</text></svg>',
    tooltip: 'Export as Markdown (.md)',
    onClick: handleExportMarkdown,
  },
  {
    id: 'export-pdf',
    label: 'Export PDF',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="1" y="12" font-size="10" font-weight="bold" fill="currentColor">PDF</text></svg>',
    tooltip: 'Export as PDF (.pdf)',
    onClick: handleExportPdf,
  },
  {
    id: 'export-word',
    label: 'Export Word',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="1" y="12" font-size="10" font-weight="bold" fill="currentColor">DOCX</text></svg>',
    tooltip: 'Export as Word (.docx)',
    onClick: handleExportWord,
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3v4H3V4h3V3H2zm11 0h-4v1h3v3h1V3zM3 9H2v4h4v-1H3V9zm10 0v3h-3v1h4V9h-1z"/></svg>',
    tooltip: 'Toggle fullscreen',
    onClick: toggleFullScreen,
    isActive: () => isFullScreen.value,
  },
])

const productivityDropdownItems = computed(() => [
  {
    id: 'format-painter-copy',
    label: 'Copy Format',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h1v2H3V2h1V1zM3 4h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/></svg>',
    onClick: handleCopyFormat,
  },
  {
    id: 'format-painter-paste',
    label: 'Paste Format',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3h2V2zm1 0v1h4V2H6zM4 4v9h8V4H4z"/></svg>',
    onClick: handlePasteFormat,
    disabled: !hasFormatCopied(),
  },
  { divider: true },
  {
    id: 'spell-check',
    label: spellCheckEnabled.value ? 'Disable Spell Check' : 'Enable Spell Check',
    icon: spellCheckEnabled.value ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 3l-8 8-3-3-1 1 4 4 9-9-1-1z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h1v12H2V2zm11 0h1v12h-1V2zM5 5h6v1H5V5zm0 3h6v1H5V8zm0 3h6v1H5v-1z"/></svg>',
    onClick: handleToggleSpellCheck,
  },
  { divider: true },
  {
    id: 'templates',
    label: 'Templates',
    icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h4v4H2V2zm5 0h4v4H7V2zm5 0h2v4h-2V2zM2 7h4v4H2V7zm5 0h4v4H7V7zm5 0h2v4h-2V7zM2 12h4v2H2v-2zm5 0h4v2H7v-2zm5 0h2v2h-2v-2z"/></svg>',
    onClick: openTemplateModal,
  },
])

// Command Palette Commands
const commandPaletteCommands = computed(() => [
  // Formatting Commands
  {
    id: 'format-bold',
    name: 'Bold',
    description: 'Make selected text bold',
    icon: '**B**',
    category: 'Formatting',
    shortcut: 'Ctrl+B',
    action: () => document.execCommand('bold'),
  },
  {
    id: 'format-italic',
    name: 'Italic',
    description: 'Make selected text italic',
    icon: '*I*',
    category: 'Formatting',
    shortcut: 'Ctrl+I',
    action: () => document.execCommand('italic'),
  },
  {
    id: 'format-underline',
    name: 'Underline',
    description: 'Underline selected text',
    icon: '__U__',
    category: 'Formatting',
    shortcut: 'Ctrl+U',
    action: () => document.execCommand('underline'),
  },
  // Heading Commands
  {
    id: 'heading-1',
    name: 'Heading 1',
    description: 'Large heading',
    icon: 'H1',
    category: 'Structure',
    shortcut: 'Ctrl+Alt+1',
    action: () => document.execCommand('formatBlock', false, 'h1'),
  },
  {
    id: 'heading-2',
    name: 'Heading 2',
    description: 'Medium heading',
    icon: 'H2',
    category: 'Structure',
    shortcut: 'Ctrl+Alt+2',
    action: () => document.execCommand('formatBlock', false, 'h2'),
  },
  {
    id: 'heading-3',
    name: 'Heading 3',
    description: 'Small heading',
    icon: 'H3',
    category: 'Structure',
    shortcut: 'Ctrl+Alt+3',
    action: () => document.execCommand('formatBlock', false, 'h3'),
  },
  // List Commands
  {
    id: 'list-bullet',
    name: 'Bullet List',
    description: 'Create an unordered list',
    icon: '•',
    category: 'Lists',
    action: () => document.execCommand('insertUnorderedList'),
  },
  {
    id: 'list-numbered',
    name: 'Numbered List',
    description: 'Create an ordered list',
    icon: '1.',
    category: 'Lists',
    action: () => document.execCommand('insertOrderedList'),
  },
  // Insert Commands
  {
    id: 'insert-link',
    name: 'Insert Link',
    description: 'Add a hyperlink',
    icon: '🔗',
    category: 'Insert',
    shortcut: 'Ctrl+K',
    action: insertLink,
  },
  {
    id: 'insert-image',
    name: 'Insert Image',
    description: 'Add an image',
    icon: '🖼️',
    category: 'Insert',
    action: insertImage,
  },
  {
    id: 'insert-table',
    name: 'Insert Table',
    description: 'Add a table',
    icon: '⊞',
    category: 'Insert',
    action: openTableModal,
  },
  {
    id: 'insert-code',
    name: 'Code Block',
    description: 'Insert code with syntax highlighting',
    icon: '</>',
    category: 'Insert',
    action: openCodeBlockModal,
  },
  {
    id: 'insert-emoji',
    name: 'Insert Emoji',
    description: 'Add an emoji',
    icon: '😀',
    category: 'Insert',
    action: toggleEmojiPicker,
  },
  {
    id: 'insert-hr',
    name: 'Horizontal Rule',
    description: 'Insert a dividing line',
    icon: '—',
    category: 'Insert',
    action: handleInsertHR,
  },
  {
    id: 'insert-page-break',
    name: 'Page Break',
    description: 'Insert a page break',
    icon: '📄',
    category: 'Insert',
    action: handleInsertPageBreak,
  },
  {
    id: 'insert-toc',
    name: 'Table of Contents',
    description: 'Generate table of contents',
    icon: '📑',
    category: 'Insert',
    action: handleInsertTOC,
  },
  // Tools
  {
    id: 'find-replace',
    name: 'Find & Replace',
    description: 'Search and replace text',
    icon: '🔍',
    category: 'Tools',
    shortcut: 'Ctrl+F',
    action: openFindReplaceModal,
  },
  {
    id: 'format-painter-copy',
    name: 'Copy Format',
    description: 'Copy text formatting',
    icon: '🖌️',
    category: 'Tools',
    action: handleCopyFormat,
  },
  {
    id: 'templates',
    name: 'Templates',
    description: 'Choose a document template',
    icon: '📚',
    category: 'Tools',
    action: openTemplateModal,
  },
  {
    id: 'toggle-spell-check',
    name: 'Toggle Spell Check',
    description: 'Enable or disable spell checking',
    icon: 'Aa',
    category: 'Tools',
    action: handleToggleSpellCheck,
  },
  // View
  {
    id: 'toggle-theme',
    name: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    icon: '🌓',
    category: 'View',
    action: toggleTheme,
  },
  {
    id: 'fullscreen',
    name: 'Toggle Fullscreen',
    description: 'Enter or exit fullscreen mode',
    icon: '⛶',
    category: 'View',
    action: toggleFullScreen,
  },
  // Export
  {
    id: 'export-html',
    name: 'Export as HTML',
    description: 'Download document as HTML',
    icon: '📄',
    category: 'Export',
    action: handleExportHtml,
  },
  {
    id: 'export-markdown',
    name: 'Export as Markdown',
    description: 'Download document as Markdown',
    icon: '📝',
    category: 'Export',
    action: handleExportMarkdown,
  },
  {
    id: 'export-pdf',
    name: 'Export as PDF',
    description: 'Download document as PDF',
    icon: '📕',
    category: 'Export',
    action: handleExportPdf,
  },
  {
    id: 'export-word',
    name: 'Export as Word',
    description: 'Download document as Word document',
    icon: '📘',
    category: 'Export',
    action: handleExportWord,
  },
  // History
  {
    id: 'undo',
    name: 'Undo',
    description: 'Undo last action',
    icon: '⟲',
    category: 'History',
    shortcut: 'Ctrl+Z',
    action: undo,
  },
  {
    id: 'redo',
    name: 'Redo',
    description: 'Redo last undone action',
    icon: '⟳',
    category: 'History',
    shortcut: 'Ctrl+Shift+Z',
    action: redo,
  },
])

// Handle command execution
function handleCommandExecute(command: any) {
  addToRecent(command.id)
  command.action()
}

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
  htmlContent.value = html // Store HTML for preview mode
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



// Command menu (Slash commands) - Using useSlashCommands composable
const {
  showCommandMenu,
  commandMenuPosition,
  commandOptions,
  openCommandMenu,
  handleCommandOption,
  handleDocumentClick,
  handleEscape,
} = useSlashCommands({
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  insertLink,
  insertImage,
  openTableModal,
  openCodeBlockModal,
  handleInsertHR,
  performWithSelection,
})

// Context menu
const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const selection = window.getSelection()
  const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0
  
  return [
    {
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      onClick: async () => {
        try {
          const text = selection?.toString() ?? ''
          await navigator.clipboard.writeText(text)
          document.execCommand('delete')
        } catch (error) {
          // Fallback to execCommand for older browsers
          document.execCommand('cut')
        }
      },
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      onClick: async () => {
        try {
          const text = selection?.toString() ?? ''
          await navigator.clipboard.writeText(text)
        } catch (error) {
          // Fallback to execCommand for older browsers
          document.execCommand('copy')
        }
      },
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: '📄',
      shortcut: 'Ctrl+V',
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText()
          // Insert text at current position
          const range = window.getSelection()?.getRangeAt(0)
          if (range) {
            range.deleteContents()
            range.insertNode(document.createTextNode(text))
          }
        } catch (error) {
          console.warn('Failed to paste from clipboard. This may require clipboard permissions.', error)
        }
      },
    },
    { divider: true },
    {
      id: 'bold',
      label: 'Bold',
      icon: '𝐁',
      shortcut: 'Ctrl+B',
      disabled: !hasSelection,
      onClick: () => handleInlineAction('strong'),
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: '𝐼',
      shortcut: 'Ctrl+I',
      disabled: !hasSelection,
      onClick: () => handleInlineAction('em'),
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: 'U̲',
      shortcut: 'Ctrl+U',
      disabled: !hasSelection,
      onClick: () => handleInlineAction('u'),
    },
    { divider: true },
    {
      id: 'link',
      label: 'Insert Link',
      icon: '🔗',
      shortcut: 'Ctrl+K',
      onClick: insertLink,
    },
    {
      id: 'image',
      label: 'Insert Image',
      icon: '🖼️',
      onClick: insertImage,
    },
  ]
})

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  
  // Check if the right-click is on a table element
  const target = event.target
  if (target instanceof Element && target.closest('table, td, th')) {
    // Show the TableDesigner at the cursor position for table-specific actions
    const table = getSelectedTable()
    const cell = getSelectedCell()
    
    if (table && cell) {
      currentTable.value = table
      currentCell.value = cell
      
      // Position the designer at the mouse cursor
      const editorRect = editorContent.value?.getBoundingClientRect()
      if (editorRect) {
        tableDesignerPosition.value = {
          x: event.clientX - editorRect.left,
          y: event.clientY - editorRect.top
        }
        showTableDesigner.value = true
      }
    }
    return
  }
  
  // Save the current selection before showing the context menu
  savedRange.value = saveSelection()
  
  showContextMenu.value = true
  contextMenuPosition.value = {
    top: event.clientY,
    left: event.clientX,
  }
}

const closeContextMenu = () => {
  showContextMenu.value = false
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Handle Enter key to prevent cursor jumping
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Delete any selected content first
    if (!range.collapsed) {
      range.deleteContents()
    }
    
    // Find the current block element (p, h1, h2, etc.)
    let currentBlock: HTMLElement | null = null
    let currentBlockTag = ''
    let node: Node | null = range.startContainer
    
    while (node && node !== editorContent.value) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const tagName = element.tagName.toLowerCase()
        if (BLOCK_ELEMENT_TAGS.includes(tagName)) {
          currentBlock = element
          currentBlockTag = tagName
          break
        }
      }
      node = node.parentNode
    }
    
    // If we're in a list item, handle it specially
    if (currentBlock && currentBlockTag === 'li') {
      // Split the list item
      const afterRange = document.createRange()
      afterRange.setStart(range.startContainer, range.startOffset)
      afterRange.setEnd(currentBlock, currentBlock.childNodes.length)
      const afterContent = afterRange.extractContents()
      
      // Create new list item and populate it
      const newLi = document.createElement('li')
      populateNewElement(newLi, afterContent)
      
      // Ensure current list item is visible
      ensureVisibleElement(currentBlock)
      
      // Insert new list item after current one
      if (currentBlock.nextSibling) {
        currentBlock.parentNode?.insertBefore(newLi, currentBlock.nextSibling)
      } else {
        currentBlock.parentNode?.appendChild(newLi)
      }
      
      // Move cursor to new list item
      const newRange = document.createRange()
      newRange.setStart(newLi, 0)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
      
      if (editorContent.value) {
        editorContent.value.dispatchEvent(new Event('input', { bubbles: true }))
      }
      return
    }
    
    // Create a new paragraph for the content after the cursor
    const newParagraph = document.createElement('p')
    
    if (currentBlock) {
      // We're inside a block element - split it
      // Extract content after the cursor
      const afterRange = document.createRange()
      afterRange.setStart(range.startContainer, range.startOffset)
      afterRange.setEnd(currentBlock, currentBlock.childNodes.length)
      const afterContent = afterRange.extractContents()
      
      // Ensure current block is visible
      ensureVisibleElement(currentBlock)
      
      // Add the extracted content to the new paragraph
      populateNewElement(newParagraph, afterContent)
      
      // Insert the new paragraph after the current block
      if (currentBlock.nextSibling) {
        currentBlock.parentNode?.insertBefore(newParagraph, currentBlock.nextSibling)
      } else {
        currentBlock.parentNode?.appendChild(newParagraph)
      }
    } else {
      // No block element found - we need to wrap existing content and create a new paragraph
      if (!editorContent.value) return
      
      try {
        // Extract content before cursor
        const beforeRange = document.createRange()
        beforeRange.setStart(editorContent.value, 0)
        beforeRange.setEnd(range.startContainer, range.startOffset)
        const beforeContent = beforeRange.extractContents()
        
        // Extract content after cursor
        const afterRange = document.createRange()
        afterRange.setStart(range.startContainer, range.startOffset)
        afterRange.setEnd(editorContent.value, editorContent.value.childNodes.length)
        const afterContent = afterRange.extractContents()
        
        // Create first paragraph with content before cursor
        const firstParagraph = document.createElement('p')
        populateNewElement(firstParagraph, beforeContent)
        
        // Create second paragraph with content after cursor
        populateNewElement(newParagraph, afterContent)
        
        // Insert both paragraphs
        editorContent.value.appendChild(firstParagraph)
        editorContent.value.appendChild(newParagraph)
      } catch (error) {
        // If range manipulation fails, fall back to simple paragraph insertion
        console.error('Error handling Enter key:', error)
        newParagraph.innerHTML = '<br>'
        if (editorContent.value.lastChild) {
          editorContent.value.insertBefore(newParagraph, editorContent.value.lastChild.nextSibling)
        } else {
          editorContent.value.appendChild(newParagraph)
        }
      }
    }
    
    // Move cursor to the beginning of the new paragraph
    const newRange = document.createRange()
    newRange.setStart(newParagraph, 0)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
    
    // Trigger input event to capture history
    if (editorContent.value) {
      editorContent.value.dispatchEvent(new Event('input', { bubbles: true }))
    }
    return
  }
  
  // Handle slash command (/) to open quick actions menu
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    // Check if we're at the beginning of a line or in an empty block
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const container = range.startContainer
      
      // Get text before cursor in current text node
      const textBefore = container.nodeType === Node.TEXT_NODE 
        ? (container as Text).data.substring(0, range.startOffset)
        : ''
      
      // Only trigger if at start of line (no text before, or only whitespace)
      if (textBefore.trim().length === 0) {
        event.preventDefault() // Prevent '/' from being inserted
        event.stopPropagation() // Stop event from bubbling
        openCommandMenu()
        return
      }
    }
  }

  // Handle Tab/Shift+Tab for list indentation
  if (event.key === 'Tab' && editorContent.value) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      // Check if we're in a list item
      let node: Node | null = range.startContainer
      while (node && node !== editorContent.value) {
        if (node.nodeName === 'LI') {
          event.preventDefault()
          if (event.shiftKey) {
            // Shift+Tab: outdent
            const success = outdentListItem(editorContent.value)
            if (success) {
              captureSnapshot()
            }
          } else {
            // Tab: indent
            const success = indentListItem(editorContent.value)
            if (success) {
              captureSnapshot()
            }
          }
          return
        }
        node = node.parentNode
      }
    }
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

  // Handle Ctrl+Y for redo (standard Windows/Linux shortcut)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
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
  // Save the selection before losing focus
  savedRange.value = saveSelection()
  // Delay hiding floating toolbar to allow clicks
  setTimeout(() => {
    showFloatingToolbar.value = false
  }, 200)
  emit('blur')
}

const onMouseUp = () => {
  updateFloatingToolbar()
  checkForTableSelection()
}

const checkForTableSelection = () => {
  const table = getSelectedTable()
  const cell = getSelectedCell()
  
  if (table && cell) {
    currentTable.value = table
    currentCell.value = cell
    
    // Position the designer near the table
    const rect = table.getBoundingClientRect()
    const editorRect = editorContent.value?.getBoundingClientRect()
    
    if (editorRect) {
      tableDesignerPosition.value = {
        x: rect.right - editorRect.left + 10,
        y: rect.top - editorRect.top
      }
      showTableDesigner.value = true
    }
  } else {
    showTableDesigner.value = false
    currentTable.value = null
    currentCell.value = null
  }
}

const onSelectionChange = () => {
  updateFloatingToolbar()
  checkForTableSelection()
  
  // Update smart toolbar context
  nextTick(() => {
    if (editorContent.value) {
      updateToolbarContext(editorContent.value)
    }
  })
}

// Code editor handlers
const onCodeInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  codeContent.value = target.value
  
  // Update the hidden WYSIWYG editor with the new HTML
  if (editorContent.value) {
    editorContent.value.innerHTML = target.value
    htmlContent.value = target.value
  }
}

const onCodeBlur = () => {
  // Sync code content to editor when leaving code view
  if (editorContent.value && codeContent.value) {
    editorContent.value.innerHTML = codeContent.value
    htmlContent.value = codeContent.value
    emit('update:modelValue', codeContent.value)
  }
}

// Lifecycle and watchers
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorContent.value) return
    if (isApplyingHistory.value) return
    // Compare sanitized versions to avoid unnecessary innerHTML updates that destroy cursor position
    const currentSanitized = sanitizeHtml(editorContent.value.innerHTML)
    const newSanitized = sanitizeHtml(newValue)
    if (currentSanitized !== newSanitized) {
      isApplyingHistory.value = true
      applySanitizedContent(newValue)
      htmlContent.value = newValue // Update stored HTML
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

// Watch viewMode changes to restore content when switching between modes
watch(viewMode, (newMode, oldMode) => {
  // Handle content restoration and synchronization when switching view modes
  nextTick(() => {
    if (newMode === 'editor' && editorContent.value) {
      // Switching to editor mode - ensure content is loaded
      if (oldMode === 'preview' || oldMode === 'code' || oldMode === 'split') {
        // Restore from stored HTML content if editor is empty
        if (!editorContent.value.innerHTML.trim() && htmlContent.value) {
          editorContent.value.innerHTML = htmlContent.value
        }
      }
    } else if ((newMode === 'code' || newMode === 'split') && editorContent.value) {
      // Switching to code/split mode - sync content and format code
      if (oldMode === 'preview' || oldMode === 'editor') {
        // If switching from preview or editor mode, restore content
        if (!editorContent.value.innerHTML.trim() && htmlContent.value) {
          editorContent.value.innerHTML = htmlContent.value
        }
      }
      
      // Update code editor content with formatted HTML
      const currentHtml = editorContent.value.innerHTML || htmlContent.value || ''
      codeContent.value = formatHtml(currentHtml)
    } else if (newMode === 'preview') {
      // When switching to preview mode, save the current content
      if (editorContent.value) {
        htmlContent.value = editorContent.value.innerHTML
      }
    }
  })
})

// Image resize functionality
const setupImageResizing = () => {
  if (!editorContent.value) return
  
  editorContent.value.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (target.classList.contains('editor-image-resizable') || target.classList.contains('editor-image-wrapper')) {
      const wrapper = target.classList.contains('editor-image-wrapper') 
        ? target 
        : target.closest('.editor-image-wrapper')
      
      if (wrapper) {
        // Remove selected class from all other images
        editorContent.value?.querySelectorAll('.editor-image-wrapper.selected').forEach(el => {
          el.classList.remove('selected')
        })
        
        // Add selected class to clicked image
        wrapper.classList.add('selected')
        
        // Add resize handles if not already present
        if (!wrapper.querySelector('.image-resize-handle')) {
          const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
          handles.forEach(position => {
            const handle = document.createElement('div')
            handle.className = `image-resize-handle ${position}`
            handle.addEventListener('mousedown', (e) => startImageResize(e, wrapper as HTMLElement, position))
            wrapper.appendChild(handle)
          })
        }
      }
    } else {
      // Clicked outside image, remove all selections
      editorContent.value?.querySelectorAll('.editor-image-wrapper.selected').forEach(el => {
        el.classList.remove('selected')
      })
    }
  })
}

let resizeData: { 
  wrapper: HTMLElement; 
  img: HTMLImageElement; 
  startX: number; 
  startY: number; 
  startWidth: number; 
  startHeight: number;
  position: string;
} | null = null

const startImageResize = (event: MouseEvent, wrapper: HTMLElement, position: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  const img = wrapper.querySelector('img') as HTMLImageElement
  if (!img) return
  
  resizeData = {
    wrapper,
    img,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: img.offsetWidth,
    startHeight: img.offsetHeight,
    position
  }
  
  document.addEventListener('mousemove', doImageResize)
  document.addEventListener('mouseup', stopImageResize)
  
  // Prevent text selection during resize
  document.body.style.userSelect = 'none'
}

const doImageResize = (event: MouseEvent) => {
  if (!resizeData) return
  
  const { img, startX, startY, startWidth, startHeight, position } = resizeData
  
  let newWidth = startWidth
  let newHeight = startHeight
  
  if (position.includes('right')) {
    newWidth = startWidth + (event.clientX - startX)
  } else if (position.includes('left')) {
    newWidth = startWidth - (event.clientX - startX)
  }
  
  if (position.includes('bottom')) {
    newHeight = startHeight + (event.clientY - startY)
  } else if (position.includes('top')) {
    newHeight = startHeight - (event.clientY - startY)
  }
  
  // Maintain aspect ratio
  const aspectRatio = startWidth / startHeight
  if (Math.abs(newWidth / newHeight - aspectRatio) > 0.1) {
    newHeight = newWidth / aspectRatio
  }
  
  // Set minimum size
  if (newWidth > 50 && newHeight > 50) {
    img.style.width = `${newWidth}px`
    img.style.height = `${newHeight}px`
    img.style.maxWidth = '100%'
  }
}

const stopImageResize = () => {
  if (resizeData) {
    document.removeEventListener('mousemove', doImageResize)
    document.removeEventListener('mouseup', stopImageResize)
    document.body.style.userSelect = ''
    
    // Capture snapshot for undo/redo
    captureSnapshot()
    
    resizeData = null
  }
}

onMounted(() => {
  if (editorContent.value) {
    applySanitizedContent(props.modelValue)
    captureSnapshot(false)
    editorContent.value.addEventListener('keydown', handleKeydown)
    // Enable spell check by default
    enableSpellCheck(editorContent.value)
    spellCheckEnabled.value = true
    
    // Initialize code editor content
    codeContent.value = formatHtml(props.modelValue || '')
    
    // Setup image resizing
    setupImageResizing()
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
  position: relative;
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

/* Context Hints (Smart Toolbar) */
.context-hints {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--editor-border);
  font-size: 12px;
  color: var(--toolbar-text);
  flex-wrap: wrap;
}

.context-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--history-bg);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
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

.code-editor {
  width: 100%;
  height: 100%;
  min-height: 240px;
  max-height: 640px;
  padding: 20px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--content-color);
  background: var(--editor-bg);
  border: none;
  outline: none;
  resize: vertical;
  overflow-y: auto;
  white-space: pre;
  word-wrap: normal;
  overflow-x: auto;
  tab-size: 2;
}

.code-editor:focus {
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

/* Resizable Image Styles */
.editor-content :deep(.editor-image-wrapper) {
  display: inline-block;
  position: relative;
  max-width: 100%;
  margin: 10px 0;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.editor-content :deep(.editor-image-wrapper:hover) {
  border-color: var(--toolbar-accent);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.editor-content :deep(.editor-image-wrapper.selected) {
  border-color: var(--toolbar-accent);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
}

.editor-content :deep(.editor-image-resizable) {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  cursor: pointer;
}

.editor-content :deep(.editor-image-wrapper)::after {
  content: '↔️ Drag to resize';
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.editor-content :deep(.editor-image-wrapper:hover)::after {
  opacity: 1;
}

.editor-content :deep(.image-resize-handle) {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid var(--toolbar-accent);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.2s;
}

.editor-content :deep(.editor-image-wrapper:hover .image-resize-handle),
.editor-content :deep(.editor-image-wrapper.selected .image-resize-handle) {
  opacity: 1;
}

.editor-content :deep(.image-resize-handle.bottom-right) {
  bottom: -6px;
  right: -6px;
  cursor: nwse-resize;
}

.editor-content :deep(.image-resize-handle.bottom-left) {
  bottom: -6px;
  left: -6px;
  cursor: nesw-resize;
}

.editor-content :deep(.image-resize-handle.top-right) {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.editor-content :deep(.image-resize-handle.top-left) {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

/* Table Resize Styles */
.editor-content :deep(table) {
  position: relative;
  resize: both;
  overflow: auto;
  min-width: 200px;
}

.editor-content :deep(table)::after {
  content: '⇲';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--toolbar-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: se-resize;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.2s;
}

.editor-content :deep(table:hover)::after {
  opacity: 1;
  background: rgba(59, 130, 246, 0.2);
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

.toolbar-btn-modern:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
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

/* View Mode Toggle Styles */
.view-mode-group {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--editor-border);
  border-radius: 6px;
}

.view-mode-btn {
  min-width: 36px;
  height: 28px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: var(--toolbar-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.view-mode-btn.with-text {
  padding: 0 12px;
  min-width: 80px;
}

.view-mode-btn .btn-label {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.view-mode-btn:hover {
  background: var(--toolbar-hover);
}

.view-mode-btn.active {
  background: var(--editor-bg);
  color: var(--toolbar-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-mode-btn:focus {
  outline: 2px solid var(--toolbar-accent);
  outline-offset: 2px;
}

/* Tooltips for view mode buttons */
.view-mode-btn[data-tooltip]::after {
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

.view-mode-btn[data-tooltip]:hover::after {
  opacity: 1;
}

/* Editor Container with Split View */
.editor-container {
  display: flex;
  gap: 0;
  position: relative;
  border-top: 1px solid var(--editor-border);
}

.editor-container.view-mode-editor {
  display: block;
}

.editor-container.view-mode-code {
  display: block;
}

.editor-container.view-mode-split {
  display: flex;
}

.editor-container.view-mode-preview {
  display: block;
}

.editor-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.split-divider {
  width: 1px;
  background: var(--editor-border);
  flex-shrink: 0;
}

.preview-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg);
}

.preview-header {
  padding: 8px 16px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--editor-border);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--toolbar-text);
}

.preview-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--content-color);
}

.preview-content-wrapper .empty-preview {
  color: var(--placeholder-color);
  font-style: italic;
}

/* Preview content styling (matches editor content) */
.preview-content-wrapper :deep(h1),
.preview-content-wrapper :deep(h2),
.preview-content-wrapper :deep(h3),
.preview-content-wrapper :deep(h4),
.preview-content-wrapper :deep(h5),
.preview-content-wrapper :deep(h6) {
  margin: 18px 0 10px;
  font-weight: 700;
  line-height: 1.25;
}

.preview-content-wrapper :deep(h1) {
  font-size: 2.2em;
}

.preview-content-wrapper :deep(h2) {
  font-size: 1.8em;
}

.preview-content-wrapper :deep(h3) {
  font-size: 1.4em;
}

.preview-content-wrapper :deep(p) {
  margin: 10px 0;
}

.preview-content-wrapper :deep(ul),
.preview-content-wrapper :deep(ol) {
  margin: 12px 0;
  padding-left: 26px;
}

.preview-content-wrapper :deep(li) {
  margin: 4px 0;
}

.preview-content-wrapper :deep(a) {
  color: var(--toolbar-accent);
  text-decoration: underline;
}

.preview-content-wrapper :deep(a):hover {
  color: #1d4ed8;
}

.preview-content-wrapper :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 6px;
}

.preview-content-wrapper :deep(code) {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.preview-content-wrapper :deep(pre) {
  background: var(--code-bg);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.preview-content-wrapper :deep(pre code) {
  background: transparent;
  padding: 0;
}

.preview-content-wrapper :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid var(--toolbar-accent);
  background: rgba(59, 130, 246, 0.05);
  font-style: italic;
}

.preview-content-wrapper :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.preview-content-wrapper :deep(table th),
.preview-content-wrapper :deep(table td) {
  border: 1px solid var(--editor-border);
  padding: 10px;
  text-align: left;
}

.preview-content-wrapper :deep(table th) {
  background: var(--toolbar-bg);
  font-weight: 600;
}

.preview-content-wrapper :deep(hr) {
  border: none;
  border-top: 2px solid var(--editor-border);
  margin: 24px 0;
}

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

/* Tooltips for dropdown triggers */
.dropdown-trigger[data-tooltip]::after {
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

.dropdown-trigger[data-tooltip]:hover::after {
  opacity: 1;
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

/* Editor Container with Split View */
.editor-container {
  display: flex;
  gap: 0;
  position: relative;
}

.editor-container.view-mode-editor {
  display: block;
}

.editor-container.view-mode-code {
  display: block;
}

.editor-container.view-mode-split {
  display: flex;
}

.editor-container.view-mode-preview {
  display: block;
}

.editor-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.split-divider {
  width: 1px;
  background: var(--editor-border);
  flex-shrink: 0;
}

.preview-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg);
}

.preview-header {
  padding: 8px 16px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--editor-border);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--toolbar-text);
}

.preview-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--content-color);
  min-height: 240px;
  max-height: 640px;
}

.preview-content-wrapper .empty-preview {
  color: var(--placeholder-color);
  font-style: italic;
}

/* Preview content styling (matches editor content) */
.preview-content-wrapper :deep(h1),
.preview-content-wrapper :deep(h2),
.preview-content-wrapper :deep(h3),
.preview-content-wrapper :deep(h4),
.preview-content-wrapper :deep(h5),
.preview-content-wrapper :deep(h6) {
  margin: 18px 0 10px;
  font-weight: 700;
  line-height: 1.25;
}

.preview-content-wrapper :deep(h1) {
  font-size: 2.2em;
}

.preview-content-wrapper :deep(h2) {
  font-size: 1.8em;
}

.preview-content-wrapper :deep(h3) {
  font-size: 1.4em;
}

.preview-content-wrapper :deep(p) {
  margin: 10px 0;
}

.preview-content-wrapper :deep(ul),
.preview-content-wrapper :deep(ol) {
  margin: 12px 0;
  padding-left: 26px;
}

.preview-content-wrapper :deep(li) {
  margin: 4px 0;
}

.preview-content-wrapper :deep(a) {
  color: var(--toolbar-accent);
  text-decoration: underline;
}

.preview-content-wrapper :deep(a):hover {
  color: #1d4ed8;
}

.preview-content-wrapper :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 6px;
}

.preview-content-wrapper :deep(code) {
  background: rgba(15, 23, 42, 0.08);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.92em;
}

.theme-dark .preview-content-wrapper :deep(code) {
  background: rgba(148, 163, 184, 0.2);
}

.preview-content-wrapper :deep(pre) {
  background: rgba(15, 23, 42, 0.08);
  padding: 16px;
  border-radius: 10px;
  overflow: auto;
}

.theme-dark .preview-content-wrapper :deep(pre) {
  background: rgba(148, 163, 184, 0.12);
}

.preview-content-wrapper :deep(blockquote) {
  border-left: 4px solid var(--toolbar-accent);
  margin: 16px 0;
  padding-left: 16px;
  color: var(--toolbar-text);
  font-style: italic;
  background: rgba(59, 130, 246, 0.06);
}

.theme-dark .preview-content-wrapper :deep(blockquote) {
  background: rgba(59, 130, 246, 0.12);
}

.preview-content-wrapper :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 0.95em;
}

.preview-content-wrapper :deep(table th) {
  background: rgba(59, 130, 246, 0.08);
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--editor-border);
}

.theme-dark .preview-content-wrapper :deep(table th) {
  background: rgba(96, 165, 250, 0.12);
}

.preview-content-wrapper :deep(table td) {
  padding: 8px 12px;
  border: 1px solid var(--editor-border);
}

.preview-content-wrapper :deep(table tr:hover) {
  background: rgba(59, 130, 246, 0.03);
}

.theme-dark .preview-content-wrapper :deep(table tr:hover) {
  background: rgba(96, 165, 250, 0.05);
}

.preview-content-wrapper :deep(hr) {
  border: none;
  border-top: 2px solid var(--editor-border);
  margin: 24px 0;
  opacity: 0.5;
}

.theme-dark .preview-content-wrapper :deep(hr) {
  opacity: 0.3;
}

/* Page Break Styles */
.editor-content :deep(.page-break) {
  margin: 24px 0;
  padding: 12px;
  border: 2px dashed var(--editor-border);
  border-radius: var(--radius-md);
  background: var(--toolbar-bg);
  text-align: center;
  user-select: none;
  position: relative;
}

.editor-content :deep(.page-break-label) {
  display: inline-block;
  padding: 4px 12px;
  background: var(--toolbar-accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.editor-content :deep(.page-break-line) {
  margin: 8px 0 0 0;
  border: none;
  border-top: 1px solid var(--editor-border);
}

@media print {
  .editor-content :deep(.page-break) {
    page-break-after: always;
    border: none;
    background: none;
  }
  
  .editor-content :deep(.page-break-label) {
    display: none;
  }
}

/* Table of Contents Styles */
.editor-content :deep(.table-of-contents) {
  background: var(--toolbar-bg);
  border: 1px solid var(--editor-border);
  border-radius: var(--radius-md);
  padding: 24px;
  margin: 24px 0;
}

.editor-content :deep(.table-of-contents h2) {
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  color: var(--content-color);
  border-bottom: 2px solid var(--toolbar-accent);
  padding-bottom: 8px;
}

.editor-content :deep(.table-of-contents ul) {
  list-style: none;
  padding: 0;
  margin: 0;
}

.editor-content :deep(.table-of-contents li) {
  margin: 8px 0;
}

.editor-content :deep(.table-of-contents a) {
  color: var(--toolbar-accent);
  text-decoration: none;
  transition: all var(--transition-fast);
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.editor-content :deep(.table-of-contents a:hover) {
  background: var(--toolbar-hover);
  transform: translateX(4px);
}

.theme-dark .editor-content :deep(.table-of-contents) {
  background: rgba(30, 41, 59, 0.5);
}

/* Toast Notification Styles */
.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  transition: all var(--transition-fast);
}

.toast-notification.success {
  background: #10b981;
  color: white;
}

.toast-notification.error {
  background: #ef4444;
  color: white;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>

