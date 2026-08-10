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

  it("clamps an offset past the end to the last position", () => {
    const r = mount("<p>Hi</p>");
    // Ask to restore offset 99 (beyond the 2 chars) -> lands at end.
    const applied = setCaretOffsets(r, { start: 99, end: 99 });
    expect(applied).toBe(true);
    expect(getCaretOffsets(r)).toEqual({ start: 2, end: 2 });
  });
});
