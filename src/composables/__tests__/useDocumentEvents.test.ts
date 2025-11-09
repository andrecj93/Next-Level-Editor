import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useDocumentEvents } from '../useDocumentEvents'

// Create a test component that uses the composable
const createTestComponent = (options: Parameters<typeof useDocumentEvents>[0]) => {
  return defineComponent({
    setup() {
      const result = useDocumentEvents(options)
      return { ...result }
    },
    render() {
      return h('div', 'Test Component')
    },
  })
}

describe('useDocumentEvents', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Document Click Handler', () => {
    it('should register document click listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const onDocumentClick = vi.fn()

      const wrapper = mount(createTestComponent({ onDocumentClick }))

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      wrapper.unmount()
    })

    it('should call onDocumentClick when document is clicked', () => {
      const onDocumentClick = vi.fn()
      const wrapper = mount(createTestComponent({ onDocumentClick }))

      const event = new MouseEvent('click', { bubbles: true })
      document.dispatchEvent(event)

      expect(onDocumentClick).toHaveBeenCalledTimes(1)
      expect(onDocumentClick).toHaveBeenCalledWith(event)
      wrapper.unmount()
    })

    it('should remove document click listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const onDocumentClick = vi.fn()

      const wrapper = mount(createTestComponent({ onDocumentClick }))
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should not register click listener if onDocumentClick is not provided', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const wrapper = mount(createTestComponent({}))

      const clickCall = addEventListenerSpy.mock.calls.find(call => call[0] === 'click')
      expect(clickCall).toBeUndefined()
      wrapper.unmount()
    })
  })

  describe('Escape Key Handler', () => {
    it('should register keydown listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const onEscapeKey = vi.fn()

      const wrapper = mount(createTestComponent({ onEscapeKey }))

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      wrapper.unmount()
    })

    it('should call onEscapeKey when Escape is pressed', () => {
      const onEscapeKey = vi.fn()
      const wrapper = mount(createTestComponent({ onEscapeKey }))

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(onEscapeKey).toHaveBeenCalledTimes(1)
      expect(onEscapeKey).toHaveBeenCalledWith(event)
      wrapper.unmount()
    })

    it('should not call onEscapeKey for other keys', () => {
      const onEscapeKey = vi.fn()
      const wrapper = mount(createTestComponent({ onEscapeKey }))

      const events = [
        new KeyboardEvent('keydown', { key: 'Enter' }),
        new KeyboardEvent('keydown', { key: 'Tab' }),
        new KeyboardEvent('keydown', { key: 'a' }),
      ]

      for (const event of events) {
        document.dispatchEvent(event)
      }

      expect(onEscapeKey).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('should remove keydown listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const onEscapeKey = vi.fn()

      const wrapper = mount(createTestComponent({ onEscapeKey }))
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not register keydown listener if onEscapeKey is not provided', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const wrapper = mount(createTestComponent({}))

      const keydownCall = addEventListenerSpy.mock.calls.find(call => call[0] === 'keydown')
      expect(keydownCall).toBeUndefined()
      wrapper.unmount()
    })
  })

  describe('Selection Change Handler', () => {
    it('should register selectionchange listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({ onSelectionChange }))

      expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
      wrapper.unmount()
    })

    it('should call onSelectionChange when selection changes', () => {
      const onSelectionChange = vi.fn()
      const wrapper = mount(createTestComponent({ onSelectionChange }))

      const event = new Event('selectionchange')
      document.dispatchEvent(event)

      expect(onSelectionChange).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('should remove selectionchange listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({ onSelectionChange }))
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
    })

    it('should not register selectionchange listener if onSelectionChange is not provided', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const wrapper = mount(createTestComponent({}))

      const selectionCall = addEventListenerSpy.mock.calls.find(call => call[0] === 'selectionchange')
      expect(selectionCall).toBeUndefined()
      wrapper.unmount()
    })
  })

  describe('Multiple Handlers', () => {
    it('should register all provided handlers', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const onDocumentClick = vi.fn()
      const onEscapeKey = vi.fn()
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({
        onDocumentClick,
        onEscapeKey,
        onSelectionChange,
      }))

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
      wrapper.unmount()
    })

    it('should call appropriate handlers for different events', () => {
      const onDocumentClick = vi.fn()
      const onEscapeKey = vi.fn()
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({
        onDocumentClick,
        onEscapeKey,
        onSelectionChange,
      }))

      document.dispatchEvent(new MouseEvent('click'))
      expect(onDocumentClick).toHaveBeenCalledTimes(1)
      expect(onEscapeKey).not.toHaveBeenCalled()
      expect(onSelectionChange).not.toHaveBeenCalled()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(onDocumentClick).toHaveBeenCalledTimes(1)
      expect(onEscapeKey).toHaveBeenCalledTimes(1)
      expect(onSelectionChange).not.toHaveBeenCalled()

      document.dispatchEvent(new Event('selectionchange'))
      expect(onDocumentClick).toHaveBeenCalledTimes(1)
      expect(onEscapeKey).toHaveBeenCalledTimes(1)
      expect(onSelectionChange).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('should remove all listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const onDocumentClick = vi.fn()
      const onEscapeKey = vi.fn()
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({
        onDocumentClick,
        onEscapeKey,
        onSelectionChange,
      }))
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
    })
  })

  describe('Returned Handlers', () => {
    it('should return handleDocumentClick function', () => {
      const wrapper = mount(createTestComponent({ onDocumentClick: vi.fn() }))
      const instance = wrapper.vm as unknown as ReturnType<typeof useDocumentEvents>

      expect(instance.handleDocumentClick).toBeDefined()
      expect(typeof instance.handleDocumentClick).toBe('function')
      wrapper.unmount()
    })

    it('should return handleEscape function', () => {
      const wrapper = mount(createTestComponent({ onEscapeKey: vi.fn() }))
      const instance = wrapper.vm as unknown as ReturnType<typeof useDocumentEvents>

      expect(instance.handleEscape).toBeDefined()
      expect(typeof instance.handleEscape).toBe('function')
      wrapper.unmount()
    })

    it('should return handleSelectionChange function', () => {
      const wrapper = mount(createTestComponent({ onSelectionChange: vi.fn() }))
      const instance = wrapper.vm as unknown as ReturnType<typeof useDocumentEvents>

      expect(instance.handleSelectionChange).toBeDefined()
      expect(typeof instance.handleSelectionChange).toBe('function')
      wrapper.unmount()
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should not leave listeners after unmount', () => {
      const onDocumentClick = vi.fn()
      const onEscapeKey = vi.fn()
      const onSelectionChange = vi.fn()

      const wrapper = mount(createTestComponent({
        onDocumentClick,
        onEscapeKey,
        onSelectionChange,
      }))
      wrapper.unmount()

      // Dispatch events after unmount
      document.dispatchEvent(new MouseEvent('click'))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      document.dispatchEvent(new Event('selectionchange'))

      // Handlers should not be called
      expect(onDocumentClick).not.toHaveBeenCalled()
      expect(onEscapeKey).not.toHaveBeenCalled()
      expect(onSelectionChange).not.toHaveBeenCalled()
    })
  })
})
