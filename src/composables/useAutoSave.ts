import { ref, watch } from 'vue'

/**
 * Composable for auto-saving content with debouncing
 * @param callback - Function to call when content should be saved
 * @param delay - Delay in milliseconds before saving (default: 2000ms)
 */
export function useAutoSave(
  callback: (content: string) => void | Promise<void>,
  delay: number = 2000
) {
  const isSaving = ref(false)
  const lastSaved = ref<Date | null>(null)
  const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Trigger auto-save with debouncing
   * @param content - Content to save
   */
  const triggerAutoSave = (content: string) => {
    // Clear existing timer
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }

    // Set new timer
    saveTimer.value = setTimeout(async () => {
      isSaving.value = true
      try {
        await callback(content)
        lastSaved.value = new Date()
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        isSaving.value = false
      }
    }, delay)
  }

  /**
   * Force save immediately
   * @param content - Content to save
   */
  const forceSave = async (content: string) => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }

    isSaving.value = true
    try {
      await callback(content)
      lastSaved.value = new Date()
    } catch (error) {
      console.error('Force save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Cancel pending auto-save
   */
  const cancelAutoSave = () => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
      saveTimer.value = null
    }
  }

  return {
    isSaving,
    lastSaved,
    triggerAutoSave,
    forceSave,
    cancelAutoSave,
  }
}
