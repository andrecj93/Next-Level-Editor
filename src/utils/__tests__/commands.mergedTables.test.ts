import { describe, it, expect, afterEach } from "vitest";
import {
  addTableRow,
  addTableColumn,
  removeTableColumn,
  removeTableRow,
} from "../commands";
import { buildTableGrid, visualColumnCount } from "../tableGrid";

/**
 * Structural table operations on tables with MERGED cells (colspan/rowspan —
 * both sanitizer-allowlisted, so any pasted table can carry them) and multiple
 * <tbody> sections. The old implementations reasoned on raw DOM cell indexes
 * and tBodies[0] only:
 *  - addTableRow sized new rows from rows[0].cells.length → a colspan title
 *    row made every added row ragged;
 *  - add/removeTableColumn applied one DOM index to every row → cells landed
 *    in different VISUAL columns per row, and a spanning cell was removed
 *    outright instead of narrowing;
 *  - <colgroup>/<col> was never kept in sync;
 *  - rows/cells in a second <tbody> were skipped entirely.
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

/** Every grid row's visual width (dense slots). */
const rowWidths = (table: HTMLTableElement) =>
  buildTableGrid(table).map((r) => r.length);

describe("addTableRow with merged cells", () => {
  it("sizes the new row from the VISUAL column count, not rows[0]'s DOM cells", () => {
    // Pasted-table shape: a colspan title row first, then real columns.
    const table = mountTable(
      '<table><tbody><tr><td colspan="3">Title</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>"
    );

    addTableRow(table, 2); // append after the last body row

    const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(rows).toHaveLength(3);
    // The new row must have 3 visual columns — NOT rows[0].cells.length (1).
    expect(rows[2].cells.length).toBe(3);
    expect(new Set(rowWidths(table))).toEqual(new Set([3]));
  });

  it("stretches a rowspan cell instead of creating an overlapping cell", () => {
    // "tall" spans body rows 0-1; inserting between them must widen the span
    // and create only the cells for the uncovered columns.
    const table = mountTable(
      '<table><tbody><tr><td rowspan="2">tall</td><td>b</td></tr>' +
        "<tr><td>c</td></tr></tbody></table>"
    );
    const tall = table.querySelector("td")!;

    addTableRow(table, 1); // between the two body rows

    expect(tall.rowSpan).toBe(3);
    const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
    expect(rows).toHaveLength(3);
    // The inserted middle row has ONE new cell (column 1) — column 0 is covered.
    expect(rows[1].cells).toHaveLength(1);
    expect(new Set(rowWidths(table))).toEqual(new Set([2]));
  });

  it("inserts into the correct SECOND tbody", () => {
    const table = mountTable(
      "<table><tbody><tr><td>a</td></tr></tbody>" +
        "<tbody><tr><td>b</td></tr><tr><td>c</td></tr></tbody></table>"
    );

    addTableRow(table, 2); // before "c" — which lives in the SECOND tbody

    const tbodies = table.tBodies;
    expect(tbodies[0].querySelectorAll("tr")).toHaveLength(1);
    expect(tbodies[1].querySelectorAll("tr")).toHaveLength(3);
    expect(tbodies[1].querySelectorAll("tr")[1].cells[0].textContent).toBe(" ");
  });
});

describe("addTableColumn with merged cells", () => {
  it("widens a spanning cell instead of slotting a new cell inside it", () => {
    // row0's "wide" covers visual columns 0-1; row1 has real cells in each.
    const table = mountTable(
      '<table><tbody><tr><td colspan="2">wide</td><td>x</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>"
    );
    const wide = table.querySelector("td")!;

    addTableColumn(table, 1); // insert a visual column between a and b

    // The spanning cell absorbs the new column…
    expect(wide.colSpan).toBe(3);
    // …and the fully-cellled row gains a real cell in visual column 1.
    const row1 = table.querySelectorAll("tr")[1];
    expect(row1.cells).toHaveLength(4);
    expect(visualColumnCount(table)).toBe(4);
    expect(new Set(rowWidths(table))).toEqual(new Set([4]));
  });

  it("adds cells to rows in EVERY tbody", () => {
    const table = mountTable(
      "<table><tbody><tr><td>a</td></tr></tbody>" +
        "<tbody><tr><td>b</td></tr></tbody></table>"
    );

    addTableColumn(table, 1); // append a second visual column

    expect(table.tBodies[0].querySelectorAll("tr")[0].cells).toHaveLength(2);
    expect(table.tBodies[1].querySelectorAll("tr")[0].cells).toHaveLength(2);
  });

  it("keeps <colgroup> in sync", () => {
    const table = mountTable(
      '<table><colgroup><col style="width:100px"><col style="width:200px"></colgroup>' +
        "<tbody><tr><td>a</td><td>b</td></tr></tbody></table>"
    );

    addTableColumn(table, 1);

    expect(table.querySelectorAll("colgroup col")).toHaveLength(3);
  });
});

describe("removeTableColumn with merged cells", () => {
  it("narrows a spanning cell instead of deleting it", () => {
    const table = mountTable(
      '<table><tbody><tr><td colspan="2">wide</td><td>x</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>"
    );
    const wide = table.querySelector("td")!;

    removeTableColumn(table, 1); // remove visual column of "b"

    // The spanning cell narrows, its content intact…
    expect(wide.colSpan).toBe(1);
    expect(wide.isConnected).toBe(true);
    // …and only "b" is gone from the fully-cellled row.
    const row1Texts = Array.from(
      table.querySelectorAll("tr")[1].cells
    ).map((c) => c.textContent);
    expect(row1Texts).toEqual(["a", "c"]);
    expect(new Set(rowWidths(table))).toEqual(new Set([2]));
  });

  it("removes the column from EVERY tbody and the matching <col>", () => {
    const table = mountTable(
      "<table><colgroup><col><col></colgroup>" +
        "<tbody><tr><td>a</td><td>b</td></tr></tbody>" +
        "<tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );

    removeTableColumn(table, 1);

    expect(table.tBodies[0].querySelectorAll("tr")[0].cells).toHaveLength(1);
    expect(table.tBodies[1].querySelectorAll("tr")[0].cells).toHaveLength(1);
    expect(table.tBodies[1].querySelectorAll("tr")[0].cells[0].textContent).toBe("c");
    expect(table.querySelectorAll("colgroup col")).toHaveLength(1);
  });
});

describe("removeTableRow with merged cells", () => {
  it("shrinks a rowspan crossing the removed row", () => {
    const table = mountTable(
      '<table><tbody><tr><td rowspan="2">tall</td><td>b</td></tr>' +
        "<tr><td>c</td></tr><tr><td>x</td><td>y</td></tr></tbody></table>"
    );
    const tall = table.querySelector("td")!;

    removeTableRow(table, 1); // the row containing "c"

    expect(tall.rowSpan).toBe(1);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(new Set(rowWidths(table))).toEqual(new Set([2]));
  });

  it("removes a row from the SECOND tbody", () => {
    const table = mountTable(
      "<table><tbody><tr><td>a</td></tr></tbody>" +
        "<tbody><tr><td>b</td></tr><tr><td>c</td></tr></tbody></table>"
    );

    removeTableRow(table, 1); // "b" — first row of the SECOND tbody

    expect(table.tBodies[0].querySelectorAll("tr")).toHaveLength(1);
    expect(table.tBodies[1].querySelectorAll("tr")).toHaveLength(1);
    expect(table.tBodies[1].querySelectorAll("tr")[0].cells[0].textContent).toBe("c");
  });
});
