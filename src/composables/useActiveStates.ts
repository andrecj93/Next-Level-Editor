import { type Ref, type ComputedRef } from 'vue'
import { isInlineStyleActive, isBlockActive, isListActive } from '../utils/formatting'

export interface ActiveStates {
  isInlineActionActive: (tag: string) => boolean
  isBlockActionActive: (tag: string) => boolean
  isListActionActive: (tag: 'ul' | 'ol') => boolean
}

export function useActiveStates(
  editorContent: Ref<HTMLDivElement | null> | ComputedRef<HTMLDivElement | null>
): ActiveStates {
  const isInlineActionActive = (tag: string): boolean => {
    if (!editorContent.value) return false
    return isInlineStyleActive(editorContent.value, tag)
  }

  const isBlockActionActive = (tag: string): boolean => {
    if (!editorContent.value) return false
    return isBlockActive(editorContent.value, tag)
  }

  const isListActionActive = (tag: 'ul' | 'ol'): boolean => {
    if (!editorContent.value) return false
    return isListActive(editorContent.value, tag)
  }

  return {
    isInlineActionActive,
    isBlockActionActive,
    isListActionActive,
  }
}
