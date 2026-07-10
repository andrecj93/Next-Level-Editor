import { ref, type Ref } from "vue";
import {
  addTableRow,
  addTableColumn,
  removeTableRow,
  removeTableColumn,
  deleteTable,
  applyCellProperties,
  applyTableProperties,
  getCellProperties,
  getTableProperties,
} from "../utils/commands";

interface TableActionsOptions {
  currentTable: Ref<HTMLTableElement | null>;
  currentCell: Ref<HTMLTableCellElement | null>;
  showTableDesigner: Ref<boolean>;
  showTablePropertiesModal: Ref<boolean>;
  openTablePropertiesModal: () => void;
  initialCellProps: Ref<any>;
  initialTableProps: Ref<any>;
  tablePropertiesMode: Ref<"cell" | "table" | "both">;
  onUpdate: () => void;
}

/**
 * Composable for handling table-related actions
 * Provides handlers for table designer operations and table/cell properties
 */
export function useTableActions(options: TableActionsOptions) {
  const {
    currentTable,
    currentCell,
    showTableDesigner,
    showTablePropertiesModal,
    openTablePropertiesModal,
    initialCellProps,
    initialTableProps,
    tablePropertiesMode,
    onUpdate,
  } = options;

  /**
   * Add a row above the currently selected cell
   */
  const handleAddRowAbove = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;

    const rowIndex = Array.from(tbody.rows).indexOf(row);
    addTableRow(currentTable.value, rowIndex);
    onUpdate();
  };

  /**
   * Add a row below the currently selected cell
   */
  const handleAddRowBelow = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;

    const rowIndex = Array.from(tbody.rows).indexOf(row);
    addTableRow(currentTable.value, rowIndex + 1);
    onUpdate();
  };

  /**
   * Add a column to the left of the currently selected cell
   */
  const handleAddColumnLeft = () => {
    if (!currentTable.value || !currentCell.value) return;
    const cellIndex = Array.from(
      currentCell.value.parentElement?.children || []
    ).indexOf(currentCell.value);
    addTableColumn(currentTable.value, cellIndex);
    onUpdate();
  };

  /**
   * Add a column to the right of the currently selected cell
   */
  const handleAddColumnRight = () => {
    if (!currentTable.value || !currentCell.value) return;
    const cellIndex = Array.from(
      currentCell.value.parentElement?.children || []
    ).indexOf(currentCell.value);
    addTableColumn(currentTable.value, cellIndex + 1);
    onUpdate();
  };

  /**
   * Remove the row containing the currently selected cell
   */
  const handleRemoveRow = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;

    const rowIndex = Array.from(tbody.rows).indexOf(row);
    removeTableRow(currentTable.value, rowIndex);
    showTableDesigner.value = false;
    onUpdate();
  };

  /**
   * Remove the column containing the currently selected cell
   */
  const handleRemoveColumn = () => {
    if (!currentTable.value || !currentCell.value) return;
    const cellIndex = Array.from(
      currentCell.value.parentElement?.children || []
    ).indexOf(currentCell.value);
    removeTableColumn(currentTable.value, cellIndex);
    showTableDesigner.value = false;
    onUpdate();
  };

  /**
   * Delete the entire table
   */
  const handleDeleteTable = () => {
    if (!currentTable.value) return;
    deleteTable(currentTable.value);
    showTableDesigner.value = false;
    currentTable.value = null;
    currentCell.value = null;
    onUpdate();
  };

  // The table/cell the properties modal is acting on, captured at open time.
  // Focusing a modal input moves the document selection out of the cell, which
  // the global selectionchange handler treats as "no table selected" and nulls
  // currentTable/currentCell — so Apply must NOT read those live refs.
  const pendingTable = ref<HTMLTableElement | null>(null);
  const pendingCell = ref<HTMLTableCellElement | null>(null);

  /**
   * Open cell properties modal
   */
  const handleCellProperties = () => {
    if (!currentCell.value) return;

    pendingCell.value = currentCell.value;
    pendingTable.value = currentTable.value;
    initialCellProps.value = getCellProperties(currentCell.value);
    tablePropertiesMode.value = "cell";
    showTablePropertiesModal.value = true;
  };

  /**
   * Open table properties modal
   */
  const handleTableProperties = () => {
    if (!currentTable.value) return;

    pendingTable.value = currentTable.value;
    pendingCell.value = currentCell.value;
    initialTableProps.value = getTableProperties(currentTable.value);
    tablePropertiesMode.value = "table";
    openTablePropertiesModal();
  };

  /**
   * Apply table and/or cell properties
   */
  const handleApplyTableProperties = (data: {
    cellProps?: {
      backgroundColor?: string;
      textAlign?: string;
      verticalAlign?: string;
      padding?: number;
      width?: string;
      height?: string;
    };
    tableProps?: {
      borderStyle?: string;
      borderWidth?: number;
      borderColor?: string;
      width?: string;
      backgroundColor?: string;
      borderCollapse?: boolean;
    };
  }) => {
    // Apply against the captured target, falling back to the live ref, so a
    // modal focus-steal that nulled currentCell/currentTable can't no-op Apply.
    const cell = pendingCell.value ?? currentCell.value;
    const table = pendingTable.value ?? currentTable.value;

    if (data.cellProps && cell) {
      applyCellProperties(cell, data.cellProps);
    }

    if (data.tableProps && table) {
      applyTableProperties(table, data.tableProps);
    }

    pendingCell.value = null;
    pendingTable.value = null;
    onUpdate();
  };

  return {
    handleAddRowAbove,
    handleAddRowBelow,
    handleAddColumnLeft,
    handleAddColumnRight,
    handleRemoveRow,
    handleRemoveColumn,
    handleDeleteTable,
    handleCellProperties,
    handleTableProperties,
    handleApplyTableProperties,
  };
}
