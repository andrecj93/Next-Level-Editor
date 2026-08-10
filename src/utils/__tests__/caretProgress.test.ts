import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCaretDocumentProgress } from "../caretProgress";

/**
 * Geometry tests for the caret "playhead" fraction. Rects are mocked
 * (happy-dom has no layout), which is exactly what makes the math assertable.
 *
 * Semantics under test (content-extent normalisation, NOT scrollHeight):
 *   progress = (caretRect.top - firstBlockRect.top)
 *            / max(lastBlockRect.bottom - firstBlockRect.top - caretRect.height, 1)
 * so the first line of the document reads 0 and the last line reads 1 —
 * for documents both shorter and taller than the visible pane. All rects
 * share viewport space, so no scrollTop/root-offset conversion appears.
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
  let firstBlock: HTMLElement;
  let lastBlock: HTMLElement;
  let firstText: Text;
  let lastText: Text;

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

  /** Content extent: first block's top .. last block's bottom (viewport px). */
  const mockContentExtent = (contentTop: number, contentBottom: number) => {
    vi.spyOn(firstBlock, "getBoundingClientRect").mockReturnValue(
      makeRect(contentTop, 40)
    );
    vi.spyOn(lastBlock, "getBoundingClientRect").mockReturnValue(
      makeRect(contentBottom - 40, 40)
    );
  };

  const mockCaretRect = (top: number, height = 20) => {
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(top, height)
    );
  };

  beforeEach(() => {
    root = document.createElement("div");
    root.innerHTML = "<p>first block</p><p>last block</p>";
    document.body.appendChild(root);
    firstBlock = root.children[0] as HTMLElement;
    lastBlock = root.children[1] as HTMLElement;
    firstText = firstBlock.firstChild as Text;
    lastText = lastBlock.firstChild as Text;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("reports ~0.5 for a caret midway through a long document", () => {
    mockSelectionFocus(firstText, 3);
    mockContentExtent(0, 1000); // span 1000
    mockCaretRect(500, 20); // (500 - 0) / (1000 - 20) ≈ 0.51

    expect(getCaretDocumentProgress(root)).toBeCloseTo(0.5, 1);
  });

  it("reads 0 on the first line of the document", () => {
    mockSelectionFocus(firstText, 0);
    mockContentExtent(100, 700);
    mockCaretRect(100, 20); // caret top == content top

    expect(getCaretDocumentProgress(root)).toBe(0);
  });

  it("clamps to 0 for a caret rect above the content top", () => {
    mockSelectionFocus(firstText, 0);
    mockContentExtent(100, 700);
    mockCaretRect(80, 20); // raw negative → clamped

    expect(getCaretDocumentProgress(root)).toBe(0);
  });

  it("short document (fits in the pane): caret on the last line reads ~1", () => {
    // One short paragraph pair inside a tall flex pane — the old scrollHeight
    // math would have read ~0.15 here; content-extent math must read the end.
    mockSelectionFocus(lastText, 5);
    mockContentExtent(100, 300); // span 200, tiny vs any pane
    mockCaretRect(280, 20); // last line: (280 - 100) / (200 - 20) = 1

    const progress = getCaretDocumentProgress(root);
    expect(progress).not.toBeNull();
    expect(progress!).toBeGreaterThanOrEqual(0.95);
    expect(progress!).toBeLessThanOrEqual(1);
  });

  it("long document: caret on the last line reads exactly 1 (no padding cap)", () => {
    mockSelectionFocus(lastText, 5);
    mockContentExtent(-4000, 1000); // span 5000, mostly scrolled above
    mockCaretRect(980, 20); // (980 - -4000) / (5000 - 20) = 1

    expect(getCaretDocumentProgress(root)).toBe(1);
  });

  it("clamps to 1 for a caret rect past the content bottom", () => {
    mockSelectionFocus(lastText, 5);
    mockContentExtent(100, 300);
    mockCaretRect(400, 20); // beyond the last block → clamped

    expect(getCaretDocumentProgress(root)).toBe(1);
  });

  it("returns null when the selection focus is outside root", () => {
    const stranger = document.createElement("p");
    stranger.textContent = "elsewhere";
    document.body.appendChild(stranger);

    mockSelectionFocus(stranger.firstChild, 2);
    mockContentExtent(100, 700);

    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("returns null when there is no selection or no ranges", () => {
    vi.spyOn(document, "getSelection").mockReturnValue(null);
    expect(getCaretDocumentProgress(root)).toBeNull();

    mockSelectionFocus(firstText, 0, 0); // rangeCount === 0
    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("returns null when root has no element children (nothing to measure)", () => {
    root.innerHTML = "";
    const loose = document.createTextNode("loose text");
    root.appendChild(loose);

    mockSelectionFocus(loose, 2);
    mockCaretRect(100, 20);

    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("returns null when the content extent is degenerate (zero-span rects)", () => {
    mockSelectionFocus(firstText, 3);
    // No child-rect mocks: happy-dom reports all-zero rects → span 0.
    mockCaretRect(100, 20);

    expect(getCaretDocumentProgress(root)).toBeNull();
  });

  it("falls back to the closest element rect for an empty block's 0-rect", () => {
    const emptyBlock = document.createElement("p");
    root.appendChild(emptyBlock); // becomes the new last block
    lastBlock = emptyBlock;

    mockSelectionFocus(emptyBlock, 0);
    mockContentExtent(100, 300);
    // Range reports the empty-block degenerate 0-rect (width 0 too)...
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(
      makeRect(0, 0, 0)
    );
    // ...so the element's own rect drives the math. It is ALSO the last
    // block, whose mocked rect spans 260..300; its top 260 with height 40:
    // (260 - 100) / max(200 - 40, 1) = 1.
    expect(getCaretDocumentProgress(root)).toBe(1);
  });
});
