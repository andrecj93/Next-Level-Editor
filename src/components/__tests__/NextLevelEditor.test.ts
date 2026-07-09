import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NextLevelEditor from '../NextLevelEditor.vue'
import EditorToolbar from '../EditorToolbar.vue'
import VariableAutocomplete from '../VariableAutocomplete.vue'
import { editorThemeClass } from '../../composables/useEditorThemes'

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

/**
 * Real-behaviour integration suite for the orchestrator. These tests mount the
 * FULL component (no child stubbing) and drive it through real DOM events and
 * child-component emits, then assert on rendered output / emitted() payloads.
 *
 * localStorage is cleared around each test because useTheme() persists the
 * light/dark choice there — without clearing, a dark toggle in one test would
 * leak into the next mount's initial theme.
 *
 * NOTE ON ABSENT PROPS: this branch's Props interface exposes modelValue,
 * placeholder, width, height, showWritingStats, enableComments, enableVariables,
 * themePreset, toolbarLayout and mentionSearch. It does NOT yet have readonly /
 * showToolbar / defaultViewMode / autofocus, so those are intentionally not
 * exercised here (there is nothing to assert — they would be inert extraneous
 * attributes). See `notes` in the task output.
 */
describe('NextLevelEditor — real-behaviour integration', () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  afterEach(() => {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  const flush = async () => {
    await nextTick()
    await nextTick()
  }

  describe('v-model round-trip', () => {
    it('renders the initial modelValue into the editing surface on mount', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>Hello world</p>' },
      })
      await flush()

      const surface = w.find('.editor-content').element as HTMLElement
      expect(surface.innerHTML).toContain('Hello world')
      expect(surface.innerHTML).toContain('<p>')
      w.unmount()
    })

    it('reflects an external modelValue prop update into the editing surface', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>Original</p>' },
      })
      await flush()
      expect((w.find('.editor-content').element as HTMLElement).innerHTML).toContain(
        'Original'
      )

      await w.setProps({ modelValue: '<p>Replaced externally</p>' })
      await flush()

      const surface = w.find('.editor-content').element as HTMLElement
      expect(surface.innerHTML).toContain('Replaced externally')
      expect(surface.innerHTML).not.toContain('Original')
      w.unmount()
    })

    it('emits update:modelValue carrying the edited HTML when the surface fires input', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>start</p>' },
      })
      await flush()

      const surface = w.find('.editor-content')
      // Simulate the browser having mutated the contenteditable DOM, then fire
      // the input event the editor listens for. happy-dom does not run
      // execCommand, so we drive innerHTML directly — the emit path reads it.
      ;(surface.element as HTMLElement).innerHTML = '<p>Edited by user</p>'
      await surface.trigger('input')
      await flush()

      const emitted = w.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted!.at(-1)![0]).toContain('Edited by user')
      w.unmount()
    })

    it('keeps the footer word/character counts in sync with the initial content', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>one two three</p>' },
      })
      await flush()

      const footer = w.find('.editor-footer')
      expect(footer.exists()).toBe(true)
      expect(w.find('.word-count').text()).toBe('3 words')
      // "one two three" = 13 characters
      expect(w.find('.char-count').text()).toBe('13 characters')
      w.unmount()
    })
  })

  describe('theme, preset and layout classes', () => {
    it('defaults to the light theme class and no preset class', async () => {
      const w = mount(NextLevelEditor)
      await flush()
      expect(w.classes()).toContain('theme-light')
      expect(w.classes().some((c) => c.startsWith('nle-theme-'))).toBe(false)
      w.unmount()
    })

    it.each(['classic', 'minimal', 'midnight', 'warm'])(
      'applies nle-theme-%s for the matching themePreset',
      async (preset) => {
        const w = mount(NextLevelEditor, { props: { themePreset: preset } })
        await flush()
        expect(w.classes()).toContain(editorThemeClass(preset))
        expect(w.classes()).toContain(`nle-theme-${preset}`)
        w.unmount()
      }
    )

    it('applies no nle-theme class for the "default" preset', async () => {
      const w = mount(NextLevelEditor, { props: { themePreset: 'default' } })
      await flush()
      expect(editorThemeClass('default')).toBe('')
      expect(w.classes().some((c) => c.startsWith('nle-theme-'))).toBe(false)
      w.unmount()
    })

    it('toggles the root to theme-dark when the toolbar requests a theme toggle', async () => {
      const w = mount(NextLevelEditor)
      await flush()
      expect(w.classes()).toContain('theme-light')

      w.findComponent(EditorToolbar).vm.$emit('toggle-theme')
      await flush()

      expect(w.classes()).toContain('theme-dark')
      expect(w.classes()).not.toContain('theme-light')
      w.unmount()
    })

    it('adds the is-compact modifier to the toolbar only for toolbarLayout="compact"', async () => {
      const comfortable = mount(NextLevelEditor, {
        props: { toolbarLayout: 'comfortable' },
      })
      await flush()
      expect(comfortable.find('.editor-toolbar-modern').classes()).not.toContain(
        'is-compact'
      )
      comfortable.unmount()

      const compact = mount(NextLevelEditor, {
        props: { toolbarLayout: 'compact' },
      })
      await flush()
      expect(compact.find('.editor-toolbar-modern').classes()).toContain(
        'is-compact'
      )
      compact.unmount()
    })
  })

  describe('view-mode switching', () => {
    it('starts in editor mode with a contenteditable WYSIWYG surface', async () => {
      const w = mount(NextLevelEditor)
      await flush()

      expect(w.find('.editor-container').classes()).toContain('view-mode-editor')
      const surface = w.find('.editor-content')
      expect(surface.exists()).toBe(true)
      expect(surface.attributes('contenteditable')).toBe('true')
      // No code textarea in editor mode
      expect(w.find('.code-editor').exists()).toBe(false)
      w.unmount()
    })

    it('switches to code view when the toolbar changes the view mode', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>code me</p>' },
      })
      await flush()

      w.findComponent(EditorToolbar).vm.$emit('view-mode-change', 'code')
      await flush()

      expect(w.find('.editor-container').classes()).toContain('view-mode-code')
      const textarea = w.find('textarea.code-editor')
      expect(textarea.exists()).toBe(true)
      w.unmount()
    })

    it('switches to preview view and renders the preview panel', async () => {
      const w = mount(NextLevelEditor, {
        props: { modelValue: '<p>preview me</p>' },
      })
      await flush()

      w.findComponent(EditorToolbar).vm.$emit('view-mode-change', 'preview')
      await flush()

      expect(w.find('.editor-container').classes()).toContain('view-mode-preview')
      const preview = w.find('.preview-panel')
      expect(preview.exists()).toBe(true)
      expect(w.find('.preview-content-wrapper').exists()).toBe(true)
      w.unmount()
    })

    it('switches to split view exposing both a code textarea and a split editor toggle', async () => {
      const w = mount(NextLevelEditor)
      await flush()

      w.findComponent(EditorToolbar).vm.$emit('view-mode-change', 'split')
      await flush()

      expect(w.find('.editor-container').classes()).toContain('view-mode-split')
      expect(w.find('textarea.code-editor').exists()).toBe(true)
      expect(w.find('.split-right-panel').exists()).toBe(true)
      w.unmount()
    })
  })

  describe('feature-flag subsystems', () => {
    it('does NOT render comments UI when enableComments is off (default)', async () => {
      const w = mount(NextLevelEditor)
      await flush()
      expect(w.find('.comments-toggle-fab').exists()).toBe(false)
      expect(w.findComponent({ name: 'CommentsSidebar' }).exists()).toBe(false)
      w.unmount()
    })

    it('mounts the comments sidebar, comment modal and toggle FAB when enableComments is on', async () => {
      const w = mount(NextLevelEditor, { props: { enableComments: true } })
      await flush()

      // FAB shows while the sidebar is closed
      expect(w.find('.comments-toggle-fab').exists()).toBe(true)
      expect(w.findComponent({ name: 'CommentsSidebar' }).exists()).toBe(true)
      expect(w.findComponent({ name: 'CommentModal' }).exists()).toBe(true)
      w.unmount()
    })

    it('opens the comments sidebar when the FAB is clicked (and the FAB then hides)', async () => {
      const w = mount(NextLevelEditor, { props: { enableComments: true } })
      await flush()

      await w.find('.comments-toggle-fab').trigger('click')
      await flush()

      // FAB is v-if="!showCommentsSidebar" — once open it disappears
      expect(w.find('.comments-toggle-fab').exists()).toBe(false)
      w.unmount()
    })

    it('does NOT render the writing-stats FAB when showWritingStats is off (default)', async () => {
      const w = mount(NextLevelEditor)
      await flush()
      expect(w.find('.writing-stats-toggle-fab').exists()).toBe(false)
      w.unmount()
    })

    it('mounts the writing-stats toggle FAB when showWritingStats is on', async () => {
      const w = mount(NextLevelEditor, { props: { showWritingStats: true } })
      await flush()
      expect(w.find('.writing-stats-toggle-fab').exists()).toBe(true)
      w.unmount()
    })

    it('toggles the writing-stats panel open when its FAB is clicked', async () => {
      const w = mount(NextLevelEditor, {
        props: { showWritingStats: true, modelValue: '<p>some words here</p>' },
      })
      await flush()

      expect(w.findComponent({ name: 'WritingStatsPanel' }).exists()).toBe(false)
      await w.find('.writing-stats-toggle-fab').trigger('click')
      await flush()
      expect(w.findComponent({ name: 'WritingStatsPanel' }).exists()).toBe(true)
      w.unmount()
    })

    it('does NOT mount the variable autocomplete when enableVariables is off (default)', async () => {
      const w = mount(NextLevelEditor)
      await flush()
      expect(w.findComponent(VariableAutocomplete).exists()).toBe(false)
      w.unmount()
    })

    it('mounts the variable autocomplete when enableVariables is on', async () => {
      const w = mount(NextLevelEditor, { props: { enableVariables: true } })
      await flush()
      expect(w.findComponent(VariableAutocomplete).exists()).toBe(true)
      w.unmount()
    })
  })

  describe('structural wiring', () => {
    it('always renders the toolbar, editor panels, footer and modals container', async () => {
      const w = mount(NextLevelEditor)
      await flush()

      expect(w.findComponent(EditorToolbar).exists()).toBe(true)
      expect(w.find('.editor-container').exists()).toBe(true)
      expect(w.find('.editor-footer').exists()).toBe(true)
      expect(w.findComponent({ name: 'ModalsContainer' }).exists()).toBe(true)
      w.unmount()
    })

    it('passes the custom placeholder through to the contenteditable surface', async () => {
      const w = mount(NextLevelEditor, {
        props: { placeholder: 'Write something great…' },
      })
      await flush()
      expect(w.find('.editor-content').attributes('placeholder')).toBe(
        'Write something great…'
      )
      w.unmount()
    })

    it('emits focus and blur when the editing surface is focused and blurred', async () => {
      const w = mount(NextLevelEditor)
      await flush()

      const surface = w.find('.editor-content')
      await surface.trigger('focus')
      await surface.trigger('blur')

      expect(w.emitted('focus')).toBeTruthy()
      expect(w.emitted('blur')).toBeTruthy()
      w.unmount()
    })
  })
})
