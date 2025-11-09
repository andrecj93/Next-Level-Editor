import { ref } from "vue";

interface ToastNotificationOptions {
  duration?: number;
}

/**
 * Composable for managing editor UI state
 * Centralizes all UI-related state management
 */
export function useEditorUIState(options?: ToastNotificationOptions) {
  const { duration = 3000 } = options || {};

  // UI state
  const isFullScreen = ref(false);
  const fontSize = ref<"small" | "normal" | "large" | "huge">("normal");
  const spellCheckEnabled = ref(false);
  const formatPainterActive = ref(false);

  // Color picker state
  const textColor = ref("#000000");
  const backgroundColor = ref("#ffff00");
  const showColorsDropdown = ref(false);

  // Toast notification state
  const showToast = ref(false);
  const toastMessage = ref("");
  const toastType = ref<"success" | "error">("success");

  /**
   * Show a toast notification with a message
   */
  const showToastNotification = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    toastMessage.value = message;
    toastType.value = type;
    showToast.value = true;

    setTimeout(() => {
      showToast.value = false;
    }, duration);
  };

  /**
   * Toggle full screen mode
   */
  const toggleFullScreen = () => {
    isFullScreen.value = !isFullScreen.value;

    if (isFullScreen.value) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return {
    // UI state
    isFullScreen,
    fontSize,
    spellCheckEnabled,
    formatPainterActive,

    // Color picker
    textColor,
    backgroundColor,
    showColorsDropdown,

    // Toast notifications
    showToast,
    toastMessage,
    toastType,
    showToastNotification,

    // Actions
    toggleFullScreen,
  };
}
