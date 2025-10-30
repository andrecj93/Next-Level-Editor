import { App } from 'vue'
import NextLevelEditor from './components/NextLevelEditor.vue'

export { NextLevelEditor }

export default {
  install: (app: App) => {
    app.component('NextLevelEditor', NextLevelEditor)
  }
}
