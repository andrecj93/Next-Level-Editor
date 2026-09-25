import { afterEach, describe, expect, it, vi } from "vitest";
import { keepCaretAboveToolbar, keepSelectionVisible, preserveVisibleSelection } from "../caretVisibility";

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

describe('keeping the current line during a layout change', () => {
  function viewport(root: HTMLElement, bottom: number) {
    root.style.overflowY = 'auto';
    root.getBoundingClientRect = () => ({ top: 100, bottom, left: 0, right: 300 } as DOMRect);
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: bottom - 100 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 1000 });
  }

  it('reveals the previously visible line after the editing area shrinks', () => {
    const { root, range } = setup();
    viewport(root, 600);
    const restore = preserveVisibleSelection(root);
    viewport(root, 400);
    restore();
    expect(root.scrollTop).toBe(174);
    expect(window.getSelection()!.getRangeAt(0).startContainer).toBe(range.startContainer);
    expect(window.getSelection()!.focusOffset).toBe(1);
  });

  it('leaves a selection the writer scrolled away from alone', () => {
    const { root, scroll } = setup();
    viewport(root, 400);
    const restore = preserveVisibleSelection(root);
    viewport(root, 300);
    restore();
    expect(root.scrollTop).toBe(0);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('keeps a formatted word whose focus is between inline elements visible', () => {
    const { root } = setup();
    root.innerHTML = '<p>A <em>quiet</em> room.</p>';
    const paragraph = root.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(paragraph, 1, paragraph, 2);
    vi.mocked(Range.prototype.getBoundingClientRect).mockImplementation(function (this: Range) {
      return this.collapsed && this.startContainer.nodeType === Node.ELEMENT_NODE
        ? { top: 0, bottom: 0, height: 0 } as DOMRect
        : { top: 530, bottom: 550, height: 20 } as DOMRect;
    });
    viewport(root, 600);
    const restore = preserveVisibleSelection(root);
    viewport(root, 400);
    restore();
    expect(root.scrollTop).toBe(174);
    expect(selection.toString()).toBe('quiet');
    expect(selection.focusNode).toBe(paragraph);
    expect(selection.focusOffset).toBe(2);
  });

  it('does not follow a selection that moved to a different editor', () => {
    const { root, scroll } = setup();
    viewport(root, 600);
    const restore = preserveVisibleSelection(root);
    const other = document.createElement('p');
    other.textContent = 'A different document';
    document.body.append(other);
    window.getSelection()!.selectAllChildren(other);
    viewport(root, 400);
    restore();
    expect(root.scrollTop).toBe(0);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('preserves the reading paragraph if native reflow tries to reveal a distant caret', () => {
    const { root } = setup();
    viewport(root, 400);
    root.scrollTop = 200;
    const paragraph = root.firstElementChild!;
    vi.spyOn(paragraph, 'getBoundingClientRect').mockReturnValue({ top: 60, bottom: 220, height: 160 } as DOMRect);
    const restore = preserveVisibleSelection(root, true);
    // The same paragraph rewraps to twice its old height, while the browser
    // independently scrolls to the off-screen caret.
    root.scrollTop = 900;
    vi.mocked(paragraph.getBoundingClientRect).mockReturnValue({ top: -600, bottom: -280, height: 320 } as DOMRect);
    restore();
    expect(root.scrollTop).toBe(280);
  });

  it('keeps the document opening when the reading position is at the top', () => {
    const { root } = setup();
    viewport(root, 400);
    const restore = preserveVisibleSelection(root, true);
    root.scrollTop = 900;
    restore();
    expect(root.scrollTop).toBe(0);
  });
});
