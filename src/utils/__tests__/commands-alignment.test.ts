import { describe, it, expect, beforeEach } from "vitest";
import { applyTextAlignment } from "../commands";

/**
 * Regression: applyTextAlignment used to align EVERY top-level block whenever
 * the selection spanned more than one block (commonAncestor === root), because
 * it collected all of root.childNodes with no range filter. It must only align
 * the blocks the selection actually touches.
 */
describe("applyTextAlignment — multi-block selection scope", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.contentEditable = "true";
    root.innerHTML =
      "<p id='p1'>One</p><p id='p2'>Two</p><p id='p3'>Three</p><p id='p4'>Four</p>";
    document.body.appendChild(root);
  });

  const selectAcross = (startId: string, endId: string) => {
    const startP = root.querySelector(`#${startId}`)!;
    const endP = root.querySelector(`#${endId}`)!;
    const range = document.createRange();
    range.setStart(startP.firstChild!, 0);
    range.setEnd(endP.firstChild!, endP.textContent!.length);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const align = (id: string) =>
    (root.querySelector(`#${id}`) as HTMLElement).style.textAlign;

  it("aligns only the blocks the selection spans, not the whole document", () => {
    selectAcross("p2", "p3");
    applyTextAlignment(root, "right");

    expect(align("p2")).toBe("right");
    expect(align("p3")).toBe("right");
    // Untouched blocks must stay default.
    expect(align("p1")).toBe("");
    expect(align("p4")).toBe("");
  });

  it("still aligns every block when the whole document is selected", () => {
    const range = document.createRange();
    range.selectNodeContents(root);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "center");

    expect(align("p1")).toBe("center");
    expect(align("p2")).toBe("center");
    expect(align("p3")).toBe("center");
    expect(align("p4")).toBe("center");
  });

  it("aligns a single block for a collapsed-within-one-block selection", () => {
    const p3 = root.querySelector("#p3")!;
    const range = document.createRange();
    range.setStart(p3.firstChild!, 1);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "right");

    expect(align("p3")).toBe("right");
    expect(align("p1")).toBe("");
    expect(align("p2")).toBe("");
    expect(align("p4")).toBe("");
  });

  // r9 boundary leak: Range.intersectsNode is boundary-INCLUSIVE, so a
  // selection that merely ENDS at the next block's start boundary (triple
  // click, Shift+Down) dragged that untouched block into the command.
  it("does not align a block the selection only touches at its start boundary", () => {
    const p2 = root.querySelector("#p2")!;
    const range = document.createRange();
    range.setStart(p2.firstChild!, 0);
    range.setEnd(root, 2); // boundary between p2 and p3 — p3 has zero overlap
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "center");

    expect(align("p2")).toBe("center");
    expect(align("p3")).toBe("");
    expect(align("p4")).toBe("");
  });

  it("does not align a block the selection only touches at its end boundary", () => {
    const p3 = root.querySelector("#p3")!;
    const range = document.createRange();
    range.setStart(root, 2); // boundary after p2 — p2 has zero overlap
    range.setEnd(p3.firstChild!, 3);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "center");

    expect(align("p3")).toBe("center");
    expect(align("p2")).toBe("");
  });

  // The representation browsers actually produce for triple-click/Shift+Down:
  // the selection END sits INSIDE the next block at (firstChild, 0) — zero
  // characters of it selected, but intersectsNode counts it → leak.
  it("does not align the next block when the selection ends at ITS (text, 0)", () => {
    const p2 = root.querySelector("#p2")!;
    const p3 = root.querySelector("#p3")!;
    const range = document.createRange();
    range.setStart(p2.firstChild!, 0);
    range.setEnd(p3.firstChild!, 0); // inside p3, but zero content selected
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "center");

    expect(align("p2")).toBe("center");
    expect(align("p3")).toBe("");
  });

  it("does not align the previous block when the selection starts at ITS text end", () => {
    const p2 = root.querySelector("#p2")!;
    const p3 = root.querySelector("#p3")!;
    const range = document.createRange();
    range.setStart(p2.firstChild!, p2.textContent!.length); // inside p2, after its last char
    range.setEnd(p3.firstChild!, 3);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "center");

    expect(align("p3")).toBe("center");
    expect(align("p2")).toBe("");
  });

  it("still aligns the block holding a collapsed caret at OFFSET 0", () => {
    // The regression trap for the naive strict-overlap fix: a collapsed caret
    // has zero overlap with everything, yet must align its own block.
    const p2 = root.querySelector("#p2")!;
    const range = document.createRange();
    range.setStart(p2.firstChild!, 0);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    applyTextAlignment(root, "right");

    expect(align("p2")).toBe("right");
    expect(align("p1")).toBe("");
    expect(align("p3")).toBe("");
  });
});
