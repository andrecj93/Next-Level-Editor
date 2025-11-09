import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useActiveStates } from '../useActiveStates'
import * as formatting from '../../utils/formatting'

vi.mock('../../utils/formatting', () => ({
  isInlineStyleActive: vi.fn(),
  isBlockActive: vi.fn(),
  isListActive: vi.fn(),
}))

describe('useActiveStates', () => {
  let editorContent: Ref<HTMLDivElement | null>
  let mockEditor: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockEditor = document.createElement('div')
    editorContent = ref<HTMLDivElement | null>(mockEditor)
  })

  describe('isInlineActionActive', () => {
    it('should call isInlineStyleActive with correct parameters', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)

      const result = isInlineActionActive('b')

      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, 'b')
      expect(result).toBe(true)
    })

    it('should return false when editorContent is null', () => {
      editorContent.value = null
      const { isInlineActionActive } = useActiveStates(editorContent)

      const result = isInlineActionActive('b')

      expect(result).toBe(false)
      expect(formatting.isInlineStyleActive).not.toHaveBeenCalled()
    })

    it('should work with multiple inline tags', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      expect(isInlineActionActive('b')).toBe(true)
      expect(isInlineActionActive('i')).toBe(false)
      expect(isInlineActionActive('u')).toBe(true)
      expect(formatting.isInlineStyleActive).toHaveBeenCalledTimes(3)
    })

    it('should handle empty tag string', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(false)

      const result = isInlineActionActive('')

      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, '')
      expect(result).toBe(false)
    })

    it('should handle special characters in tag', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(false)

      const result = isInlineActionActive('!@#$%')

      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, '!@#$%')
      expect(result).toBe(false)
    })
  })

  describe('isBlockActionActive', () => {
    it('should call isBlockActive with correct parameters', () => {
      const { isBlockActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isBlockActive).mockReturnValue(true)

      const result = isBlockActionActive('h1')

      expect(formatting.isBlockActive).toHaveBeenCalledWith(mockEditor, 'h1')
      expect(result).toBe(true)
    })

    it('should return false when editorContent is null', () => {
      editorContent.value = null
      const { isBlockActionActive } = useActiveStates(editorContent)

      const result = isBlockActionActive('h1')

      expect(result).toBe(false)
      expect(formatting.isBlockActive).not.toHaveBeenCalled()
    })

    it('should work with multiple block tags', () => {
      const { isBlockActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isBlockActive)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)

      expect(isBlockActionActive('h1')).toBe(true)
      expect(isBlockActionActive('h2')).toBe(false)
      expect(isBlockActionActive('p')).toBe(true)
      expect(isBlockActionActive('blockquote')).toBe(false)
      expect(formatting.isBlockActive).toHaveBeenCalledTimes(4)
    })

    it('should handle empty tag string', () => {
      const { isBlockActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isBlockActive).mockReturnValue(false)

      const result = isBlockActionActive('')

      expect(formatting.isBlockActive).toHaveBeenCalledWith(mockEditor, '')
      expect(result).toBe(false)
    })

    it('should handle uppercase tags', () => {
      const { isBlockActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isBlockActive).mockReturnValue(true)

      const result = isBlockActionActive('H1')

      expect(formatting.isBlockActive).toHaveBeenCalledWith(mockEditor, 'H1')
      expect(result).toBe(true)
    })
  })

  describe('isListActionActive', () => {
    it('should call isListActive with ul tag', () => {
      const { isListActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isListActive).mockReturnValue(true)

      const result = isListActionActive('ul')

      expect(formatting.isListActive).toHaveBeenCalledWith(mockEditor, 'ul')
      expect(result).toBe(true)
    })

    it('should call isListActive with ol tag', () => {
      const { isListActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isListActive).mockReturnValue(false)

      const result = isListActionActive('ol')

      expect(formatting.isListActive).toHaveBeenCalledWith(mockEditor, 'ol')
      expect(result).toBe(false)
    })

    it('should return false when editorContent is null', () => {
      editorContent.value = null
      const { isListActionActive } = useActiveStates(editorContent)

      const resultUl = isListActionActive('ul')
      const resultOl = isListActionActive('ol')

      expect(resultUl).toBe(false)
      expect(resultOl).toBe(false)
      expect(formatting.isListActive).not.toHaveBeenCalled()
    })

    it('should handle multiple sequential calls', () => {
      const { isListActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isListActive)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      expect(isListActionActive('ul')).toBe(true)
      expect(isListActionActive('ol')).toBe(false)
      expect(isListActionActive('ul')).toBe(true)
      expect(formatting.isListActive).toHaveBeenCalledTimes(3)
    })

    it('should work with both list types in same instance', () => {
      const { isListActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isListActive)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)

      const ulActive = isListActionActive('ul')
      const olActive = isListActionActive('ol')

      expect(ulActive).toBe(true)
      expect(olActive).toBe(false)
      expect(formatting.isListActive).toHaveBeenNthCalledWith(1, mockEditor, 'ul')
      expect(formatting.isListActive).toHaveBeenNthCalledWith(2, mockEditor, 'ol')
    })
  })

  describe('Integration', () => {
    it('should return all three functions', () => {
      const activeStates = useActiveStates(editorContent)

      expect(activeStates).toHaveProperty('isInlineActionActive')
      expect(activeStates).toHaveProperty('isBlockActionActive')
      expect(activeStates).toHaveProperty('isListActionActive')
      expect(typeof activeStates.isInlineActionActive).toBe('function')
      expect(typeof activeStates.isBlockActionActive).toBe('function')
      expect(typeof activeStates.isListActionActive).toBe('function')
    })

    it('should work with all functions when editor is available', () => {
      const { isInlineActionActive, isBlockActionActive, isListActionActive } =
        useActiveStates(editorContent)

      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)
      vi.mocked(formatting.isBlockActive).mockReturnValue(false)
      vi.mocked(formatting.isListActive).mockReturnValue(true)

      expect(isInlineActionActive('b')).toBe(true)
      expect(isBlockActionActive('h1')).toBe(false)
      expect(isListActionActive('ul')).toBe(true)

      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, 'b')
      expect(formatting.isBlockActive).toHaveBeenCalledWith(mockEditor, 'h1')
      expect(formatting.isListActive).toHaveBeenCalledWith(mockEditor, 'ul')
    })

    it('should work with all functions when editor is null', () => {
      editorContent.value = null
      const { isInlineActionActive, isBlockActionActive, isListActionActive } =
        useActiveStates(editorContent)

      expect(isInlineActionActive('b')).toBe(false)
      expect(isBlockActionActive('h1')).toBe(false)
      expect(isListActionActive('ul')).toBe(false)

      expect(formatting.isInlineStyleActive).not.toHaveBeenCalled()
      expect(formatting.isBlockActive).not.toHaveBeenCalled()
      expect(formatting.isListActive).not.toHaveBeenCalled()
    })

    it('should handle editor becoming null after initialization', () => {
      const { isInlineActionActive, isBlockActionActive, isListActionActive } =
        useActiveStates(editorContent)

      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)
      expect(isInlineActionActive('b')).toBe(true)

      editorContent.value = null

      expect(isInlineActionActive('b')).toBe(false)
      expect(isBlockActionActive('h1')).toBe(false)
      expect(isListActionActive('ul')).toBe(false)
    })

    it('should handle editor being restored after null', () => {
      editorContent.value = null
      const { isInlineActionActive } = useActiveStates(editorContent)

      expect(isInlineActionActive('b')).toBe(false)

      editorContent.value = mockEditor
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)

      expect(isInlineActionActive('b')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive calls', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)

      for (let i = 0; i < 100; i++) {
        expect(isInlineActionActive('b')).toBe(true)
      }

      expect(formatting.isInlineStyleActive).toHaveBeenCalledTimes(100)
    })

    it('should handle all functions with same tag', () => {
      const { isInlineActionActive, isBlockActionActive } = useActiveStates(editorContent)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)
      vi.mocked(formatting.isBlockActive).mockReturnValue(false)

      expect(isInlineActionActive('p')).toBe(true)
      expect(isBlockActionActive('p')).toBe(false)
    })

    it('should work with computed ref', () => {
      const computedRef = ref(mockEditor)
      const { isInlineActionActive } = useActiveStates(computedRef)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(true)

      expect(isInlineActionActive('b')).toBe(true)
      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, 'b')
    })

    it('should handle very long tag names', () => {
      const { isInlineActionActive } = useActiveStates(editorContent)
      const longTag = 'a'.repeat(1000)
      vi.mocked(formatting.isInlineStyleActive).mockReturnValue(false)

      const result = isInlineActionActive(longTag)

      expect(result).toBe(false)
      expect(formatting.isInlineStyleActive).toHaveBeenCalledWith(mockEditor, longTag)
    })

    it('should handle null editor with all tag types', () => {
      editorContent.value = null
      const { isInlineActionActive, isBlockActionActive, isListActionActive } =
        useActiveStates(editorContent)

      expect(isInlineActionActive('b')).toBe(false)
      expect(isInlineActionActive('i')).toBe(false)
      expect(isBlockActionActive('h1')).toBe(false)
      expect(isBlockActionActive('p')).toBe(false)
      expect(isListActionActive('ul')).toBe(false)
      expect(isListActionActive('ol')).toBe(false)

      expect(formatting.isInlineStyleActive).not.toHaveBeenCalled()
      expect(formatting.isBlockActive).not.toHaveBeenCalled()
      expect(formatting.isListActive).not.toHaveBeenCalled()
    })
  })
})
