import { describe, it, expect, afterEach } from "vitest";
import { toggleList, indentListItem, outdentListItem } from "../formatting";
import { CHECKLIST_CLASS, checklistItemForNode } from "../checklist";

/**
 * Round-13 lists cluster:
 *  - #1 (HIGH): indenting/outdenting a checklist item created a bare <ul>, so the
 *    nested item became a dead, un-toggleable checkbox and lost its checked state
 *    on the next sanitize round-trip (the sanitizer only preserves <li> attrs
 *    inside ul.checklist).
 *  - #6 (MED): toggling a list OFF with only a subset of items selected un-listed
 *    the ENTIRE list instead of just the selected items.
 *  - #18 (MED): un-listing an item whose <li> holds a nested sublist moved the
 *    sublist INTO the new <p>, producing invalid <ul>-inside-<p>.
 */
let root: HTMLDivElement | null = null;

afterEach(() => {
  root?.remove();
  root = null;
  window.getSelection()?.removeAllRanges();
});

const setup = (html: string) => {
  root = document.createElement("div");
  root.contentEditable = "true";
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

const caretInto = (el: Element) => {
  const range = document.createRange();
  range.selectNodeContents(el.firstChild ?? el);
  range.collapse(true);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

const selectAcross = (startEl: Element, endEl: Element) => {
  const range = document.createRange();
  range.setStart(startEl.firstChild ?? startEl, 0);
  const endNode = endEl.firstChild ?? endEl;
  range.setEnd(endNode, endNode.textContent?.length ?? 0);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

describe("indentListItem preserves checklist semantics (#1)", () => {
  it("gives the nested sublist the checklist class so the item stays toggleable", () => {
    const r = setup(
      `<ul class="${CHECKLIST_CLASS}">` +
        `<li data-checked="false">A</li>` +
        `<li data-checked="true">B</li>` +
        `</ul>`
    );
    const itemB = r.querySelectorAll("li")[1]!;
    caretInto(itemB);

    expect(indentListItem(r)).toBe(true);

    // B is now nested under A…
    const nested = r.querySelector("li ul");
    expect(nested).not.toBeNull();
    // …in a list that still carries the checklist class…
    expect(nested!.classList.contains(CHECKLIST_CLASS)).toBe(true);
    // …its checked state is intact…
    expect(itemB.getAttribute("data-checked")).toBe("true");
    // …and it resolves as a live checklist item (checkbox works again).
    expect(checklistItemForNode(itemB)).toBe(itemB);
  });
});

describe("outdentListItem preserves checklist semantics (#1)", () => {
  it("keeps a re-nested following item inside a checklist list", () => {
    const r = setup(
      `<ul class="${CHECKLIST_CLASS}">` +
        `<li>A<ul class="${CHECKLIST_CLASS}">` +
        `<li data-checked="false">B</li>` +
        `<li data-checked="true">C</li>` +
        `</ul></li>` +
        `</ul>`
    );
    const itemB = Array.from(r.querySelectorAll("li")).find(
      (li) => li.firstChild?.textContent?.startsWith("B")
    )!;
    const itemC = Array.from(r.querySelectorAll("li")).find(
      (li) => li.textContent === "C"
    )!;
    caretInto(itemB);

    expect(outdentListItem(r)).toBe(true);

    // C followed B, so it re-nests under the now-outdented B. That new sublist
    // must be a checklist too, or C becomes a dead checkbox and loses its state.
    expect(itemC.getAttribute("data-checked")).toBe("true");
    expect(checklistItemForNode(itemC)).toBe(itemC);
  });
});

describe("toggleList off only un-lists the selected items (#6)", () => {
  it("leaves unselected items listed when a subset is toggled off", () => {
    const r = setup(
      "<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li></ul>"
    );
    const items = r.querySelectorAll("li");
    selectAcross(items[1]!, items[2]!); // items 2 and 3

    toggleList(r, "ul");

    // 2 and 3 are now paragraphs…
    const paras = Array.from(r.querySelectorAll("p")).map((p) => p.textContent);
    expect(paras).toEqual(["2", "3"]);
    // …while 1, 4, 5 remain list items.
    const stillListed = Array.from(r.querySelectorAll("li")).map(
      (li) => li.textContent
    );
    expect(stillListed).toEqual(["1", "4", "5"]);
  });
});

describe("un-listing an item with a nested sublist stays valid (#18)", () => {
  it("never puts a <ul> inside a <p>", () => {
    const r = setup(
      "<ul><li>Parent<ul><li>Child</li></ul></li><li>Sibling</li></ul>"
    );
    const items = r.querySelectorAll("li");
    const parent = items[0]!;
    const sibling = Array.from(items).find(
      (li) => li.textContent === "Sibling"
    )!;
    selectAcross(parent, sibling);

    toggleList(r, "ul");

    // No list may be nested inside a paragraph (invalid, re-splits on round-trip).
    expect(r.querySelector("p ul, p ol")).toBeNull();
    // Parent's own text became a paragraph…
    expect(
      Array.from(r.querySelectorAll("p")).some((p) =>
        p.textContent?.startsWith("Parent")
      )
    ).toBe(true);
    // …and the Child item survives as a real list item.
    expect(
      Array.from(r.querySelectorAll("li")).some(
        (li) => li.textContent === "Child"
      )
    ).toBe(true);
  });
});
