import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../export";

/**
 * #16: GFM has no rowspan/colspan, so a spanning cell must EXPAND into
 * placeholder cells or every later cell shifts into the wrong column. Colspan
 * expansion landed in batch 41; rowspan still shifted the NEXT row's cells left
 * (the spanned-into slot emitted nothing). The table case now renders from the
 * colspan/rowspan-aware virtual grid (tableGrid.ts).
 */
const rows = (md: string) =>
  md
    .trim()
    .split("\n")
    .filter((l) => l.startsWith("|"));

describe("htmlToMarkdown table spans (#16)", () => {
  it("keeps later cells in their column under a rowspan", () => {
    const md = htmlToMarkdown(
      "<table>" +
        "<tr><th>A</th><th>B</th></tr>" +
        '<tr><td rowspan="2">X</td><td>1</td></tr>' +
        "<tr><td>2</td></tr>" +
        "</table>"
    );
    const lines = rows(md);
    // Row 3 has one DOM cell ("2") but must render under column B, with an
    // empty placeholder under the rowspanned X.
    expect(lines[3]).toBe("|  | 2 |");
    // And row 2 is untouched.
    expect(lines[2]).toBe("| X | 1 |");
  });

  it("still expands colspan into placeholders (b41 behavior preserved)", () => {
    const md = htmlToMarkdown(
      "<table>" +
        "<tr><th>A</th><th>B</th><th>C</th></tr>" +
        '<tr><td colspan="2">X</td><td>Y</td></tr>' +
        "</table>"
    );
    expect(rows(md)[2]).toBe("| X |  | Y |");
  });

  it("renders a plain table unchanged", () => {
    const md = htmlToMarkdown(
      "<table><tr><th>H1</th><th>H2</th></tr><tr><td>a</td><td>b</td></tr></table>"
    );
    const lines = rows(md);
    expect(lines[0]).toBe("| H1 | H2 |");
    expect(lines[1]).toBe("| --- | --- |");
    expect(lines[2]).toBe("| a | b |");
  });
});
