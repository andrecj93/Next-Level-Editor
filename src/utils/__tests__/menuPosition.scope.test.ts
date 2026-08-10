import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clampMenuToViewport } from "../menuPosition";

/**
 * R23-7: the clamp collected obstacle bars with a DOCUMENT-WIDE
 * `querySelectorAll('.editor-toolbar-modern, .mobile-toolbar')`, so a second
 * editor's toolbar counted as an obstacle for the first editor's menu. With two
 * stacked editors, the lower editor's toolbar has its centre in the bottom half
 * of the viewport, so it became a "bottom obstacle" and the first editor's
 * slash menu was flipped up against it — measured at 228px away from the caret
 * that opened it, and 120px shorter.
 */
const VIEWPORT_HEIGHT = 900;
const VIEWPORT_WIDTH = 1024;

/** A stand-in toolbar at a fixed rect, inside `parent`. */
const addToolbar = (
  parent: HTMLElement,
  top: number,
  height: number,
  width = 800
) => {
  const bar = document.createElement("div");
  bar.className = "editor-toolbar-modern";
  parent.appendChild(bar);
  bar.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      left: 0,
      right: width,
      width,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return bar;
};

const makeEditorRoot = () => {
  const root = document.createElement("div");
  root.className = "next-level-editor";
  document.body.appendChild(root);
  return root;
};

beforeEach(() => {
  window.innerHeight = VIEWPORT_HEIGHT;
  window.innerWidth = VIEWPORT_WIDTH;
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("clampMenuToViewport only avoids ITS OWN editor's bars (#R23-7)", () => {
  const OPTIONS = { estimatedWidth: 280, estimatedHeight: 320 };

  it("ignores a second editor's toolbar lower down the page", () => {
    const first = makeEditorRoot();
    addToolbar(first, 0, 64); // our own top toolbar

    const alone = clampMenuToViewport(300, 100, {
      ...OPTIONS,
      root: first,
    });

    // A second editor appears below, its toolbar in the viewport's lower half.
    const second = makeEditorRoot();
    addToolbar(second, 420, 64);

    const withNeighbour = clampMenuToViewport(300, 100, {
      ...OPTIONS,
      root: first,
    });

    expect(withNeighbour.top).toBe(alone.top);
    expect(withNeighbour.maxHeight).toBe(alone.maxHeight);
    // And it really did stay at the caret rather than flipping to the top.
    expect(withNeighbour.top).toBe(300);
  });

  it("still avoids the caller's OWN bottom-docked toolbar", () => {
    const own = makeEditorRoot();
    addToolbar(own, 700, 64); // our own bottom dock

    const pos = clampMenuToViewport(600, 100, { ...OPTIONS, root: own });

    // The menu must end above our own bar, not run under it.
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(700);
  });

  it("still avoids the teleported mobile toolbar, which lives outside the root", () => {
    const own = makeEditorRoot();
    const mobile = document.createElement("div");
    mobile.className = "mobile-toolbar";
    document.body.appendChild(mobile);
    mobile.getBoundingClientRect = () =>
      ({
        top: 750,
        bottom: 900,
        left: 0,
        right: VIEWPORT_WIDTH,
        width: VIEWPORT_WIDTH,
        height: 150,
        x: 0,
        y: 750,
        toJSON: () => ({}),
      }) as DOMRect;

    const pos = clampMenuToViewport(600, 100, { ...OPTIONS, root: own });

    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(750);
  });

  it("falls back to a document-wide scan when no root is given", () => {
    // Backwards compatible: a caller that does not pass a root behaves as before.
    const only = makeEditorRoot();
    addToolbar(only, 0, 64);

    const pos = clampMenuToViewport(300, 100, OPTIONS);

    expect(pos.top).toBe(300);
  });
});
