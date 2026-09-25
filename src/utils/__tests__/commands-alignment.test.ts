import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
  afterEach(() => { window.getSelection()?.removeAllRanges(); root.remove(); });

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

  it('aligns the first typed line and preserves its selected text', () => {
    root.textContent = 'A sentence worth keeping.';
    const selection = window.getSelection()!;
    selection.selectAllChildren(root);
    applyTextAlignment(root, 'center');
    expect(root.innerHTML).toBe('<p style="text-align: center;">A sentence worth keeping.</p>');
    expect(root.style.textAlign).toBe('');
    expect(selection.toString()).toBe('A sentence worth keeping.');
  });

  it('keeps inline marks and a backwards word selection in a loose paragraph', () => {
    root.innerHTML = 'A <em>quiet</em> morning';
    const word = root.querySelector('em')!.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(word, 5, word, 0);
    applyTextAlignment(root, 'right');
    expect(root.innerHTML).toBe('<p style="text-align: right;">A <em>quiet</em> morning</p>');
    expect(selection.toString()).toBe('quiet');
    expect(selection.anchorNode).toBe(word);
    expect(selection.anchorOffset).toBe(5);
    expect(selection.focusOffset).toBe(0);
  });

  it('keeps a caret at the root boundary after a first line ready to continue', () => {
    root.textContent = 'An opening';
    const selection = window.getSelection()!;
    selection.collapse(root, 1);
    applyTextAlignment(root, 'center');
    expect(root.innerHTML).toBe('<p style="text-align: center;">An opening</p>');
    expect(selection.isCollapsed).toBe(true);
    expect(selection.focusNode).toBe(root.firstChild);
    expect(selection.focusOffset).toBe(1);
  });

  it('aligns the touched loose line without absorbing breaks or adjacent blocks', () => {
    root.innerHTML = '<p>Before</p>One<br>Two <strong>words</strong><p>After</p>';
    window.getSelection()!.collapse(root.querySelector('strong')!.firstChild!, 3);
    applyTextAlignment(root, 'right');
    expect(root.innerHTML).toBe('<p>Before</p>One<br><p style="text-align: right;">Two <strong>words</strong></p><p>After</p>');
  });

  it('aligns mixed loose and existing paragraphs while preserving outside prose', () => {
    root.innerHTML = 'Before<p>One</p>Loose <em>line</em><p>Two</p>After';
    const paragraphs = root.querySelectorAll('p');
    window.getSelection()!.setBaseAndExtent(paragraphs[0].firstChild!, 0, paragraphs[1].firstChild!, 3);
    applyTextAlignment(root, 'center');
    expect(root.innerHTML).toBe('Before<p style="text-align: center;">One</p><p style="text-align: center;">Loose <em>line</em></p><p style="text-align: center;">Two</p>After');
    expect(window.getSelection()!.toString()).toBe('OneLoose lineTwo');
  });

  it('does not wrap the next loose line at a zero-content selection boundary', () => {
    root.innerHTML = '<p>Selected</p>Untouched';
    window.getSelection()!.setBaseAndExtent(root.firstChild!.firstChild!, 0, root.lastChild!, 0);
    applyTextAlignment(root, 'center');
    expect(root.innerHTML).toBe('<p style="text-align: center;">Selected</p>Untouched');
  });

  it('keeps serialized whitespace between paragraphs without creating blank blocks', () => {
    root.innerHTML = '<p>One</p>\n  <p>Two</p>';
    window.getSelection()!.selectAllChildren(root);
    applyTextAlignment(root, 'center');
    expect(root.innerHTML).toBe('<p style="text-align: center;">One</p>\n  <p style="text-align: center;">Two</p>');
  });

  it('sets alignment before the first character without styling the editor root', () => {
    root.replaceChildren();
    window.getSelection()!.collapse(root, 0);
    applyTextAlignment(root, 'right');
    expect(root.innerHTML).toBe('<p style="text-align: right;"><br></p>');
    expect(window.getSelection()!.isCollapsed).toBe(true);
  });

  it('does not change text selected outside this editor', () => {
    const outside = document.createElement('p');
    outside.textContent = 'Another document';
    document.body.append(outside);
    window.getSelection()!.selectAllChildren(outside);
    applyTextAlignment(root, 'right');
    expect(outside.style.textAlign).toBe('');
    expect(root.querySelectorAll('[style]')).toHaveLength(0);
    outside.remove();
  });

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
