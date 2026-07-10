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
});
