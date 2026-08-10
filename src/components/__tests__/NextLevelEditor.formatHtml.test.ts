import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NextLevelEditor from '../NextLevelEditor.vue'

/**
 * Regression tests for the toolbar "Format HTML" button (code/split views).
 *
 * Bug: the button was wired to handleFormatHtml, which pretty-printed the
 * hidden WYSIWYG div but never updated codeContent — so the visible code
 * textarea stayed byte-identical while whitespace was silently injected into
 * the model. It must instead reformat the textarea content and keep the
 * editor surface + v-model in sync.
 */
describe('NextLevelEditor — Format HTML button', () => {
  let wrapper: ReturnType<typeof mount>

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  const RAW = '<h1>FmtTest</h1><p>one</p><p>two</p>'
  const FORMATTED = '<h1>FmtTest</h1>\n<p>one</p>\n<p>two</p>'

  async function enterViewAndTypeRawHtml(view: 'code' | 'split') {
    const label = view === 'code' ? 'Code view' : 'Split view'
    await wrapper.find(`button[aria-label="${label}"]`).trigger('click')
    // The viewMode watcher syncs content inside a nextTick
    await nextTick()
    await nextTick()

    const textarea = wrapper.find('textarea.code-editor')
    expect(textarea.exists()).toBe(true)

    // Simulate the user replacing the source with single-line HTML
    ;(textarea.element as HTMLTextAreaElement).value = RAW
    await textarea.trigger('input')
    return textarea
  }

  it('visibly reformats the code textarea in code view', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '' } })

    const textarea = await enterViewAndTypeRawHtml('code')
    expect((textarea.element as HTMLTextAreaElement).value).toBe(RAW)

    const formatBtn = wrapper.find('button[aria-label="Format HTML"]')
    expect(formatBtn.exists()).toBe(true)
    await formatBtn.trigger('click')
    await nextTick()

    expect((textarea.element as HTMLTextAreaElement).value).toBe(FORMATTED)
  })

  it('visibly reformats the code textarea in split view', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '' } })

    const textarea = await enterViewAndTypeRawHtml('split')

    await wrapper.find('button[aria-label="Format HTML"]').trigger('click')
    await nextTick()

    expect((textarea.element as HTMLTextAreaElement).value).toBe(FORMATTED)
  })

  it('keeps the editor surface and v-model in sync with the formatted source', async () => {
    wrapper = mount(NextLevelEditor, { props: { modelValue: '' } })

    await enterViewAndTypeRawHtml('code')
    await wrapper.find('button[aria-label="Format HTML"]').trigger('click')
    await nextTick()

    // The (hidden, in code view) WYSIWYG surface mirrors the source. It holds
    // the COMPACT form: the surface is now sanitized before the write (#R23-9)
    // and sanitizing drops whitespace-only text nodes. That is the same shape
    // typing in the textarea has always produced via onCodeInput — and it is
    // what this test's name asks for, since the model below is compact too.
    // Before the sanitize the two disagreed: formatted surface, compact model.
    const editorContent = wrapper.find('.editor-content')
    expect((editorContent.element as HTMLElement).innerHTML).toBe(RAW)

    // And the change was emitted through v-model. The emit pipeline sanitizes,
    // which strips whitespace-only text nodes — so the model receives the
    // semantically identical compact HTML, not whitespace-polluted markup.
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toBe(RAW)
  })

  /**
   * R23-9 (security): typing in the code textarea sanitizes before the value
   * re-enters the DOM (onCodeInput, the batch-24 stored-XSS fix), but the
   * Format HTML button took a different route — updateCodeContent wrote the
   * RAW textarea text into the live contenteditable, the mirrored surface and
   * htmlContent (which is v-html-rendered in the preview pane and re-emitted
   * by autosave). Pretty-printing a snippet copied off the web was enough to
   * execute its handlers in the host's origin and persist them to the model.
   */
  describe('Format HTML sanitizes (#R23-9)', () => {
    const PAYLOAD =
      '<p>hi</p><img src=x onerror="alert(document.domain)"><iframe src="https://tracker.example/beacon"></iframe>'

    it('does not write raw event handlers into the live editor surface', async () => {
      wrapper = mount(NextLevelEditor, { props: { modelValue: '' } })

      await wrapper.find('button[aria-label="Code view"]').trigger('click')
      await nextTick()
      await nextTick()

      const textarea = wrapper.find('textarea.code-editor')
      ;(textarea.element as HTMLTextAreaElement).value = PAYLOAD
      await textarea.trigger('input')

      // Typing is already safe — establish that, so a regression here is not
      // mistaken for the button's defect.
      const surface = wrapper.find('.editor-content').element as HTMLElement
      expect(surface.innerHTML).not.toContain('onerror')

      await wrapper.find('button[aria-label="Format HTML"]').trigger('click')
      await nextTick()

      expect(surface.innerHTML).not.toContain('onerror')
      expect(surface.innerHTML).not.toContain('tracker.example')
      expect(surface.querySelector('iframe')).toBeNull()
    })

    it('does not emit raw event handlers to the host model', async () => {
      // The emit fired SYNCHRONOUSLY after the click is sanitized, so checking
      // emitted() straight away looks clean and hides the leak. The raw string
      // escapes later, when the debounced autosave re-emits htmlContent.
      vi.useFakeTimers()
      wrapper = mount(NextLevelEditor, { props: { modelValue: '' } })

      await wrapper.find('button[aria-label="Code view"]').trigger('click')
      await nextTick()
      await nextTick()

      const textarea = wrapper.find('textarea.code-editor')
      ;(textarea.element as HTMLTextAreaElement).value = PAYLOAD
      await textarea.trigger('input')
      await wrapper.find('button[aria-label="Format HTML"]').trigger('click')
      await nextTick()

      vi.advanceTimersByTime(5000)
      await nextTick()

      const calls = wrapper.emitted('update:modelValue') ?? []
      expect(calls.length).toBeGreaterThan(0)
      for (const call of calls) {
        expect(String(call[0])).not.toContain('onerror')
        expect(String(call[0])).not.toContain('<iframe')
      }
    })
  })
})
