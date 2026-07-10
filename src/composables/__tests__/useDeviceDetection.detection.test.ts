import { describe, it, expect, afterEach, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount, VueWrapper } from "@vue/test-utils";
import { useDeviceDetection } from "../useDeviceDetection";

/**
 * REAL-BEHAVIOUR detection tests for useDeviceDetection.
 *
 * The sibling `useDeviceDetection.cleanup.test.ts` proves the matchMedia
 * listeners are removed on unmount. This file instead exercises the *detection*
 * logic: it drives the real composable inside a real mounted setup context
 * (so onMounted/onUnmounted actually run) and asserts the real computed outputs
 * for representative viewport widths, touch/hover capability permutations,
 * orientation, breakpoints and platform strings.
 *
 * happy-dom has no layout engine and its default matchMedia always reports
 * `matches: false`, so we install a *controllable* matchMedia (mapping the exact
 * media strings the source queries to booleans) and set window.innerWidth /
 * innerHeight / navigator.* ourselves. Every override is captured and restored
 * in afterEach so tests stay isolated. We test the REAL logic THROUGH those
 * stubs — the stubs only stand in for the environment the code reads, not for
 * any of the code under test.
 */

// ---------------------------------------------------------------------------
// Host component (the A11yProbe pattern from SkipLinks.test.ts): mounting the
// composable inside a real component's setup is REQUIRED — it registers resize /
// orientationchange / matchMedia("change") listeners in onMounted, which Vue
// only runs for a mounted instance. `expose(api)` surfaces the reactive result;
// Vue wraps the exposed object with proxyRefs, so refs/computeds read back
// already unwrapped on `wrapper.vm`.
// ---------------------------------------------------------------------------
const DeviceProbe = defineComponent({
  name: "DeviceProbe",
  setup(_props, { expose }) {
    const api = useDeviceDetection();
    expose(api);
    return () => h("div", { class: "device-probe" });
  },
});

type Api = ReturnType<typeof useDeviceDetection>;
// Refs/computeds unwrap to their `.value` type on the exposed vm; plain
// functions (minBreakpoint/maxBreakpoint) stay callable.
type UnwrappedApi = {
  [K in keyof Api]: Api[K] extends { value: infer V } ? V : Api[K];
};
const api = (w: VueWrapper): UnwrappedApi =>
  w.vm as unknown as UnwrappedApi;

// ---------------------------------------------------------------------------
// Environment control
// ---------------------------------------------------------------------------
interface EnvConfig {
  width: number;
  height?: number;
  /** matches for "(hover: hover)" */
  hover?: boolean;
  /** matches for "(pointer: fine)" */
  pointerFine?: boolean;
  maxTouchPoints?: number;
  userAgent?: string;
  platform?: string;
  cssSupports?: boolean;
}

// Restore thunks, unwound LIFO in afterEach.
const restores: Array<() => void> = [];

function patch(obj: object, prop: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(obj, prop);
  restores.push(() => {
    if (original) Object.defineProperty(obj, prop, original);
    else delete (obj as Record<string, unknown>)[prop];
  });
  Object.defineProperty(obj, prop, {
    configurable: true,
    writable: true,
    value,
  });
}

function installMatchMedia(hover: boolean, pointerFine: boolean) {
  // Model real matchMedia semantics for exactly the three media strings the
  // source queries; anything else reports no-match.
  const map: Record<string, boolean> = {
    "(hover: hover)": hover,
    "(pointer: fine)": pointerFine,
    "(hover: hover) and (pointer: fine)": hover && pointerFine,
  };
  const fn = ((query: string) => ({
    media: query,
    matches: !!map[query],
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  patch(window, "matchMedia", fn);
  patch(globalThis as unknown as object, "matchMedia", fn);
}

function applyEnv(cfg: EnvConfig) {
  patch(window, "innerWidth", cfg.width);
  patch(window, "innerHeight", cfg.height ?? 800);
  installMatchMedia(cfg.hover ?? false, cfg.pointerFine ?? false);
  patch(navigator, "maxTouchPoints", cfg.maxTouchPoints ?? 0);
  if (cfg.userAgent !== undefined) patch(navigator, "userAgent", cfg.userAgent);
  if (cfg.platform !== undefined) patch(navigator, "platform", cfg.platform);
  if (cfg.cssSupports !== undefined) {
    // happy-dom's global `CSS` is a getter that returns a FRESH namespace object
    // on every access, so patching the instance we grab here never reaches the
    // `CSS.supports(...)` call inside the source (which reads its own fresh CSS).
    // `supports` lives on the shared prototype, so patch THAT — it reaches every
    // fresh CSS instance, including the source's.
    const CSSObj = (globalThis as unknown as { CSS: object }).CSS;
    const proto = Object.getPrototypeOf(CSSObj) as object;
    patch(proto, "supports", () => cfg.cssSupports);
  }
}

function mountWith(cfg: EnvConfig): VueWrapper {
  applyEnv(cfg);
  return mount(DeviceProbe);
}

afterEach(() => {
  while (restores.length) restores.pop()!();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe("useDeviceDetection - detection logic", () => {
  describe("deviceType across representative widths", () => {
    it("classifies a phone-width viewport (<768) as mobile", () => {
      const w = mountWith({ width: 375, maxTouchPoints: 5 });
      const a = api(w);
      expect(a.deviceType).toBe("mobile");
      expect(a.isMobile).toBe(true);
      expect(a.isTablet).toBe(false);
      expect(a.isDesktop).toBe(false);
      w.unmount();
    });

    it("still classifies 767px (just under the 768 boundary) as mobile", () => {
      const w = mountWith({ width: 767 });
      expect(api(w).deviceType).toBe("mobile");
      w.unmount();
    });

    it("classifies a 768-1024 touch/no-hover viewport as tablet", () => {
      // First branch: hasTouch && !supportsHover => tablet regardless of the
      // <900 heuristic.
      const w = mountWith({
        width: 950,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.deviceType).toBe("tablet");
      expect(a.isTablet).toBe(true);
      w.unmount();
    });

    it("classifies an 800px mouse/hover viewport as tablet (width < 900 heuristic)", () => {
      // No touch, has hover => falls to `windowWidth < 900 ? tablet : desktop`.
      const w = mountWith({
        width: 800,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      expect(api(w).deviceType).toBe("tablet");
      w.unmount();
    });

    it("classifies a 950px mouse/hover viewport as desktop (>= 900, < 1024)", () => {
      const w = mountWith({
        width: 950,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      expect(api(w).deviceType).toBe("desktop");
      w.unmount();
    });

    it("classifies exactly 1024px as desktop", () => {
      const w = mountWith({ width: 1024, hover: true, pointerFine: true });
      const a = api(w);
      expect(a.deviceType).toBe("desktop");
      expect(a.isDesktop).toBe(true);
      w.unmount();
    });

    it("classifies a wide 1440px viewport as desktop", () => {
      const w = mountWith({ width: 1440, hover: true, pointerFine: true });
      expect(api(w).deviceType).toBe("desktop");
      w.unmount();
    });
  });

  describe("breakpoints", () => {
    // exactly one breakpoint flag is true for a given width
    it.each([
      [500, "xs"],
      [575, "xs"],
      [576, "sm"],
      [767, "sm"],
      [768, "md"],
      [991, "md"],
      [992, "lg"],
      [1199, "lg"],
      [1200, "xl"],
      [1399, "xl"],
      [1400, "xxl"],
      [1920, "xxl"],
    ])("width %i => active breakpoint %s (and only that one)", (width, active) => {
      const w = mountWith({ width: width as number });
      const bps = api(w).breakpoints as Record<string, boolean>;
      expect(bps[active as string]).toBe(true);
      const others = Object.keys(bps).filter((k) => k !== active);
      expect(others.every((k) => bps[k] === false)).toBe(true);
      w.unmount();
    });

    it("minBreakpoint is true for the active band and lower, false above", () => {
      // width 1000 => lg (index 3)
      const w = mountWith({ width: 1000, hover: true, pointerFine: true });
      const a = api(w);
      expect(a.minBreakpoint("xs")).toBe(true);
      expect(a.minBreakpoint("md")).toBe(true);
      expect(a.minBreakpoint("lg")).toBe(true);
      expect(a.minBreakpoint("xl")).toBe(false);
      expect(a.minBreakpoint("xxl")).toBe(false);
      w.unmount();
    });

    it("maxBreakpoint is true for the active band and higher, false below", () => {
      // width 1000 => lg (index 3)
      const w = mountWith({ width: 1000, hover: true, pointerFine: true });
      const a = api(w);
      expect(a.maxBreakpoint("xxl")).toBe(true);
      expect(a.maxBreakpoint("xl")).toBe(true);
      expect(a.maxBreakpoint("lg")).toBe(true);
      expect(a.maxBreakpoint("md")).toBe(false);
      expect(a.maxBreakpoint("xs")).toBe(false);
      w.unmount();
    });
  });

  describe("orientation (initial, from innerWidth vs innerHeight)", () => {
    it("reports portrait when height > width", () => {
      const w = mountWith({ width: 400, height: 900 });
      expect(api(w).orientation).toBe("portrait");
      w.unmount();
    });

    it("reports landscape when width > height", () => {
      const w = mountWith({ width: 1200, height: 800 });
      expect(api(w).orientation).toBe("landscape");
      w.unmount();
    });

    it("reports portrait when width === height (not strictly greater)", () => {
      const w = mountWith({ width: 800, height: 800 });
      expect(api(w).orientation).toBe("portrait");
      w.unmount();
    });
  });

  describe("touch capabilities + pointer type", () => {
    it("desktop with mouse: hasMouse, hover support, no touch, pointerType=mouse", () => {
      const w = mountWith({
        width: 1280,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      const a = api(w);
      expect(a.touchCapabilities.hasMouse).toBe(true);
      expect(a.touchCapabilities.hasTouch).toBe(false);
      expect(a.touchCapabilities.hasPen).toBe(false);
      expect(a.supportsHover).toBe(true);
      expect(a.pointerType).toBe("mouse");
      expect(a.isTouchOnly).toBe(false);
      expect(a.isHybrid).toBe(false);
      w.unmount();
    });

    it("touch-only device: hasTouch, no hover, pointerType=touch, isTouchOnly", () => {
      const w = mountWith({
        width: 375,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.touchCapabilities.hasTouch).toBe(true);
      expect(a.touchCapabilities.hasMouse).toBe(false);
      expect(a.touchCapabilities.maxTouchPoints).toBe(5);
      expect(a.supportsHover).toBe(false);
      expect(a.pointerType).toBe("touch");
      expect(a.isTouchOnly).toBe(true);
      expect(a.isHybrid).toBe(false);
      w.unmount();
    });

    it("pen/stylus device: fine pointer without hover => hasPen, pointerType=pen", () => {
      const w = mountWith({
        width: 1000,
        hover: false,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      const a = api(w);
      expect(a.touchCapabilities.hasPen).toBe(true);
      expect(a.touchCapabilities.hasMouse).toBe(false);
      expect(a.pointerType).toBe("pen");
      w.unmount();
    });

    it("hybrid device: touch + mouse => isHybrid, pointerType=mouse (mouse wins)", () => {
      const w = mountWith({
        width: 1280,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 10,
      });
      const a = api(w);
      expect(a.touchCapabilities.hasTouch).toBe(true);
      expect(a.touchCapabilities.hasMouse).toBe(true);
      expect(a.isHybrid).toBe(true);
      expect(a.isTouchOnly).toBe(false);
      // mouse is checked before touch in pointerType
      expect(a.pointerType).toBe("mouse");
      w.unmount();
    });

    it("no capabilities at all => pointerType=unknown", () => {
      const w = mountWith({
        width: 1000,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 0,
      });
      const a = api(w);
      expect(a.touchCapabilities.hasTouch).toBe(false);
      expect(a.touchCapabilities.hasMouse).toBe(false);
      expect(a.touchCapabilities.hasPen).toBe(false);
      expect(a.pointerType).toBe("unknown");
      w.unmount();
    });
  });

  describe("recommendedTouchSize", () => {
    it("48px on mobile", () => {
      const w = mountWith({ width: 375, maxTouchPoints: 5 });
      expect(api(w).recommendedTouchSize).toBe(48);
      w.unmount();
    });

    it("44px on tablet", () => {
      const w = mountWith({
        width: 800,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.isTablet).toBe(true);
      expect(a.recommendedTouchSize).toBe(44);
      w.unmount();
    });

    it("44px on a large touch-only screen (desktop-width, no hover)", () => {
      // deviceType desktop (>=1024) but touch-only => the isTouchOnly branch.
      const w = mountWith({
        width: 1280,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.isDesktop).toBe(true);
      expect(a.isTouchOnly).toBe(true);
      expect(a.recommendedTouchSize).toBe(44);
      w.unmount();
    });

    it("32px on desktop with a mouse", () => {
      const w = mountWith({
        width: 1280,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      expect(api(w).recommendedTouchSize).toBe(32);
      w.unmount();
    });
  });

  describe("useMobileUI / showMobileToolbar", () => {
    it("useMobileUI is true on a phone", () => {
      const w = mountWith({ width: 375, maxTouchPoints: 5 });
      expect(api(w).useMobileUI).toBe(true);
      w.unmount();
    });

    it("useMobileUI is true for a portrait tablet, false for a landscape tablet", () => {
      const portrait = mountWith({
        width: 800,
        height: 1000,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const pa = api(portrait);
      expect(pa.isTablet).toBe(true);
      expect(pa.orientation).toBe("portrait");
      expect(pa.useMobileUI).toBe(true);
      portrait.unmount();

      const landscape = mountWith({
        width: 900,
        height: 800,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const la = api(landscape);
      expect(la.isTablet).toBe(true);
      expect(la.orientation).toBe("landscape");
      expect(la.useMobileUI).toBe(false);
      landscape.unmount();
    });

    it("useMobileUI is false on desktop", () => {
      const w = mountWith({ width: 1280, hover: true, pointerFine: true });
      expect(api(w).useMobileUI).toBe(false);
      w.unmount();
    });

    it("showMobileToolbar is true on a narrow tablet (<900) and false on a wide tablet (>=900)", () => {
      const narrow = mountWith({
        width: 800,
        height: 1000,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const na = api(narrow);
      expect(na.isTablet).toBe(true);
      expect(na.showMobileToolbar).toBe(true);
      narrow.unmount();

      const wide = mountWith({
        width: 950,
        height: 1200,
        hover: false,
        pointerFine: false,
        maxTouchPoints: 5,
      });
      const wa = api(wide);
      expect(wa.isTablet).toBe(true); // touch/no-hover keeps it a tablet at 950
      expect(wa.showMobileToolbar).toBe(false); // but 950 >= 900
      wide.unmount();
    });
  });

  describe("platform detection", () => {
    it("detects iOS from an iPhone user agent", () => {
      const w = mountWith({
        width: 375,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.platform).toBe("ios");
      expect(a.isIOS).toBe(true);
      expect(a.isAndroid).toBe(false);
      w.unmount();
    });

    it("detects Android from an Android user agent", () => {
      const w = mountWith({
        width: 400,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      const a = api(w);
      expect(a.platform).toBe("android");
      expect(a.isAndroid).toBe(true);
      expect(a.isIOS).toBe(false);
      w.unmount();
    });

    it("detects macOS from the platform string (non-mobile UA)", () => {
      const w = mountWith({
        width: 1440,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        hover: true,
        pointerFine: true,
      });
      expect(api(w).platform).toBe("macos");
      w.unmount();
    });

    it("detects Windows from the platform string", () => {
      const w = mountWith({
        width: 1440,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        platform: "Win32",
        hover: true,
        pointerFine: true,
      });
      expect(api(w).platform).toBe("windows");
      w.unmount();
    });

    it("detects Linux from the platform string", () => {
      const w = mountWith({
        width: 1440,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        platform: "Linux x86_64",
        hover: true,
        pointerFine: true,
      });
      expect(api(w).platform).toBe("linux");
      w.unmount();
    });

    it("falls back to unknown for an unrecognised platform/UA", () => {
      const w = mountWith({
        width: 1024,
        userAgent: "SomeWeirdBrowser/1.0",
        platform: "Nintendo Switch",
        hover: true,
        pointerFine: true,
      });
      expect(api(w).platform).toBe("unknown");
      w.unmount();
    });

    it("supportsSafeArea: true only when iOS AND CSS.supports(env(safe-area)) is true", () => {
      const w = mountWith({
        width: 375,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
        cssSupports: true,
      });
      expect(api(w).supportsSafeArea).toBe(true);
      w.unmount();
    });

    it("supportsSafeArea: false on iOS when CSS.supports reports false", () => {
      const w = mountWith({
        width: 375,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
        cssSupports: false,
      });
      expect(api(w).supportsSafeArea).toBe(false);
      w.unmount();
    });

    it("supportsSafeArea: false on non-iOS (short-circuits before CSS.supports)", () => {
      const w = mountWith({
        width: 1440,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        platform: "Win32",
        hover: true,
        pointerFine: true,
        // deliberately make CSS.supports true to prove the iOS guard short-circuits
        cssSupports: true,
      });
      expect(api(w).supportsSafeArea).toBe(false);
      w.unmount();
    });
  });

  describe("reactive updates on window resize", () => {
    it("recomputes windowWidth, deviceType and breakpoints when the window resizes", async () => {
      const w = mountWith({
        width: 375,
        height: 800,
        hover: true,
        pointerFine: true,
        maxTouchPoints: 0,
      });
      const a = api(w);
      expect(a.isMobile).toBe(true);
      expect(a.windowWidth).toBe(375);

      // Grow to a desktop viewport and fire the real resize event the
      // composable listens for in onMounted.
      (window as unknown as { innerWidth: number }).innerWidth = 1280;
      (window as unknown as { innerHeight: number }).innerHeight = 800;
      window.dispatchEvent(new Event("resize"));
      await w.vm.$nextTick();

      const b = api(w);
      expect(b.windowWidth).toBe(1280);
      expect(b.isMobile).toBe(false);
      expect(b.isDesktop).toBe(true);
      expect(b.deviceType).toBe("desktop");
      const bps = b.breakpoints as Record<string, boolean>;
      expect(bps.xl).toBe(true);
      w.unmount();
    });

    it("updates orientation when a resize swaps the width/height relationship", async () => {
      const w = mountWith({ width: 1200, height: 800 }); // landscape
      expect(api(w).orientation).toBe("landscape");

      (window as unknown as { innerWidth: number }).innerWidth = 800;
      (window as unknown as { innerHeight: number }).innerHeight = 1200;
      window.dispatchEvent(new Event("resize"));
      await w.vm.$nextTick();

      expect(api(w).orientation).toBe("portrait");
      expect(api(w).windowHeight).toBe(1200);
      w.unmount();
    });

    it("does not react to resize after the component is unmounted (listener removed)", async () => {
      const w = mountWith({ width: 375, height: 800 });
      const a = api(w);
      expect(a.windowWidth).toBe(375);

      // Capture the reactive ref BEFORE unmount so we can read it afterwards.
      const state = w.vm as unknown as { windowWidth: number };
      w.unmount();

      (window as unknown as { innerWidth: number }).innerWidth = 1600;
      window.dispatchEvent(new Event("resize"));

      // The onUnmounted hook removed the resize listener, so the stale value holds.
      expect(state.windowWidth).toBe(375);
    });
  });

  describe("orientationchange (debounced via setTimeout)", () => {
    it("applies the new orientation only after the 100ms debounce elapses", async () => {
      const w = mountWith({ width: 400, height: 900 }); // portrait
      expect(api(w).orientation).toBe("portrait");

      vi.useFakeTimers();
      try {
        (window as unknown as { innerWidth: number }).innerWidth = 900;
        (window as unknown as { innerHeight: number }).innerHeight = 400;
        window.dispatchEvent(new Event("orientationchange"));

        // Debounced: nothing applied yet.
        expect(api(w).orientation).toBe("portrait");

        vi.advanceTimersByTime(100);
      } finally {
        vi.useRealTimers();
      }

      await w.vm.$nextTick();
      const a = api(w);
      expect(a.orientation).toBe("landscape");
      expect(a.windowWidth).toBe(900);
      w.unmount();
    });
  });
});
