import { afterEach, describe, expect, it, vi } from "vitest";
import { keepCaretAboveToolbar, keepSelectionVisible } from "../caretVisibility";

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

function setup() {
  const root = document.createElement("div");
  root.tabIndex = 0;
  root.innerHTML = "<p>A line to keep visible</p>";
  document.body.append(root);
  root.focus();
  const range = document.createRange();
  range.setStart(root.firstChild!.firstChild!, 1);
  range.collapse(true);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  const toolbar = document.createElement("div");
  toolbar.getBoundingClientRect = () => ({ top: 500 } as DOMRect);
  vi.spyOn(Range.prototype, "getBoundingClientRect")
    .mockReturnValue({ top: 530, bottom: 550, height: 20 } as DOMRect);
  const scroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  return { root, range, toolbar, scroll };
}

describe("caret visibility above fixed mobile controls", () => {
  it("reveals a covered insertion point without changing the selection", () => {
    const { root, range, toolbar, scroll } = setup();
    keepCaretAboveToolbar(toolbar, root);
    expect(scroll).toHaveBeenCalledWith({ top: 62, behavior: "instant" });
    expect(window.getSelection()!.getRangeAt(0).startContainer).toBe(range.startContainer);
    expect(window.getSelection()!.anchorOffset).toBe(1);
  });

  it("does not move the page when another control owns focus", () => {
    const { root, toolbar, scroll } = setup();
    root.blur();
    keepCaretAboveToolbar(toolbar, root);
    expect(scroll).not.toHaveBeenCalled();
  });

  it("does not disturb a text selection", () => {
    const { root, range, toolbar, scroll } = setup();
    range.setEnd(range.startContainer, 4);
    keepCaretAboveToolbar(toolbar, root);
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('selection scrolling after formatting', () => {
  it('reveals an off-screen passage without inserting nodes or changing its range', () => {
    const { root, range, scroll } = setup();
    range.selectNodeContents(root.firstChild!);
    vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue({ top: innerHeight + 20, bottom: innerHeight + 40, height: 20, left: 10, right: 150 } as DOMRect);
    const html = root.innerHTML;
    const selected = window.getSelection()!.toString();
    const insert = vi.spyOn(Range.prototype, 'insertNode');
    keepSelectionVisible(root);
    expect(scroll).toHaveBeenCalledWith({ top: 48, left: 0, behavior: 'instant' });
    expect(insert).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe(html);
    expect(window.getSelection()!.toString()).toBe(selected);
  });

  it('keeps a backwards selection and its focus end intact', () => {
    const { root, scroll } = setup();
    const text = root.firstChild!.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(text, 12, text, 2);
    vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue({ top: -30, bottom: -10, height: 20, left: 10, right: 150 } as DOMRect);
    keepSelectionVisible(root);
    expect(scroll).toHaveBeenCalledWith({ top: -38, left: 0, behavior: 'instant' });
    expect(selection.anchorOffset).toBe(12);
    expect(selection.focusOffset).toBe(2);
  });

  it('does not scroll a selection from another editor', () => {
    const { scroll } = setup();
    const other = document.createElement('div');
    document.body.append(other);
    keepSelectionVisible(other);
    expect(scroll).not.toHaveBeenCalled();
  });
});
