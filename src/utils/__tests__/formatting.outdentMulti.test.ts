import { describe, it, expect, beforeEach } from "vitest";
import { outdentListItem, indentListItem } from "../formatting";

/**
 * R23-12: Shift+Tab outdented only the FIRST of several selected list items,
 * while Tab already indents every one of them. outdentListItem resolved a
 * single item from range.startContainer and never looked at the other selected
 * siblings — and then the "following items travel with it" rule re-nested the
 * remaining SELECTED items underneath the one that moved. Selecting B, C, D and
 * pressing Shift+Tab left two of the three still indented, now under a
 * different parent.
 */
let root: HTMLElement;

const selectAcross = (from: Node, to: Node) => {
  const range = document.createRange();
  range.setStart(from, 0);
  range.setEnd(to, (to.textContent || "").length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

const caretIn = (node: Node) => {
  const range = document.createRange();
  range.setStart(node, 0);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

/** Item text by nesting depth, e.g. { "A": 0, "B": 1 }. */
const depths = (): Record<string, number> => {
  const out: Record<string, number> = {};
  root.querySelectorAll("li").forEach((li) => {
    let depth = 0;
    let node: HTMLElement | null = li.parentElement;
    while (node && node !== root) {
      if (["UL", "OL"].includes(node.tagName)) depth += 1;
      node = node.parentElement;
    }
    // Own text only, ignoring nested items.
    const text = Array.from(li.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join("")
      .trim();
    if (text) out[text] = depth - 1;
  });
  return out;
};

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe("Shift+Tab outdents every selected item (#R23-12)", () => {
  const NESTED =
    "<ul><li>A<ul><li>B</li><li>C</li><li>D</li></ul></li></ul>";

  it("outdents all three selected sub-items", () => {
    root.innerHTML = NESTED;
    const items = Array.from(root.querySelectorAll("li"));
    const [, b, , d] = items;
    selectAcross(b.firstChild!, d.firstChild!);

    expect(outdentListItem(root)).toBe(true);

    expect(depths()).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    expect(root.querySelectorAll("li")).toHaveLength(4);
  });

  it("keeps the items in document order", () => {
    root.innerHTML = NESTED;
    const items = Array.from(root.querySelectorAll("li"));
    selectAcross(items[1].firstChild!, items[3].firstChild!);

    outdentListItem(root);

    expect(
      Array.from(root.querySelectorAll("li")).map((li) =>
        (li.textContent || "").trim()
      )
    ).toEqual(["A", "B", "C", "D"]);
  });

  it("still re-nests only the items AFTER the selection", () => {
    // Google Docs semantics, and the behaviour the single-item path already
    // had: outdenting B alone in "A > [B, C, D]" gives "A, B > [C, D]".
    root.innerHTML = NESTED;
    const items = Array.from(root.querySelectorAll("li"));
    caretIn(items[1].firstChild!);

    outdentListItem(root);

    expect(depths()).toEqual({ A: 0, B: 0, C: 1, D: 1 });
  });

  it("outdents a two-item selection and re-nests the remaining tail", () => {
    root.innerHTML = NESTED;
    const items = Array.from(root.querySelectorAll("li"));
    selectAcross(items[1].firstChild!, items[2].firstChild!);

    outdentListItem(root);

    expect(depths()).toEqual({ A: 0, B: 0, C: 0, D: 1 });
  });

  it("mirrors Tab, which already indents every selected item", () => {
    // Symmetry check: indent all three, then outdent all three, and the list
    // must be back where it started.
    root.innerHTML = "<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>";
    const items = Array.from(root.querySelectorAll("li"));
    selectAcross(items[1].firstChild!, items[3].firstChild!);

    expect(indentListItem(root)).toBe(true);
    expect(depths()).toEqual({ A: 0, B: 1, C: 1, D: 1 });

    const nested = Array.from(root.querySelectorAll("li")).filter((li) =>
      ["B", "C", "D"].includes((li.textContent || "").trim())
    );
    selectAcross(nested[0].firstChild!, nested[2].firstChild!);
    expect(outdentListItem(root)).toBe(true);

    expect(depths()).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });
});
