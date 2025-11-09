import { ref } from 'vue'

/**
 * Composable for toast notifications
 * Provides a simple toast notification system for success/error messages
 */
export function useToastNotification() {
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error'>('success')

  /**
   * Show a toast notification
   * @param message - The message to display
   * @param type - The type of toast (success or error)
   * @param duration - How long to show the toast in milliseconds (default: 3000)
   */
  const show = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    toastMessage.value = message
    toastType.value = type
    showToast.value = true

    setTimeout(() => {
      showToast.value = false
    }, duration)
  }

  /**
   * Hide the toast notification immediately
   */
  const hide = () => {
    showToast.value = false
  }

  return {
    showToast,
    toastMessage,
    toastType,
    show,
    hide,
  }
}
