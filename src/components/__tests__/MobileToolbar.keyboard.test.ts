import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import MobileToolbar from "../MobileToolbar.vue";

/**
 * The bar is `position: fixed; bottom: 0`. On iOS the layout viewport does NOT
 * shrink when the soft keyboard opens — only the *visual* viewport does — so a
 * bottom-pinned fixed bar is left stranded behind the keyboard, unreachable.
 * The bar must follow `window.visualViewport` and lift itself by the keyboard
 * inset so it stays docked to the visible edge.
 */

const MOBILE_WIDTH = 375;

// Minimal EventTarget-ish stand-in for window.visualViewport (happy-dom has no
// visual viewport). Tracks height/offsetTop and lets the test fire resize.
function makeVisualViewport(height: number, offsetTop = 0) {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    height,
    offsetTop,
    addEventListener(type: string, cb: () => void) {
      (listeners[type] ||= []).push(cb);
    },
    removeEventListener(type: string, cb: () => void) {
      listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
    },
    _emit(type: string) {
      (listeners[type] || []).forEach((f) => f());
    },
    _count(type: string) {
      return (listeners[type] || []).length;
    },
  };
}

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;
const hadVV = Object.prototype.hasOwnProperty.call(window, "visualViewport");
const originalVV = (window as unknown as { visualViewport?: unknown })
  .visualViewport;

const mountToolbar = () =>
  mount(MobileToolbar, { global: { stubs: { teleport: true } } });

const barEl = (w: ReturnType<typeof mountToolbar>) =>
  w.get(".mobile-toolbar").element as HTMLElement;

beforeEach(() => {
  window.innerWidth = MOBILE_WIDTH;
  // A phone is narrow AND touch-capable; showMobileToolbar requires both
  // (a narrow mouse-only window is not a phone). #R22-M1
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 5,
    configurable: true,
  });
  (window as unknown as Record<string, unknown>).ontouchstart = () => {};
  window.innerHeight = 800;
});

afterEach(() => {
  window.innerWidth = originalInnerWidth;
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
  delete (window as unknown as Record<string, unknown>).ontouchstart;
  window.innerHeight = originalInnerHeight;
  if (hadVV) {
    Object.defineProperty(window, "visualViewport", {
      value: originalVV,
      configurable: true,
    });
  } else {
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
  }
});

describe("MobileToolbar keyboard avoidance (visualViewport)", () => {
  it("lifts the bar by the keyboard inset when the visual viewport shrinks", async () => {
    const vv = makeVisualViewport(800, 0);
    Object.defineProperty(window, "visualViewport", {
      value: vv,
      configurable: true,
    });

    const w = mountToolbar();
    await nextTick();
    // No keyboard yet -> docked at the bottom.
    expect(barEl(w).style.bottom).toBe("0px");

    // Keyboard opens: visual viewport is now 300px shorter.
    vv.height = 500;
    vv._emit("resize");
    await nextTick();
    expect(barEl(w).style.bottom).toBe("300px");

    // Keyboard closes: back to the bottom edge.
    vv.height = 800;
    vv._emit("resize");
    await nextTick();
    expect(barEl(w).style.bottom).toBe("0px");
    w.unmount();
  });

  it("accounts for a scrolled visual viewport (offsetTop)", async () => {
    const vv = makeVisualViewport(500, 50); // keyboard up AND page pinch-scrolled
    Object.defineProperty(window, "visualViewport", {
      value: vv,
      configurable: true,
    });

    const w = mountToolbar();
    await nextTick();
    // inset = innerHeight(800) - vv.height(500) - offsetTop(50) = 250
    expect(barEl(w).style.bottom).toBe("250px");
    w.unmount();
  });

  it("detaches its visualViewport listeners on unmount", async () => {
    const vv = makeVisualViewport(800, 0);
    Object.defineProperty(window, "visualViewport", {
      value: vv,
      configurable: true,
    });

    const w = mountToolbar();
    await nextTick();
    expect(vv._count("resize")).toBeGreaterThan(0);
    w.unmount();
    expect(vv._count("resize")).toBe(0);
  });

  it("stays docked and does not crash when visualViewport is unavailable", async () => {
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
    const w = mountToolbar();
    await nextTick();
    expect(barEl(w).style.bottom).toBe("0px");
    w.unmount();
  });
});
