import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import NextLevelEditor from '../NextLevelEditor.vue'

describe('NextLevelEditor', () => {
  let wrapper: ReturnType<typeof mount>

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Size Props', () => {
    it('should apply custom width when width prop is provided', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          width: '800px',
        },
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.width).toBe('800px')
    })

    it('should apply custom height when height prop is provided', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          height: '500px',
        },
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.height).toBe('500px')
    })

    it('should apply both width and height when both props are provided', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          width: '1000px',
          height: '600px',
        },
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.width).toBe('1000px')
      expect((editor.element as HTMLElement).style.height).toBe('600px')
    })

    it('should accept percentage values for width and height', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          width: '100%',
          height: '80vh',
        },
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.width).toBe('100%')
      expect((editor.element as HTMLElement).style.height).toBe('80vh')
    })

    it('should not apply styles when width and height props are not provided', () => {
      wrapper = mount(NextLevelEditor, {
        props: {},
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.width).toBe('')
      expect((editor.element as HTMLElement).style.height).toBe('')
    })

    it('should accept CSS units like em, rem, and vw', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          width: '50rem',
          height: '30em',
        },
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
      expect((editor.element as HTMLElement).style.width).toBe('50rem')
      expect((editor.element as HTMLElement).style.height).toBe('30em')
    })
  })

  describe('Basic Functionality', () => {
    it('should render with default placeholder', () => {
      wrapper = mount(NextLevelEditor, {
        props: {},
      })

      const editor = wrapper.find('.next-level-editor')
      expect(editor.exists()).toBe(true)
    })

    it('should accept custom placeholder', () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          placeholder: 'Custom placeholder text',
        },
      })

      const editorContent = wrapper.find('.editor-content')
      expect(editorContent.exists()).toBe(true)
      expect(editorContent.attributes('placeholder')).toBe('Custom placeholder text')
    })

    it('should emit update:modelValue on input', async () => {
      wrapper = mount(NextLevelEditor, {
        props: {
          modelValue: '<p>Initial content</p>',
        },
      })

      const editorContent = wrapper.find('.editor-content')
      expect(editorContent.exists()).toBe(true)

      // Simulate input event
      await editorContent.trigger('input')

      // Check if the event was emitted
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })
})
