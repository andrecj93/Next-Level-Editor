import { describe, it, expect, afterEach } from 'vitest'
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

    // The (hidden, in code view) WYSIWYG surface mirrors the formatted source
    const editorContent = wrapper.find('.editor-content')
    expect((editorContent.element as HTMLElement).innerHTML).toBe(FORMATTED)

    // And the change was emitted through v-model. The emit pipeline sanitizes,
    // which strips whitespace-only text nodes — so the model receives the
    // semantically identical compact HTML, not whitespace-polluted markup.
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toBe(RAW)
  })
})
