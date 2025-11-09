import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useViewMode } from '../useViewMode'
import * as exportUtils from '../../utils/export'

vi.mock('../../utils/export', () => ({
  formatHtml: vi.fn((html: string) => html.trim())
}))

describe('useViewMode', () => {
  let editorContent: any
  let htmlContent: any
  let codeContent: any
  let viewMode: ReturnType<typeof useViewMode>

  beforeEach(() => {
    editorContent = ref(document.createElement('div'))
    htmlContent = ref('<p>Initial HTML</p>')
    codeContent = ref('')
    
    viewMode = useViewMode({
      editorContent,
      htmlContent,
      codeContent
    })
    
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with editor view mode', () => {
      expect(viewMode.viewMode.value).toBe('editor')
    })

    it('should have empty code content initially', () => {
      expect(codeContent.value).toBe('')
    })

    it('should preserve htmlContent ref', () => {
      expect(htmlContent.value).toBe('<p>Initial HTML</p>')
    })
  })

  describe('restoreEditorContent', () => {
    it('should restore editor content from htmlContent when editor is empty', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = '<p>Restore me</p>'
      
      viewMode.restoreEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('<p>Restore me</p>')
    })

    it('should not restore when editor already has content', () => {
      editorContent.value.innerHTML = '<p>Existing</p>'
      htmlContent.value = '<p>Should not restore</p>'
      
      viewMode.restoreEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('<p>Existing</p>')
    })

    it('should not restore when htmlContent is empty', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = ''
      
      viewMode.restoreEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('')
    })

    it('should handle whitespace-only content as empty', () => {
      editorContent.value.innerHTML = '   \n\t  '
      htmlContent.value = '<p>Restore</p>'
      
      viewMode.restoreEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('<p>Restore</p>')
    })

    it('should do nothing if editorContent is null', () => {
      editorContent.value = null
      htmlContent.value = '<p>Test</p>'
      
      expect(() => {
        viewMode.restoreEditorContent()
      }).not.toThrow()
    })

    it('should handle complex HTML restoration', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = '<div><h1>Title</h1><p>Content</p></div>'
      
      viewMode.restoreEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('<div><h1>Title</h1><p>Content</p></div>')
    })
  })

  describe('syncCodeEditor', () => {
    it('should sync code editor with current HTML', () => {
      editorContent.value.innerHTML = '<p>Sync me</p>'
      
      viewMode.syncCodeEditor()
      
      expect(codeContent.value).toBe('<p>Sync me</p>')
      expect(exportUtils.formatHtml).toHaveBeenCalledWith('<p>Sync me</p>')
    })

    it('should use htmlContent if editor is empty', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = '<p>From htmlContent</p>'
      
      viewMode.syncCodeEditor()
      
      expect(codeContent.value).toBe('<p>From htmlContent</p>')
    })

    it('should handle empty content', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = ''
      
      viewMode.syncCodeEditor()
      
      expect(codeContent.value).toBe('')
    })

    it('should do nothing if editorContent is null', () => {
      editorContent.value = null
      
      expect(() => {
        viewMode.syncCodeEditor()
      }).not.toThrow()
    })

    it('should call formatHtml utility', () => {
      editorContent.value.innerHTML = '<div><p>Format</p></div>'
      
      viewMode.syncCodeEditor()
      
      expect(exportUtils.formatHtml).toHaveBeenCalled()
    })

    it('should handle complex nested HTML with tbody', () => {
      const complexHtml = '<div><ul><li>Item 1</li><li>Item 2</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table></div>'
      editorContent.value.innerHTML = complexHtml
      
      viewMode.syncCodeEditor()
      
      expect(exportUtils.formatHtml).toHaveBeenCalledWith(complexHtml)
    })
  })

  describe('saveEditorContent', () => {
    it('should save editor content to htmlContent', () => {
      editorContent.value.innerHTML = '<p>Save me</p>'
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toBe('<p>Save me</p>')
    })

    it('should handle empty editor content', () => {
      editorContent.value.innerHTML = ''
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toBe('')
    })

    it('should do nothing if editorContent is null', () => {
      const originalHtmlContent = htmlContent.value
      editorContent.value = null
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toBe(originalHtmlContent)
    })

    it('should save complex HTML structures', () => {
      const complexHtml = '<div><h1>Title</h1><p>Content <strong>bold</strong></p></div>'
      editorContent.value.innerHTML = complexHtml
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toBe(complexHtml)
    })

    it('should overwrite previous htmlContent', () => {
      htmlContent.value = '<p>Old</p>'
      editorContent.value.innerHTML = '<p>New</p>'
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toBe('<p>New</p>')
    })
  })

  describe('View Mode Switching', () => {
    it('should allow changing viewMode value', () => {
      viewMode.viewMode.value = 'code'
      expect(viewMode.viewMode.value).toBe('code')
    })

    it('should switch to split mode', () => {
      viewMode.viewMode.value = 'split'
      expect(viewMode.viewMode.value).toBe('split')
    })

    it('should switch to preview mode', () => {
      viewMode.viewMode.value = 'preview'
      expect(viewMode.viewMode.value).toBe('preview')
    })

    it('should switch back to editor mode', () => {
      viewMode.viewMode.value = 'code'
      viewMode.viewMode.value = 'editor'
      expect(viewMode.viewMode.value).toBe('editor')
    })

    it('should allow all valid view modes', () => {
      const modes: Array<'editor' | 'code' | 'split' | 'preview'> = ['editor', 'code', 'split', 'preview']
      
      modes.forEach(mode => {
        viewMode.viewMode.value = mode
        expect(viewMode.viewMode.value).toBe(mode)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null editorContent gracefully in all operations', () => {
      editorContent.value = null
      
      expect(() => {
        viewMode.restoreEditorContent()
        viewMode.syncCodeEditor()
        viewMode.saveEditorContent()
      }).not.toThrow()
    })

    it('should handle switching modes with null editorContent', async () => {
      editorContent.value = null
      
      viewMode.viewMode.value = 'code'
      await nextTick()
      
      expect(viewMode.viewMode.value).toBe('code')
    })

    it('should handle empty strings in all content refs', () => {
      editorContent.value.innerHTML = ''
      htmlContent.value = ''
      codeContent.value = ''
      
      viewMode.restoreEditorContent()
      viewMode.syncCodeEditor()
      viewMode.saveEditorContent()
      
      expect(editorContent.value.innerHTML).toBe('')
      expect(htmlContent.value).toBe('')
      expect(codeContent.value).toBe('')
    })

    it('should handle very long HTML content', () => {
      const longHtml = '<p>' + 'Lorem ipsum '.repeat(1000) + '</p>'
      editorContent.value.innerHTML = longHtml
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value.length).toBeGreaterThan(10000)
    })

    it('should handle special HTML characters', () => {
      const specialHtml = '<p>&lt;script&gt; &amp; &quot;</p>'
      editorContent.value.innerHTML = specialHtml
      
      viewMode.saveEditorContent()
      
      expect(htmlContent.value).toContain('&lt;')
    })

    it('should handle switching to same mode', async () => {
      viewMode.viewMode.value = 'editor'
      await nextTick()
      
      viewMode.viewMode.value = 'editor'
      await nextTick()
      
      expect(viewMode.viewMode.value).toBe('editor')
    })

    it('should re-sync codeContent when switching back to code mode', async () => {
      editorContent.value.innerHTML = '<p>Code preserve test</p>'
      viewMode.viewMode.value = 'code'
      await nextTick()
      
      viewMode.viewMode.value = 'editor'
      await nextTick()
      
      viewMode.viewMode.value = 'code'
      await nextTick()
      
      expect(codeContent.value).toBeTruthy()
      expect(exportUtils.formatHtml).toHaveBeenCalled()
    })
  })
})
