import { onMounted, onUnmounted, ref } from "vue";

/**
 * Gesture types detected by the system
 */
export type GestureType =
  | "swipe-left"
  | "swipe-right"
  | "swipe-up"
  | "swipe-down"
  | "pinch-in"
  | "pinch-out"
  | "long-press"
  | "double-tap"
  | "tap"
  | "two-finger-tap";

/**
 * Gesture event data
 */
export interface GestureEvent {
  type: GestureType;
  target: EventTarget | null;
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  duration?: number;
}

/**
 * Haptic feedback patterns
 */
export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "warning";

/**
 * Mobile gesture callbacks
 */
export interface MobileGestureCallbacks {
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLongPress?: (e: GestureEvent) => void;
  onDoubleTap?: (e: GestureEvent) => void;
  onTap?: (e: GestureEvent) => void;
  onSwipe?: (e: GestureEvent) => void;
}

/**
 * Professional mobile gesture system
 * Inspired by iOS/Android native apps and Google Docs mobile
 *
 * Features:
 * - Multi-touch gestures (swipe, pinch, tap)
 * - Haptic feedback (Vibration API)
 * - Touch target optimization (44x44px minimum)
 * - Gesture recognition with configurable thresholds
 * - Debounced and optimized for performance
 */
export function useMobileGestures(
  editorRef: { value: HTMLElement | null },
  callbacks: MobileGestureCallbacks = {}
) {
  const {
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onLongPress,
    onDoubleTap,
    onTap,
    onSwipe,
  } = callbacks;

  // Gesture state
  const isSwiping = ref(false);
  const isPinching = ref(false);
  // Peak simultaneous finger count during the current touch sequence. A tap
  // may only fire when this is 1 — a multi-finger gesture releases its fingers
  // one at a time, and the first release resets isSwiping/isPinching, so the
  // last release used to look like a lone single-finger tap and fired spuriously.
  const maxTouches = ref(0);
  const isLongPressing = ref(false);

  // Touch tracking
  const startX = ref(0);
  const startY = ref(0);
  const startDistance = ref(0);
  const lastTapTime = ref(0);
  const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  // Gesture thresholds
  const minSwipeDistance = 50; // minimum distance for swipe (px)
  const maxVerticalDistance = 30; // max vertical movement for horizontal swipe
  const minPinchDistance = 40; // minimum distance change for pinch
  const longPressDuration = 500; // long press duration (ms)
  const doubleTapDelay = 300; // max time between taps for double-tap (ms)

  // Haptic feedback support check. Guarded because this runs during SETUP, and
  // `navigator` is not a global in Node before v21 — on Node 20 LTS a bare
  // reference throws ReferenceError and takes the whole server render with it.
  const supportsHaptics =
    typeof navigator !== "undefined" && "vibrate" in navigator;

  /**
   * Trigger haptic feedback
   */
  const triggerHaptic = (pattern: HapticPattern = "light") => {
    if (!supportsHaptics) return;

    try {
      switch (pattern) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(20);
          break;
        case "heavy":
          navigator.vibrate(50);
          break;
        case "success":
          navigator.vibrate([10, 50, 10]); // Short-long-short
          break;
        case "error":
          navigator.vibrate([50, 50, 50]); // Three medium pulses
          break;
        case "warning":
          navigator.vibrate([20, 100, 20]); // Medium-long-medium
          break;
      }
    } catch (error) {
      console.debug("Haptic feedback failed:", error);
    }
  };

  /**
   * Calculate distance between two touch points
   */
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Emit gesture event
   */
  const emitGesture = (type: GestureType, data: Partial<GestureEvent> = {}) => {
    const event: GestureEvent = {
      type,
      target: data.target || null,
      ...data,
    };

    // Call appropriate callback
    switch (type) {
      case "swipe-left":
        triggerHaptic("medium");
        onRedo?.();
        onSwipe?.(event);
        break;
      case "swipe-right":
        triggerHaptic("medium");
        onUndo?.();
        onSwipe?.(event);
        break;
      case "swipe-up":
      case "swipe-down":
        triggerHaptic("light");
        onSwipe?.(event);
        break;
      case "pinch-in":
        triggerHaptic("light");
        onZoomOut?.();
        break;
      case "pinch-out":
        triggerHaptic("light");
        onZoomIn?.();
        break;
      case "long-press":
        triggerHaptic("heavy");
        onLongPress?.(event);
        break;
      case "double-tap":
        triggerHaptic("light");
        onDoubleTap?.(event);
        break;
      case "tap":
        onTap?.(event);
        break;
    }
  };

  /**
   * Handle touch start
   */
  const handleTouchStart = (e: TouchEvent) => {
    if (!editorRef.value) return;

    const touches = e.touches;
    maxTouches.value = Math.max(maxTouches.value, touches.length);

    // Single touch - possible tap or long press
    if (touches.length === 1) {
      startX.value = touches[0].clientX;
      startY.value = touches[0].clientY;

      // Start long press timer
      longPressTimer.value = setTimeout(() => {
        isLongPressing.value = true;
        emitGesture("long-press", { target: e.target });
      }, longPressDuration);
    }

    // Two finger touch - possible swipe or pinch
    if (touches.length === 2) {
      // Cancel long press if started
      if (longPressTimer.value) {
        clearTimeout(longPressTimer.value);
        longPressTimer.value = null;
      }

      startX.value = touches[0].clientX;
      startY.value = touches[0].clientY;
      startDistance.value = getTouchDistance(touches[0], touches[1]);
      isSwiping.value = true;
      isPinching.value = true;
    }
  };

  /**
   * Cancel a PENDING long press if the finger moved significantly.
   *
   * Only pending: once the long press has fired, the sequence is spent and
   * `isLongPressing` must stay latched until touchend. Clearing it on movement
   * made "long-press then drag" — how you adjust a selection on a phone —
   * look like a plain tap on release, so lifting emitted a spurious tap and
   * stamped lastTapTime, turning the next real tap into a double-tap. #R22-M4
   */
  const cancelLongPressIfMoved = (touch: Touch) => {
    if (!longPressTimer.value) return;

    const deltaX = Math.abs(touch.clientX - startX.value);
    const deltaY = Math.abs(touch.clientY - startY.value);

    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  /**
   * Detect and emit pinch gesture
   */
  const detectPinch = (touch1: Touch, touch2: Touch) => {
    // Fire once per two-finger gesture. Without this guard, continued spreading
    // re-entered detectPinch on every touchmove and re-emitted zoom steps.
    if (!isPinching.value) return;

    const currentDistance = getTouchDistance(touch1, touch2);
    const distanceChange = currentDistance - startDistance.value;

    if (Math.abs(distanceChange) > minPinchDistance) {
      // Disarm BOTH two-finger gestures — this move is a pinch, not a swipe,
      // and the gesture is now spent until the fingers lift (touchend re-arms).
      isPinching.value = false;
      isSwiping.value = false;
      const scale = currentDistance / startDistance.value;
      if (distanceChange > 0) {
        emitGesture("pinch-out", { scale });
      } else {
        emitGesture("pinch-in", { scale });
      }
    }
  };

  /**
   * Detect and emit swipe gesture
   */
  const detectSwipe = (touch: Touch) => {
    // Fire once per two-finger gesture. This guarded on the WRONG flag
    // (isPinching), so after a swipe emitted, isPinching stayed true and every
    // subsequent touchmove re-emitted the swipe — an undo/redo streak that
    // wiped multiple history states from a single gesture.
    if (!isSwiping.value) return;

    const deltaX = touch.clientX - startX.value;
    const deltaY = touch.clientY - startY.value;

    // Horizontal swipe
    if (
      Math.abs(deltaX) > minSwipeDistance &&
      Math.abs(deltaY) < maxVerticalDistance
    ) {
      // Disarm both — the gesture is spent until the fingers lift.
      isSwiping.value = false;
      isPinching.value = false;
      if (deltaX > 0) {
        emitGesture("swipe-right", { deltaX, deltaY });
      } else {
        emitGesture("swipe-left", { deltaX, deltaY });
      }
    }
    // Vertical swipe
    else if (
      Math.abs(deltaY) > minSwipeDistance &&
      Math.abs(deltaX) < maxVerticalDistance
    ) {
      isSwiping.value = false;
      isPinching.value = false;
      if (deltaY > 0) {
        emitGesture("swipe-down", { deltaX, deltaY });
      } else {
        emitGesture("swipe-up", { deltaX, deltaY });
      }
    }
  };

  /**
   * Handle touch move
   */
  const handleTouchMove = (e: TouchEvent) => {
    if (!editorRef.value) return;

    const touches = e.touches;

    // Single touch - check for long press cancellation
    if (touches.length === 1) {
      cancelLongPressIfMoved(touches[0]);
    }

    // Two finger gestures
    if (touches.length === 2 && (isSwiping.value || isPinching.value)) {
      e.preventDefault(); // Prevent default zoom/scroll
      detectPinch(touches[0], touches[1]);
      detectSwipe(touches[0]);
    }
  };

  /**
   * Handle touch end
   */
  const handleTouchEnd = (e: TouchEvent) => {
    if (!editorRef.value) return;

    // Clear long press timer
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }

    // Handle tap gestures (only if not swiping/long-pressing, and the whole
    // sequence never involved more than one finger — otherwise the second
    // finger's release fired a spurious tap).
    if (
      e.changedTouches.length === 1 &&
      maxTouches.value === 1 &&
      !isSwiping.value &&
      !isPinching.value &&
      !isLongPressing.value
    ) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.value;

      if (timeSinceLastTap < doubleTapDelay) {
        // Double tap detected
        emitGesture("double-tap", { target: e.target });
        lastTapTime.value = 0; // Reset to prevent triple-tap
      } else {
        // Single tap
        emitGesture("tap", { target: e.target });
        lastTapTime.value = now;
      }
    }

    // Handle two-finger tap
    if (e.changedTouches.length === 2 && !isSwiping.value) {
      emitGesture("two-finger-tap", { target: e.target });
    }

    // Reset state
    isSwiping.value = false;
    isPinching.value = false;
    isLongPressing.value = false;
    // Only clear the peak-touch tracker once EVERY finger is up, so a
    // multi-finger sequence stays flagged until it fully ends.
    if (e.touches.length === 0) {
      maxTouches.value = 0;
    }
  };

  onMounted(() => {
    if (editorRef.value) {
      const element = editorRef.value;
      element.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      element.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      element.addEventListener("touchend", handleTouchEnd, { passive: false });
    }
  });

  onUnmounted(() => {
    if (editorRef.value) {
      const element = editorRef.value;
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    }

    // Clear any pending timers
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
    }
  });

  return {
    isSwiping,
    isPinching,
    isLongPressing,
    supportsHaptics,
  };
}
