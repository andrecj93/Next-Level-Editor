import { onMounted, onBeforeUnmount } from 'vue'

interface DocumentEventsOptions {
  onDocumentClick?: (event: MouseEvent) => void
  onEscapeKey?: (event: KeyboardEvent) => void
  onSelectionChange?: () => void
}

/**
 * Composable for managing document-level event listeners
 * Handles click outside, escape key, and selection change events
 */
export function useDocumentEvents(options: DocumentEventsOptions) {
  const { onDocumentClick, onEscapeKey, onSelectionChange } = options

  /**
   * Handle Escape key press
   */
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && onEscapeKey) {
      onEscapeKey(event)
    }
  }

  /**
   * Handle document click
   */
  const handleDocumentClick = (event: MouseEvent) => {
    if (onDocumentClick) {
      onDocumentClick(event)
    }
  }

  /**
   * Handle selection change
   */
  const handleSelectionChange = () => {
    if (onSelectionChange) {
      onSelectionChange()
    }
  }

  onMounted(() => {
    if (onDocumentClick) {
      document.addEventListener('click', handleDocumentClick)
    }
    if (onEscapeKey) {
      document.addEventListener('keydown', handleEscape)
    }
    if (onSelectionChange) {
      document.addEventListener('selectionchange', handleSelectionChange)
    }
  })

  onBeforeUnmount(() => {
    if (onDocumentClick) {
      document.removeEventListener('click', handleDocumentClick)
    }
    if (onEscapeKey) {
      document.removeEventListener('keydown', handleEscape)
    }
    if (onSelectionChange) {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  })

  return {
    // Return the handlers in case they need to be called manually
    handleEscape,
    handleDocumentClick,
    handleSelectionChange,
  }
}
