import { describe, it, expect, beforeEach } from "vitest";
import { toggleBlock } from "../formatting";

/**
 * R23-13: converting (or un-listing) a MIDDLE item of a numbered list restarted
 * the numbering of every item below it. unnestListItem builds the trailing list
 * with document.createElement(tag) and copies only the checklist class — never
 * the `start` ordinal — so "1. One / 2. Two / 3. Three / 4. Four", with Two
 * converted, rendered "1. One / Two / 1. Three / 2. Four". handleEnterInListItem
 * already sets newList.start for the Enter-on-empty split; this path forgot to.
 */
let root: HTMLElement;

const caretIn = (node: Node) => {
  const range = document.createRange();
  range.setStart(node, 0);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe("converting a middle list item preserves numbering (#R23-13)", () => {
  it("continues the ordinal on the items below", () => {
    root.innerHTML =
      "<ol><li>One</li><li>Two</li><li>Three</li><li>Four</li></ol>";
    const two = root.querySelectorAll("li")[1];
    caretIn(two.firstChild!);

    // Convert "Two" to a heading — the unnestListItem path. #R23-13
    toggleBlock(root, "h2", "p");

    const lists = root.querySelectorAll("ol");
    expect(lists).toHaveLength(2);
    // The first list keeps "One"; the trailing list continues at 3.
    expect(lists[0].textContent).toBe("One");
    const trailing = lists[1] as HTMLOListElement;
    expect(
      Array.from(trailing.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["Three", "Four"]);
    // start=3 so the browser renders 3. Three / 4. Four, not 1. Three.
    expect(trailing.start).toBe(3);
  });

  it("leaves an unordered list without a start ordinal", () => {
    root.innerHTML = "<ul><li>a</li><li>b</li><li>c</li></ul>";
    const b = root.querySelectorAll("li")[1];
    caretIn(b.firstChild!);

    toggleBlock(root, "h2", "p");

    const lists = root.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    // No spurious start attribute on a <ul> — it has no numbering.
    expect(lists[1].hasAttribute("start")).toBe(false);
  });

  it("does not add a start when the converted item is the LAST one", () => {
    root.innerHTML = "<ol><li>One</li><li>Two</li></ol>";
    const two = root.querySelectorAll("li")[1];
    caretIn(two.firstChild!);

    toggleBlock(root, "h2", "p");

    // No trailing list at all — nothing after "Two".
    expect(root.querySelectorAll("ol")).toHaveLength(1);
    expect(root.querySelector("ol")!.textContent).toBe("One");
  });

  it("counts from the ordinal the first list already declared", () => {
    // A list that itself starts at 10: converting its 2nd item makes the tail
    // continue at 12, not 2.
    root.innerHTML =
      '<ol start="10"><li>Ten</li><li>Eleven</li><li>Twelve</li></ol>';
    const eleven = root.querySelectorAll("li")[1];
    caretIn(eleven.firstChild!);

    toggleBlock(root, "h2", "p");

    const trailing = root.querySelectorAll("ol")[1] as HTMLOListElement;
    expect(trailing.start).toBe(12);
  });
});
