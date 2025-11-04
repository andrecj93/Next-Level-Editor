import { App } from 'vue'
import NextLevelEditor from './components/NextLevelEditor.vue'

// Export utility functions
export { formatHtml, htmlToMarkdown, exportAsHtml, exportAsMarkdown } from './utils/export'

export { NextLevelEditor }

export default {
  install: (app: App) => {
    app.component('NextLevelEditor', NextLevelEditor)
  }
}
