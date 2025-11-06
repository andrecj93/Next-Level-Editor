import { App } from 'vue'
import NextLevelEditor from './components/NextLevelEditor.vue'

// Export utility functions
export { formatHtml, htmlToMarkdown, exportAsHtml, exportAsMarkdown } from './utils/export'
export { copyFormat, pasteFormat, hasFormatCopied, clearCopiedFormat } from './utils/formatPainter'
export { getTemplates, getTemplatesByCategory, getTemplateById, type Template } from './utils/templates'
export { insertPageBreak, insertTableOfContents, generateTableOfContents } from './utils/pageManagement'
export { toggleSpellCheck, enableSpellCheck, disableSpellCheck, getSuggestion } from './utils/spellChecker'

export { NextLevelEditor }

export default {
  install: (app: App) => {
    app.component('NextLevelEditor', NextLevelEditor)
  }
}
