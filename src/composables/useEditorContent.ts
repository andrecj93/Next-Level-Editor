import { ref, watch, nextTick, type Ref } from 'vue'
import { useHtmlSanitizer } from './useHtmlSanitizer'
import { useEditorHistory } from './useEditorHistory'

interface UseEditorContentOptions {
  editorContent: Ref<HTMLDivElement | null>
  modelValue: Ref<string>
  onUpdate: (value: string) => void
  triggerAutoSave?: (content: string) => void
}

/**
 * Composable for managing editor content, sanitization, and synchronization
 * Handles content validation, history tracking, and model updates
 */
export function useEditorContent(options: UseEditorContentOptions) {
  const { editorContent, modelValue, onUpdate, triggerAutoSave } = options
  const { sanitizeHtml } = useHtmlSanitizer()
  const {
    history,
    historyIndex,
    isApplyingHistory,
    captureSnapshot,
    undo: performUndo,
    redo: performRedo,
    canUndo,
    canRedo,
  } = useEditorHistory()

  const htmlContent = ref('')
  const codeContent = ref('')

  /**
   * Apply sanitized content to the editor
   */
  const applySanitizedContent = (value?: string | null) => {
    const sanitized = sanitizeHtml(value)
    if (sanitized !== (value ?? '')) {
      onUpdate(sanitized)
    }
    if (editorContent.value && editorContent.value.innerHTML !== sanitized) {
      editorContent.value.innerHTML = sanitized
    }
    htmlContent.value = sanitized
  }

  /**
   * Capture a history snapshot and emit update
   */
  const captureAndEmit = (emitUpdate = true) => {
    if (!editorContent.value || isApplyingHistory.value) return

    const html = editorContent.value.innerHTML
    htmlContent.value = html

    captureSnapshot(html)

    if (emitUpdate) {
      const sanitized = sanitizeHtml(html)
      onUpdate(sanitized)
    }
  }

  /**
   * Handle undo operation
   */
  const undo = () => {
    performUndo((html: string) => {
      if (editorContent.value) {
        editorContent.value.innerHTML = html
      }
      const sanitized = sanitizeHtml(html)
      onUpdate(sanitized)
    })
  }

  /**
   * Handle redo operation
   */
  const redo = () => {
    performRedo((html: string) => {
      if (editorContent.value) {
        editorContent.value.innerHTML = html
      }
      const sanitized = sanitizeHtml(html)
      onUpdate(sanitized)
    })
  }

  /**
   * Sync code editor content to WYSIWYG editor
   */
  const syncCodeToEditor = (code: string) => {
    codeContent.value = code
    if (editorContent.value) {
      editorContent.value.innerHTML = code
      htmlContent.value = code
    }
  }

  /**
   * Sync WYSIWYG editor content to code editor
   */
  const syncEditorToCode = () => {
    if (editorContent.value) {
      const html = editorContent.value.innerHTML
      codeContent.value = html
      htmlContent.value = html
      return html
    }
    return ''
  }

  // Watch for external model value changes
  watch(
    modelValue,
    (newValue) => {
      if (!editorContent.value) return
      if (isApplyingHistory.value) return

      const currentSanitized = sanitizeHtml(editorContent.value.innerHTML)
      const newSanitized = sanitizeHtml(newValue)

      if (currentSanitized !== newSanitized) {
        isApplyingHistory.value = true
        applySanitizedContent(newValue)
        nextTick(() => {
          isApplyingHistory.value = false
          captureAndEmit(false)
        })
      }
    },
    { immediate: true }
  )

  // Watch for content changes and trigger auto-save
  if (triggerAutoSave) {
    watch(
      () => editorContent.value?.innerHTML,
      (newContent) => {
        if (newContent && !isApplyingHistory.value) {
          triggerAutoSave(newContent)
        }
      }
    )
  }

  return {
    htmlContent,
    codeContent,
    history,
    historyIndex,
    isApplyingHistory,
    applySanitizedContent,
    captureAndEmit,
    undo,
    redo,
    canUndo,
    canRedo,
    syncCodeToEditor,
    syncEditorToCode,
    sanitizeHtml,
  }
}
