import { ref, nextTick, type Ref } from "vue";
import {
  getSelectedTable,
  getSelectedCell,
  insertTable as insertTableUtil,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  deleteTable,
  applyCellProperties,
  applyTableProperties,
  getCellProperties,
  getTableProperties,
} from "../utils/commands";
import { smoothScrollIntoView } from "../utils/scroll";

interface TableManagementOptions {
  editorContent: Ref<HTMLElement | null>;
  performWithSelection: (callback: (root: HTMLElement) => void) => void;
  onUpdate: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

/**
 * Composable for managing table operations in the editor
 * Handles table insertion, row/column manipulation, and properties
 */
export function useTableManagement(options: TableManagementOptions) {
  const { editorContent, performWithSelection, onUpdate, showToast } = options;

  const currentTable = ref<HTMLTableElement | null>(null);
  const currentCell = ref<HTMLTableCellElement | null>(null);
  const tableDesignerPosition = ref({ x: 0, y: 0 });
  const showTableDesigner = ref(false);

  /**
   * Insert a new table into the editor
   */
  const insertTable = (rows: number, cols: number, includeHeader: boolean) => {
    performWithSelection((root) => {
      insertTableUtil(root, rows, cols, includeHeader);

      showToast(`✓ Table (${rows}×${cols}) inserted successfully!`);

      // Find the newly inserted table and scroll to it
      nextTick(() => {
        const tables = editorContent.value?.querySelectorAll("table");
        if (tables && tables.length > 0) {
          const lastTable = tables[tables.length - 1];
          smoothScrollIntoView(lastTable, {
            behavior: "smooth",
            block: "center",
          });
        }
      });
    });
  };

  /**
   * Add a row above the current cell
   */
  const addRowAbove = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;

    const rowIndex = Array.from(tbody.rows).indexOf(row);
    addTableRow(currentTable.value, rowIndex);
    onUpdate();
  };

  /**
   * Add a row below the current cell
   */
  const addRowBelow = () => {
    if (!currentTable.value || !currentCell.value) return;
    const row = currentCell.value.parentElement as HTMLTableRowElement;
    const tbody = row.parentElement as HTMLTableSectionElement;
    if (!tbody) return;

    const rowIndex = Array.from(tbody.rows).indexOf(row);
    addTableRow(currentTable.value, rowIndex + 1);
    onUpdate();
  };

  /**
   * Add a column to the left of the current cell
   */
  const addColumnLeft = () => {
    if (!currentTable.value || !currentCell.value) return;
    const cellIndex = Array.from(
      currentCell.value.parentElement?.children || []
    ).indexOf(currentCell.value);
    addTableColumn(currentTable.value, cellIndex);
    onUpdate();
  };

  /**
   * Add a column to the right of the current cell
   */
  const addColumnRight = () => {
    if (!currentTable.value || !currentCell.value) return;
    const cellIndex = Array.from(
      currentCell.value.parentElement?.children || []
    ).indexOf(currentCell.value);
    addTableColumn(currentTable.value, cellIndex + 1);
    onUpdate();
  };

  /**
   * Remove the row containing the current cell
   */
  const removeRow = () => {
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
   * Remove the column containing the current cell
   */
  const removeColumn = () => {
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
  const removeTable = () => {
    if (!currentTable.value) return;
    deleteTable(currentTable.value);
    showTableDesigner.value = false;
    currentTable.value = null;
    currentCell.value = null;
    onUpdate();
  };

  /**
   * Get cell properties for the properties modal
   */
  const getCellPropertiesData = () => {
    if (!currentCell.value) return {};
    return getCellProperties(currentCell.value);
  };

  /**
   * Get table properties for the properties modal
   */
  const getTablePropertiesData = () => {
    if (!currentTable.value) return {};
    return getTableProperties(currentTable.value);
  };

  /**
   * Apply properties to cell and/or table
   */
  const applyProperties = (data: {
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
    if (data.cellProps && currentCell.value) {
      applyCellProperties(currentCell.value, data.cellProps);
    }

    if (data.tableProps && currentTable.value) {
      applyTableProperties(currentTable.value, data.tableProps);
    }

    onUpdate();
  };

  /**
   * Check for table selection and update current table/cell
   */
  const checkTableSelection = () => {
    if (!editorContent.value) return;

    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) {
      showTableDesigner.value = false;
      return;
    }

    const table = getSelectedTable();
    const cell = getSelectedCell();

    if (table && cell) {
      currentTable.value = table;
      currentCell.value = cell;

      const rect = cell.getBoundingClientRect();
      const editorRect = editorContent.value.getBoundingClientRect();

      tableDesignerPosition.value = {
        x: rect.right - editorRect.left + 5,
        y: rect.top - editorRect.top,
      };

      showTableDesigner.value = true;
    } else {
      showTableDesigner.value = false;
      currentTable.value = null;
      currentCell.value = null;
    }
  };

  return {
    currentTable,
    currentCell,
    tableDesignerPosition,
    showTableDesigner,
    insertTable,
    addRowAbove,
    addRowBelow,
    addColumnLeft,
    addColumnRight,
    removeRow,
    removeColumn,
    removeTable,
    getCellPropertiesData,
    getTablePropertiesData,
    applyProperties,
    checkTableSelection,
  };
}
