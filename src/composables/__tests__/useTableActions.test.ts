import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useTableActions } from "../useTableActions";
import * as commands from "../../utils/commands";

vi.mock("../../utils/commands", () => ({
  addTableRow: vi.fn(),
  addTableColumn: vi.fn(),
  removeTableRow: vi.fn(),
  removeTableColumn: vi.fn(),
  deleteTable: vi.fn(),
  applyCellProperties: vi.fn(),
  applyTableProperties: vi.fn(),
  getCellProperties: vi.fn(() => ({})),
  getTableProperties: vi.fn(() => ({})),
}));

type TablePropertiesMode = "cell" | "table" | "both";

describe("useTableActions", () => {
  let currentTable: HTMLTableElement;
  let currentCell: HTMLTableCellElement;
  let mockOnUpdate: () => void;

  beforeEach(() => {
    // Create a complete table structure
    const table = document.createElement("table");
    const tbody = document.createElement("tbody");

    // Create 3x3 table
    const rows: HTMLTableRowElement[] = [];
    for (let i = 0; i < 3; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 3; j++) {
        const cell = document.createElement("td");
        cell.textContent = `Cell ${i}-${j}`;
        row.appendChild(cell);
      }
      tbody.appendChild(row);
      rows.push(row);
    }

    // Mock tbody.rows to return HTMLCollection-like object
    Object.defineProperty(tbody, "rows", {
      get() {
        return tbody.querySelectorAll("tr");
      },
      configurable: true,
    });

    table.appendChild(tbody);
    document.body.appendChild(table);

    currentTable = table;
    const middleRow = rows[1];
    currentCell = middleRow.querySelectorAll("td")[1];
    mockOnUpdate = vi.fn();

    vi.clearAllMocks();
  });

  describe("handleAddRowAbove", () => {
    it("should add row above current cell", () => {
      const { handleAddRowAbove } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowAbove();

      expect(commands.addTableRow).toHaveBeenCalledWith(currentTable, 1);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not add row when table is null", () => {
      const { handleAddRowAbove } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowAbove();

      expect(commands.addTableRow).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not add row when cell is null", () => {
      const { handleAddRowAbove } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowAbove();

      expect(commands.addTableRow).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleAddRowBelow", () => {
    it("should add row below current cell", () => {
      const { handleAddRowBelow } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowBelow();

      expect(commands.addTableRow).toHaveBeenCalledWith(currentTable, 2);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not add row when table is null", () => {
      const { handleAddRowBelow } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowBelow();

      expect(commands.addTableRow).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not add row when cell is null", () => {
      const { handleAddRowBelow } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowBelow();

      expect(commands.addTableRow).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleAddColumnLeft", () => {
    it("should add column to the left of current cell", () => {
      const { handleAddColumnLeft } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnLeft();

      expect(commands.addTableColumn).toHaveBeenCalledWith(currentTable, 1);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not add column when table is null", () => {
      const { handleAddColumnLeft } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnLeft();

      expect(commands.addTableColumn).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not add column when cell is null", () => {
      const { handleAddColumnLeft } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnLeft();

      expect(commands.addTableColumn).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleAddColumnRight", () => {
    it("should add column to the right of current cell", () => {
      const { handleAddColumnRight } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnRight();

      expect(commands.addTableColumn).toHaveBeenCalledWith(currentTable, 2);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not add column when table is null", () => {
      const { handleAddColumnRight } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnRight();

      expect(commands.addTableColumn).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not add column when cell is null", () => {
      const { handleAddColumnRight } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddColumnRight();

      expect(commands.addTableColumn).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleRemoveRow", () => {
    it("should remove the row containing current cell", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveRow } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveRow();

      expect(commands.removeTableRow).toHaveBeenCalledWith(currentTable, 1);
      expect(showTableDesigner.value).toBe(false);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("removes the header row itself when a header cell is selected (not body row 0)", () => {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = "Head";
      headerRow.appendChild(th);
      thead.appendChild(headerRow);
      const tbody = document.createElement("tbody");
      const bodyRow = document.createElement("tr");
      const td = document.createElement("td");
      td.textContent = "Body";
      bodyRow.appendChild(td);
      tbody.appendChild(bodyRow);
      table.appendChild(thead);
      table.appendChild(tbody);
      document.body.appendChild(table);

      const showTableDesigner = ref(true);
      const { handleRemoveRow } = useTableActions({
        currentTable: ref(table),
        currentCell: ref(th),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveRow();

      // removeTableRow indexes into the tbody and would delete body row 0 — it
      // must NOT run for a header cell.
      expect(commands.removeTableRow).not.toHaveBeenCalled();
      // The header row is gone; the body row survives.
      expect(table.querySelector("thead")).toBeNull();
      expect(table.querySelector("tbody tr")).not.toBeNull();
      expect(table.textContent).toContain("Body");

      table.remove();
    });

    it("should not remove row when table is null", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveRow } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveRow();

      expect(commands.removeTableRow).not.toHaveBeenCalled();
      expect(showTableDesigner.value).toBe(true);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not remove row when cell is null", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveRow } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveRow();

      expect(commands.removeTableRow).not.toHaveBeenCalled();
      expect(showTableDesigner.value).toBe(true);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleRemoveColumn", () => {
    it("should remove the column containing current cell", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveColumn } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveColumn();

      expect(commands.removeTableColumn).toHaveBeenCalledWith(currentTable, 1);
      expect(showTableDesigner.value).toBe(false);
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not remove column when table is null", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveColumn } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveColumn();

      expect(commands.removeTableColumn).not.toHaveBeenCalled();
      expect(showTableDesigner.value).toBe(true);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should not remove column when cell is null", () => {
      const showTableDesigner = ref(true);
      const { handleRemoveColumn } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleRemoveColumn();

      expect(commands.removeTableColumn).not.toHaveBeenCalled();
      expect(showTableDesigner.value).toBe(true);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleDeleteTable", () => {
    it("should delete entire table", () => {
      const showTableDesigner = ref(true);
      const currentTableRef = ref(currentTable);
      const currentCellRef = ref(currentCell);

      const { handleDeleteTable } = useTableActions({
        currentTable: currentTableRef,
        currentCell: currentCellRef,
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleDeleteTable();

      expect(commands.deleteTable).toHaveBeenCalledWith(currentTable);
      expect(showTableDesigner.value).toBe(false);
      expect(currentTableRef.value).toBeNull();
      expect(currentCellRef.value).toBeNull();
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not delete when table is null", () => {
      const showTableDesigner = ref(true);
      const currentTableRef = ref(null);

      const { handleDeleteTable } = useTableActions({
        currentTable: currentTableRef,
        currentCell: ref(currentCell),
        showTableDesigner,
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleDeleteTable();

      expect(commands.deleteTable).not.toHaveBeenCalled();
      expect(showTableDesigner.value).toBe(true);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleCellProperties", () => {
    it("should open cell properties modal", () => {
      const showTablePropertiesModal = ref(false);
      const initialCellProps = ref({});
      const tablePropertiesMode = ref<TablePropertiesMode>("table");

      vi.mocked(commands.getCellProperties).mockReturnValue({
        backgroundColor: "#fff",
        textAlign: "left",
      } as any);

      const { handleCellProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal,
        openTablePropertiesModal: vi.fn(),
        initialCellProps,
        initialTableProps: ref({}),
        tablePropertiesMode,
        onUpdate: mockOnUpdate,
      });

      handleCellProperties();

      expect(commands.getCellProperties).toHaveBeenCalledWith(currentCell);
      expect(initialCellProps.value).toEqual({
        backgroundColor: "#fff",
        textAlign: "left",
      });
      expect(tablePropertiesMode.value).toBe("cell");
      expect(showTablePropertiesModal.value).toBe(true);
    });

    it("should not open modal when cell is null", () => {
      const showTablePropertiesModal = ref(false);
      const tablePropertiesMode = ref<TablePropertiesMode>("table");

      const { handleCellProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal,
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode,
        onUpdate: mockOnUpdate,
      });

      handleCellProperties();

      expect(commands.getCellProperties).not.toHaveBeenCalled();
      expect(showTablePropertiesModal.value).toBe(false);
      expect(tablePropertiesMode.value).toBe("table");
    });
  });

  describe("handleTableProperties", () => {
    it("should open table properties modal", () => {
      const initialTableProps = ref({});
      const tablePropertiesMode = ref<TablePropertiesMode>("cell");
      const mockOpenModal = vi.fn();

      vi.mocked(commands.getTableProperties).mockReturnValue({
        borderWidth: 1,
        borderColor: "#000",
      } as any);

      const { handleTableProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: mockOpenModal,
        initialCellProps: ref({}),
        initialTableProps,
        tablePropertiesMode,
        onUpdate: mockOnUpdate,
      });

      handleTableProperties();

      expect(commands.getTableProperties).toHaveBeenCalledWith(currentTable);
      expect(initialTableProps.value).toEqual({
        borderWidth: 1,
        borderColor: "#000",
      });
      expect(tablePropertiesMode.value).toBe("table");
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("should not open modal when table is null", () => {
      const tablePropertiesMode = ref<TablePropertiesMode>("cell");
      const mockOpenModal = vi.fn();

      const { handleTableProperties } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: mockOpenModal,
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode,
        onUpdate: mockOnUpdate,
      });

      handleTableProperties();

      expect(commands.getTableProperties).not.toHaveBeenCalled();
      expect(mockOpenModal).not.toHaveBeenCalled();
      expect(tablePropertiesMode.value).toBe("cell");
    });
  });

  describe("handleApplyTableProperties", () => {
    it("should apply cell properties", () => {
      const { handleApplyTableProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      const cellProps = {
        backgroundColor: "#f00",
        textAlign: "center",
        padding: 10,
      };

      handleApplyTableProperties({ cellProps });

      expect(commands.applyCellProperties).toHaveBeenCalledWith(
        currentCell,
        cellProps
      );
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should apply table properties", () => {
      const { handleApplyTableProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("table"),
        onUpdate: mockOnUpdate,
      });

      const tableProps = {
        borderWidth: 2,
        borderColor: "#000",
        width: "100%",
      };

      handleApplyTableProperties({ tableProps });

      expect(commands.applyTableProperties).toHaveBeenCalledWith(
        currentTable,
        tableProps
      );
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should apply both cell and table properties", () => {
      const { handleApplyTableProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("both"),
        onUpdate: mockOnUpdate,
      });

      const cellProps = { backgroundColor: "#f00" };
      const tableProps = { borderWidth: 2 };

      handleApplyTableProperties({ cellProps, tableProps });

      expect(commands.applyCellProperties).toHaveBeenCalledWith(
        currentCell,
        cellProps
      );
      expect(commands.applyTableProperties).toHaveBeenCalledWith(
        currentTable,
        tableProps
      );
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not apply cell properties when cell is null", () => {
      const { handleApplyTableProperties } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(null),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      const cellProps = { backgroundColor: "#f00" };

      handleApplyTableProperties({ cellProps });

      expect(commands.applyCellProperties).not.toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not apply table properties when table is null", () => {
      const { handleApplyTableProperties } = useTableActions({
        currentTable: ref(null),
        currentCell: ref(currentCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("table"),
        onUpdate: mockOnUpdate,
      });

      const tableProps = { borderWidth: 2 };

      handleApplyTableProperties({ tableProps });

      expect(commands.applyTableProperties).not.toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive operations", () => {
      const { handleAddRowAbove, handleAddColumnLeft, handleRemoveRow } =
        useTableActions({
          currentTable: ref(currentTable),
          currentCell: ref(currentCell),
          showTableDesigner: ref(true),
          showTablePropertiesModal: ref(false),
          openTablePropertiesModal: vi.fn(),
          initialCellProps: ref({}),
          initialTableProps: ref({}),
          tablePropertiesMode: ref("cell"),
          onUpdate: mockOnUpdate,
        });

      handleAddRowAbove();
      handleAddColumnLeft();
      handleRemoveRow();

      expect(commands.addTableRow).toHaveBeenCalledTimes(1);
      expect(commands.addTableColumn).toHaveBeenCalledTimes(1);
      expect(commands.removeTableRow).toHaveBeenCalledTimes(1);
      expect(mockOnUpdate).toHaveBeenCalledTimes(3);
    });

    it("should handle operations on first cell (0,0)", () => {
      const tbody = currentTable.querySelector("tbody")!;
      const rows = tbody.querySelectorAll("tr");
      const firstRow = rows[0];
      const firstCell = firstRow.querySelectorAll("td")[0];

      const { handleAddRowAbove, handleAddColumnLeft } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(firstCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowAbove();
      handleAddColumnLeft();

      expect(commands.addTableRow).toHaveBeenCalledWith(currentTable, 0);
      expect(commands.addTableColumn).toHaveBeenCalledWith(currentTable, 0);
    });

    it("should handle operations on last cell", () => {
      const tbody = currentTable.querySelector("tbody")!;
      const rows = tbody.querySelectorAll("tr");
      const lastRow = rows[rows.length - 1];
      const cells = lastRow.querySelectorAll("td");
      const lastCell = cells[cells.length - 1];

      const { handleAddRowBelow, handleAddColumnRight } = useTableActions({
        currentTable: ref(currentTable),
        currentCell: ref(lastCell),
        showTableDesigner: ref(true),
        showTablePropertiesModal: ref(false),
        openTablePropertiesModal: vi.fn(),
        initialCellProps: ref({}),
        initialTableProps: ref({}),
        tablePropertiesMode: ref("cell"),
        onUpdate: mockOnUpdate,
      });

      handleAddRowBelow();
      handleAddColumnRight();

      expect(commands.addTableRow).toHaveBeenCalledWith(currentTable, 3);
      expect(commands.addTableColumn).toHaveBeenCalledWith(currentTable, 3);
    });
  });

  describe("handleApplyTableProperties (captures target at modal-open)", () => {
    it("applies table props to the CAPTURED table even after the live refs are nulled", () => {
      const tableRef = ref<HTMLTableElement | null>(currentTable);
      const cellRef = ref<HTMLTableCellElement | null>(currentCell);
      const { handleTableProperties, handleApplyTableProperties } =
        useTableActions({
          currentTable: tableRef,
          currentCell: cellRef,
          showTableDesigner: ref(true),
          showTablePropertiesModal: ref(false),
          openTablePropertiesModal: vi.fn(),
          initialCellProps: ref({}),
          initialTableProps: ref({}),
          tablePropertiesMode: ref("table"),
          onUpdate: mockOnUpdate,
        });

      // Opening the modal captures the current table/cell.
      handleTableProperties();

      // Focusing a modal input fires selectionchange -> checkForTableSelection
      // nulls the live refs. Apply must still target the captured table.
      tableRef.value = null;
      cellRef.value = null;

      handleApplyTableProperties({ tableProps: { borderWidth: 5 } });

      expect(commands.applyTableProperties).toHaveBeenCalledWith(currentTable, {
        borderWidth: 5,
      });
      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it("applies cell props to the CAPTURED cell even after the live refs are nulled", () => {
      const tableRef = ref<HTMLTableElement | null>(currentTable);
      const cellRef = ref<HTMLTableCellElement | null>(currentCell);
      const { handleCellProperties, handleApplyTableProperties } =
        useTableActions({
          currentTable: tableRef,
          currentCell: cellRef,
          showTableDesigner: ref(false),
          showTablePropertiesModal: ref(false),
          openTablePropertiesModal: vi.fn(),
          initialCellProps: ref({}),
          initialTableProps: ref({}),
          tablePropertiesMode: ref("cell"),
          onUpdate: mockOnUpdate,
        });

      handleCellProperties();
      tableRef.value = null;
      cellRef.value = null;

      // padding: 0 also guards against a truthiness bug in the apply payload.
      handleApplyTableProperties({ cellProps: { padding: 0 } });

      expect(commands.applyCellProperties).toHaveBeenCalledWith(currentCell, {
        padding: 0,
      });
    });
  });

  describe("add row from a header (thead) cell", () => {
    const makeHeaderTable = () => {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const hrow = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = "H1";
      hrow.appendChild(th);
      thead.appendChild(hrow);
      const tbody = document.createElement("tbody");
      const brow = document.createElement("tr");
      brow.appendChild(document.createElement("td"));
      tbody.appendChild(brow);
      table.append(thead, tbody);
      document.body.appendChild(table);
      return { table, th };
    };

    const optsFor = (
      table: HTMLTableElement,
      cell: HTMLTableCellElement
    ) => ({
      currentTable: ref(table),
      currentCell: ref(cell),
      showTableDesigner: ref(true),
      showTablePropertiesModal: ref(false),
      openTablePropertiesModal: vi.fn(),
      initialCellProps: ref({}),
      initialTableProps: ref({}),
      tablePropertiesMode: ref("cell" as const),
      onUpdate: vi.fn(),
    });

    it("Add Row Below inserts at the TOP of the body (index 0), not after the first body row", () => {
      const { table, th } = makeHeaderTable();
      const { handleAddRowBelow } = useTableActions(optsFor(table, th));
      handleAddRowBelow();
      expect(commands.addTableRow).toHaveBeenCalledWith(table, 0);
    });

    it("Add Row Above from a header cell also targets the top of the body", () => {
      const { table, th } = makeHeaderTable();
      const { handleAddRowAbove } = useTableActions(optsFor(table, th));
      handleAddRowAbove();
      expect(commands.addTableRow).toHaveBeenCalledWith(table, 0);
    });
  });
});
