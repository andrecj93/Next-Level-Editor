import { describe, it, expect, afterEach } from "vitest";
import { insertLink, findLinkForRange } from "../formatting";

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

describe('editing a link preserves the writing position', () => {
  it.each(['previous-text-end', 'parent-start', 'whole-anchor'])('recognizes a link selected from %s', boundary => {
    const r = setup('<p>See <a href="https://old.com"><em>harbor map</em></a> today.</p>');
    const p = r.querySelector('p')!;
    const anchor = r.querySelector('a')!;
    const text = r.querySelector('em')!.firstChild!;
    const range = document.createRange();
    if (boundary === 'previous-text-end') range.setStart(p.firstChild!, 4);
    else range.setStart(p, 1);
    if (boundary === 'whole-anchor') range.setEnd(p, 2);
    else range.setEnd(text, 6);
    const selection = window.getSelection()!;
    selection.removeAllRanges(); selection.addRange(range);
    expect(findLinkForRange(r, range)).toBe(anchor);
    insertLink(r, 'https://new.com');
    expect(r.querySelectorAll('a')).toHaveLength(1);
    expect(anchor.getAttribute('href')).toBe('https://new.com');
    expect(anchor.textContent).toBe('harbor map');
    expect(selection.toString()).toBe(boundary === 'whole-anchor' ? 'harbor map' : 'harbor');
  });

  it('preserves a backward selection inside the caption', () => {
    const r = setup('<p><a href="https://old.com"><em>harbor map</em></a></p>');
    const text = r.querySelector('em')!.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(text, 6, text, 0);
    insertLink(r, 'https://new.com');
    expect(selection.toString()).toBe('harbor');
    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(6);
    expect(selection.focusOffset).toBe(0);
    expect(r.querySelector('em')!.textContent).toBe('harbor map');
  });

  it('resumes after an explicitly replaced caption', () => {
    const r = setup('<p><a href="https://old.com">harbor map</a> today.</p>');
    const anchor = r.querySelector('a')!;
    select(anchor.firstChild!, 3, anchor.firstChild!, 3);
    insertLink(r, 'https://new.com', 'a new map');
    const selection = window.getSelection()!;
    expect(anchor.textContent).toBe('a new map');
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorNode).toBe(anchor.parentNode);
    expect(selection.anchorOffset).toBe(1);
  });

  it('keeps inline marks and caret when a supplied caption is unchanged', () => {
    const r = setup('<p><a href="https://old.com"><em>harbor map</em></a></p>');
    const text = r.querySelector('em')!.firstChild!;
    select(text, 3, text, 3);
    insertLink(r, 'https://new.com', 'harbor map');
    expect(r.querySelector('em')!.textContent).toBe('harbor map');
    expect(window.getSelection()!.anchorNode).toBe(text);
    expect(window.getSelection()!.anchorOffset).toBe(3);
  });
});

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
