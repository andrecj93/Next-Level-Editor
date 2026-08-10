import { describe, it, expect, afterEach } from "vitest";
import { toggleList } from "../formatting";
import { applyFontSize } from "../commands";

/**
 * r19 — two pre-existing multi-block structural bugs surfaced by the round-19
 * hunt (NOT introduced by the audited batches 82-84):
 *
 *  - applyFontSize("normal") across ≥2 blocks ran extractContents on the RAW
 *    multi-block range, cloning the partially-contained <p>s and leaving ghost
 *    empty paragraphs (with orphaned emptied sized spans) bracketing the
 *    content. The size-APPLY path already sliced per block; CLEAR must too.
 *
 *  - toggleList across a blockquote's paragraphs and an EXTERNAL paragraph
 *    wrapped every leaf block into one <ul> placed at blocks[0] — which sits
 *    inside the blockquote — relocating the external (non-quoted) paragraph
 *    into the quote. Blocks must be grouped by parent so a list never crosses a
 *    structural boundary.
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

describe("applyFontSize('normal') across blocks leaves no ghosts (#r19-1)", () => {
  it("clearing size across two sized paragraphs keeps exactly two clean paragraphs", () => {
    const r = mount(
      '<p><span style="font-size: 1.75em;">aaa</span></p>' +
        '<p><span style="font-size: 1.75em;">bbb</span></p>'
    );
    const aaa = r.querySelector("span")!.firstChild!;
    const bbb = r.querySelectorAll("span")[1]!.firstChild!;
    selectFromTo(aaa, 0, bbb, 3);

    applyFontSize(r, "normal");

    expect(r.querySelectorAll("p")).toHaveLength(2);
    expect(Array.from(r.querySelectorAll("p")).map((p) => p.textContent)).toEqual(
      ["aaa", "bbb"]
    );
    // No leftover sized spans, empty or otherwise.
    expect(r.querySelectorAll('span[style*="font-size"]')).toHaveLength(0);
    // No empty paragraphs injected.
    expect(
      Array.from(r.querySelectorAll("p")).filter((p) => !(p.textContent ?? ""))
    ).toHaveLength(0);
  });

  it("clearing size across two PLAIN paragraphs does not double them", () => {
    const r = mount("<p>aaa</p><p>bbb</p>");
    const aaa = r.querySelector("p")!.firstChild!;
    const bbb = r.querySelectorAll("p")[1]!.firstChild!;
    selectFromTo(aaa, 0, bbb, 3);

    applyFontSize(r, "normal");

    expect(r.querySelectorAll("p")).toHaveLength(2);
    expect(r.textContent).toBe("aaabbb");
  });

  it("clearing size on a single sized paragraph still works", () => {
    const r = mount('<p><span style="font-size: 1.75em;">solo</span></p>');
    const solo = r.querySelector("span")!.firstChild!;
    selectFromTo(solo, 0, solo, 4);

    applyFontSize(r, "normal");

    expect(r.querySelectorAll('span[style*="font-size"]')).toHaveLength(0);
    expect(r.textContent).toBe("solo");
    expect(r.querySelectorAll("p")).toHaveLength(1);
  });
});

describe("toggleList never crosses a structural boundary (#r19-2)", () => {
  it("a selection spanning a blockquote and an external paragraph keeps them separate", () => {
    const r = mount("<blockquote><p>a</p><p>b</p></blockquote><p>c</p>");
    const a = r.querySelector("blockquote p")!.firstChild!;
    const c = r.querySelectorAll("p")[2]!.firstChild!;
    selectFromTo(a, 0, c, 1);

    toggleList(r, "ul");

    // "c" stays OUTSIDE the blockquote — never relocated into the quote.
    expect(r.querySelector("blockquote")!.textContent).toBe("ab");
    expect(r.querySelector("blockquote ul")).not.toBeNull();
    // The external paragraph became its own list at the root level.
    const rootLists = Array.from(r.children).filter(
      (el) => el.tagName.toLowerCase() === "ul"
    );
    expect(rootLists).toHaveLength(1);
    expect(rootLists[0].textContent).toBe("c");
    expect(r.textContent).toBe("abc");
  });

  it("the ordinary case (sibling paragraphs) still makes one list", () => {
    const r = mount("<p>one</p><p>two</p><p>three</p>");
    const one = r.querySelector("p")!.firstChild!;
    const three = r.querySelectorAll("p")[2]!.firstChild!;
    selectFromTo(one, 0, three, 5);

    toggleList(r, "ul");

    const lists = r.querySelectorAll("ul");
    expect(lists).toHaveLength(1);
    expect(Array.from(lists[0].children).map((li) => li.textContent)).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("across two direct-text table cells the table survives — list goes INSIDE each cell (#r20-1)", () => {
    const r = mount(
      "<table><tbody><tr><td>alpha</td><td>beta</td></tr></tbody></table>"
    );
    const alpha = r.querySelectorAll("td")[0]!.firstChild!;
    const beta = r.querySelectorAll("td")[1]!.firstChild!;
    selectFromTo(alpha, 0, beta, 4);

    toggleList(r, "ul");

    // The table is intact — cells preserved, no bare <ul> directly inside <tr>.
    expect(r.querySelectorAll("td")).toHaveLength(2);
    expect(r.querySelector("tr > ul, tr > ol")).toBeNull();
    // Each cell's content became a list inside it.
    expect(r.querySelectorAll("td ul")).toHaveLength(2);
    expect(r.querySelectorAll("td")[0].textContent).toBe("alpha");
    expect(r.querySelectorAll("td")[1].textContent).toBe("beta");
    // Survives a parse round-trip (what v-model persist does) without collapse.
    const rt = document.createElement("div");
    rt.innerHTML = r.innerHTML;
    expect(rt.querySelectorAll("td")).toHaveLength(2);
    expect(rt.querySelector("tr > ul")).toBeNull();
  });

  it("header <th> cells are preserved the same way (#r20-1)", () => {
    const r = mount(
      "<table><thead><tr><th>H1</th><th>H2</th></tr></thead></table>"
    );
    const h1 = r.querySelectorAll("th")[0]!.firstChild!;
    const h2 = r.querySelectorAll("th")[1]!.firstChild!;
    selectFromTo(h1, 0, h2, 2);

    toggleList(r, "ol");

    expect(r.querySelectorAll("th")).toHaveLength(2);
    expect(r.querySelector("tr > ul, tr > ol")).toBeNull();
    expect(r.querySelectorAll("th ol")).toHaveLength(2);
  });

  it("a CARET in a direct-text cell lists that cell, not a split bullet (#r21-2)", () => {
    const r = mount(
      "<table><tbody><tr><td>Name</td><td>Role</td></tr></tbody></table>"
    );
    const role = r.querySelectorAll("td")[1]!.firstChild!;
    const caret = document.createRange();
    caret.setStart(role, 2);
    caret.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(caret);

    toggleList(r, "ul");

    // The cell's content became a list INSIDE the cell; the table is intact.
    expect(r.querySelectorAll("td")).toHaveLength(2);
    expect(r.querySelector("tr > ul, tr > ol")).toBeNull();
    expect(r.querySelectorAll("td")[1].querySelector("ul")).not.toBeNull();
    expect(r.querySelectorAll("td")[1].textContent).toBe("Role");
  });

  it("a cross-cell selection into a cell that ALREADY has a list keeps the table (#r21-1)", () => {
    const r = mount(
      "<table><tbody>" +
        "<tr><td>Name</td><td><ul><li>alpha</li></ul></td></tr>" +
        "<tr><td>Role</td><td>dev</td></tr>" +
        "</tbody></table>"
    );
    const name = r.querySelectorAll("td")[0]!.firstChild!;
    const alpha = r.querySelector("td ul li")!.firstChild!;
    selectFromTo(name, 0, alpha, 5);

    toggleList(r, "ul");

    // No bare list inside a row, no cell nested in a list item.
    expect(r.querySelector("tr > ul, tr > ol")).toBeNull();
    expect(r.querySelector("li td")).toBeNull();
    // Column structure survives a parse round-trip (what v-model persists).
    const rt = document.createElement("div");
    rt.innerHTML = r.innerHTML;
    const counts = Array.from(rt.querySelectorAll("tr")).map(
      (tr) => tr.querySelectorAll("td").length
    );
    expect(counts).toEqual([2, 2]);
    expect(rt.querySelector("tr > ul")).toBeNull();
    expect(rt.textContent).toContain("alpha");
  });

  it("a caret in a <th> lists the header cell without breaking the row (#r21-2)", () => {
    const r = mount(
      "<table><thead><tr><th>H1</th><th>H2</th></tr></thead></table>"
    );
    const h2 = r.querySelectorAll("th")[1]!.firstChild!;
    const caret = document.createRange();
    caret.setStart(h2, 1);
    caret.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(caret);

    toggleList(r, "ol");

    expect(r.querySelectorAll("th")).toHaveLength(2);
    expect(r.querySelector("tr > ul, tr > ol")).toBeNull();
    expect(r.querySelectorAll("th")[1].querySelector("ol")).not.toBeNull();
    // The header text is listed WHOLE, not split around an empty bullet.
    expect(r.querySelectorAll("th")[1].textContent).toBe("H2");
    expect(r.querySelector("th ol li")!.textContent).toBe("H2");
  });

  it("a cell whose content is a <p> still converts normally (verifier note)", () => {
    // p IS in BLOCK_TAGS, so convertBlockToList already handles this — guard
    // that the new cell branch does not hijack it.
    const r = mount(
      "<table><tbody><tr><td><p>para</p></td></tr></tbody></table>"
    );
    const para = r.querySelector("td p")!.firstChild!;
    const caret = document.createRange();
    caret.setStart(para, 1);
    caret.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(caret);

    toggleList(r, "ul");

    expect(r.querySelectorAll("td")).toHaveLength(1);
    expect(r.querySelector("td ul li")!.textContent).toBe("para");
    expect(r.querySelector("tr > ul")).toBeNull();
  });

  it("a selection crossing an existing list never reorders content (#r20-2)", () => {
    const r = mount("<p>A</p><ul><li>B</li></ul><p>C</p>");
    const a = r.querySelector("p")!.firstChild!;
    const c = r.querySelectorAll("p")[1]!.firstChild!;
    selectFromTo(a, 0, c, 1);

    toggleList(r, "ul");

    // Document order stays A, B, C — C is never moved before B.
    expect(r.textContent).toBe("ABC");
  });
});
