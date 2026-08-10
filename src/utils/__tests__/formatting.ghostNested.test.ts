import { describe, it, expect, afterEach } from "vitest";
import { applyInlineStyle, getBlockSlicesInRange } from "../formatting";

/**
 * r18 — a LEAF block can still contain an UNtouched nested block. The old leaf
 * path clamped the range straight to the leaf and extractContents ripped the
 * nested list structure: selecting only "text" in
 * <li>text<ul><li>sub</li></ul></li> (end boundary parked at the sublist's
 * (sub, 0)) cloned a ghost <ul><li></li></ul> into the wrapper and duplicated
 * the sublist. Run-slicing every block — breaking each inline run on any
 * STRUCTURAL child (a nested list/table even when its inner blocks weren't
 * collected) — keeps the operation to the parent's own inline content.
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

describe("styling a parent's text near an untouched sublist (#r18 ghost)", () => {
  it("bolding only the parent text does not clone or duplicate the sublist", () => {
    const r = mount("<ul><li>text<ul><li>sub</li></ul></li></ul>");
    const outer = r.querySelector("li")!.firstChild!; // "text"
    const subLi = r.querySelector("ul ul li")!;
    // End parked at the sublist item's (sub, 0): selects only "text".
    selectFromTo(outer, 0, subLi.firstChild!, 0);

    applyInlineStyle(r, "strong");

    // "text" is bolded…
    expect(r.querySelector("li > strong")?.textContent).toBe("text");
    // …and the sublist is intact: exactly one sub-list, one "sub" item, no
    // empty ghost <li>.
    expect(r.querySelectorAll("ul ul").length).toBe(1);
    const subItems = Array.from(r.querySelectorAll("ul ul li"));
    expect(subItems).toHaveLength(1);
    expect(subItems[0].textContent).toBe("sub");
    expect(
      Array.from(r.querySelectorAll("li")).filter(
        (li) => !(li.textContent ?? "")
      )
    ).toHaveLength(0);
  });

  it("the slice for such a selection is exactly the parent text, never the sublist", () => {
    const r = mount("<ul><li>text<ul><li>sub</li></ul></li></ul>");
    const outer = r.querySelector("li")!.firstChild!;
    const subLi = r.querySelector("ul ul li")!;
    const range = selectFromTo(outer, 0, subLi.firstChild!, 0);

    const slices = getBlockSlicesInRange(range, r).map((s) => s.toString());
    expect(slices).toEqual(["text"]);
  });

  it("a paragraph with a nested table: bolding the lead text leaves the table intact", () => {
    const r = mount(
      "<div>lead<table><tbody><tr><td>cell</td></tr></tbody></table></div>"
    );
    const lead = r.querySelector("div")!.firstChild!; // "lead"
    const cell = r.querySelector("td")!;
    selectFromTo(lead, 0, cell.firstChild!, 0);

    applyInlineStyle(r, "strong");

    expect(r.querySelector("div > strong")?.textContent).toBe("lead");
    // Table untouched: still one row, one cell with "cell", no strong inside.
    expect(r.querySelectorAll("td")).toHaveLength(1);
    expect(r.querySelector("td")!.textContent).toBe("cell");
    expect(r.querySelector("td strong")).toBeNull();
  });

  it("a malformed <strong> wrapping text + sublist preserves content and never throws", () => {
    // An inline element directly wrapping a block (<strong><ul>…</ul></strong>)
    // is invalid HTML the sanitizer never emits — reachable only by external
    // innerHTML tampering. The achievable guarantee on such input is that the
    // operation does not throw and loses no visible text; perfect structural
    // normalization of malformed input is out of scope.
    const r = mount(
      "<ul><li><strong>text<ul><li>sub</li></ul></strong></li></ul>"
    );
    const t = r.querySelector("strong")!.firstChild!;
    const subLi = r.querySelector("ul ul li")!.firstChild!;
    selectFromTo(t, 0, subLi, 3);

    expect(() => applyInlineStyle(r, "strong")).not.toThrow();
    expect(r.textContent).toBe("textsub");
  });

  it("regression: normal nested-list bold (all touched) still styles every run", () => {
    const r = mount("<ul><li>head<ul><li>sub</li></ul>tail</li></ul>");
    const head = r.querySelector("li")!.firstChild!;
    const tail = r.querySelector("li")!.lastChild!;
    selectFromTo(head, 0, tail, 4);

    applyInlineStyle(r, "strong");

    const bolded = Array.from(r.querySelectorAll("strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("head");
    expect(bolded).toContain("sub");
    expect(bolded).toContain("tail");
  });
});
