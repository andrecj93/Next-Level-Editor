/**
 * Command Palette Composable
 * Provides keyboard shortcut handling and command palette state management
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface Command {
  id: string
  name: string
  description: string
  icon: string
  category: string
  shortcut?: string
  action: () => void
}

export interface UseCommandPaletteOptions {
  /**
   * This editor's root. The Ctrl/Cmd+Shift+K listener is on `document`, so with
   * two editors on a page one press opened BOTH palettes and the last to focus
   * stole the keystrokes. Given a root, only the editor whose caret is inside
   * it opens — and an already-open palette still toggles closed. #R23-31
   */
  editorRoot?: Ref<HTMLElement | null>
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const { editorRoot } = options
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
    // Cmd+Shift+K (Mac) / Ctrl+Shift+K (Windows/Linux) opens the command
    // palette. The Mac binding used to be a bare Cmd+K, which collided with
    // Cmd+K = Insert Link — a single press opened the link dialog AND toggled
    // the palette. Requiring Shift on both platforms removes the collision and
    // keeps the shortcut consistent everywhere.
    const isMac =
      typeof navigator !== 'undefined' &&
      (navigator.platform || navigator.userAgent || '')
        .toUpperCase()
        .indexOf('MAC') >= 0
    const isCommandPaletteShortcut =
      event.shiftKey &&
      (isMac ? event.metaKey : event.ctrlKey) &&
      event.key.toLowerCase() === 'k'

    if (!isCommandPaletteShortcut) return

    // Scope the shortcut to THIS editor: respond only when the caret (or the
    // event target) is inside our root, so two editors on a page do not both
    // open. An already-open palette still responds — its second press closes
    // it, even though focus has moved into the teleported palette and out of
    // the editor root. Without a root (single-editor / back-compat), keep the
    // old unconditional behaviour. #R23-31
    const root = editorRoot?.value
    if (root && !showCommandPalette.value) {
      const target = event.target as Node | null
      const focused = document.activeElement
      const ours =
        (focused instanceof Node && root.contains(focused)) ||
        (target !== null && root.contains(target))
      if (!ours) return
    }

    event.preventDefault()
    toggleCommandPalette()
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
