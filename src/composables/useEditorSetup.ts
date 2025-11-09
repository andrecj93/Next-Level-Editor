import { type Ref, type ComputedRef, onMounted, onBeforeUnmount } from 'vue'
import { formatHtml } from '../utils/export'

export interface UseEditorSetupOptions {
  editorContent: Ref<HTMLDivElement | null> | ComputedRef<HTMLDivElement | null>
  codeContent: Ref<string>
  floatingToolbarTimer: Ref<ReturnType<typeof setTimeout> | null>
  modelValue: string
  applySanitizedContent: (content: string) => void
  captureSnapshot: (emitChange?: boolean) => void
  handleKeydown: (event: KeyboardEvent) => void
  enableSpellCheck: () => void
  setupImageResizing: () => void
  cleanupImageResize: () => void
  handleDocumentClick: (event: MouseEvent) => void
  handleEscape: (event: KeyboardEvent) => void
  onSelectionChange: () => void
}

/**
 * Composable for managing editor setup and cleanup lifecycle
 * Handles mounting, unmounting, and event listener setup
 */
export function useEditorSetup(options: UseEditorSetupOptions) {
  const {
    editorContent,
    codeContent,
    floatingToolbarTimer,
    modelValue,
    applySanitizedContent,
    captureSnapshot,
    handleKeydown,
    enableSpellCheck,
    setupImageResizing,
    cleanupImageResize,
    handleDocumentClick,
    handleEscape,
    onSelectionChange,
  } = options

  onMounted(() => {
    if (editorContent.value) {
      applySanitizedContent(modelValue)
      captureSnapshot(false)
      editorContent.value.addEventListener('keydown', handleKeydown)
      // Enable spell check by default
      enableSpellCheck()
      
      // Initialize code editor content
      codeContent.value = formatHtml(modelValue || '')
      
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
    // Cleanup image resize listeners
    cleanupImageResize()
  })
}
