import { describe, it, expect, beforeEach } from "vitest";
import { applyTextAlignment } from "../commands";

/**
 * R23-14: clicking Align center/right/justify with the caret in a table cell
 * did nothing at all — no alignment, no feedback. isAlignableBlock listed
 * p/h1-h6/div/li/blockquote but not td/th, and a cell's ancestors (tr, tbody,
 * table) are not alignable either, so the walk-up ran out and the function
 * returned having changed nothing.
 *
 * Cells created by the editor's own Insert > Table hold text DIRECTLY
 * (insertTable sets td.textContent), so every table the editor makes hit this
 * path; only a cell the user had separately nested a <p> into ever aligned.
 */
let root: HTMLElement;

const caretIn = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
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

describe("text alignment works inside table cells (#R23-14)", () => {
  it("aligns the cell that holds the caret", () => {
    root.innerHTML =
      "<table><tbody><tr><td>Alpha</td><td>Beta</td></tr></tbody></table>";
    const [first, second] = Array.from(root.querySelectorAll("td"));
    caretIn(first.firstChild!);

    applyTextAlignment(root, "center");

    expect(first.style.textAlign).toBe("center");
    // The neighbouring cell is untouched.
    expect(second.style.textAlign).toBe("");
  });

  it("keeps the table intact", () => {
    root.innerHTML =
      "<table><tbody><tr><td>Alpha</td></tr></tbody></table>";
    const cell = root.querySelector("td")!;
    caretIn(cell.firstChild!);

    applyTextAlignment(root, "right");

    expect(root.querySelectorAll("td")).toHaveLength(1);
    expect(root.querySelector("td")?.textContent).toBe("Alpha");
  });

  it("aligns a header cell too", () => {
    root.innerHTML =
      "<table><thead><tr><th>Header</th></tr></thead></table>";
    const header = root.querySelector("th")!;
    caretIn(header.firstChild!);

    applyTextAlignment(root, "center");

    expect(header.style.textAlign).toBe("center");
  });

  it("still prefers a block the user nested inside the cell", () => {
    // Control: when the cell holds a real block, that block owns the alignment
    // — the cell must not swallow it.
    root.innerHTML =
      "<table><tbody><tr><td><p>Alpha</p></td></tr></tbody></table>";
    const paragraph = root.querySelector("p")!;
    caretIn(paragraph.firstChild!);

    applyTextAlignment(root, "right");

    expect(paragraph.style.textAlign).toBe("right");
  });

  it("still aligns an ordinary paragraph outside a table", () => {
    root.innerHTML = "<p>Alpha</p>";
    const paragraph = root.querySelector("p")!;
    caretIn(paragraph.firstChild!);

    applyTextAlignment(root, "center");

    expect(paragraph.style.textAlign).toBe("center");
  });
});
