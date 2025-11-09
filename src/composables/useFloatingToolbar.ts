import { ref, computed } from 'vue'
import type { ToolbarAction } from '../types/toolbar'

export interface UseFloatingToolbarOptions {
  handleInlineAction: (tag: string) => void
  isInlineActionActive: (tag: string) => boolean
  insertLink: () => void
}

/**
 * Composable for managing floating toolbar visibility and actions
 * Shows toolbar when text is selected, hides when selection is cleared
 */
export function useFloatingToolbar(options?: UseFloatingToolbarOptions) {
  const showFloatingToolbar = ref(false)
  const floatingToolbarTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Update floating toolbar visibility based on current selection
   */
  const updateFloatingToolbar = () => {
    const selection = globalThis.getSelection()
    
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

  /**
   * Hide floating toolbar
   */
  const hideFloatingToolbar = () => {
    showFloatingToolbar.value = false
  }

  /**
   * Floating toolbar actions (subset of main toolbar)
   * Only available when options are provided
   */
  const floatingActions = options ? computed<ToolbarAction[]>(() => [
    {
      id: 'bold',
      label: 'Bold',
      icon: '<strong>B</strong>',
      tooltip: 'Bold (Ctrl+B)',
      onClick: () => options.handleInlineAction('strong'),
      isActive: () => options.isInlineActionActive('strong'),
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: '<em>I</em>',
      tooltip: 'Italic (Ctrl+I)',
      onClick: () => options.handleInlineAction('em'),
      isActive: () => options.isInlineActionActive('em'),
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: '<u>U</u>',
      tooltip: 'Underline (Ctrl+U)',
      onClick: () => options.handleInlineAction('u'),
      isActive: () => options.isInlineActionActive('u'),
    },
    {
      id: 'link',
      label: 'Link',
      icon: '🔗',
      tooltip: 'Insert link',
      onClick: options.insertLink,
    },
  ]) : computed(() => [])

  return {
    showFloatingToolbar,
    floatingToolbarTimer,
    updateFloatingToolbar,
    hideFloatingToolbar,
    floatingActions,
  }
}
