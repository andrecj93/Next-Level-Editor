import { describe, it, expect, afterEach } from "vitest";
import { applyInlineStyle, insertLink } from "../formatting";
import { applyTextColor } from "../commands";

/**
 * r15 #4/#9 (HIGH): batch 67 correctly EXCLUDES the boundary block a selection
 * merely ends at ((nextBlock.firstText, 0) — the triple-click representation).
 * But the single-block paths still operated on the ORIGINAL range, whose
 * physical end sits inside that excluded block — extractContents() then ripped
 * across the boundary, nesting block clones inside the inline element
 * (<strong><p>…</p></strong>; <strong> as a direct child of <tr> with partial
 * <td> clones). The working range is now CLAMPED to the one genuinely-touched
 * block.
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

describe("single-block commands clamp the boundary-representation range", () => {
  it("Bold on a triple-click selection never nests blocks in the inline tag (#4)", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    selectFromTo(p1.firstChild!, 0, p2.firstChild!, 0);

    applyInlineStyle(r, "strong");

    expect(r.querySelector("strong p")).toBeNull();
    expect(r.querySelectorAll("p")).toHaveLength(2);
    expect(r.querySelector("p strong")?.textContent).toBe("Hello");
    // World stays outside any strong.
    expect(r.querySelectorAll("p")[1].querySelector("strong")).toBeNull();
    expect(r.textContent).toBe("HelloWorld");
  });

  it("Bold across a cell boundary never rips the table row (#9)", () => {
    const r = mount(
      "<table><tbody><tr><td>aa</td><td>bb</td></tr></tbody></table>"
    );
    const [td1, td2] = Array.from(r.querySelectorAll("td"));
    selectFromTo(td1.firstChild!, 1, td2.firstChild!, 0);

    applyInlineStyle(r, "strong");

    // The row structure is intact: two cells, no <strong> child of <tr>.
    const row = r.querySelector("tr")!;
    expect(row.querySelectorAll(":scope > td")).toHaveLength(2);
    expect(row.querySelector(":scope > strong")).toBeNull();
    // The second character of td1 got bolded; td2 untouched.
    expect(td1.textContent).toBe("aa");
    expect(td1.querySelector("strong")?.textContent).toBe("a");
    expect(td2.innerHTML).toBe("bb");
  });

  it("Text color on a triple-click selection stays inside the first block", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    selectFromTo(p1.firstChild!, 0, p2.firstChild!, 0);

    applyTextColor(r, "rgb(255, 0, 0)");

    expect(r.querySelector("span p")).toBeNull();
    expect(r.querySelectorAll("p")).toHaveLength(2);
    const colored = r.querySelector<HTMLElement>("p span");
    expect(colored?.textContent).toBe("Hello");
    expect(p2.querySelector("span")).toBeNull();
  });

  it("Link on a triple-click selection wraps only the first block's text", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    selectFromTo(p1.firstChild!, 0, p2.firstChild!, 0);

    insertLink(r, "https://x.com");

    expect(r.querySelector("a p")).toBeNull();
    expect(r.querySelectorAll("a")).toHaveLength(1);
    expect(r.querySelector("p a")?.textContent).toBe("Hello");
    expect(p2.querySelector("a")).toBeNull();
  });

  it("BARE-ROOT inline content (no block wrapper) still gets styled", () => {
    // Typing into an empty contenteditable can produce a bare text node with no
    // <p> — getBlocksInRange finds zero blocks there, and the first clamp fix
    // turned every formatting command into a silent no-op (21 e2e failures).
    const r = mount("hello world");
    const text = r.firstChild!;
    selectFromTo(text, 0, text, 5);

    applyInlineStyle(r, "strong");

    expect(r.querySelector("strong")?.textContent).toBe("hello");
    expect(r.textContent).toBe("hello world");
  });

  it("BARE-ROOT text color still applies", () => {
    const r = mount("hello world");
    const text = r.firstChild!;
    selectFromTo(text, 6, text, 11);

    applyTextColor(r, "rgb(255, 0, 0)");

    const span = r.querySelector<HTMLElement>("span");
    expect(span?.textContent).toBe("world");
    expect(span?.style.color).toBe("rgb(255, 0, 0)");
  });

  it("BARE-ROOT link insertion still wraps the selection", () => {
    const r = mount("hello world");
    const text = r.firstChild!;
    selectFromTo(text, 0, text, 5);

    insertLink(r, "https://x.com");

    expect(r.querySelector("a")?.textContent).toBe("hello");
  });

  it("a selection touching NO block content is a structural no-op", () => {
    const r = mount("<p>Hello</p><p>World</p>");
    const [p1, p2] = Array.from(r.querySelectorAll("p"));
    const before = r.innerHTML;
    // From the very end of p1's text to the very start of p2's text — zero
    // characters captured in either block.
    selectFromTo(p1.firstChild!, 5, p2.firstChild!, 0);

    applyInlineStyle(r, "strong");

    expect(r.innerHTML).toBe(before);
  });
});
