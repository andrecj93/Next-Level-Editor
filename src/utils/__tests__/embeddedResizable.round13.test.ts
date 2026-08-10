import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createEmbeddedResizable,
  initializeEmbeddedElements,
  clampKeepingAspect,
} from "../embeddedResizable";

/**
 * Round-13 embedded-image polish:
 *  - #24: with maintainAspect, a corner resize clamped width and height
 *    INDEPENDENTLY, so near the min/max one axis hit the limit while the other
 *    kept its value — the box distorted (a wide image snapped square with empty
 *    bands). The two axes must be clamped together, preserving the ratio.
 *  - #25: keyboard-deleting a selected embed removed it but placed no caret, so
 *    the next keystroke went nowhere until the user clicked back in. Delete now
 *    restores a caret where the embed was.
 */

describe("clampKeepingAspect preserves the ratio at the limits (#24)", () => {
  it("scales both axes up together when one dips below the min", () => {
    // 4:1 wide box dragged so the short side would fall under MIN (100).
    const r = clampKeepingAspect(200, 50);
    expect(r.height).toBe(100); // short side pinned to the min…
    expect(r.width).toBe(400); // …and the long side follows the 4:1 ratio
  });

  it("scales both axes down together when one exceeds the max", () => {
    const r = clampKeepingAspect(2400, 600); // 4:1, long side over MAX (1200)
    expect(r.width).toBe(1200);
    expect(r.height).toBe(300); // ratio preserved
  });

  it("leaves an in-range size untouched", () => {
    expect(clampKeepingAspect(400, 300)).toEqual({ width: 400, height: 300 });
  });
});

describe("deleting a selected embed restores the caret (#25)", () => {
  let root: HTMLDivElement | null = null;

  afterEach(() => {
    root?.remove();
    root = null;
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("leaves a collapsed caret inside the editor after Delete", () => {
    root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    root.innerHTML =
      "<p>before</p>" +
      createEmbeddedResizable({
        type: "image",
        src: "x.png",
        alt: "x",
        width: 400,
        height: 300,
      }) +
      "<p>after</p>";
    document.body.appendChild(root);
    initializeEmbeddedElements(root);

    const container = root.querySelector<HTMLElement>(
      ".embedded-resizable-container"
    )!;
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.stubGlobal("confirm", vi.fn(() => true));

    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Delete", bubbles: true })
    );

    expect(root.querySelector(".embedded-resizable-container")).toBeNull();

    const sel = window.getSelection()!;
    expect(sel.rangeCount).toBeGreaterThan(0);
    const range = sel.getRangeAt(0);
    expect(range.collapsed).toBe(true);
    expect(root.contains(range.startContainer)).toBe(true);
  });
});
