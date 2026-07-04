import { Plugin } from 'vue'
import NextLevelEditor from './components/NextLevelEditor.vue'

export { NextLevelEditor }

// Export utility functions
export function formatHtml(html: string, indentSize?: number): string
export function htmlToMarkdown(html: string): string
export function exportAsHtml(html: string, filename?: string, prettify?: boolean): void
export function exportAsMarkdown(html: string, filename?: string): void

declare const plugin: Plugin

export default plugin

export interface MentionSuggestion {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

export interface NextLevelEditorProps {
  modelValue?: string
  placeholder?: string
  width?: string
  height?: string
  showWritingStats?: boolean
  enableComments?: boolean
  enableVariables?: boolean
  /** Host-supplied @mention provider for comment mentions. */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[]
}

export interface NextLevelEditorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}
