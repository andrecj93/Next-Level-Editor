import { describe, it, expect, afterEach } from "vitest";
import { toggleList, indentListItem } from "../formatting";

/**
 * Batch-66 follow-up: the same boundary leak fixed for alignment lived in the
 * list operations. A selection whose END sits INSIDE the next item/block at
 * (firstChild, 0) — the representation triple-click / Shift+Down produce —
 * selects ZERO of it, yet range.intersectsNode counted it, so:
 *  - toggleList OFF un-listed one extra item,
 *  - Tab (indentListItem) indented one extra item,
 *  - toggleList ON swallowed one extra paragraph into the new list.
 * All three now share the alignment fix via rangeTouchesElement.
 */
const roots: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.appendChild(el);
  roots.push(el);
  return el;
};

afterEach(() => {
  for (const el of roots.splice(0)) el.remove();
  window.getSelection()?.removeAllRanges();
});

const selectFromTo = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number
) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

describe("list commands ignore a zero-overlap boundary block", () => {
  it("toggleList OFF does not un-list the item the selection only ends at", () => {
    const r = mount("<ul><li>one</li><li>two</li><li>three</li></ul>");
    const items = r.querySelectorAll("li");
    // Select item "two" fully, ending INSIDE item "three" at (text, 0).
    selectFromTo(items[1].firstChild!, 0, items[2].firstChild!, 0);

    toggleList(r, "ul");

    // "two" became a paragraph; "three" (zero characters selected) stays listed.
    expect(
      Array.from(r.querySelectorAll("p")).map((p) => p.textContent)
    ).toEqual(["two"]);
    expect(
      Array.from(r.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["one", "three"]);
  });

  it("Tab does not indent the item the selection only ends at", () => {
    const r = mount("<ul><li>A</li><li>B</li><li>C</li></ul>");
    const items = r.querySelectorAll("li");
    selectFromTo(items[1].firstChild!, 0, items[2].firstChild!, 0);

    expect(indentListItem(r)).toBe(true);

    // B nested under A; C (zero characters selected) stays top-level.
    const nested = r.querySelector("li > ul");
    expect(nested).not.toBeNull();
    expect(
      Array.from(nested!.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["B"]);
    const topItems = Array.from(r.querySelectorAll(":scope > ul > li")).map(
      (li) => (li.firstChild?.textContent ?? "").trim()
    );
    expect(topItems).toEqual(["A", "C"]);
  });

  it("toggleList ON does not swallow the block the selection only ends at", () => {
    const r = mount("<p>alpha</p><p>beta</p><p>gamma</p>");
    const ps = r.querySelectorAll("p");
    selectFromTo(ps[0].firstChild!, 0, ps[2].firstChild!, 0);

    toggleList(r, "ul");

    // alpha + beta became one list; gamma stays a paragraph.
    expect(
      Array.from(r.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["alpha", "beta"]);
    expect(
      Array.from(r.querySelectorAll("p")).map((p) => p.textContent)
    ).toEqual(["gamma"]);
  });
});
