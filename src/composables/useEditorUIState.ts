import { ref, onMounted, onBeforeUnmount } from "vue";
import { nextInstanceToken } from "../utils/instanceToken";

interface ToastNotificationOptions {
  duration?: number;
}

/**
 * Which editor asked for fullscreen. Module-level because fullscreen is a
 * DOCUMENT-level resource: the request goes to documentElement (fullscreening
 * just the editor root would hide every teleported modal and menu), so
 * `document.fullscreenElement` cannot identify the requester on its own. #R23-6
 */
let fullScreenOwner: string | null = null;

/**
 * Composable for managing editor UI state
 * Centralizes all UI-related state management
 */
export function useEditorUIState(options?: ToastNotificationOptions) {
  const { duration = 3000 } = options || {};
  const instanceToken = nextInstanceToken("nle-fs");

  // UI state
  const isFullScreen = ref(false);
  // In-page "Focus mode": the editor fills the viewport (fixed inset:0) without
  // the OS-level fullscreen takeover — a calm, distraction-free surface you can
  // leave with a click or Escape. Distinct from isFullScreen (real fullscreen).
  const isFocusMode = ref(false);
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
   * Toggle full screen mode. isFullScreen is driven by the actual
   * `fullscreenchange` event (see below) rather than flipped here, so the
   * state stays correct when the user leaves fullscreen with Esc/F11 — which
   * the browser handles directly, bypassing this button.
   */
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      fullScreenOwner = instanceToken;
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  /**
   * Toggle the in-page Focus mode. Pure CSS-state (no fullscreen API), so it
   * works anywhere the OS fullscreen call is blocked (sandboxed iframes, some
   * embeds) and never hijacks the whole screen.
   */
  const toggleFocusMode = () => {
    isFocusMode.value = !isFocusMode.value;
  };

  // Keep isFullScreen in sync with the real fullscreen state so the editor's
  // `.fullscreen` layout class and the toolbar button's active state never get
  // stuck on after an Esc/F11 exit.
  const syncFullScreenState = () => {
    const active = Boolean(document.fullscreenElement);
    // Nobody owns fullscreen once it ends — so the next request, from whichever
    // editor, is honoured. Every instance runs this; clearing is idempotent.
    if (!active) fullScreenOwner = null;
    // Only the editor that ASKED lays itself out as fullscreen. A host page
    // fullscreening itself leaves every editor alone. #R23-6
    isFullScreen.value = active && fullScreenOwner === instanceToken;
  };

  // Escape leaves Focus mode — but only once nothing else wants the key. The
  // editor's overlays (modals, command palette) handle Escape in the capture
  // phase and call preventDefault, so an already-handled Escape arrives here
  // with `defaultPrevented` set: a first Escape closes the topmost overlay, a
  // second exits Focus mode. Keying off defaultPrevented (instead of probing
  // the DOM for overlay selectors) is scope-safe — it never dead-locks when the
  // HOST page has a persistent [role="dialog"] (chat widget, cookie banner),
  // and it works for teleported overlays and multiple editors on one page.
  const onFocusModeKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !isFocusMode.value) return;
    if (event.defaultPrevented) return;
    isFocusMode.value = false;
  };

  onMounted(() => {
    document.addEventListener("fullscreenchange", syncFullScreenState);
    document.addEventListener("keydown", onFocusModeKeydown);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("fullscreenchange", syncFullScreenState);
    document.removeEventListener("keydown", onFocusModeKeydown);
  });

  return {
    // UI state
    isFullScreen,
    isFocusMode,
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
    toggleFocusMode,
  };
}
