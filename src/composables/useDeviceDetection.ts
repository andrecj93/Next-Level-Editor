import { ref, computed, onMounted, onUnmounted, onBeforeUnmount } from "vue";

/**
 * Device type detection
 */
export type DeviceType = "mobile" | "tablet" | "desktop";

/**
 * Touch capability detection
 */
export interface TouchCapabilities {
  hasTouch: boolean;
  hasMouse: boolean;
  hasPen: boolean;
  maxTouchPoints: number;
}

/**
 * Device and touch detection composable
 *
 * Professional device detection inspired by:
 * - Material Design breakpoints
 * - iOS Human Interface Guidelines
 * - Bootstrap 5 breakpoints
 *
 * Features:
 * - Device type detection (mobile/tablet/desktop)
 * - Touch capability detection
 * - Orientation tracking
 * - Breakpoint utilities
 * - Hover support detection
 */
export function useDeviceDetection() {
  // Window dimensions
  const windowWidth = ref(window.innerWidth);
  const windowHeight = ref(window.innerHeight);

  // Orientation
  const orientation = ref<"portrait" | "landscape">(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  // Touch capabilities
  const touchCapabilities = ref<TouchCapabilities>({
    hasTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    hasMouse: matchMedia("(hover: hover) and (pointer: fine)").matches,
    hasPen:
      matchMedia("(pointer: fine)").matches &&
      !matchMedia("(hover: hover)").matches,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });

  // Hover support
  const supportsHover = computed(() => matchMedia("(hover: hover)").matches);

  // Pointer type
  const pointerType = computed(() => {
    if (touchCapabilities.value.hasMouse) return "mouse";
    if (touchCapabilities.value.hasPen) return "pen";
    if (touchCapabilities.value.hasTouch) return "touch";
    return "unknown";
  });

  /**
   * Device type based on screen width and capabilities
   */
  const deviceType = computed<DeviceType>(() => {
    const width = windowWidth.value;

    // Mobile: < 768px (Material Design phone breakpoint)
    if (width < 768) return "mobile";

    // Tablet: 768px - 1024px
    if (width < 1024) {
      // If has touch and no hover, it's likely a tablet
      if (touchCapabilities.value.hasTouch && !supportsHover.value) {
        return "tablet";
      }
      // Otherwise it might be a small desktop
      return windowWidth.value < 900 ? "tablet" : "desktop";
    }

    // Desktop: >= 1024px
    return "desktop";
  });

  /**
   * Is mobile device (phone)
   */
  const isMobile = computed(() => deviceType.value === "mobile");

  /**
   * Is tablet device
   */
  const isTablet = computed(() => deviceType.value === "tablet");

  /**
   * Is desktop device
   */
  const isDesktop = computed(() => deviceType.value === "desktop");

  /**
   * Is touch-only device (no mouse/hover support)
   */
  const isTouchOnly = computed(() => {
    return touchCapabilities.value.hasTouch && !supportsHover.value;
  });

  /**
   * Is hybrid device (touch + mouse)
   */
  const isHybrid = computed(() => {
    return touchCapabilities.value.hasTouch && touchCapabilities.value.hasMouse;
  });

  /**
   * Breakpoint utilities
   */
  const breakpoints = computed(() => ({
    xs: windowWidth.value < 576, // Extra small (mobile portrait)
    sm: windowWidth.value >= 576 && windowWidth.value < 768, // Small (mobile landscape)
    md: windowWidth.value >= 768 && windowWidth.value < 992, // Medium (tablet)
    lg: windowWidth.value >= 992 && windowWidth.value < 1200, // Large (desktop)
    xl: windowWidth.value >= 1200 && windowWidth.value < 1400, // Extra large
    xxl: windowWidth.value >= 1400, // Extra extra large
  }));

  /**
   * Minimum breakpoint active
   */
  const minBreakpoint = (bp: keyof typeof breakpoints.value) => {
    const bps = ["xs", "sm", "md", "lg", "xl", "xxl"];
    const currentIndex = bps.findIndex(
      (b) => breakpoints.value[b as keyof typeof breakpoints.value]
    );
    const targetIndex = bps.indexOf(bp);
    return currentIndex >= targetIndex;
  };

  /**
   * Maximum breakpoint active
   */
  const maxBreakpoint = (bp: keyof typeof breakpoints.value) => {
    const bps = ["xs", "sm", "md", "lg", "xl", "xxl"];
    const currentIndex = bps.findIndex(
      (b) => breakpoints.value[b as keyof typeof breakpoints.value]
    );
    const targetIndex = bps.indexOf(bp);
    return currentIndex <= targetIndex;
  };

  /**
   * Touch target size recommendation (px)
   */
  const recommendedTouchSize = computed(() => {
    if (isMobile.value) return 48; // Mobile: 48x48px minimum
    if (isTablet.value) return 44; // Tablet: 44x44px
    if (isTouchOnly.value) return 44; // Any touch-only: 44x44px
    return 32; // Desktop with mouse: 32x32px acceptable
  });

  /**
   * Should use mobile UI optimizations
   */
  const useMobileUI = computed(() => {
    return (
      isMobile.value || (isTablet.value && orientation.value === "portrait")
    );
  });

  /**
   * Should show mobile toolbar
   */
  const showMobileToolbar = computed(() => {
    return isMobile.value || (isTablet.value && windowWidth.value < 900);
  });

  /**
   * Platform detection (OS)
   */
  const platform = computed(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || "";

    if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
    if (/android/.test(userAgent)) return "android";
    if (/mac/.test(platform)) return "macos";
    if (/win/.test(platform)) return "windows";
    if (/linux/.test(platform)) return "linux";
    return "unknown";
  });

  /**
   * Is iOS device
   */
  const isIOS = computed(() => platform.value === "ios");

  /**
   * Is Android device
   */
  const isAndroid = computed(() => platform.value === "android");

  /**
   * Supports safe area insets (notch/island)
   */
  const supportsSafeArea = computed(() => {
    return isIOS.value && CSS.supports("padding-top: env(safe-area-inset-top)");
  });

  /**
   * Handle window resize
   */
  const handleResize = () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
    orientation.value =
      window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  };

  /**
   * Handle orientation change
   */
  const handleOrientationChange = () => {
    // Delay to get accurate dimensions after rotation
    setTimeout(() => {
      handleResize();
    }, 100);
  };

  /**
   * Check for touch capability changes (rare, but possible on hybrid devices)
   */
  const updateTouchCapabilities = () => {
    touchCapabilities.value = {
      hasTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      hasMouse: matchMedia("(hover: hover) and (pointer: fine)").matches,
      hasPen:
        matchMedia("(pointer: fine)").matches &&
        !matchMedia("(hover: hover)").matches,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };
  };

  // Media queries for touch capability changes (kept as refs so their
  // "change" listeners can be removed on unmount and don't leak)
  let hoverQuery: MediaQueryList | null = null;
  let pointerQuery: MediaQueryList | null = null;

  // Lifecycle
  onMounted(() => {
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleOrientationChange);

    // Listen to media query changes
    hoverQuery = matchMedia("(hover: hover)");
    pointerQuery = matchMedia("(pointer: fine)");

    hoverQuery.addEventListener("change", updateTouchCapabilities);
    pointerQuery.addEventListener("change", updateTouchCapabilities);
  });

  onBeforeUnmount(() => {
    // Remove the matchMedia "change" listeners added on mount
    hoverQuery?.removeEventListener("change", updateTouchCapabilities);
    pointerQuery?.removeEventListener("change", updateTouchCapabilities);
    hoverQuery = null;
    pointerQuery = null;
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleOrientationChange);
  });

  return {
    // Dimensions
    windowWidth,
    windowHeight,
    orientation,

    // Device type
    deviceType,
    isMobile,
    isTablet,
    isDesktop,

    // Touch capabilities
    touchCapabilities,
    isTouchOnly,
    isHybrid,
    supportsHover,
    pointerType,

    // Breakpoints
    breakpoints,
    minBreakpoint,
    maxBreakpoint,

    // Recommendations
    recommendedTouchSize,
    useMobileUI,
    showMobileToolbar,

    // Platform
    platform,
    isIOS,
    isAndroid,
    supportsSafeArea,
  };
}
