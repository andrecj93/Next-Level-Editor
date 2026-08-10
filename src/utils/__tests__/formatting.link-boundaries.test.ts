import { describe, it, expect, afterEach } from "vitest";
import { insertLink } from "../formatting";

/**
 * Round-13 links cluster:
 *  - #2 (HIGH): applying a link to a selection that STRADDLES an existing link's
 *    boundary (starts inside the <a>, ends outside) produced nested anchors,
 *    which the parser collapses to an EMPTY new link on the next round-trip —
 *    silent data loss (the new link vanishes and the trailing text de-links).
 *  - #17 (MED): applying a link across multiple block elements wrapped the <p>
 *    blocks inside one <a> (<a><p>…</p><p>…</p></a>) — invalid, re-splits on
 *    round-trip.
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

const select = (
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

const anchorByHref = (r: HTMLElement, href: string) =>
  Array.from(r.querySelectorAll("a")).find(
    (a) => a.getAttribute("href") === href
  );

describe("insertLink never nests anchors on a straddling selection (#2)", () => {
  it("splits the old link and links only the selected slice", () => {
    const r = setup('<p><a href="https://old.com">Hello</a> world</p>');
    const p = r.querySelector("p")!;
    const anchorText = r.querySelector("a")!.firstChild!; // "Hello"
    const worldText = p.lastChild!; // " world"
    select(anchorText, 2, worldText, worldText.textContent!.length);

    insertLink(r, "https://new.com");

    // No nested anchors anywhere.
    expect(r.querySelector("a a")).toBeNull();
    expect(r.querySelectorAll("a")).toHaveLength(2);
    // The new link covers exactly the selected text and is NOT empty.
    const fresh = anchorByHref(r, "https://new.com");
    expect(fresh).toBeTruthy();
    expect(fresh!.textContent).toBe("llo world");
    // The un-selected prefix of the old link stays linked to the old href.
    const old = anchorByHref(r, "https://old.com");
    expect(old).toBeTruthy();
    expect(old!.textContent).toBe("He");
  });
});

describe("insertLink across blocks links each block inline (#17)", () => {
  it("wraps each block's selected slice in its own <a>, never a <p> inside <a>", () => {
    const r = setup("<p>foo</p><p>bar</p>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    select(p1.firstChild!, 1, p2.firstChild!, 2); // "oo" … "ba"

    insertLink(r, "https://new.com");

    // No anchor may wrap a block element.
    expect(r.querySelector("a p, a div, a h1, a li")).toBeNull();
    // One inline anchor per block, each carrying the new href.
    const a1 = p1.querySelector("a");
    const a2 = p2.querySelector("a");
    expect(a1?.textContent).toBe("oo");
    expect(a2?.textContent).toBe("ba");
    expect(a1?.getAttribute("href")).toBe("https://new.com");
    expect(a2?.getAttribute("href")).toBe("https://new.com");
    // Surrounding text is untouched.
    expect(p1.textContent).toBe("foo");
    expect(p2.textContent).toBe("bar");
  });
});
