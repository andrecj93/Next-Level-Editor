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
import { visualColumnOfCell } from "../utils/tableGrid";

/** Body rows across EVERY tbody, in document order (happy-dom lacks
 *  HTMLTableSectionElement.rows, so derive from table.rows). */
const bodyRowsOf = (table: HTMLTableElement): HTMLTableRowElement[] =>
  Array.from(table.rows).filter(
    (row) => row.parentElement?.tagName === "TBODY"
  );

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
    const section = row.parentElement as HTMLTableSectionElement;
    if (!section) return;

    // addTableRow inserts into a <tbody>, so a header (<thead>) cell has no
    // body-row index — "above"/"below" a header both mean "top of the body".
    // Body cells use their index across EVERY tbody (not just the first).
    const rowIndex =
      section.tagName === "THEAD"
        ? 0
        : bodyRowsOf(currentTable.value).indexOf(row);
    addTableRow(currentTable.value, rowIndex);
    onUpdate();
  };

  /**
   * Add a row below the currently selected cell
   */
  const handleAddRowBelow = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const section = row.parentElement as HTMLTableSectionElement;
    if (!section) return;

    const rowIndex =
      section.tagName === "THEAD"
        ? 0
        : bodyRowsOf(currentTable.value).indexOf(row) + 1;
    addTableRow(currentTable.value, rowIndex);
    onUpdate();
  };

  /**
   * Add a column to the left of the currently selected cell
   */
  const handleAddColumnLeft = () => {
    if (!currentTable.value || !currentCell.value) return;
    // VISUAL column, not the raw DOM cell index — with a colspan earlier in
    // the row the two disagree and the column landed in the wrong place.
    const col = visualColumnOfCell(currentTable.value, currentCell.value);
    if (col < 0) return;
    addTableColumn(currentTable.value, col);
    onUpdate();
  };

  /**
   * Add a column to the right of the currently selected cell
   */
  const handleAddColumnRight = () => {
    if (!currentTable.value || !currentCell.value) return;
    const col = visualColumnOfCell(currentTable.value, currentCell.value);
    if (col < 0) return;
    // "Right of this cell" = past its full span.
    addTableColumn(currentTable.value, col + currentCell.value.colSpan);
    onUpdate();
  };

  /**
   * Remove the row containing the currently selected cell
   */
  const handleRemoveRow = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const section = row.parentElement as HTMLTableSectionElement | null;
    if (!section) return;

    if (section.tagName === "THEAD") {
      // removeTableRow only indexes into the <tbody>, so a selected HEADER cell
      // used to silently delete body row 0 instead. Remove the header row the
      // user is actually in (dropping an emptied <thead>).
      row.remove();
      if (section.querySelectorAll("tr").length === 0) section.remove();
    } else {
      const rowIndex = bodyRowsOf(currentTable.value).indexOf(row);
      removeTableRow(currentTable.value, rowIndex);
    }
    showTableDesigner.value = false;
    onUpdate();
  };

  /**
   * Remove the column containing the currently selected cell
   */
  const handleRemoveColumn = () => {
    if (!currentTable.value || !currentCell.value) return;
    const col = visualColumnOfCell(currentTable.value, currentCell.value);
    if (col < 0) return;
    removeTableColumn(currentTable.value, col);
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
   * Close the designer and hand focus back to the editing surface BEFORE a
   * properties modal opens. Destructive actions already closed the popover,
   * but the properties pair left it standing: under the modal while open,
   * then lingering over the table after Cancel — parked at the right-clicked
   * cell, intercepting the user's next click into their own table. And the
   * modal captures document.activeElement at open as its close-restore
   * target, so the focused designer button (about to unmount) would leave
   * focus falling to <body> — the #R23-36 context-menu rule applies here
   * unchanged: restore focus FIRST, then let the action run. #R29-3
   */
  const yieldDesignerToModal = () => {
    const host = (
      currentCell.value ?? currentTable.value
    )?.closest<HTMLElement>('[contenteditable="true"]');
    host?.focus({ preventScroll: true });
    showTableDesigner.value = false;
  };

  /**
   * Open cell properties modal
   */
  const handleCellProperties = () => {
    if (!currentCell.value) return;

    pendingCell.value = currentCell.value;
    pendingTable.value = currentTable.value;
    initialCellProps.value = getCellProperties(currentCell.value);
    yieldDesignerToModal();
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
    yieldDesignerToModal();
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
      const cellProps = { ...data.cellProps };
      // getCellProperties can only surface ONE number for the padding (the
      // modal has a single field), so the DEFAULT asymmetric "8px 12px" reads
      // back as 8. If the user did not change the field, skip it entirely —
      // writing it back would collapse the shorthand to "8px".
      if (
        cellProps.padding !== undefined &&
        cellProps.padding === (initialCellProps.value as { padding?: number } | null)?.padding
      ) {
        delete cellProps.padding;
      }
      applyCellProperties(cell, cellProps);
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
