import { describe, it, expect, afterEach } from "vitest";
import {
  buildTableGrid,
  visualColumnCount,
  visualColumnOfCell,
} from "../tableGrid";

/**
 * The colspan/rowspan-aware virtual grid underlying every structural table
 * operation. Pasted tables (sanitizer allowlists colspan/rowspan) routinely
 * carry merged cells; raw DOM cell indexes then disagree with VISUAL columns,
 * which is what corrupted add/remove row/column.
 */
let host: HTMLDivElement | null = null;

const mountTable = (html: string): HTMLTableElement => {
  host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.querySelector("table")!;
};

afterEach(() => {
  host?.remove();
  host = null;
});

describe("buildTableGrid", () => {
  it("maps a uniform table 1:1", () => {
    const table = mountTable(
      "<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>"
    );
    const grid = buildTableGrid(table);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(2);
    expect(grid[0][0].cell.textContent).toBe("a");
    expect(grid[1][1].cell.textContent).toBe("d");
    expect(grid[0][0].origin).toBe(true);
  });

  it("expands a colspan across visual slots (origin only on the first)", () => {
    const table = mountTable(
      '<table><tr><td colspan="3">title</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></table>"
    );
    const grid = buildTableGrid(table);
    expect(grid[0]).toHaveLength(3);
    expect(grid[0][0].cell).toBe(grid[0][1].cell);
    expect(grid[0][1].cell).toBe(grid[0][2].cell);
    expect(grid[0][0].origin).toBe(true);
    expect(grid[0][1].origin).toBe(false);
  });

  it("expands a rowspan down visual rows", () => {
    const table = mountTable(
      '<table><tr><td rowspan="2">tall</td><td>b</td></tr>' +
        "<tr><td>c</td></tr></table>"
    );
    const grid = buildTableGrid(table);
    // Row 1's single DOM cell ("c") lands in visual column 1, under "b".
    expect(grid[1][0].cell.textContent).toBe("tall");
    expect(grid[1][0].origin).toBe(false);
    expect(grid[1][1].cell.textContent).toBe("c");
  });

  it("covers thead + multiple tbodies in document order", () => {
    const table = mountTable(
      "<table><thead><tr><th>h1</th><th>h2</th></tr></thead>" +
        "<tbody><tr><td>a</td><td>b</td></tr></tbody>" +
        "<tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );
    const grid = buildTableGrid(table);
    expect(grid).toHaveLength(3);
    expect(grid[0][0].cell.textContent).toBe("h1");
    expect(grid[2][1].cell.textContent).toBe("d");
  });
});

describe("visualColumnCount / visualColumnOfCell", () => {
  it("counts visual columns, not DOM cells", () => {
    const table = mountTable(
      '<table><tr><td colspan="3">title</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></table>"
    );
    expect(visualColumnCount(table)).toBe(3);
  });

  it("resolves a cell's visual column past earlier spans", () => {
    const table = mountTable(
      '<table><tr><td colspan="2">wide</td><td>x</td></tr></table>'
    );
    const x = table.querySelectorAll("td")[1];
    // DOM index 1, but VISUAL column 2.
    expect(visualColumnOfCell(table, x)).toBe(2);
  });

  it("resolves a visual column shifted by a rowspan from above", () => {
    const table = mountTable(
      '<table><tr><td rowspan="2">tall</td><td>b</td></tr>' +
        "<tr><td>c</td></tr></table>"
    );
    const c = table.querySelectorAll("tr")[1].querySelector("td")!;
    // DOM index 0 in its row, but VISUAL column 1 (column 0 is occupied).
    expect(visualColumnOfCell(table, c)).toBe(1);
  });

  it("returns -1 for a cell not in the table", () => {
    const table = mountTable("<table><tr><td>a</td></tr></table>");
    const stray = document.createElement("td");
    expect(visualColumnOfCell(table, stray)).toBe(-1);
  });
});
