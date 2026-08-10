import { describe, it, expect, afterEach } from "vitest";
import { applyInlineStyle, insertLink, getBlocksInRange } from "../formatting";

/**
 * r16 #2/#3/#4 — regressions/gaps in the r15 structural fixes:
 *  - #4: getBlocksInRange collected ancestor AND descendant blocks (a wrapper
 *    <div>/<td> plus its inner <p>s), breaking the disjoint-subtree invariant
 *    every per-block path assumes. It now keeps only LEAF blocks.
 *  - #3: with nested blocks, linkSelection processed the ancestor first, whose
 *    extraction truncated the end text node — the descendant's saved endOffset
 *    then overflowed and setEnd threw an uncaught IndexSizeError mid-mutation.
 *  - #2: the toggle-OFF branch of applyInlineStyle ran on the RAW range:
 *    triple-click un-bold was a no-op (plus an empty <strong> husk), and the
 *    parent-level representation duplicated paragraphs.
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

describe("getBlocksInRange keeps only leaf blocks (#4)", () => {
  it("a wrapper div is not returned alongside its inner paragraphs", () => {
    const r = mount("<div><p>hello</p><p>world</p></div>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    const range = selectFromTo(p1.firstChild!, 2, p2.firstChild!, 3);

    const blocks = getBlocksInRange(range, r);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].tagName).toBe("P");
    expect(blocks[1].tagName).toBe("P");
    // Disjointness: no returned block contains another.
    for (const a of blocks)
      for (const b of blocks) if (a !== b) expect(a.contains(b)).toBe(false);
  });
});

describe("cross-paragraph commands inside a wrapper stay valid (#3/#4)", () => {
  it("insertLink across two <p>s in a <div> does not throw and links per block", () => {
    const r = mount("<div><p>hello</p><p>world</p></div>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    selectFromTo(p1.firstChild!, 2, p2.firstChild!, 3);

    expect(() => insertLink(r, "https://x.test")).not.toThrow();

    // One inline anchor per paragraph; no <a> wrapping a <p>.
    expect(r.querySelector("a p")).toBeNull();
    const anchors = r.querySelectorAll("a");
    expect(anchors).toHaveLength(2);
    expect(anchors[0].textContent).toBe("llo");
    expect(anchors[1].textContent).toBe("wor");
    expect(r.textContent).toBe("helloworld");
  });

  it("bold across two <p>s in a <div> never nests blocks in the inline tag", () => {
    const r = mount("<div><p>hello</p><p>world</p></div>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    selectFromTo(p1.firstChild!, 2, p2.firstChild!, 3);

    applyInlineStyle(r, "strong");

    expect(r.querySelector("strong p, strong div")).toBeNull();
    expect(r.querySelectorAll("p")).toHaveLength(2);
    expect(p1.querySelector("strong")?.textContent).toBe("llo");
    expect(p2.querySelector("strong")?.textContent).toBe("wor");
  });
});

describe("toggle-OFF honours the boundary representation (#2)", () => {
  it("triple-click un-bold removes bold in ONE press, no husk", () => {
    const r = mount("<p><strong>Hello</strong></p><p>World</p>");
    const boldText = r.querySelector("strong")!.firstChild!;
    const worldText = r.querySelectorAll("p")[1].firstChild!;
    selectFromTo(boldText, 0, worldText, 0); // triple-click shape

    applyInlineStyle(r, "strong");

    expect(r.querySelectorAll("strong")).toHaveLength(0);
    expect(r.textContent).toBe("HelloWorld");
    expect(r.querySelectorAll("p")).toHaveLength(2);
  });

  it("parent-level end representation un-bolds without duplicating paragraphs", () => {
    const r = mount("<p><strong>Hello</strong></p><p>World</p>");
    const boldText = r.querySelector("strong")!.firstChild!;
    selectFromTo(boldText, 0, r, 1); // end at the boundary between the two <p>s

    applyInlineStyle(r, "strong");

    expect(r.querySelectorAll("strong")).toHaveLength(0);
    expect(r.querySelectorAll("p")).toHaveLength(2);
    expect(r.textContent).toBe("HelloWorld");
  });
});
