import { ref, watch, onScopeDispose, type Ref } from "vue";

/**
 * Adaptive editor chrome — the video-player pattern applied to writing.
 *
 * Sustained typing is "playback": the toolbar and surrounding chrome recede
 * so the page becomes the whole interface. Pointer movement, a real text
 * selection, or a chrome-access key (Escape / Alt / F10) is "intent": the
 * chrome returns instantly. A mere typing pause does NOT bring the chrome
 * back — a thinking writer shouldn't see the toolbar pop in mid-thought.
 *
 * This is a pure state composable: it never touches DOM styles. The host
 * binds the returned `receded` ref to a data attribute / class and animates
 * the transition in CSS.
 *
 * Listeners are document-level but ownership-scoped to `root` (the same
 * pattern as useFloatingToolbar's editorRoot): events whose target lives
 * outside this editor instance are ignored, so several mounted editors don't
 * recede each other's chrome.
 */

/** A reactive boolean, as either a ref or a getter. */
type BooleanSource = Ref<boolean> | (() => boolean);

/**
 * Focus landing anywhere in the toolbar area brings the chrome back — a
 * keyboard user tabbing into the (visually receded) toolbar must see it.
 */
const TOOLBAR_FOCUS_SELECTOR = ".editor-toolbar-modern, .nle-toolbar-shell";

/** Pointer movement below this distance (px) is treated as jitter. */
const POINTER_JITTER_PX = 4;

/** Keys that never count as writing on their own. */
const MODIFIER_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "AltGraph",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "Symbol",
  "SymbolLock",
]);

const FUNCTION_KEY_RE = /^F\d{1,2}$/;

export interface UseChromeRecedeOptions {
  /**
   * The root element of THIS editor instance. All document-level listeners
   * check event targets against it, so a page with several editors only
   * recedes the one actually being written in.
   */
  root: Ref<HTMLElement | null>;
  /** Master switch; consulted when the recede timer fires. */
  enabled: BooleanSource;
  /**
   * "A dropdown / modal / menu is open." While true the chrome never
   * recedes, and if it is currently receded it is restored immediately.
   */
  suppressed?: BooleanSource;
  /** Quiet time after the last keystroke of a burst before receding. */
  recedeDelayMs?: number;
  /** Qualifying keystrokes (within `armWindowMs`) required to arm. */
  armKeystrokes?: number;
  /** Window within which the arming keystrokes must land. */
  armWindowMs?: number;
}

export interface UseChromeRecedeReturn {
  /** True while the chrome should be receded. Host binds this to CSS. */
  receded: Ref<boolean>;
  /** Manual reset — host calls it on e.g. toolbar interactions. */
  restore: () => void;
}

/**
 * Is this keydown "writing"? Printable characters count, and so do
 * Backspace / Delete / Enter (deleting and splitting paragraphs IS writing).
 * Pure modifiers, F-keys, Tab and Escape are chrome/navigation, not content.
 * IME composition keydowns (isComposing, or the synthetic "Process" key)
 * count too — a composing user is very much writing.
 */
const isWritingKeydown = (event: KeyboardEvent): boolean => {
  const { key } = event;
  if (key === "Escape" || key === "Tab") return false;
  if (MODIFIER_KEYS.has(key)) return false;
  if (FUNCTION_KEY_RE.test(key)) return false;
  if (key === "Backspace" || key === "Delete" || key === "Enter") return true;
  if (event.isComposing || key === "Process") return true;
  return key.length === 1;
};

/**
 * Composable managing the receded/restored state of the editor chrome.
 * Typing arms and (after a quiet delay) recedes; pointer/selection/focus
 * intent restores instantly.
 */
export function useChromeRecede(
  options: UseChromeRecedeOptions
): UseChromeRecedeReturn {
  const {
    root,
    recedeDelayMs = 900,
    armKeystrokes = 3,
    armWindowMs = 1000,
  } = options;

  const receded = ref(false);

  const readFlag = (source?: BooleanSource): boolean => {
    if (!source) return false;
    return typeof source === "function" ? source() : source.value;
  };
  const isEnabled = () => readFlag(options.enabled);
  const isSuppressed = () => readFlag(options.suppressed);

  // --- internal state (plain vars: none of this needs to be reactive) ---
  let recedeTimer: ReturnType<typeof setTimeout> | null = null;
  let armed = false;
  let keystrokes = 0;
  let windowStartedAt = 0;
  let lastPointer: { x: number; y: number } | null = null;

  const clearRecedeTimer = () => {
    if (recedeTimer !== null) {
      clearTimeout(recedeTimer);
      recedeTimer = null;
    }
  };

  /** Manual reset: disarm, cancel any pending recede, show the chrome. */
  const restore = () => {
    clearRecedeTimer();
    armed = false;
    keystrokes = 0;
    receded.value = false;
  };

  /**
   * (Re)start the quiet-delay timer. Each qualifying keydown while armed
   * restarts it, so the recede lands ~recedeDelayMs after the LAST
   * keystroke of a burst — not mid-burst.
   */
  const startRecedeTimer = () => {
    clearRecedeTimer();
    recedeTimer = setTimeout(() => {
      recedeTimer = null;
      if (isEnabled() && !isSuppressed()) {
        receded.value = true;
      }
    }, recedeDelayMs);
  };

  /**
   * Ownership check: only events whose target is inside THIS editor's root
   * are ours (document listeners are shared across every mounted instance).
   */
  const isOwnedTarget = (event: Event): boolean => {
    const rootEl = root.value;
    const target = event.target;
    return (
      rootEl !== null && target instanceof Node && rootEl.contains(target)
    );
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!isOwnedTarget(event)) return;

    // Chrome-access keys are intent: return instantly. (Checked before the
    // writing filter — Alt is a "pure modifier" and F10 an F-key there.)
    if (event.key === "Escape" || event.key === "Alt" || event.key === "F10") {
      restore();
      return;
    }

    if (!isWritingKeydown(event)) return;

    if (armed) {
      // Already armed: just keep pushing the recede past the current burst.
      startRecedeTimer();
      return;
    }

    const now = Date.now();
    if (keystrokes === 0 || now - windowStartedAt > armWindowMs) {
      // First keystroke, or the previous window expired without arming.
      keystrokes = 0;
      windowStartedAt = now;
    }
    keystrokes += 1;
    if (keystrokes >= armKeystrokes) {
      armed = true;
      startRecedeTimer();
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isOwnedTarget(event)) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!lastPointer) {
      // No baseline yet — record it; we can't measure movement from nothing.
      lastPointer = point;
      return;
    }
    const distance = Math.hypot(
      point.x - lastPointer.x,
      point.y - lastPointer.y
    );
    // Sub-threshold moves do NOT update the baseline: slow drift accumulates
    // against the recorded point instead of being rebased away, so genuine
    // (if gentle) movement still restores while sensor jitter never does.
    if (distance <= POINTER_JITTER_PX) return;
    lastPointer = point;
    restore();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!isOwnedTarget(event)) return;
    lastPointer = { x: event.clientX, y: event.clientY };
    restore();
  };

  const onSelectionChange = () => {
    const rootEl = root.value;
    if (!rootEl) return;
    const selection = document.getSelection();
    // Only a REAL (non-collapsed) selection is intent. A collapsed caret
    // moving because the user is typing must not pop the chrome back.
    if (!selection || selection.isCollapsed) return;
    const { anchorNode, focusNode } = selection;
    if (
      anchorNode &&
      focusNode &&
      rootEl.contains(anchorNode) &&
      rootEl.contains(focusNode)
    ) {
      restore();
    }
  };

  const onFocusIn = (event: FocusEvent) => {
    const rootEl = root.value;
    const target = event.target;
    if (!rootEl || !(target instanceof Element) || !rootEl.contains(target)) {
      return;
    }
    if (target.closest(TOOLBAR_FOCUS_SELECTOR)) {
      restore();
    }
  };

  // Becoming suppressed must not only block future recedes (the timer
  // callback checks) but also restore a currently-receded chrome — the host
  // just opened a dropdown/modal over it. Sync flush: the chrome must be
  // back before the overlay paints, not a tick later.
  watch(
    () => isSuppressed(),
    (suppressed) => {
      if (suppressed) restore();
    },
    { flush: "sync" }
  );

  // Disabling the feature mid-session restores immediately for the same
  // reason (and keystroke state from the old mode shouldn't linger).
  watch(
    () => isEnabled(),
    (enabled) => {
      if (!enabled) restore();
    },
    { flush: "sync" }
  );

  // Listeners live on document and re-check root.value per event, so a root
  // swap needs no re-binding — but stale arming/timers from the old element
  // must not carry over.
  watch(root, () => restore(), { flush: "sync" });

  // SSR guard: no document, no listeners — the composable degrades to an
  // inert `receded: false`.
  const canListen = typeof document !== "undefined";
  if (canListen) {
    // Capture phase so the editor's own stopPropagation-happy handlers
    // can't hide typing/pointer activity from us.
    document.addEventListener("keydown", onKeydown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("selectionchange", onSelectionChange);
  }

  onScopeDispose(() => {
    clearRecedeTimer();
    if (!canListen) return;
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("focusin", onFocusIn, true);
    document.removeEventListener("selectionchange", onSelectionChange);
  });

  return { receded, restore };
}
