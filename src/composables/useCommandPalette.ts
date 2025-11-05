/**
 * Command Palette Composable
 * Provides keyboard shortcut handling and command palette state management
 */

import { ref, onMounted, onBeforeUnmount } from 'vue'

export interface Command {
  id: string
  name: string
  description: string
  icon: string
  category: string
  shortcut?: string
  action: () => void
}

export function useCommandPalette() {
  const showCommandPalette = ref(false)
  const recentCommands = ref<string[]>([])
  const MAX_RECENT = 5

  /**
   * Opens the command palette
   */
  function openCommandPalette() {
    showCommandPalette.value = true
  }

  /**
   * Closes the command palette
   */
  function closeCommandPalette() {
    showCommandPalette.value = false
  }

  /**
   * Toggles the command palette
   */
  function toggleCommandPalette() {
    showCommandPalette.value = !showCommandPalette.value
  }

  /**
   * Adds a command to recent history
   */
  function addToRecent(commandId: string) {
    // Remove if already exists
    recentCommands.value = recentCommands.value.filter(id => id !== commandId)
    // Add to front
    recentCommands.value.unshift(commandId)
    // Keep only MAX_RECENT items
    if (recentCommands.value.length > MAX_RECENT) {
      recentCommands.value = recentCommands.value.slice(0, MAX_RECENT)
    }
  }

  /**
   * Handles keyboard shortcuts for command palette
   */
  function handleKeyboardShortcut(event: KeyboardEvent) {
    // Cmd+K (Mac) or Ctrl+Shift+K (Windows/Linux) to open command palette
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isCommandPaletteShortcut = isMac
      ? event.metaKey && event.key === 'k' && !event.shiftKey
      : event.ctrlKey && event.shiftKey && event.key === 'K'

    if (isCommandPaletteShortcut) {
      event.preventDefault()
      toggleCommandPalette()
    }
  }

  /**
   * Sets up keyboard event listener
   */
  function setupKeyboardListener() {
    document.addEventListener('keydown', handleKeyboardShortcut)
  }

  /**
   * Removes keyboard event listener
   */
  function removeKeyboardListener() {
    document.removeEventListener('keydown', handleKeyboardShortcut)
  }

  // Setup on mount
  onMounted(() => {
    setupKeyboardListener()
  })

  // Cleanup on unmount
  onBeforeUnmount(() => {
    removeKeyboardListener()
  })

  return {
    showCommandPalette,
    recentCommands,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    addToRecent,
  }
}
