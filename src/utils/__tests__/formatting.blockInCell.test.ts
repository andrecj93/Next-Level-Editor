import { describe, it, expect, beforeEach } from "vitest";
import { toggleBlock } from "../formatting";

/**
 * R23-2: applying Heading / Paragraph / Quote to a selection that spans table
 * cells REPLACED each <td> with the block tag, leaving `<tr><h1>…</h1></tr>`.
 * That is invalid HTML: the parser foster-parents the headings out of the
 * table on the next sanitize round-trip, so the cell text is ejected above the
 * table and the row is left empty — the user loses their table.
 *
 * A cell's CONTENT is what should be converted, inside the cell — exactly what
 * the list command already does via wrapCellContentInList (#r20-1).
 */
const selectAcross = (from: Node, fromOffset: number, to: Node, toOffset: number) => {
  const range = document.createRange();
  range.setStart(from, fromOffset);
  range.setEnd(to, toOffset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return range;
};

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe("toggleBlock across table cells keeps the table (#R23-2)", () => {
  it("converts cell CONTENT to a heading instead of replacing the cell", () => {
    root.innerHTML =
      "<table><tbody><tr><td>Alpha</td><td>Beta</td></tr></tbody></table>";
    const [a, b] = Array.from(root.querySelectorAll("td"));
    selectAcross(a.firstChild!, 0, b.firstChild!, 4);

    toggleBlock(root, "h1", "p");

    expect(root.querySelectorAll("td")).toHaveLength(2);
    expect(root.querySelector("tr > h1")).toBeNull();
    expect(a.querySelector("h1")?.textContent).toBe("Alpha");
    expect(b.querySelector("h1")?.textContent).toBe("Beta");
  });

  it("keeps the table when converting to a blockquote", () => {
    root.innerHTML =
      "<table><tbody><tr><td>Alpha</td><td>Beta</td></tr></tbody></table>";
    const [a, b] = Array.from(root.querySelectorAll("td"));
    selectAcross(a.firstChild!, 0, b.firstChild!, 4);

    toggleBlock(root, "blockquote", "p");

    expect(root.querySelectorAll("td")).toHaveLength(2);
    expect(a.querySelector("blockquote")?.textContent).toBe("Alpha");
  });

  it("preserves the cell's own attributes", () => {
    root.innerHTML =
      '<table><tbody><tr><td colspan="2" style="width: 120px;">Alpha</td>' +
      "<td>Beta</td></tr></tbody></table>";
    const [a, b] = Array.from(root.querySelectorAll("td"));
    selectAcross(a.firstChild!, 0, b.firstChild!, 4);

    toggleBlock(root, "h2", "p");

    const cell = root.querySelector("td");
    expect(cell?.getAttribute("colspan")).toBe("2");
    expect(cell?.getAttribute("style")).toContain("120px");
  });

  it("does not leave a ragged row when only some cells are selected", () => {
    root.innerHTML =
      "<table><tbody><tr><td>One</td><td>Two</td><td>Three</td>" +
      "<td>Four</td></tr></tbody></table>";
    const cells = Array.from(root.querySelectorAll("td"));
    selectAcross(cells[1].firstChild!, 0, cells[2].firstChild!, 5);

    toggleBlock(root, "h3", "p");

    expect(root.querySelectorAll("td")).toHaveLength(4);
    expect(
      Array.from(root.querySelectorAll("td")).map((c) => c.textContent)
    ).toEqual(["One", "Two", "Three", "Four"]);
  });

  it("converts a paragraph and a cell together without breaking either", () => {
    root.innerHTML =
      "<p>Intro</p><table><tbody><tr><td>Alpha</td><td>Beta</td></tr></tbody></table>";
    const p = root.querySelector("p")!;
    const cell = root.querySelector("td")!;
    selectAcross(p.firstChild!, 0, cell.firstChild!, 5);

    toggleBlock(root, "h2", "p");

    expect(root.querySelector("h2")?.textContent).toBe("Intro");
    expect(root.querySelectorAll("td")).toHaveLength(2);
    expect(cell.querySelector("h2")?.textContent).toBe("Alpha");
  });

  it("does not nest a second heading when the cells are already headings", () => {
    root.innerHTML =
      "<table><tbody><tr><td><h1>Alpha</h1></td><td><h1>Beta</h1></td>" +
      "</tr></tbody></table>";
    const [a, b] = Array.from(root.querySelectorAll("h1"));
    selectAcross(a.firstChild!, 0, b.firstChild!, 4);

    toggleBlock(root, "h1", "p");

    // Every selected block already matches → Word-style toggle to the fallback.
    expect(root.querySelectorAll("h1")).toHaveLength(0);
    expect(root.querySelectorAll("td")).toHaveLength(2);
    expect(root.querySelector("td p")?.textContent).toBe("Alpha");
  });
});
