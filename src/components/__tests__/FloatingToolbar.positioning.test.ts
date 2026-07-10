import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FloatingToolbar from "../FloatingToolbar.vue";
import {
  computeToolbarPosition,
  EDGE_MARGIN,
  ABOVE_OFFSET,
  BELOW_OFFSET,
  FLIP_THRESHOLD,
  ESTIMATED_WIDTH,
} from "../../utils/floatingToolbarPosition";

/**
 * Positioning math for the SELECTION toolbar (floating bubble).
 * The bubble uses `transform: translateX(-50%)`, so `left` is the CENTER;
 * the visible edges are `left ± toolbarWidth / 2`.
 */
describe("computeToolbarPosition", () => {
  const base = {
    toolbarWidth: 240,
    viewportWidth: 1024,
    scrollX: 0,
    scrollY: 0,
  };

  describe("horizontal clamping (Findings 1 + 2)", () => {
    it("keeps the bubble attached to a centered selection on a 375px viewport", () => {
      // Selection centered in a mobile viewport; the old clamp
      // (innerWidth - 300 = 75) would have yanked the center to 75px.
      const pos = computeToolbarPosition({
        ...base,
        viewportWidth: 375,
        rect: { top: 200, bottom: 220, left: 147.5, width: 80 },
      });
      // Selection center is 187.5, inside the allowed band [130, 245].
      expect(pos.left).toBe(187.5);
      // Both edges visible with the margin respected.
      expect(pos.left - 120).toBeGreaterThanOrEqual(EDGE_MARGIN);
      expect(pos.left + 120).toBeLessThanOrEqual(375 - EDGE_MARGIN);
    });

    it("clamps the RIGHT edge (not the center) on a narrow viewport", () => {
      const pos = computeToolbarPosition({
        ...base,
        viewportWidth: 375,
        rect: { top: 200, bottom: 220, left: 300, width: 60 },
      });
      // max center = 375 - 240/2 - 10 = 245
      expect(pos.left).toBe(245);
      expect(pos.left + 120).toBe(375 - EDGE_MARGIN); // right edge on-screen
      expect(pos.left - 120).toBeGreaterThanOrEqual(EDGE_MARGIN); // left edge too
    });

    it("keeps the LEFT edge on-screen for selections at the left margin (desktop)", () => {
      // Old code floored the CENTER at 10px -> left edge at 10 - width/2 < 0.
      const pos = computeToolbarPosition({
        ...base,
        rect: { top: 200, bottom: 220, left: 0, width: 20 },
      });
      // min center = 240/2 + 10 = 130 -> left edge exactly at the margin.
      expect(pos.left).toBe(130);
      expect(pos.left - 120).toBe(EDGE_MARGIN);
    });

    it("centers the bubble when it is wider than the viewport", () => {
      const pos = computeToolbarPosition({
        ...base,
        toolbarWidth: 400,
        viewportWidth: 375,
        rect: { top: 200, bottom: 220, left: 10, width: 30 },
      });
      expect(pos.left).toBe(375 / 2);
    });

    it("applies horizontal clamping in viewport space, then converts to document space", () => {
      const unscrolled = computeToolbarPosition({
        ...base,
        rect: { top: 200, bottom: 220, left: 0, width: 20 },
      });
      const scrolled = computeToolbarPosition({
        ...base,
        scrollX: 100,
        rect: { top: 200, bottom: 220, left: 0, width: 20 },
      });
      expect(scrolled.left).toBe(unscrolled.left + 100);
    });
  });

  describe("vertical flip (Finding 3)", () => {
    it("places the bubble ABOVE the selection when there is room", () => {
      const pos = computeToolbarPosition({
        ...base,
        rect: { top: 200, bottom: 220, left: 100, width: 80 },
      });
      expect(pos.below).toBe(false);
      expect(pos.top).toBe(200 - ABOVE_OFFSET);
    });

    it("flips BELOW when the selection is near the top of an unscrolled page", () => {
      // Old code clamped top to 10px, covering the selected text.
      const pos = computeToolbarPosition({
        ...base,
        rect: { top: 20, bottom: 40, left: 100, width: 80 },
      });
      expect(pos.below).toBe(true);
      expect(pos.top).toBe(40 + BELOW_OFFSET);
    });

    it("flips BELOW on a scrolled page instead of computing an off-screen top", () => {
      // rect.top is viewport-relative: 30px from the viewport top while the
      // page is scrolled 500px. Old code: 30 + 500 - 50 = 480 (doc coords),
      // i.e. 20px ABOVE the viewport -> invisible.
      const pos = computeToolbarPosition({
        ...base,
        scrollY: 500,
        rect: { top: 30, bottom: 50, left: 100, width: 80 },
      });
      expect(pos.below).toBe(true);
      expect(pos.top).toBe(50 + 500 + BELOW_OFFSET);
      // Sanity: the bubble top is inside the viewport.
      expect(pos.top - 500).toBeGreaterThan(0);
    });

    it("does not flip at exactly the threshold", () => {
      const pos = computeToolbarPosition({
        ...base,
        rect: { top: FLIP_THRESHOLD, bottom: FLIP_THRESHOLD + 20, left: 100, width: 80 },
      });
      expect(pos.below).toBe(false);
      expect(pos.top).toBe(FLIP_THRESHOLD - ABOVE_OFFSET);
    });
  });
});

describe("FloatingToolbar (component)", () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const actions = [
    {
      id: "bold",
      label: "B",
      tooltip: "Bold",
      onClick: () => {},
    },
  ];

  const mockSelection = (rect: { top: number; bottom: number; left: number; width: number }) => {
    const domRect = {
      ...rect,
      height: rect.bottom - rect.top,
      right: rect.left + rect.width,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    } as DOMRect;
    vi.spyOn(window, "getSelection").mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => ({ getBoundingClientRect: () => domRect }),
    } as unknown as Selection);
  };

  const showToolbar = async (rect: { top: number; bottom: number; left: number; width: number }) => {
    mockSelection(rect);
    wrapper = mount(FloatingToolbar, { props: { show: false, actions } });
    await wrapper.setProps({ show: true });
    // updatePosition runs on a 10ms setTimeout after show flips true.
    vi.advanceTimersByTime(20);
    await nextTick();
    await nextTick(); // re-measure pass after first render
    return document.body.querySelector(".floating-toolbar") as HTMLElement | null;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders above the selection without the is-below class when there is room", async () => {
    const el = await showToolbar({ top: 200, bottom: 220, left: 400, width: 80 });
    expect(el).not.toBeNull();
    expect(el!.classList.contains("is-below")).toBe(false);
    expect(el!.style.top).toBe(`${200 - ABOVE_OFFSET}px`);
    expect(el!.style.left).toBe("440px");
  });

  it("adds the is-below class and positions under the selection near the viewport top", async () => {
    const el = await showToolbar({ top: 20, bottom: 40, left: 400, width: 80 });
    expect(el).not.toBeNull();
    expect(el!.classList.contains("is-below")).toBe(true);
    expect(el!.style.top).toBe(`${40 + BELOW_OFFSET}px`);
  });

  it("clamps using the estimated width before the bubble can be measured", async () => {
    // happy-dom reports offsetWidth 0, so ESTIMATED_WIDTH drives the clamp.
    const el = await showToolbar({ top: 200, bottom: 220, left: 0, width: 20 });
    expect(el).not.toBeNull();
    expect(el!.style.left).toBe(`${ESTIMATED_WIDTH / 2 + EDGE_MARGIN}px`);
  });
});
