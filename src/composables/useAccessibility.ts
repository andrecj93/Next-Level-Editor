import { ref, computed, getCurrentInstance, onMounted, onUnmounted, nextTick } from "vue";
import { useEditorLocale } from "./useEditorLocale";
import { createEditorLocaleFormatter } from "../utils/editorLocale";
import type { EditorLocaleFormatter } from "../types/locale";

/**
 * ARIA live region politeness levels
 */
export type AriaLive = "off" | "polite" | "assertive";

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  initialFocus?: HTMLElement | null;
  returnFocus?: boolean;
  allowOutsideClick?: boolean;
}

/**
 * Announcement options
 */
export interface AnnouncementOptions {
  priority?: AriaLive;
  clearPrevious?: boolean;
  delay?: number;
}

/** A getter keeps built-in feedback in its originating editor's current locale. */
export type AnnouncementMessage = string | (() => string);

/**
 * Keyboard navigation direction
 */
export type NavigationDirection = "next" | "previous" | "first" | "last";

// Announcement state is SHARED across all useAccessibility() instances. The
// composable is a factory (fresh state per call), but AriaLiveRegion, the editor
// orchestrator and SkipLinks each call it separately; without a shared array an
// announce() from one instance never reaches the aria-live regions rendered by
// AriaLiveRegion, so screen-reader users got no spoken feedback. [#2]
const sharedAnnouncements = ref<
  Array<{ id: number; message: string; priority: AriaLive; language: string }>
>([]);
const sharedAnnouncementId = ref(0);

/**
 * Professional accessibility system for WCAG AAA compliance
 *
 * Inspired by:
 * - Google Docs accessibility features
 * - Microsoft Word screen reader support
 * - GitHub accessibility patterns
 * - Material Design accessibility guidelines
 *
 * Features:
 * - Complete ARIA attributes management
 * - Focus management and trapping
 * - Keyboard navigation helpers
 * - Screen reader announcements
 * - Skip links generation
 * - Landmark region detection
 * - Color contrast validation (7:1 for AAA)
 * - High contrast mode detection
 * - Reduced motion preferences
 */
// Invisible, unspoken character used to force a DOM mutation when the same
// announcement text repeats (aria-atomic regions only re-announce on change).
const ZWSP = "\u200B";
const ZWSP_RE = /\u200B/g;

export function useAccessibility(
  containerRef?: { value: HTMLElement | null },
  locale?: Pick<EditorLocaleFormatter, "t" | "language">
) {
  // The editor provides its locale to descendants; its own setup must pass it
  // explicitly because inject() only sees ancestor providers.
  const formatter = locale ?? (getCurrentInstance()
    ? useEditorLocale()
    : createEditorLocaleFormatter(() => "en"));
  const { t } = formatter;
  // Announcement state — shared singleton so all instances (editor, SkipLinks,
  // AriaLiveRegion) read/write the same array. [#2]
  const announcements = sharedAnnouncements;
  const announcementId = sharedAnnouncementId;
  const ownedAnnouncements = new Set<number>();
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  const preferenceCleanups: Array<() => void> = [];
  let disposed = false;

  const schedule = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      if (!disposed) callback();
    }, delay);
    pendingTimers.add(timer);
  };

  // Focus state
  const focusedElement = ref<HTMLElement | null>(null);
  const focusTrapActive = ref(false);
  const focusTrapElement = ref<HTMLElement | null>(null);
  const focusReturnElement = ref<HTMLElement | null>(null);
  let focusTrapCleanup: (() => void) | null = null;

  // Keyboard navigation state
  const navigationMode = ref<"read" | "edit">("edit");
  const currentLandmark = ref<string | null>(null);

  // User preferences (from OS/browser). Guarded so a server render (no window)
  // gets safe defaults instead of `ReferenceError: window is not defined`; the
  // real OS preferences are read on the client and kept live by the listeners
  // installed in onMounted.
  const prefersMediaQuery = (query: string): boolean =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;
  const prefersReducedMotion = ref(
    prefersMediaQuery("(prefers-reduced-motion: reduce)")
  );
  const prefersHighContrast = ref(prefersMediaQuery("(prefers-contrast: more)"));
  const prefersColorScheme = ref<"light" | "dark">(
    prefersMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light"
  );

  // Screen reader detection
  const screenReaderActive = ref(false);

  /**
   * Check if screen reader is likely active
   * Note: This is heuristic-based as there's no reliable way to detect screen readers
   */
  const detectScreenReader = () => {
    // Check for common screen reader patterns
    const hasAriaLiveRegion = document.querySelector("[aria-live]");
    const hasScreenReaderText = document.querySelector(
      ".sr-only, .visually-hidden"
    );
    const userAgent = navigator.userAgent.toLowerCase();

    // Some screen readers modify the user agent
    const knownScreenReaders = [
      "nvda",
      "jaws",
      "voiceover",
      "talkback",
      "narrator",
    ];
    const hasScreenReaderUA = knownScreenReaders.some((sr) =>
      userAgent.includes(sr)
    );

    screenReaderActive.value = !!(
      hasAriaLiveRegion ||
      hasScreenReaderText ||
      hasScreenReaderUA
    );
  };

  // ============================================
  // ARIA Live Announcements
  // ============================================

  /**
   * Announce message to screen readers
   */
  const announce = (message: AnnouncementMessage, options: AnnouncementOptions = {}) => {
    if (disposed) return;
    const { priority = "polite", clearPrevious = false, delay = 0 } = options;

    if (clearPrevious) {
      announcements.value = [];
    }

    const announce = () => {
      const id = ++announcementId.value;
      const resolveMessage = typeof message === "function" ? message : () => message;

      // The live regions are aria-atomic and render only the latest message —
      // a screen reader speaks only when the region's TEXT CHANGES. If this
      // message is identical to the one currently displayed (e.g. the same
      // action twice within the 5s window), alternate an invisible zero-width
      // space so the region still mutates; U+200B is neither spoken nor seen.
      const matching = announcements.value.filter(
        (a) => a.priority === priority
      );
      const latest = matching[matching.length - 1]?.message;
      const suffix = latest !== undefined &&
        latest.replace(ZWSP_RE, "") === resolveMessage() && !latest.endsWith(ZWSP)
        ? ZWSP : "";

      ownedAnnouncements.add(id);
      announcements.value.push({
        id,
        get message() { return `${resolveMessage()}${suffix}`; },
        get language() { return formatter.language(); },
        priority,
      });

      // Auto-clear after 5 seconds
      schedule(() => {
        ownedAnnouncements.delete(id);
        announcements.value = announcements.value.filter((a) => a.id !== id);
      }, 5000);
    };

    if (delay > 0) {
      schedule(announce, delay);
    } else {
      announce();
    }
  };

  /**
   * Clear all announcements
   */
  const clearAnnouncements = () => {
    announcements.value = [];
  };

  /**
   * Get the current announcement text for a priority region.
   *
   * Returns ONLY the most-recent message, not a joined backlog. The live
   * regions are `aria-atomic="true"`, so a screen reader re-reads the WHOLE
   * region on any change — joining every message queued in the last 5s meant
   * toggling Bold then Italic re-spoke "Bold on" when "Italic on" was appended.
   * Showing just the latest makes each change read exactly one new message.
   * (Auto-clear removes messages oldest-first, since each entry's higher id
   * also has a later 5s timer, so an older message can never resurface as the
   * latest after the newest clears.)
   */
  const getAnnouncements = (priority: AriaLive) => {
    const matching = announcements.value.filter((a) => a.priority === priority);
    return matching.length ? matching[matching.length - 1].message : "";
  };

  const getAnnouncementLanguage = (priority: AriaLive) =>
    announcements.value.filter((a) => a.priority === priority).at(-1)?.language;

  // ============================================
  // Focus Management
  // ============================================

  /**
   * Set focus to element with optional announcement
   */
  const setFocus = (
    element: HTMLElement | null,
    options?: { announce?: AnnouncementMessage; preventScroll?: boolean }
  ) => {
    if (!element) return;

    focusedElement.value = element;
    element.focus({ preventScroll: options?.preventScroll });

    if (options?.announce) {
      announce(options.announce, { priority: "polite", delay: 100 });
    }
  };

  /**
   * Get all focusable elements within container
   */
  const getFocusableElements = (
    container: HTMLElement = document.body
  ): HTMLElement[] => {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    // Visible = neither the element NOR any ancestor is display:none /
    // visibility:hidden. Checking only the element's own computed style missed
    // controls inside a `v-show`-collapsed panel/sidebar (display doesn't
    // inherit, so the child still computes display:block) — a focus trap could
    // then land Tab on an invisible control.
    const isVisible = (el: HTMLElement): boolean => {
      let node: HTMLElement | null = el;
      while (node) {
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
        node = node.parentElement;
      }
      return true;
    };

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      isVisible
    );
  };

  /**
   * Get next/previous focusable element
   */
  const getAdjacentFocusable = (
    direction: "next" | "previous",
    currentElement?: HTMLElement
  ): HTMLElement | null => {
    const container = containerRef?.value || document.body;
    const focusables = getFocusableElements(container);

    if (focusables.length === 0) return null;

    if (!currentElement) {
      return direction === "next" ? focusables[0] : focusables.at(-1) || null;
    }

    const currentIndex = focusables.indexOf(currentElement);
    if (currentIndex === -1) return focusables[0];

    if (direction === "next") {
      return focusables[currentIndex + 1] || focusables[0]; // Wrap around
    }
    return focusables[currentIndex - 1] || focusables.at(-1) || null;
  };

  /**
   * Navigate to adjacent focusable element
   */
  const navigateToAdjacent = (direction: NavigationDirection) => {
    const container = containerRef?.value || document.body;
    const focusables = getFocusableElements(container);

    if (focusables.length === 0) return;

    let targetElement: HTMLElement | null = null;

    switch (direction) {
      case "next":
        targetElement = getAdjacentFocusable(
          "next",
          document.activeElement as HTMLElement
        );
        break;
      case "previous":
        targetElement = getAdjacentFocusable(
          "previous",
          document.activeElement as HTMLElement
        );
        break;
      case "first":
        targetElement = focusables[0];
        break;
      case "last":
        targetElement = focusables.at(-1) || null;
        break;
    }

    if (targetElement) {
      setFocus(targetElement);
    }
  };

  /**
   * Create focus trap within element
   */
  const trapFocus = (element: HTMLElement, options: FocusTrapOptions = {}) => {
    const {
      initialFocus = null,
      returnFocus = true,
      allowOutsideClick = false,
    } = options;

    // Store return element
    if (returnFocus && document.activeElement instanceof HTMLElement) {
      focusReturnElement.value = document.activeElement;
    }

    focusTrapElement.value = element;
    focusTrapActive.value = true;

    // Set initial focus
    nextTick(() => {
      if (initialFocus) {
        setFocus(initialFocus);
      } else {
        const focusables = getFocusableElements(element);
        if (focusables.length > 0) {
          setFocus(focusables[0]);
        }
      }
    });

    // Handle tab key
    const handleTabKey = (e: KeyboardEvent) => {
      if (!focusTrapActive.value || !focusTrapElement.value) return;
      if (e.key !== "Tab") return;

      const focusables = getFocusableElements(focusTrapElement.value);
      if (focusables.length === 0) return;

      const firstFocusable = focusables[0];
      const lastFocusable = focusables.at(-1);
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey && activeElement === firstFocusable && lastFocusable) {
        // Shift + Tab - wrap to last
        e.preventDefault();
        setFocus(lastFocusable);
      } else if (!e.shiftKey && activeElement === lastFocusable) {
        // Tab - wrap to first
        e.preventDefault();
        setFocus(firstFocusable);
      }
    };

    // Handle clicks outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (!allowOutsideClick && focusTrapElement.value) {
        if (!focusTrapElement.value.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Tear down any previous trap's listeners before installing new ones.
    focusTrapCleanup?.();

    document.addEventListener("keydown", handleTabKey);
    if (!allowOutsideClick) {
      document.addEventListener("mousedown", handleOutsideClick, true);
    }

    // Return cleanup function (also invoked by releaseFocusTrap).
    focusTrapCleanup = () => {
      document.removeEventListener("keydown", handleTabKey);
      document.removeEventListener("mousedown", handleOutsideClick, true);
      focusTrapCleanup = null;
    };
    return focusTrapCleanup;
  };

  /**
   * Release focus trap
   */
  const releaseFocusTrap = () => {
    focusTrapActive.value = false;
    focusTrapElement.value = null;

    // Remove the global keydown/mousedown listeners the trap installed.
    focusTrapCleanup?.();

    // Return focus to original element
    if (focusReturnElement.value) {
      setFocus(focusReturnElement.value);
      focusReturnElement.value = null;
    }
  };

  // ============================================
  // Keyboard Navigation
  // ============================================

  /**
   * Handle arrow key navigation in list/grid
   */
  const handleArrowNavigation = (
    e: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: {
      wrap?: boolean;
      orientation?: "horizontal" | "vertical" | "grid";
      columns?: number;
    } = {}
  ): number => {
    const { wrap = true, orientation = "vertical", columns = 1 } = options;

    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowUp":
        if (orientation === "vertical" || orientation === "grid") {
          newIndex = currentIndex - (orientation === "grid" ? columns : 1);
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
          e.preventDefault();
        }
        break;

      case "ArrowDown":
        if (orientation === "vertical" || orientation === "grid") {
          newIndex = currentIndex + (orientation === "grid" ? columns : 1);
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
          e.preventDefault();
        }
        break;

      case "ArrowLeft":
        if (orientation === "horizontal" || orientation === "grid") {
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
          e.preventDefault();
        }
        break;

      case "ArrowRight":
        if (orientation === "horizontal" || orientation === "grid") {
          newIndex = currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
          e.preventDefault();
        }
        break;

      case "Home":
        newIndex = 0;
        e.preventDefault();
        break;

      case "End":
        newIndex = items.length - 1;
        e.preventDefault();
        break;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      setFocus(items[newIndex]);
    }

    return newIndex;
  };

  // ============================================
  // ARIA Attributes Helpers
  // ============================================

  /**
   * Generate ARIA attributes for element
   */
  const getAriaAttributes = (
    role: string,
    options: {
      label?: string;
      labelledBy?: string;
      describedBy?: string;
      expanded?: boolean;
      selected?: boolean;
      checked?: boolean | "mixed";
      pressed?: boolean;
      disabled?: boolean;
      hasPopup?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";
      controls?: string;
      owns?: string;
      live?: AriaLive;
      atomic?: boolean;
      relevant?: string;
      busy?: boolean;
      current?: boolean | "page" | "step" | "location" | "date" | "time";
      invalid?: boolean;
      required?: boolean;
      level?: number;
      posInSet?: number;
      setSize?: number;
    } = {}
  ) => {
    const attrs: Record<string, string | boolean | number> = { role };

    if (options.label) attrs["aria-label"] = options.label;
    if (options.labelledBy) attrs["aria-labelledby"] = options.labelledBy;
    if (options.describedBy) attrs["aria-describedby"] = options.describedBy;
    if (options.expanded !== undefined)
      attrs["aria-expanded"] = String(options.expanded);
    if (options.selected !== undefined)
      attrs["aria-selected"] = String(options.selected);
    if (options.checked !== undefined)
      attrs["aria-checked"] = String(options.checked);
    if (options.pressed !== undefined)
      attrs["aria-pressed"] = String(options.pressed);
    if (options.disabled) attrs["aria-disabled"] = "true";
    if (options.hasPopup) attrs["aria-haspopup"] = String(options.hasPopup);
    if (options.controls) attrs["aria-controls"] = options.controls;
    if (options.owns) attrs["aria-owns"] = options.owns;
    if (options.live) attrs["aria-live"] = options.live;
    if (options.atomic !== undefined)
      attrs["aria-atomic"] = String(options.atomic);
    if (options.relevant) attrs["aria-relevant"] = options.relevant;
    if (options.busy !== undefined) attrs["aria-busy"] = String(options.busy);
    if (options.current) attrs["aria-current"] = String(options.current);
    if (options.invalid) attrs["aria-invalid"] = "true";
    if (options.required) attrs["aria-required"] = "true";
    if (options.level) attrs["aria-level"] = String(options.level);
    if (options.posInSet) attrs["aria-posinset"] = String(options.posInSet);
    if (options.setSize) attrs["aria-setsize"] = String(options.setSize);

    return attrs;
  };

  // ============================================
  // Color Contrast Validation
  // ============================================

  /**
   * Calculate relative luminance (WCAG 2.1 formula)
   */
  const getRelativeLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const val = c / 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  /**
   * Calculate contrast ratio between two colors
   */
  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  /**
   * Parse color string to RGB
   */
  const parseColor = (
    color: string
  ): { r: number; g: number; b: number } | null => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  };

  /**
   * Check if contrast meets WCAG level (AAA requires 7:1 for normal text, 4.5:1 for large)
   */
  const meetsContrastRequirement = (
    ratio: number,
    level: "AA" | "AAA" = "AAA",
    largeText = false
  ): boolean => {
    if (level === "AAA") {
      return largeText ? ratio >= 4.5 : ratio >= 7;
    } else {
      return largeText ? ratio >= 3 : ratio >= 4.5;
    }
  };

  /**
   * Validate element contrast
   */
  const validateContrast = (
    element: HTMLElement
  ): {
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
    foreground: string;
    background: string;
  } | null => {
    const style = window.getComputedStyle(element);
    const foreground = style.color;
    const background = style.backgroundColor;

    // If background is transparent, walk up the DOM tree
    let bgElement: HTMLElement | null = element;
    let effectiveBackground = background;

    while (
      bgElement &&
      (effectiveBackground === "rgba(0, 0, 0, 0)" ||
        effectiveBackground === "transparent")
    ) {
      bgElement = bgElement.parentElement;
      if (bgElement) {
        effectiveBackground =
          window.getComputedStyle(bgElement).backgroundColor;
      }
    }

    const ratio = getContrastRatio(
      foreground,
      effectiveBackground || "#ffffff"
    );
    const fontSize = Number.parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const isLargeText =
      fontSize >= 18 ||
      (fontSize >= 14 &&
        (fontWeight === "bold" || Number.parseInt(fontWeight) >= 700));

    return {
      ratio,
      meetsAA: meetsContrastRequirement(ratio, "AA", isLargeText),
      meetsAAA: meetsContrastRequirement(ratio, "AAA", isLargeText),
      foreground,
      background: effectiveBackground || "#ffffff",
    };
  };

  // ============================================
  // Landmark Navigation
  // ============================================

  /**
   * Get all landmark regions in document
   */
  const getLandmarks = (): Array<{
    element: HTMLElement;
    role: string;
    label?: string;
  }> => {
    const landmarkRoles = [
      "banner",
      "navigation",
      "main",
      "complementary",
      "contentinfo",
      "search",
      "region",
      "form",
    ];

    const landmarks: Array<{
      element: HTMLElement;
      role: string;
      label?: string;
    }> = [];

    // Find by role attribute
    landmarkRoles.forEach((role) => {
      document
        .querySelectorAll<HTMLElement>(`[role="${role}"]`)
        .forEach((el) => {
          landmarks.push({
            element: el,
            role,
            label: el.getAttribute("aria-label") || undefined,
          });
        });
    });

    // Find by semantic HTML
    const semanticMap: Record<string, string> = {
      header: "banner",
      nav: "navigation",
      main: "main",
      aside: "complementary",
      footer: "contentinfo",
      form: "form",
    };

    Object.entries(semanticMap).forEach(([tag, role]) => {
      document.querySelectorAll<HTMLElement>(tag).forEach((el) => {
        if (!el.getAttribute("role")) {
          landmarks.push({
            element: el,
            role,
            label: el.getAttribute("aria-label") || undefined,
          });
        }
      });
    });

    return landmarks;
  };

  /**
   * Navigate to next/previous landmark
   */
  const navigateToLandmark = (direction: "next" | "previous") => {
    const landmarks = getLandmarks();
    if (landmarks.length === 0) return;

    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = landmarks.findIndex((l) =>
      l.element.contains(currentElement)
    );

    let targetIndex = 0;
    if (currentIndex !== -1) {
      targetIndex =
        direction === "next"
          ? (currentIndex + 1) % landmarks.length
          : (currentIndex - 1 + landmarks.length) % landmarks.length;
    }

    const target = landmarks[targetIndex];
    setFocus(target.element, {
      announce: () => t("Navigating to {label} landmark", {
        label: target.element.getAttribute("aria-label") || target.role,
      }),
    });
    currentLandmark.value = target.role;
  };

  // ============================================
  // User Preference Monitoring
  // ============================================

  const updateMotionPreference = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches;
    announce(
      () => e.matches
        ? t("Animations disabled for reduced motion")
        : t("Animations enabled"),
      { priority: "polite" }
    );
  };

  const updateContrastPreference = (e: MediaQueryListEvent) => {
    prefersHighContrast.value = e.matches;
    announce(
      () => e.matches ? t("High contrast mode enabled") : t("Standard contrast mode"),
      { priority: "polite" }
    );
  };

  const updateColorSchemePreference = (e: MediaQueryListEvent) => {
    prefersColorScheme.value = e.matches ? "dark" : "light";
  };

  // ============================================
  // Lifecycle
  // ============================================

  onMounted(() => {
    detectScreenReader();

    // Monitor user preferences
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    motionQuery.addEventListener("change", updateMotionPreference);
    contrastQuery.addEventListener("change", updateContrastPreference);
    colorSchemeQuery.addEventListener("change", updateColorSchemePreference);
    preferenceCleanups.push(
      () => motionQuery.removeEventListener("change", updateMotionPreference),
      () => contrastQuery.removeEventListener("change", updateContrastPreference),
      () => colorSchemeQuery.removeEventListener("change", updateColorSchemePreference)
    );
  });

  onUnmounted(() => {
    disposed = true;
    pendingTimers.forEach(clearTimeout);
    pendingTimers.clear();
    preferenceCleanups.forEach(cleanup => cleanup());
    // Closing a dialog/editor must not erase another publisher's feedback.
    announcements.value = announcements.value.filter(a => !ownedAnnouncements.has(a.id));
    ownedAnnouncements.clear();
    if (focusTrapActive.value) {
      releaseFocusTrap();
    }
  });

  return {
    // Announcements
    announce,
    clearAnnouncements,
    getAnnouncements,
    getAnnouncementLanguage,
    announcements: computed(() => announcements.value),

    // Focus management
    setFocus,
    getFocusableElements,
    getAdjacentFocusable,
    navigateToAdjacent,
    trapFocus,
    releaseFocusTrap,
    focusedElement: computed(() => focusedElement.value),
    focusTrapActive: computed(() => focusTrapActive.value),

    // Keyboard navigation
    handleArrowNavigation,
    navigationMode,

    // ARIA helpers
    getAriaAttributes,

    // Color contrast
    getContrastRatio,
    meetsContrastRequirement,
    validateContrast,

    // Landmarks
    getLandmarks,
    navigateToLandmark,
    currentLandmark: computed(() => currentLandmark.value),

    // User preferences
    prefersReducedMotion: computed(() => prefersReducedMotion.value),
    prefersHighContrast: computed(() => prefersHighContrast.value),
    prefersColorScheme: computed(() => prefersColorScheme.value),
    screenReaderActive: computed(() => screenReaderActive.value),
  };
}
