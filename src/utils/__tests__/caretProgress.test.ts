import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCaretDocumentProgress } from "../caretProgress";

/**
 * Geometry tests for the caret "playhead" fraction. Rects and scroll metrics
 * are mocked (happy-dom has no layout), which is exactly what makes the math
 * assertable: progress = (rectMidY - rootTop + scrollTop) / scrollHeight.
 */
describe("getCaretDocumentProgress", () => {
  const makeRect = (top: number, height: number, width = 1): DOMRect =>
    ({
      top,
      height,
      width,
      bottom: top + height,
      left: 0,
      right: width,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;

  let root: HTMLElement;
  let textNode: Text;

  /** Point the (mocked) selection focus at a node inside/outside root. */
  const mockSelectionFocus = (
    focusNode: Node | null,
    focusOffset = 0,
    rangeCount = 1
  ) => {
    vi.spyOn(document, "getSelection").mockReturnValue({
      rangeCount,
      focusNode,
      focusOffset,
    } as unknown as Selection);
  };

  /** Configure the root's geometry: viewport rect + scroll metrics. */
  const mockRootGeometry = (opts: {
    top: number;
    scrollTop: number;
    scrollHeight: number;
  }) => {
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
      makeRect(opts.top, 600, 800)
    );
    Object.defineProperty(root, "scrollTop", {
      value: opts.scrollTop,
      configurable: true,
    });
    Object.defineProperty(root, "scrollHeight", {
      value: opts.scrollHeight,
      configurable: true,
    });
  };

  beforeEach(() => {
    root = document.createElement("div");
    root.innerHTML = "<p>hello world</p>";
    document.body.appendChild(root);
    textNode = root.querySelector("p")!.firstChild as Text;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("reports ~0.5 for a caret at the middle of the scrollable content", () => {
    mockSelectionFocus(textNode, 3);
    mockRootGeometry({ top: 100, scrollTop: 200, scrollHeight: 1000 });
    // Caret rect mid = 390 + 20/2 = 400 → (400 - 100 + 200) / 1000 = 0.5
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(390, 20)
    );

    expect(getCaretDocumentProgress(root)).toBeCloseTo(0.5, 5);
  });

  it("clamps to 0 at (or above) the top of the document", () => {
    mockSelectionFocus(textNode, 0);
    mockRootGeometry({ top: 100, scrollTop: 0, scrollHeight: 1000 });
    // Caret mid = 90, above rootTop 100 → raw -0.01 → clamped to 0
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(80, 20)
    );

    expect(getCaretDocumentProgress(root)).toBe(0);
  });

  it("clamps to 1 at (or past) the bottom of the document", () => {
    mockSelectionFocus(textNode, 5);
    mockRootGeometry({ top: 100, scrollTop: 950, scrollHeight: 1000 });
    // Caret mid = 270 → (270 - 100 + 950) / 1000 = 1.12 → clamped to 1
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(260, 20)
    );

    expect(getCaretDocumentProgress(root)).toBe(1);
  });

  it("returns null when the selection focus is outside root", () => {
    const stranger = document.createElement("p");
    stranger.textContent = "elsewhere";
    document.body.appendChild(stranger);

    mockSelectionFocus(stranger.firstChild, 2);
    mockRootGeometry({ top: 100, scrollTop: 0, scrollHeight: 1000 });

    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("returns null when there is no selection or no ranges", () => {
    vi.spyOn(document, "getSelection").mockReturnValue(null);
    expect(getCaretDocumentProgress(root)).toBeNull();

    mockSelectionFocus(textNode, 0, 0); // rangeCount === 0
    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("returns null when scrollHeight is degenerate", () => {
    mockSelectionFocus(textNode, 3);
    mockRootGeometry({ top: 100, scrollTop: 0, scrollHeight: 0 });
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(390, 20)
    );

    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("falls back to the closest element rect for an empty block's 0-rect", () => {
    const emptyBlock = document.createElement("p");
    root.appendChild(emptyBlock);

    mockSelectionFocus(emptyBlock, 0);
    mockRootGeometry({ top: 100, scrollTop: 200, scrollHeight: 1000 });
    // Range reports the empty-block degenerate 0-rect...
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(0, 0, 0)
    );
    // ...so the element's own rect drives the math: mid 400 → 0.5
    vi.spyOn(emptyBlock, "getBoundingClientRect").mockReturnValue(
      makeRect(390, 20)
    );

    expect(getCaretDocumentProgress(root)).toBeCloseTo(0.5, 5);
  });
});
