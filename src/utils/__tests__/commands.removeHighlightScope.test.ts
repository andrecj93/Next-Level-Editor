import { describe, it, expect, beforeEach } from "vitest";
import { applyBackgroundColor } from "../commands";

/**
 * R23-10: the highlight dropdown's "None" swatch cleared highlighting far
 * beyond the selection. Two separate leaks:
 *
 *  1. A PARTIAL selection inside a highlighted run stripped the WHOLE span —
 *     selecting "beta" in a yellow "alpha beta gamma" un-highlighted all three
 *     words.
 *  2. `range.intersectsNode` counts a range that merely TOUCHES a node, so
 *     selecting paragraph 1 up to the very start of a highlight in paragraph 2
 *     cleared that highlight too — zero of its characters were selected.
 */
let root: HTMLElement;

const HIGHLIGHT = "rgb(255, 255, 0)";

const selectText = (node: Node, start: number, end: number) => {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
};

const highlightedTexts = () =>
  Array.from(root.querySelectorAll<HTMLElement>("span"))
    .filter((el) => el.style.backgroundColor)
    .map((el) => el.textContent);

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe('highlight "None" only clears the selection (#R23-10)', () => {
  it('places future typing outside the highlight while retaining emphasis', () => {
    root.innerHTML = `<p><em><span style="background-color: ${HIGHLIGHT};">alpha beta</span></em></p>`;
    selectText(root.querySelector('span')!.firstChild!, 3, 3);
    applyBackgroundColor(root, 'transparent');
    const selection = window.getSelection()!;
    expect(selection.isCollapsed).toBe(true);
    const typing = selection.anchorNode!.parentElement!;
    expect(typing.closest('em')).not.toBeNull();
    expect(typing.closest('span[style*="background-color"]')).toBeNull();
    expect(highlightedTexts()).toEqual(['alp', 'ha beta']);
  });

  it("keeps the rest of the run highlighted when only a word is selected", () => {
    root.innerHTML = `<p><span style="background-color: ${HIGHLIGHT};">alpha beta gamma</span></p>`;
    const text = root.querySelector("span")!.firstChild!;
    // "beta" sits at offsets 6..10.
    selectText(text, 6, 10);

    applyBackgroundColor(root, "transparent");

    expect(root.textContent).toBe("alpha beta gamma");
    const still = highlightedTexts().join("|");
    expect(still).toContain("alpha ");
    expect(still).toContain(" gamma");
    expect(still).not.toContain("beta");
    expect(window.getSelection()!.toString()).toBe('beta');
  });

  it("does not clear a highlight in the next block that was merely touched", () => {
    root.innerHTML =
      `<p>plain</p><p><span style="background-color: ${HIGHLIGHT};">HL</span></p>`;
    const first = root.querySelector("p")!.firstChild!;
    const highlighted = root.querySelector("span")!.firstChild!;

    // Drag from the start of paragraph 1 to the very start of the highlight:
    // not one of its characters is selected.
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(highlighted, 0);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    applyBackgroundColor(root, "transparent");

    expect(highlightedTexts()).toEqual(["HL"]);
  });

  it("still clears a fully selected highlight", () => {
    root.innerHTML = `<p><span style="background-color: ${HIGHLIGHT};">whole</span></p>`;
    const text = root.querySelector("span")!.firstChild!;
    selectText(text, 0, 5);

    applyBackgroundColor(root, "transparent");

    expect(highlightedTexts()).toEqual([]);
    expect(root.textContent).toBe("whole");
    expect(window.getSelection()!.toString()).toBe('whole');
  });

  it("clears every highlight a multi-word selection really covers", () => {
    root.innerHTML =
      `<p><span style="background-color: ${HIGHLIGHT};">one</span> ` +
      `<span style="background-color: ${HIGHLIGHT};">two</span></p>`;
    const paragraph = root.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    applyBackgroundColor(root, "transparent");

    expect(highlightedTexts()).toEqual([]);
    expect(window.getSelection()!.toString()).toBe('one two');
  });

  it('preserves a backward selection inside emphasized highlighted prose', () => {
    root.innerHTML = `<p><em><span style="background-color: ${HIGHLIGHT};">alpha beta gamma</span></em></p>`;
    const text = root.querySelector('span')!.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(text, 10, text, 6);
    applyBackgroundColor(root, 'transparent');
    expect(selection.toString()).toBe('beta');
    const range = selection.getRangeAt(0);
    expect(selection.anchorNode).toBe(range.endContainer);
    expect(selection.anchorOffset).toBe(range.endOffset);
    expect(root.querySelector('em')!.textContent).toBe('alpha beta gamma');
    expect(highlightedTexts()).toEqual(['alpha ', ' gamma']);
  });
});
