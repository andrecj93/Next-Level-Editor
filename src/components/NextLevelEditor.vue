<template>
  <div :class="['next-level-editor', themeClass]">
    <div class="editor-toolbar">
      <div
        v-for="group in toolbarSections"
        :key="group.id"
        :class="['toolbar-section', { collapsed: collapsedGroups[group.id] }]"
      >
        <button class="toolbar-section-toggle" @click="toggleGroup(group.id)">
          <span class="section-label">{{ group.label }}</span>
          <span class="section-description">{{ group.description }}</span>
          <span class="chevron" :class="{ open: !collapsedGroups[group.id] }">⌄</span>
        </button>
        <transition name="toolbar-collapse">
          <div v-show="!collapsedGroups[group.id]" class="toolbar-section-body">
            <button
              v-for="action in group.actions"
              :key="action.id"
              :class="['toolbar-btn', { active: action.isActive ? action.isActive() : false }]"
              :data-tooltip="action.tooltip"
              @mousedown.prevent
              @click="action.onClick"
            >
              <span v-if="action.icon" v-html="action.icon" />
              <span v-else>{{ action.label }}</span>
            </button>
          </div>
        </transition>
      </div>

      <div class="toolbar-section theme-switcher">
        <button class="toolbar-section-toggle" @click="toggleTheme">
          <span class="section-label">Tema</span>
          <span class="section-description">Alternar claro/escuro</span>
          <span class="chevron open">🌓</span>
        </button>
      </div>
    </div>

    <transition name="command-menu">
      <div
        v-if="showCommandMenu"
        class="command-menu"
        :style="{ top: `${commandMenuPosition.top}px`, left: `${commandMenuPosition.left}px` }"
      >
        <div class="command-menu-header">Atalhos rápidos</div>
        <ul>
          <li
            v-for="option in commandOptions"
            :key="option.id"
            @mousedown.prevent
            @click="() => handleCommandOption(option)"
          >
            <div class="command-title">{{ option.label }}</div>
            <div class="command-description">{{ option.description }}</div>
          </li>
        </ul>
      </div>
    </transition>

    <div class="history-panel" v-if="history.length > 1">
      <div class="history-header">
        <span>Histórico</span>
        <div class="history-controls">
          <button class="toolbar-btn" data-tooltip="Desfazer (Ctrl+Z)" @click="undo">⟲</button>
          <button class="toolbar-btn" data-tooltip="Refazer (Ctrl+Shift+Z)" @click="redo">⟳</button>
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
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue'

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
  placeholder: 'Start typing...',
})

const emit = defineEmits<Emits>()

const editorContent = ref<HTMLDivElement | null>(null)

interface ToolbarAction {
  id: string
  label: string
  tooltip: string
  icon?: string
  onClick: () => void
  isActive?: () => boolean
}

type HistoryEntry = { id: string; html: string; preview: string }

const history = ref<HistoryEntry[]>([])
const historyIndex = ref(-1)
const isApplyingHistory = ref(false)

const theme = ref<'light' | 'dark'>('light')
const collapsedGroups = reactive<Record<string, boolean>>({
  text: false,
  structure: false,
  inserts: false,
  cleanup: false,
})

const themeClass = computed(() => (theme.value === 'dark' ? 'theme-dark' : 'theme-light'))

const getSelectionRange = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  return selection.getRangeAt(0)
}

const ensureEditorFocus = () => {
  nextTick(() => {
    editorContent.value?.focus()
  })
}

const wrapInlineSelection = (tag: string) => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  if (range.collapsed) {
    const element = document.createElement(tag)
    element.appendChild(document.createTextNode('\u200B'))
    range.insertNode(element)
    const newRange = document.createRange()
    const textNode = element.firstChild as Text
    newRange.setStart(textNode, textNode.length)
    newRange.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(newRange)
  } else {
    const wrapper = document.createElement(tag)
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(wrapper)
    newRange.collapse(false)
    selection?.addRange(newRange)
  }

  ensureEditorFocus()
  captureSnapshot()
}

const applyBlockFormat = (tag: string) => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  let block = range.startContainer as HTMLElement | null
  if (block.nodeType === Node.TEXT_NODE) {
    block = block.parentElement
  }
  while (block && block.parentElement !== editorContent.value) {
    block = block?.parentElement || null
  }

  if (!block) {
    const element = document.createElement(tag)
    element.innerHTML = '&nbsp;'
    range.insertNode(element)
  } else {
    const newBlock = document.createElement(tag)
    newBlock.innerHTML = block.innerHTML
    editorContent.value.replaceChild(newBlock, block)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(newBlock)
    newRange.collapse(false)
    selection?.addRange(newRange)
  }

  ensureEditorFocus()
  captureSnapshot()
}

const insertChecklist = () => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  const selectionText = range.toString() || 'Nova tarefa'
  const items = selectionText
    .split(/\n+/)
    .filter(Boolean)
    .map((text) => text.trim())
  const list = document.createElement('ul')
  list.classList.add('checklist')
  if (items.length === 0) {
    items.push('Nova tarefa')
  }
  items.forEach((item) => {
    const li = document.createElement('li')
    const label = document.createElement('label')
    label.classList.add('checklist-item')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const span = document.createElement('span')
    span.textContent = item
    label.append(checkbox, span)
    li.appendChild(label)
    list.appendChild(li)
  })

  range.deleteContents()
  range.insertNode(list)
  ensureEditorFocus()
  captureSnapshot()
}

const insertBlockquote = () => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  const quote = document.createElement('blockquote')
  const content = range.cloneContents()
  if (!content.textContent?.trim()) {
    quote.textContent = 'Digite sua citação aqui'
  } else {
    quote.appendChild(content)
  }
  range.deleteContents()
  range.insertNode(quote)
  ensureEditorFocus()
  captureSnapshot()
}

const insertCodeBlock = () => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  const pre = document.createElement('pre')
  const code = document.createElement('code')
  const content = range.cloneContents()
  const text = content.textContent || ''
  code.textContent = text || 'console.log("Hello World")'
  pre.appendChild(code)
  range.deleteContents()
  range.insertNode(pre)
  ensureEditorFocus()
  captureSnapshot()
}

const applyList = (ordered: boolean) => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return

  const text = range.toString() || 'Novo item'
  const items = text
    .split(/\n+/)
    .filter(Boolean)
  const list = document.createElement(ordered ? 'ol' : 'ul')
  if (items.length === 0) {
    items.push('Novo item')
  }
  items.forEach((item) => {
    const li = document.createElement('li')
    li.textContent = item.trim()
    list.appendChild(li)
  })
  range.deleteContents()
  range.insertNode(list)
  ensureEditorFocus()
  captureSnapshot()
}

const clearFormatting = () => {
  if (!editorContent.value) return
  const text = editorContent.value.innerText
  editorContent.value.innerHTML = text
  captureSnapshot()
  ensureEditorFocus()
}

const insertLink = () => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return
  const url = prompt('Enter the URL:')
  if (!url) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_blank'
  const content = range.cloneContents()
  if (!content.textContent) {
    anchor.textContent = url
  } else {
    anchor.appendChild(content)
  }
  range.deleteContents()
  range.insertNode(anchor)
  ensureEditorFocus()
  captureSnapshot()
}

const insertImage = () => {
  const range = getSelectionRange()
  if (!range || !editorContent.value) return
  if (!editorContent.value.contains(range.commonAncestorContainer)) return
  const url = prompt('Enter the image URL:')
  if (!url) return
  const image = document.createElement('img')
  image.src = url
  image.alt = 'Image'
  range.insertNode(image)
  ensureEditorFocus()
  captureSnapshot()
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

const isInlineActive = (tag: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false
  let node: Node | null = selection.anchorNode
  while (node && node !== editorContent.value) {
    if (node instanceof HTMLElement && node.tagName.toLowerCase() === tag.toLowerCase()) {
      return true
    }
    node = node.parentNode
  }
  return false
}

const formatActions: ToolbarAction[] = [
  {
    id: 'bold',
    label: 'Negrito',
    icon: '<strong>B</strong>',
    tooltip: 'Negrito (Ctrl+B)',
    onClick: () => wrapInlineSelection('strong'),
    isActive: () => isInlineActive('strong'),
  },
  {
    id: 'italic',
    label: 'Itálico',
    icon: '<em>I</em>',
    tooltip: 'Itálico (Ctrl+I)',
    onClick: () => wrapInlineSelection('em'),
    isActive: () => isInlineActive('em'),
  },
  {
    id: 'underline',
    label: 'Sublinhado',
    icon: '<u>U</u>',
    tooltip: 'Sublinhado (Ctrl+U)',
    onClick: () => wrapInlineSelection('u'),
    isActive: () => isInlineActive('u'),
  },
  {
    id: 'strike',
    label: 'Riscado',
    icon: '<s>S</s>',
    tooltip: 'Tachar texto',
    onClick: () => wrapInlineSelection('s'),
    isActive: () => isInlineActive('s'),
  },
]

const headingActions: ToolbarAction[] = [
  {
    id: 'h1',
    label: 'H1',
    icon: '<strong>H1</strong>',
    tooltip: 'Título principal (Ctrl+Alt+1)',
    onClick: () => applyBlockFormat('h1'),
  },
  {
    id: 'h2',
    label: 'H2',
    icon: '<strong>H2</strong>',
    tooltip: 'Título secundário (Ctrl+Alt+2)',
    onClick: () => applyBlockFormat('h2'),
  },
  {
    id: 'h3',
    label: 'H3',
    icon: '<strong>H3</strong>',
    tooltip: 'Subtítulo (Ctrl+Alt+3)',
    onClick: () => applyBlockFormat('h3'),
  },
  {
    id: 'paragraph',
    label: 'Parágrafo',
    icon: '¶',
    tooltip: 'Converter em parágrafo',
    onClick: () => applyBlockFormat('p'),
  },
]

const insertActions: ToolbarAction[] = [
  {
    id: 'unordered-list',
    label: 'Lista',
    icon: '•',
    tooltip: 'Lista não ordenada',
    onClick: () => applyList(false),
  },
  {
    id: 'ordered-list',
    label: 'Lista numerada',
    icon: '1.',
    tooltip: 'Lista ordenada',
    onClick: () => applyList(true),
  },
  {
    id: 'link',
    label: 'Link',
    icon: '🔗',
    tooltip: 'Inserir link (Ctrl+K)',
    onClick: insertLink,
  },
  {
    id: 'image',
    label: 'Imagem',
    icon: '🖼️',
    tooltip: 'Inserir imagem',
    onClick: insertImage,
  },
]

const cleanupActions: ToolbarAction[] = [
  {
    id: 'clear',
    label: 'Limpar',
    icon: '🧹',
    tooltip: 'Remover formatação',
    onClick: clearFormatting,
  },
]

const toolbarSections = [
  {
    id: 'text',
    label: 'Texto',
    description: 'Estilos inline',
    actions: formatActions,
  },
  {
    id: 'structure',
    label: 'Estrutura',
    description: 'Cabeçalhos e parágrafos',
    actions: headingActions,
  },
  {
    id: 'inserts',
    label: 'Inserções',
    description: 'Listas, links e mídia',
    actions: insertActions,
  },
  {
    id: 'cleanup',
    label: 'Limpeza',
    description: 'Normalizar conteúdo',
    actions: cleanupActions,
  },
]

const toggleGroup = (id: string) => {
  collapsedGroups[id] = !collapsedGroups[id]
}

const buildPreview = (html: string) => {
  const temp = document.createElement('div')
  temp.innerHTML = html
  const text = temp.innerText.replace(/\s+/g, ' ').trim()
  return text.length > 60 ? `${text.slice(0, 57)}...` : text || 'Conteúdo vazio'
}

const captureSnapshot = (emitUpdate = true) => {
  if (!editorContent.value || isApplyingHistory.value) return
  const html = editorContent.value.innerHTML
  const preview = buildPreview(html)
  const current = history.value[historyIndex.value]
  if (current && current.html === html) {
    if (emitUpdate) {
      emit('update:modelValue', html)
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
    emit('update:modelValue', html)
  }
}

const applyHistoryEntry = (entry: HistoryEntry | undefined) => {
  if (!entry || !editorContent.value) return
  isApplyingHistory.value = true
  editorContent.value.innerHTML = entry.html
  emit('update:modelValue', entry.html)
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

const onInput = () => {
  captureSnapshot()
}

const onFocus = () => {
  emit('focus')
}

const onBlur = () => {
  emit('blur')
}

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

  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        wrapInlineSelection('strong')
        return
      case 'i':
        event.preventDefault()
        wrapInlineSelection('em')
        return
      case 'u':
        event.preventDefault()
        wrapInlineSelection('u')
        return
      case 'x':
        if (event.shiftKey) {
          event.preventDefault()
          wrapInlineSelection('s')
          return
        }
        break
    }
  }

  if ((event.ctrlKey || event.metaKey) && event.altKey) {
    switch (event.key) {
      case '1':
        event.preventDefault()
        applyBlockFormat('h1')
        break
      case '2':
        event.preventDefault()
        applyBlockFormat('h2')
        break
      case '3':
        event.preventDefault()
        applyBlockFormat('h3')
        break
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
    label: 'Título 1',
    description: 'Transforma o bloco em um cabeçalho nível 1',
    action: () => applyBlockFormat('h1'),
  },
  {
    id: 'slash-h2',
    label: 'Título 2',
    description: 'Cabeçalho intermediário',
    action: () => applyBlockFormat('h2'),
  },
  {
    id: 'slash-h3',
    label: 'Título 3',
    description: 'Subtítulo',
    action: () => applyBlockFormat('h3'),
  },
  {
    id: 'slash-checklist',
    label: 'Checklist',
    description: 'Lista com caixas de seleção',
    action: insertChecklist,
  },
  {
    id: 'slash-quote',
    label: 'Citação',
    description: 'Destaca um trecho como citação',
    action: insertBlockquote,
  },
  {
    id: 'slash-code',
    label: 'Bloco de código',
    description: 'Insere um bloco pré-formatado',
    action: insertCodeBlock,
  },
]

const showCommandMenu = ref(false)
const commandMenuPosition = ref({ top: 0, left: 0 })

const handleCommandOption = (option: (typeof commandOptions)[number]) => {
  removeSlashTrigger()
  option.action()
  closeCommandMenu()
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorContent.value) return
    if (isApplyingHistory.value) return
    if (editorContent.value.innerHTML !== newValue) {
      isApplyingHistory.value = true
      editorContent.value.innerHTML = newValue
      nextTick(() => {
        isApplyingHistory.value = false
        captureSnapshot(false)
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (editorContent.value) {
    if (props.modelValue) {
      editorContent.value.innerHTML = props.modelValue
    }
    captureSnapshot(false)
    editorContent.value.addEventListener('keydown', handleKeydown)
  }
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  if (editorContent.value) {
    editorContent.value.removeEventListener('keydown', handleKeydown)
  }
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
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

.editor-content :deep(ul.checklist) {
  list-style: none;
  padding: 0;
}

.editor-content :deep(ul.checklist li) {
  margin: 8px 0;
}

.editor-content :deep(.checklist-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--checklist-border);
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
}

.theme-dark .editor-content :deep(.checklist-item) {
  background: rgba(15, 23, 42, 0.7);
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
</style>
