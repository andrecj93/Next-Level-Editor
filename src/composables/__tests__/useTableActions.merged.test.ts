import { describe, it, expect, vi, afterEach } from "vitest";
import { ref } from "vue";
import { useTableActions } from "../useTableActions";
import { visualColumnCount, buildTableGrid } from "../../utils/tableGrid";

/**
 * The composable's column handlers fed RAW DOM cell indexes into the (now
 * grid-aware) column operations. With a colspan earlier in the row, the DOM
 * index disagrees with the VISUAL column — "add column right of c" inserted
 * the column in the middle of the table instead. Handlers must translate the
 * current cell to its visual column first. Cell-properties Apply also
 * collapsed an asymmetric padding shorthand ("8px 12px" → "8px") even when the
 * user never touched the padding field.
 */

let host: HTMLDivElement | null = null;

afterEach(() => {
  host?.remove();
  host = null;
});

const setup = (tableHtml: string, cellSelector: string) => {
  host = document.createElement("div");
  host.innerHTML = tableHtml;
  document.body.appendChild(host);
  const table = host.querySelector("table")!;
  const cell = host.querySelector(cellSelector) as HTMLTableCellElement;

  const options = {
    currentTable: ref<HTMLTableElement | null>(table),
    currentCell: ref<HTMLTableCellElement | null>(cell),
    showTableDesigner: ref(false),
    showTablePropertiesModal: ref(false),
    openTablePropertiesModal: vi.fn(),
    initialCellProps: ref<Record<string, unknown>>({}),
    initialTableProps: ref<Record<string, unknown>>({}),
    tablePropertiesMode: ref<"cell" | "table" | "both">("cell"),
    onUpdate: vi.fn(),
  };
  return { table, cell, options, actions: useTableActions(options) };
};

describe("useTableActions with merged cells", () => {
  it("adds a column to the RIGHT of a cell that sits past a colspan", () => {
    // "x" is DOM cell index 1 but VISUAL column 2.
    const { table, actions } = setup(
      '<table><tbody><tr><td colspan="2">wide</td><td id="x">x</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>",
      "#x"
    );

    actions.handleAddColumnRight();

    // A 4th visual column appended AFTER x — row1 order unchanged then new cell.
    expect(visualColumnCount(table)).toBe(4);
    const row1 = table.querySelectorAll("tr")[1];
    expect(Array.from(row1.cells).map((c) => c.textContent?.trim())).toEqual([
      "a",
      "b",
      "c",
      "",
    ]);
    // The wide cell was NOT widened (the new column is beyond it).
    expect(table.querySelector("td")!.colSpan).toBe(2);
  });

  it("removes the VISUAL column of a cell past a colspan", () => {
    const { table, actions } = setup(
      '<table><tbody><tr><td colspan="2">wide</td><td id="x">x</td></tr>' +
        "<tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>",
      "#x"
    );

    actions.handleRemoveColumn();

    // Visual column 2 removed: "x" and "c" gone, wide/a/b intact.
    expect(table.querySelector("#x")).toBeNull();
    const texts = Array.from(table.querySelectorAll("td")).map(
      (c) => c.textContent
    );
    expect(texts).toEqual(["wide", "a", "b"]);
  });

  it("adds a row below a cell in the SECOND tbody", () => {
    const { table, actions } = setup(
      "<table><tbody><tr><td>a</td></tr></tbody>" +
        '<tbody><tr><td id="x">b</td></tr><tr><td>c</td></tr></tbody></table>',
      "#x"
    );

    actions.handleAddRowBelow();

    // New row lands between b and c INSIDE the second tbody.
    expect(table.tBodies[0].querySelectorAll("tr")).toHaveLength(1);
    expect(table.tBodies[1].querySelectorAll("tr")).toHaveLength(3);
    expect(buildTableGrid(table)).toHaveLength(4);
  });
});

describe("cell-properties Apply preserves untouched asymmetric padding", () => {
  it("does not collapse an '8px 12px' shorthand when padding was not changed", () => {
    const { cell, options, actions } = setup(
      "<table><tbody><tr><td id=\"x\">x</td></tr></tbody></table>",
      "#x"
    );
    cell.style.padding = "8px 12px";
    // What getCellProperties surfaced when the modal opened.
    options.initialCellProps.value = { padding: 8 };

    actions.handleApplyTableProperties({
      cellProps: { padding: 8, backgroundColor: "#ff0000" },
    });

    // Background applied, padding untouched (still asymmetric).
    expect(cell.style.padding).toBe("8px 12px");
    // happy-dom keeps the hex form; a real browser normalizes to rgb().
    expect(["#ff0000", "rgb(255, 0, 0)"]).toContain(
      cell.style.backgroundColor
    );
  });

  it("still applies padding the user actually changed", () => {
    const { cell, options, actions } = setup(
      "<table><tbody><tr><td id=\"x\">x</td></tr></tbody></table>",
      "#x"
    );
    cell.style.padding = "8px 12px";
    options.initialCellProps.value = { padding: 8 };

    actions.handleApplyTableProperties({ cellProps: { padding: 10 } });

    expect(cell.style.padding).toBe("10px");
  });
});
