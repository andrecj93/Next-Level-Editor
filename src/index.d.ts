import { Plugin } from 'vue'
import NextLevelEditor from './components/NextLevelEditor.vue'

export { NextLevelEditor }

declare const plugin: Plugin

export default plugin

export interface NextLevelEditorProps {
  modelValue?: string
  placeholder?: string
}

export interface NextLevelEditorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}
