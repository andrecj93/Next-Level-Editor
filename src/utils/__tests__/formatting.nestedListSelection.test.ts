import { describe, it, expect, afterEach } from "vitest";
import { getBlocksInRange, toggleBlock, toggleList } from "../formatting";

/**
 * R23-11 — a selection spanning a bullet AND its own sub-bullet converted only
 * the parent, then split the sub-list out to the top level as an untouched
 * list.
 *
 * Root cause: `getBlocksInRange`'s #r16-4 leaf filter drops ANY block that
 * contains another collected block — including a parent <li> whose own text is
 * genuinely selected. The count then falls to 1, so `toggleBlock` leaves the
 * multi-block path and converts the single ancestor found at the caret.
 *
 * The leaf filter must stay for structural wrappers (a <div>/<td> that only
 * holds other blocks), which is what #r16-4 was actually about.
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
  return range;
};

const tags = (elements: Element[]) =>
  elements.map((el) => el.tagName.toLowerCase());

describe("getBlocksInRange keeps a parent list item with its own selected text", () => {
  it("returns BOTH the bullet and its selected sub-bullet", () => {
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    const range = selectFromTo(
      parentLi.firstChild!,
      0,
      childLi.firstChild!,
      5
    );

    const blocks = getBlocksInRange(range, r);

    expect(tags(blocks)).toEqual(["li", "li"]);
    expect(blocks[0]).toBe(parentLi);
    expect(blocks[1]).toBe(childLi);
  });

  it("still drops a structural wrapper that holds no selected text of its own (#r16-4)", () => {
    const r = mount("<div><p>hello</p><p>world</p></div>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    const range = selectFromTo(p1.firstChild!, 2, p2.firstChild!, 3);

    const blocks = getBlocksInRange(range, r);

    expect(tags(blocks)).toEqual(["p", "p"]);
    for (const a of blocks)
      for (const b of blocks) if (a !== b) expect(a.contains(b)).toBe(false);
  });

  it("still drops a cell that only wraps the selected block (#r16-4)", () => {
    const r = mount(
      "<table><tr><td><p>one</p></td><td><p>two</p></td></tr></table>"
    );
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    const range = selectFromTo(p1.firstChild!, 0, p2.firstChild!, 3);

    const blocks = getBlocksInRange(range, r);

    expect(tags(blocks)).toEqual(["p", "p"]);
  });

  it("keeps the leaf rule when the nested block is NOT a sub-list", () => {
    // A <p> inside an <li> is a paste artefact: converting the <li> would
    // swallow it (no drain path), so the ancestor must still be dropped.
    const r = mount("<ul><li>Parent<p>stray</p></li></ul>");
    const li = r.querySelector("li")!;
    const stray = r.querySelector("p")!;
    const range = selectFromTo(li.firstChild!, 0, stray.firstChild!, 5);

    const blocks = getBlocksInRange(range, r);

    expect(tags(blocks)).toEqual(["p"]);
  });
});

describe("toggleBlock over a bullet and its sub-bullet (R23-11)", () => {
  it("converts BOTH items and leaves no orphan list behind", () => {
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    selectFromTo(parentLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleBlock(r, "h1");

    const headings = Array.from(r.querySelectorAll("h1"));
    expect(headings.map((h) => h.textContent)).toEqual(["Parent", "Child"]);
    expect(r.querySelectorAll("li")).toHaveLength(0);
    expect(r.querySelectorAll("ul")).toHaveLength(0);
  });

  it("converting the pair to paragraphs never leaves a <p> inside the <ul>", () => {
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    selectFromTo(parentLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleBlock(r, "p");

    expect(r.querySelector("ul > p, ol > p")).toBeNull();
    expect(Array.from(r.querySelectorAll("p")).map((p) => p.textContent)).toEqual(
      ["Parent", "Child"]
    );
    expect(r.querySelectorAll("li")).toHaveLength(0);
  });

  it("two sibling bullets still both convert (control)", () => {
    const r = mount("<ul><li>One</li><li>Two</li></ul>");
    const [first, second] = Array.from(r.querySelectorAll("li"));
    selectFromTo(first.firstChild!, 0, second.firstChild!, 3);

    toggleBlock(r, "h2");

    expect(Array.from(r.querySelectorAll("h2")).map((h) => h.textContent)).toEqual(
      ["One", "Two"]
    );
    expect(r.querySelectorAll("li")).toHaveLength(0);
  });
});

describe("toggleList type switch over a bullet and its sub-bullet (R28-2)", () => {
  it("retags the touched sub-list too, not just the outer list", () => {
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    selectFromTo(parentLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleList(r, "ol");

    // Both selected levels are numbered now; no <ul> left anywhere.
    expect(r.querySelectorAll("ul")).toHaveLength(0);
    expect(r.querySelectorAll("ol")).toHaveLength(2);
    expect(r.querySelector("ol > li")?.textContent).toContain("Parent");
    expect(r.querySelector("ol ol > li")?.textContent).toBe("Child");
  });

  it("a selection wholly inside the sub-list retags only that level (control)", () => {
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const childLi = Array.from(r.querySelectorAll("li"))[1];
    selectFromTo(childLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleList(r, "ol");

    // The outer list is untouched; only the nested one switched type.
    expect(r.querySelectorAll("ul")).toHaveLength(1);
    expect(r.querySelector("ul > li")?.textContent).toContain("Parent");
    expect(r.querySelector("ul ol > li")?.textContent).toBe("Child");
  });

  it("an untouched sibling sub-list keeps its type (control)", () => {
    // Selection spans the parent's text and the FIRST sub-list only; the
    // second sub-list is outside the selection and must stay a <ul>.
    const r = mount(
      "<ul><li>Parent<ul><li>Child</li></ul><ul><li>Other</li></ul></li></ul>"
    );
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    selectFromTo(parentLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleList(r, "ol");

    const remainingUl = r.querySelectorAll("ul");
    expect(remainingUl).toHaveLength(1);
    expect(remainingUl[0].textContent).toBe("Other");
    expect(r.querySelector("ol ol > li")?.textContent).toBe("Child");
  });

  it("toggle-off over the pair keeps the sub-list listed (locks the design)", () => {
    // Deliberate semantics (commented in toggleList): un-listing the parent
    // hoists its sub-list out INTACT — nested items are not flattened. This
    // pins that behavior so the R28-2 retag change cannot drift it.
    const r = mount("<ul><li>Parent<ul><li>Child</li></ul></li></ul>");
    const [parentLi, childLi] = Array.from(r.querySelectorAll("li"));
    selectFromTo(parentLi.firstChild!, 0, childLi.firstChild!, 5);

    toggleList(r, "ul");

    expect(r.querySelector("p")?.textContent).toBe("Parent");
    expect(r.querySelectorAll("ul > li")).toHaveLength(1);
    expect(r.querySelector("ul > li")?.textContent).toBe("Child");
    expect(r.querySelector("li li")).toBeNull();
  });
});
