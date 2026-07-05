import { ref, computed } from "vue";

/**
 * Toast notification types
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast position on screen
 */
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Individual toast notification
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
  progress: number;
  paused: boolean;
}

/**
 * Toast configuration options
 */
export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  position?: ToastPosition;
}

/**
 * Default toast icons by type — inline stroke SVGs (Lucide geometry) that match
 * the editor's icon language and inherit color from the toast's `color` via
 * currentColor. Rendered with v-html in ToastContainer (library-controlled
 * constants, not user input). Callers may still override `icon` with any string.
 */
const svgIcon = (paths: string): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const DEFAULT_ICONS: Record<ToastType, string> = {
  success: svgIcon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  error: svgIcon('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
  warning: svgIcon(
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
  ),
  info: svgIcon('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
};

/**
 * Generate unique ID for toasts
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Professional Toast Notification System
 * Features:
 * - Multiple toast stacking
 * - Auto-dismiss with progress bar
 * - Pause on hover
 * - Custom icons and actions
 * - Configurable position
 * - Smooth animations
 * - Accessible (ARIA)
 */
export function useToastNotification() {
  // Legacy support
  const showToast = ref(false);
  const toastMessage = ref("");
  const toastType = ref<ToastType>("success");

  // New advanced system
  const toasts = ref<Toast[]>([]);
  const position = ref<ToastPosition>("bottom-right");
  const maxToasts = ref(5);
  const defaultDuration = ref(3000);

  // Timers map to track toast auto-dismiss
  const timers = new Map<string, number>();
  const progressIntervals = new Map<string, number>();

  /**
   * Add a new toast notification
   */
  const addToast = (message: string, options: ToastOptions = {}): string => {
    const toast: Toast = {
      id: generateId(),
      message,
      type: options.type || "success",
      duration: options.duration ?? defaultDuration.value,
      dismissible: options.dismissible !== false,
      icon: options.icon || DEFAULT_ICONS[options.type || "success"],
      action: options.action,
      createdAt: Date.now(),
      progress: 0,
      paused: false,
    };

    // Remove oldest toast if max limit reached
    if (toasts.value.length >= maxToasts.value) {
      const oldestToast = toasts.value[0];
      removeToast(oldestToast.id);
    }

    toasts.value.push(toast);

    // Set up auto-dismiss
    if (toast.duration > 0) {
      startToastTimer(toast);
    }

    return toast.id;
  };

  /**
   * Start auto-dismiss timer with progress tracking
   */
  const startToastTimer = (toast: Toast) => {
    const startTime = Date.now();

    // Progress bar update interval (60fps)
    const progressInterval = window.setInterval(() => {
      const currentToast = toasts.value.find((t) => t.id === toast.id);
      if (!currentToast || currentToast.paused) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / toast.duration) * 100, 100);
      currentToast.progress = progress;

      if (progress >= 100) {
        clearInterval(progressInterval);
        progressIntervals.delete(toast.id);
      }
    }, 16); // ~60fps

    progressIntervals.set(toast.id, progressInterval);

    // Auto-dismiss timer
    const timer = window.setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);

    timers.set(toast.id, timer);
  };

  /**
   * Pause toast auto-dismiss (on hover)
   */
  const pauseToast = (id: string) => {
    const toast = toasts.value.find((t) => t.id === id);
    if (!toast || toast.paused) return;

    toast.paused = true;

    // Clear timers
    const timer = timers.get(id);
    const progressInterval = progressIntervals.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    if (progressInterval) {
      clearInterval(progressInterval);
      progressIntervals.delete(id);
    }
  };

  /**
   * Resume toast auto-dismiss
   */
  const resumeToast = (id: string) => {
    const toast = toasts.value.find((t) => t.id === id);
    if (!toast?.paused) return;

    toast.paused = false;

    // Calculate remaining time
    const remainingDuration = toast.duration * (1 - toast.progress / 100);

    if (remainingDuration > 0) {
      // Restart timer with remaining time
      const modifiedToast: Toast = {
        ...toast,
        duration: remainingDuration,
      };
      startToastTimer(modifiedToast);
    }
  };

  /**
   * Remove a toast notification
   */
  const removeToast = (id: string) => {
    // Clear timers
    const timer = timers.get(id);
    const progressInterval = progressIntervals.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    if (progressInterval) {
      clearInterval(progressInterval);
      progressIntervals.delete(id);
    }

    // Remove from array
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  /**
   * Clear all toasts
   */
  const clearAll = () => {
    // Clear all timers
    timers.forEach((timer) => clearTimeout(timer));
    progressIntervals.forEach((interval) => clearInterval(interval));

    timers.clear();
    progressIntervals.clear();
    toasts.value = [];
  };

  /**
   * Update toast position
   */
  const setPosition = (newPosition: ToastPosition) => {
    position.value = newPosition;
  };

  /**
   * Update max toasts
   */
  const setMaxToasts = (max: number) => {
    maxToasts.value = Math.max(1, max);
  };

  /**
   * Update default duration
   */
  const setDefaultDuration = (duration: number) => {
    defaultDuration.value = Math.max(0, duration);
  };

  // Computed properties
  const hasToasts = computed(() => toasts.value.length > 0);
  const toastCount = computed(() => toasts.value.length);

  // Legacy API support (backward compatibility)
  /**
   * @deprecated Use addToast instead
   */
  const show = (
    message: string,
    type: ToastType = "success",
    duration = 3000
  ) => {
    toastMessage.value = message;
    toastType.value = type;
    showToast.value = true;

    // Also add to new system
    addToast(message, { type, duration });

    setTimeout(() => {
      showToast.value = false;
    }, duration);
  };

  /**
   * @deprecated Use removeToast or clearAll instead
   */
  const hide = () => {
    showToast.value = false;
  };

  // Convenience methods
  const success = (message: string, options?: Omit<ToastOptions, "type">) =>
    addToast(message, { ...options, type: "success" });

  const error = (message: string, options?: Omit<ToastOptions, "type">) =>
    addToast(message, { ...options, type: "error" });

  const warning = (message: string, options?: Omit<ToastOptions, "type">) =>
    addToast(message, { ...options, type: "warning" });

  const info = (message: string, options?: Omit<ToastOptions, "type">) =>
    addToast(message, { ...options, type: "info" });

  return {
    // Legacy API (backward compatibility)
    showToast,
    toastMessage,
    toastType,
    show,
    hide,

    // New Advanced API
    toasts: computed(() => toasts.value),
    position: computed(() => position.value),
    hasToasts,
    toastCount,
    maxToasts: computed(() => maxToasts.value),
    defaultDuration: computed(() => defaultDuration.value),

    // Methods
    addToast,
    removeToast,
    pauseToast,
    resumeToast,
    clearAll,
    setPosition,
    setMaxToasts,
    setDefaultDuration,

    // Convenience methods
    success,
    error,
    warning,
    info,
  };
}
