import { describe, it, expect, afterEach } from "vitest";
import { useDeviceDetection } from "../useDeviceDetection";

/**
 * R22-M1: the phone-style FIXED BOTTOM toolbar was gated on VIEWPORT WIDTH
 * alone (isMobile || (isTablet && width < 900)), so plain desktop Chrome
 * snapped to half a wide screen — mouse only, zero touch points — was served a
 * phone toolbar. That bar covers content, reserves bottom clearance, and
 * replaces the docked toolbar (silently dropping toolbarPosition/toolbarMode).
 * It is a TOUCH affordance, so it now requires an actual touch device.
 */
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
const originalMatchMedia = window.matchMedia;

const setViewport = (width: number, opts: { touch: boolean }) => {
  window.innerWidth = width;
  window.innerHeight = 900;
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: opts.touch ? 5 : 0,
    configurable: true,
  });
  if (opts.touch) {
    (window as unknown as Record<string, unknown>).ontouchstart = () => {};
  } else {
    delete (window as unknown as Record<string, unknown>).ontouchstart;
  }
  // A mouse desktop reports hover/fine; a phone reports coarse/none.
  window.matchMedia = ((query: string) => ({
    matches: opts.touch
      ? /pointer:\s*coarse|hover:\s*none/.test(query)
      : /hover:\s*hover|pointer:\s*fine/.test(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  window.innerWidth = originalWidth;
  window.innerHeight = originalHeight;
  window.matchMedia = originalMatchMedia;
  delete (window as unknown as Record<string, unknown>).ontouchstart;
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
});

describe("showMobileToolbar requires touch, not just a narrow window (#R22-M1)", () => {
  it("is false on a mouse-only 800px window (desktop snapped to half a screen)", () => {
    setViewport(800, { touch: false });
    expect(useDeviceDetection().showMobileToolbar.value).toBe(false);
  });

  it("is false on a mouse-only 500px window too", () => {
    setViewport(500, { touch: false });
    expect(useDeviceDetection().showMobileToolbar.value).toBe(false);
  });

  it("is TRUE on a real touch phone (control)", () => {
    setViewport(375, { touch: true });
    expect(useDeviceDetection().showMobileToolbar.value).toBe(true);
  });

  it("is TRUE on a narrow touch tablet (control)", () => {
    setViewport(820, { touch: true });
    expect(useDeviceDetection().showMobileToolbar.value).toBe(true);
  });

  it("is false on a wide mouse desktop (control)", () => {
    setViewport(1400, { touch: false });
    expect(useDeviceDetection().showMobileToolbar.value).toBe(false);
  });
});
