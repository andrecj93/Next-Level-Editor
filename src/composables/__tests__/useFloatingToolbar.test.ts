import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useFloatingToolbar } from '../useFloatingToolbar'
import type { UseFloatingToolbarOptions } from '../useFloatingToolbar'

describe('useFloatingToolbar', () => {
  let mockHandleInlineAction: (tag: string) => void
  let mockIsInlineActionActive: (tag: string) => boolean
  let mockInsertLink: () => void
  let options: UseFloatingToolbarOptions

  beforeEach(() => {
    mockHandleInlineAction = vi.fn()
    mockIsInlineActionActive = vi.fn((tag: string) => tag === 'strong')
    mockInsertLink = vi.fn()
    options = {
      handleInlineAction: mockHandleInlineAction,
      isInlineActionActive: mockIsInlineActionActive,
      insertLink: mockInsertLink,
    }

    // Use fake timers for setTimeout testing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with toolbar hidden', () => {
      const { showFloatingToolbar } = useFloatingToolbar(options)
      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should initialize with null timer', () => {
      const { floatingToolbarTimer } = useFloatingToolbar(options)
      expect(floatingToolbarTimer.value).toBeNull()
    })

    it('should initialize without options', () => {
      const { showFloatingToolbar, floatingActions } = useFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(false)
      expect(floatingActions.value).toEqual([])
    })
  })

  describe('updateFloatingToolbar', () => {
    it('should show toolbar when text is selected', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      // Mock selection with text
      const mockSelection = {
        isCollapsed: false,
        toString: () => 'Selected text',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should hide toolbar when selection is collapsed', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      // Mock collapsed selection
      const mockSelection = {
        isCollapsed: true,
        toString: () => '',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should hide toolbar when no text is selected (whitespace only)', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      // Mock selection with only whitespace
      const mockSelection = {
        isCollapsed: false,
        toString: () => '   ',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should hide toolbar when selection is null', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      vi.spyOn(globalThis, 'getSelection').mockReturnValue(null)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should show toolbar for single character selection', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: () => 'a',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should clear existing timer when called multiple times', () => {
      const { updateFloatingToolbar, floatingToolbarTimer } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: () => 'text',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      // First call
      updateFloatingToolbar()
      
      // Manually set a timer to test clearing
      floatingToolbarTimer.value = setTimeout(() => {}, 1000)
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

      // Second call should clear the timer
      updateFloatingToolbar()

      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(floatingToolbarTimer.value).toBeNull()
    })

    it('should handle empty string selection', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: () => '',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should trim whitespace from selection', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: () => '  text  ',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should handle rapid selection changes', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const mockSelectionWithText = {
        isCollapsed: false,
        toString: () => 'text',
      }
      const mockCollapsedSelection = {
        isCollapsed: true,
        toString: () => '',
      }

      const getSelectionSpy = vi.spyOn(globalThis, 'getSelection')

      // First selection with text
      getSelectionSpy.mockReturnValue(mockSelectionWithText as Selection)
      updateFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(true)

      // Clear selection
      getSelectionSpy.mockReturnValue(mockCollapsedSelection as Selection)
      updateFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(false)

      // Select again
      getSelectionSpy.mockReturnValue(mockSelectionWithText as Selection)
      updateFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(true)
    })
  })

  describe('hideFloatingToolbar', () => {
    it('should hide the floating toolbar', () => {
      const { hideFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      // Show toolbar first
      showFloatingToolbar.value = true
      expect(showFloatingToolbar.value).toBe(true)

      hideFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should work when toolbar is already hidden', () => {
      const { hideFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      expect(showFloatingToolbar.value).toBe(false)

      hideFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })

    it('should be callable multiple times', () => {
      const { hideFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      showFloatingToolbar.value = true

      hideFloatingToolbar()
      hideFloatingToolbar()
      hideFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(false)
    })
  })

  describe('floatingActions', () => {
    it('should return bold action with correct properties', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const boldAction = floatingActions.value.find((a) => a.id === 'bold')

      expect(boldAction).toBeDefined()
      expect(boldAction?.label).toBe('Bold')
      expect(boldAction?.icon).toBe('<strong>B</strong>')
      expect(boldAction?.tooltip).toBe('Bold (Ctrl+B)')
    })

    it('should return italic action with correct properties', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const italicAction = floatingActions.value.find((a) => a.id === 'italic')

      expect(italicAction).toBeDefined()
      expect(italicAction?.label).toBe('Italic')
      expect(italicAction?.icon).toBe('<em>I</em>')
      expect(italicAction?.tooltip).toBe('Italic (Ctrl+I)')
    })

    it('should return underline action with correct properties', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const underlineAction = floatingActions.value.find((a) => a.id === 'underline')

      expect(underlineAction).toBeDefined()
      expect(underlineAction?.label).toBe('Underline')
      expect(underlineAction?.icon).toBe('<u>U</u>')
      expect(underlineAction?.tooltip).toBe('Underline (Ctrl+U)')
    })

    it('should return link action with correct properties', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const linkAction = floatingActions.value.find((a) => a.id === 'link')

      expect(linkAction).toBeDefined()
      expect(linkAction?.label).toBe('Link')
      expect(linkAction?.icon).toBe('🔗')
      expect(linkAction?.tooltip).toBe('Insert link')
    })

    it('should call handleInlineAction when bold action is clicked', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const boldAction = floatingActions.value.find((a) => a.id === 'bold')
      boldAction?.onClick()

      expect(mockHandleInlineAction).toHaveBeenCalledWith('strong')
    })

    it('should call handleInlineAction when italic action is clicked', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const italicAction = floatingActions.value.find((a) => a.id === 'italic')
      italicAction?.onClick()

      expect(mockHandleInlineAction).toHaveBeenCalledWith('em')
    })

    it('should call handleInlineAction when underline action is clicked', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const underlineAction = floatingActions.value.find((a) => a.id === 'underline')
      underlineAction?.onClick()

      expect(mockHandleInlineAction).toHaveBeenCalledWith('u')
    })

    it('should call insertLink when link action is clicked', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const linkAction = floatingActions.value.find((a) => a.id === 'link')
      linkAction?.onClick()

      expect(mockInsertLink).toHaveBeenCalledTimes(1)
    })

    it('should return correct isActive state for bold action', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const boldAction = floatingActions.value.find((a) => a.id === 'bold')

      expect(boldAction?.isActive?.()).toBe(true) // mockIsInlineActionActive returns true for 'strong'
    })

    it('should return correct isActive state for italic action', () => {
      const { floatingActions } = useFloatingToolbar(options)

      const italicAction = floatingActions.value.find((a) => a.id === 'italic')

      expect(italicAction?.isActive?.()).toBe(false) // mockIsInlineActionActive returns false for 'em'
    })

    it('should return empty array when no options provided', () => {
      const { floatingActions } = useFloatingToolbar()

      expect(floatingActions.value).toEqual([])
    })

    it('should return 4 actions when options are provided', () => {
      const { floatingActions } = useFloatingToolbar(options)

      expect(floatingActions.value).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple updateFloatingToolbar calls in sequence', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const getSelectionSpy = vi.spyOn(globalThis, 'getSelection')

      for (let i = 0; i < 10; i++) {
        getSelectionSpy.mockReturnValue({
          isCollapsed: i % 2 === 0,
          toString: () => (i % 2 === 0 ? '' : `text${i}`),
        } as Selection)

        updateFloatingToolbar()

        expect(showFloatingToolbar.value).toBe(i % 2 !== 0)
      }
    })

    it('should handle all actions being clicked in sequence', () => {
      const { floatingActions } = useFloatingToolbar(options)

      floatingActions.value.forEach((action) => {
        action.onClick()
      })

      expect(mockHandleInlineAction).toHaveBeenCalledTimes(3) // bold, italic, underline
      expect(mockInsertLink).toHaveBeenCalledTimes(1)
    })

    it('should handle toolbar visibility changes during active timer', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: () => 'text',
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      // First update
      updateFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(true)

      // Second update should clear previous timer
      updateFloatingToolbar()
      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should handle getSelection returning undefined properties', () => {
      const { updateFloatingToolbar } = useFloatingToolbar(options)

      const mockSelection = {
        isCollapsed: false,
        toString: vi.fn(() => {
          throw new Error('toString failed')
        }),
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as unknown as Selection)

      expect(() => updateFloatingToolbar()).toThrow()
    })

    it('should handle long text selections', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const longText = 'a'.repeat(10000)
      const mockSelection = {
        isCollapsed: false,
        toString: () => longText,
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should handle special characters in selection', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const mockSelection = {
        isCollapsed: false,
        toString: () => specialText,
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })

    it('should handle Unicode characters in selection', () => {
      const { updateFloatingToolbar, showFloatingToolbar } = useFloatingToolbar(options)

      const unicodeText = '你好世界 🌍 مرحبا'
      const mockSelection = {
        isCollapsed: false,
        toString: () => unicodeText,
      }
      vi.spyOn(globalThis, 'getSelection').mockReturnValue(mockSelection as Selection)

      updateFloatingToolbar()

      expect(showFloatingToolbar.value).toBe(true)
    })
  })
})
