import { describe, it, expect, afterEach } from "vitest";
import { getCaretOffsets, setCaretOffsets } from "../caretOffset";

describe("caretOffset capture/restore", () => {
  let root: HTMLDivElement | null = null;

  afterEach(() => {
    root?.remove();
    root = null;
    window.getSelection()?.removeAllRanges();
  });

  const mount = (html: string) => {
    root = document.createElement("div");
    root.contentEditable = "true";
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };

  const collapseAt = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  it("captures a collapsed caret's text offset across multiple blocks", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    // Caret after "Wor" in the second paragraph -> global offset 5 + 3 = 8.
    const worldText = r.querySelectorAll("p")[1].firstChild!;
    collapseAt(worldText, 3);

    expect(getCaretOffsets(r)).toEqual({ start: 8, end: 8 });
  });

  it("round-trips a caret through an innerHTML replacement", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    const worldText = r.querySelectorAll("p")[1].firstChild!;
    collapseAt(worldText, 3);
    const saved = getCaretOffsets(r);

    // Simulate undo: replace the DOM with an equivalent tree. The caret's old
    // container nodes are gone, so any surviving range is stale.
    r.innerHTML = "<p>Hello</p><p>World</p>";

    const applied = setCaretOffsets(r, saved);
    expect(applied).toBe(true);

    // The restored caret is back after "Wor" in the second paragraph.
    const restored = getCaretOffsets(r);
    expect(restored).toEqual({ start: 8, end: 8 });
    const sel = window.getSelection()!;
    expect(sel.getRangeAt(0).startContainer.textContent).toBe("World");
    expect(sel.getRangeAt(0).startOffset).toBe(3);
  });

  it("round-trips a non-collapsed selection", () => {
    const r = mount("<p>abcdef</p>");
    const text = r.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 1); // b
    range.setEnd(text, 4); // before e -> selects "bcd"
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const saved = getCaretOffsets(r);
    expect(saved).toEqual({ start: 1, end: 4 });

    r.innerHTML = "<p>abcdef</p>";
    setCaretOffsets(r, saved);
    expect(getCaretOffsets(r)).toEqual({ start: 1, end: 4 });
    expect(window.getSelection()!.toString()).toBe("bcd");
  });

  it("returns null when the selection is outside the root", () => {
    const r = mount("<p>Hello</p>");
    const outside = document.createElement("p");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    collapseAt(outside.firstChild!, 2);

    expect(getCaretOffsets(r)).toBeNull();
    outside.remove();
  });

  it.each([
    '<p>Hello</p><p>World</p>',
    '<p>Hello<strong>World</strong></p>',
  ])('starts a restored non-collapsed selection inside the next text node: %s', html => {
    const r = mount(html);
    expect(setCaretOffsets(r, { start: 5, end: 10 })).toBe(true);
    const range = window.getSelection()!.getRangeAt(0);
    expect(range.startContainer.textContent).toBe('World');
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(range.startContainer);
    expect(range.endOffset).toBe(5);
  });

  it("clamps an offset past the end to the last position", () => {
    const r = mount("<p>Hi</p>");
    // Ask to restore offset 99 (beyond the 2 chars) -> lands at end.
    const applied = setCaretOffsets(r, { start: 99, end: 99 });
    expect(applied).toBe(true);
    expect(getCaretOffsets(r)).toEqual({ start: 2, end: 2 });
  });

  it.each([
    ['<p>Earlier.</p><p><br></p>', 'p:last-child', 0],
    ['<p>Earlier.</p><table><tbody><tr><td><br></td></tr></tbody></table>', 'td', 0],
    ['<p><em>Quiet.</em></p>', 'p', 1],
    ['<p><span contenteditable="false">Name</span></p>', 'p', 1],
    ['<p>First<br>Second</p>', 'p', 2],
  ] as const)('preserves the structural caret in %s', (html, selector, offset) => {
    const r = mount(html);
    collapseAt(r.querySelector(selector)!, offset);
    const saved = getCaretOffsets(r, true);
    r.innerHTML = html;
    expect(setCaretOffsets(r, saved)).toBe(true);
    expect(window.getSelection()!.anchorNode).toBe(r.querySelector(selector));
    expect(window.getSelection()!.anchorOffset).toBe(offset);
  });

  it('retains selection direction in a restored history snapshot', () => {
    const html = '<p>Hello <em>world</em>.</p>';
    const r = mount(html);
    const text = r.querySelector('em')!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 5, text, 0);
    const saved = getCaretOffsets(r, true);
    r.innerHTML = html;
    expect(setCaretOffsets(r, saved)).toBe(true);
    expect(window.getSelection()!.toString()).toBe('world');
    expect(window.getSelection()!.anchorOffset).toBe(5);
    expect(window.getSelection()!.focusOffset).toBe(0);
  });

  it('uses text offsets when a restored snapshot has different inline wrappers', () => {
    const r = mount('<p>Hello <em>world</em>.</p>');
    collapseAt(r.querySelector('em')!.firstChild!, 3);
    const saved = getCaretOffsets(r, true);
    r.innerHTML = '<p>Hello world.</p>';
    expect(setCaretOffsets(r, saved)).toBe(true);
    expect(getCaretOffsets(r)).toEqual({ start: 9, end: 9 });
  });
});
