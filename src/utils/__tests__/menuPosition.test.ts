import { describe, it, expect, afterEach } from "vitest";
import { clampMenuToViewport } from "../menuPosition";

// happy-dom defaults: window.innerWidth 1024, innerHeight 768. Fixed bars are
// simulated by stubbing getBoundingClientRect on real elements.

const OPTS = { estimatedWidth: 320, estimatedHeight: 400, margin: 8 };

function addBar(className: string, rect: Partial<DOMRect>) {
  const el = document.createElement("div");
  el.className = className;
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("clampMenuToViewport", () => {
  it("passes through a position that already fits", () => {
    const pos = clampMenuToViewport(100, 50, OPTS);
    expect(pos.top).toBe(100);
    expect(pos.left).toBe(50);
    expect(pos.maxHeight).toBeGreaterThanOrEqual(400);
  });

  it("clamps the left edge so the menu never overflows the right side", () => {
    const pos = clampMenuToViewport(100, 990, OPTS);
    // innerWidth 1024 - width 320 - margin 8 = 696
    expect(pos.left).toBe(1024 - 320 - 8);
  });

  it("keeps the menu below the sticky main toolbar", () => {
    addBar("editor-toolbar-modern", { bottom: 64, height: 64 });
    const pos = clampMenuToViewport(10, 50, OPTS);
    expect(pos.top).toBe(64 + 8);
  });

  it("keeps the menu above the fixed mobile toolbar and budgets max-height", () => {
    addBar("mobile-toolbar", { top: 500, height: 268 });
    // Caret near the bottom: the box must be pulled up above the bar.
    const pos = clampMenuToViewport(700, 50, OPTS);
    expect(pos.top + 400).toBeLessThanOrEqual(500);
    // The height budget stops at the bar, so lower rows stay tappable.
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(500);
  });

  it("caps the height budget instead of collapsing when nothing fits", () => {
    addBar("editor-toolbar-modern", { bottom: 300, height: 300 });
    addBar("mobile-toolbar", { top: 460, height: 308 });
    const pos = clampMenuToViewport(400, 50, OPTS);
    // 160px is the floor: the menu scrolls internally rather than vanishing.
    expect(pos.maxHeight).toBeGreaterThanOrEqual(160);
    expect(pos.top).toBeGreaterThanOrEqual(308);
  });

  it("ignores a mobile toolbar that is present but zero-height (hidden)", () => {
    addBar("mobile-toolbar", { top: 0, height: 0 });
    const pos = clampMenuToViewport(700, 50, OPTS);
    // Bottom limit falls back to the viewport, not the hidden bar's top: 0.
    expect(pos.top).toBe(768 - 400 - 8);
  });

  // toolbarPosition="bottom": the same .editor-toolbar-modern element is a
  // dock at the viewport bottom. It must be treated as a BOTTOM obstacle —
  // the old clamp read its rect.bottom as minTop and pinned the menu below
  // the viewport (invisible menu still owning the keyboard).
  describe("bottom-docked toolbar", () => {
    const DOCK = { top: 715, bottom: 768, height: 53, width: 1024 };

    it("does not force the menu top below the dock", () => {
      addBar("editor-toolbar-modern", DOCK);
      const pos = clampMenuToViewport(100, 50, OPTS);
      // A caret well above the dock keeps its position untouched.
      expect(pos.top).toBe(100);
      expect(pos.left).toBe(50);
    });

    it("uses the dock top as the bottom limit for flip and height budget", () => {
      addBar("editor-toolbar-modern", DOCK);
      // Caret right above the dock: the box is pulled up above it.
      const pos = clampMenuToViewport(700, 50, OPTS);
      expect(pos.top + 400).toBeLessThanOrEqual(715);
      expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(715);
      // And it stays on-screen (the inverted bug placed it at ~innerHeight+8).
      expect(pos.top).toBeLessThan(715);
    });
  });

  // toolbarPosition="left": the toolbar is a tall, narrow, full-height rail.
  // It claims horizontal space only — under the old clamp its rect.bottom
  // (= the editor's bottom edge) became minTop, pushing menus below the
  // whole document.
  describe("left-rail toolbar", () => {
    const RAIL = { top: 0, bottom: 768, height: 768, width: 48, right: 48 };

    it("clamps the left edge to the rail's right side", () => {
      addBar("editor-toolbar-modern", RAIL);
      const pos = clampMenuToViewport(100, 10, OPTS);
      expect(pos.left).toBe(48 + 8);
    });

    it("makes no vertical claim: caret position and full height budget kept", () => {
      addBar("editor-toolbar-modern", RAIL);
      const pos = clampMenuToViewport(100, 200, OPTS);
      expect(pos.top).toBe(100);
      expect(pos.left).toBe(200);
      // Bottom limit is the viewport, not the rail's bottom edge.
      expect(pos.maxHeight).toBe(768 - 100 - 8);
    });
  });

  it("honors a top bar and a bottom dock simultaneously", () => {
    // e.g. a host sticky header plus toolbarPosition="bottom".
    addBar("editor-toolbar-modern", { top: 0, bottom: 64, height: 64, width: 1024 });
    addBar("editor-toolbar-modern", { top: 715, bottom: 768, height: 53, width: 1024 });
    const low = clampMenuToViewport(10, 50, OPTS);
    expect(low.top).toBe(64 + 8); // kept below the top bar
    const high = clampMenuToViewport(700, 50, OPTS);
    expect(high.top + 400).toBeLessThanOrEqual(715); // pulled above the dock
    expect(high.top + high.maxHeight).toBeLessThanOrEqual(715);
  });

  it("uses the full viewport when no toolbar exists at all (pill/zen mode)", () => {
    const pos = clampMenuToViewport(700, 50, OPTS);
    // Only the viewport bottom clamps: innerHeight 768 - height 400 - margin 8.
    expect(pos.top).toBe(768 - 400 - 8);
    const fits = clampMenuToViewport(5, 50, OPTS);
    // No phantom top bar: only the margin floor applies.
    expect(fits.top).toBe(8);
  });
});
