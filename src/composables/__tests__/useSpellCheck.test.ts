import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSpellCheck } from '../useSpellCheck'
import * as spellChecker from '../../utils/spellChecker'

vi.mock('../../utils/spellChecker', () => ({
  enableSpellCheck: vi.fn(),
  toggleSpellCheck: vi.fn(),
}))

describe('useSpellCheck', () => {
  let editorContent: Ref<HTMLElement | null>
  let spellCheckEnabled: Ref<boolean>
  let mockEditor: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockEditor = document.createElement('div')
    editorContent = ref<HTMLElement | null>(mockEditor)
    spellCheckEnabled = ref<boolean>(false)
  })

  describe('enableSpellCheck', () => {
    it('should call enableSpellCheckUtil and set spellCheckEnabled to true', () => {
      const { enableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      enableSpellCheck()

      expect(spellChecker.enableSpellCheck).toHaveBeenCalledWith(mockEditor)
      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should not enable spell check when editorContent is null', () => {
      editorContent.value = null
      const { enableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      enableSpellCheck()

      expect(spellChecker.enableSpellCheck).not.toHaveBeenCalled()
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should update spellCheckEnabled state', () => {
      const { enableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      expect(spellCheckEnabled.value).toBe(false)

      enableSpellCheck()

      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should work with already enabled spell check', () => {
      spellCheckEnabled.value = true
      const { enableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      enableSpellCheck()

      expect(spellChecker.enableSpellCheck).toHaveBeenCalledWith(mockEditor)
      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should handle multiple calls', () => {
      const { enableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      enableSpellCheck()
      enableSpellCheck()
      enableSpellCheck()

      expect(spellChecker.enableSpellCheck).toHaveBeenCalledTimes(3)
      expect(spellCheckEnabled.value).toBe(true)
    })
  })

  describe('handleToggleSpellCheck', () => {
    it('should call toggleSpellCheckUtil and update state', () => {
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(true)

      handleToggleSpellCheck()

      expect(spellChecker.toggleSpellCheck).toHaveBeenCalledWith(mockEditor)
      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should toggle from false to true', () => {
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = false
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(true)

      handleToggleSpellCheck()

      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should toggle from true to false', () => {
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = true
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(false)

      handleToggleSpellCheck()

      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should not toggle when editorContent is null', () => {
      editorContent.value = null
      spellCheckEnabled.value = false
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      handleToggleSpellCheck()

      expect(spellChecker.toggleSpellCheck).not.toHaveBeenCalled()
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should handle multiple toggles', () => {
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      vi.mocked(spellChecker.toggleSpellCheck)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      expect(spellChecker.toggleSpellCheck).toHaveBeenCalledTimes(3)
    })
  })

  describe('disableSpellCheck', () => {
    it('should set spellcheck attribute to false and update state', () => {
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = true

      disableSpellCheck()

      expect(mockEditor.getAttribute('spellcheck')).toBe('false')
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should not disable when editorContent is null', () => {
      editorContent.value = null
      spellCheckEnabled.value = true
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      disableSpellCheck()

      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should work when already disabled', () => {
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = false

      disableSpellCheck()

      expect(mockEditor.getAttribute('spellcheck')).toBe('false')
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should handle multiple calls', () => {
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = true

      disableSpellCheck()
      disableSpellCheck()
      disableSpellCheck()

      expect(mockEditor.getAttribute('spellcheck')).toBe('false')
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should overwrite existing spellcheck attribute', () => {
      mockEditor.setAttribute('spellcheck', 'true')
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      disableSpellCheck()

      expect(mockEditor.getAttribute('spellcheck')).toBe('false')
    })
  })

  describe('Integration', () => {
    it('should return all functions and state', () => {
      const result = useSpellCheck({ editorContent, spellCheckEnabled })

      expect(result).toHaveProperty('enableSpellCheck')
      expect(result).toHaveProperty('handleToggleSpellCheck')
      expect(result).toHaveProperty('disableSpellCheck')
      expect(result).toHaveProperty('spellCheckEnabled')
      expect(typeof result.enableSpellCheck).toBe('function')
      expect(typeof result.handleToggleSpellCheck).toBe('function')
      expect(typeof result.disableSpellCheck).toBe('function')
      expect(result.spellCheckEnabled).toBe(spellCheckEnabled)
    })

    it('should enable, toggle, and disable spell check', () => {
      const { enableSpellCheck, handleToggleSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(false)

      enableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)

      disableSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should work with enable -> disable sequence', () => {
      const { enableSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })

      enableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      disableSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should handle all operations with null editor', () => {
      editorContent.value = null
      const { enableSpellCheck, handleToggleSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })

      enableSpellCheck()
      handleToggleSpellCheck()
      disableSpellCheck()

      expect(spellCheckEnabled.value).toBe(false)
      expect(spellChecker.enableSpellCheck).not.toHaveBeenCalled()
      expect(spellChecker.toggleSpellCheck).not.toHaveBeenCalled()
    })

    it('should handle editor becoming null after initialization', () => {
      const { enableSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })

      enableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      editorContent.value = null

      disableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { enableSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })

      for (let i = 0; i < 10; i++) {
        enableSpellCheck()
        disableSpellCheck()
      }

      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should use the same spellCheckEnabled ref', () => {
      const { spellCheckEnabled: returnedRef } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })

      expect(returnedRef).toBe(spellCheckEnabled)
      spellCheckEnabled.value = true
      expect(returnedRef.value).toBe(true)
    })

    it('should work with different HTMLElement types', () => {
      const textarea = document.createElement('textarea')
      editorContent.value = textarea
      const { disableSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })

      disableSpellCheck()

      expect(textarea.getAttribute('spellcheck')).toBe('false')
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should handle toggle returning same state', () => {
      const { handleToggleSpellCheck } = useSpellCheck({ editorContent, spellCheckEnabled })
      spellCheckEnabled.value = true
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(true)

      handleToggleSpellCheck()

      expect(spellCheckEnabled.value).toBe(true)
    })

    it('should handle enable then immediate toggle', () => {
      const { enableSpellCheck, handleToggleSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(false)

      enableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)
    })

    it('should handle all operations in sequence', () => {
      const { enableSpellCheck, handleToggleSpellCheck, disableSpellCheck } = useSpellCheck({
        editorContent,
        spellCheckEnabled,
      })
      vi.mocked(spellChecker.toggleSpellCheck).mockReturnValue(true)

      disableSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)

      enableSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      handleToggleSpellCheck()
      expect(spellCheckEnabled.value).toBe(true)

      disableSpellCheck()
      expect(spellCheckEnabled.value).toBe(false)
    })
  })
})
