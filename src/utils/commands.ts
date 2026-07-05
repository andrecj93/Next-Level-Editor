/**
 * Command definitions for slash commands and toolbar actions
 */

export interface EditorCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon?: string;
  execute: () => void;
}

/**
 * Get word count from HTML content
 * @param html - HTML content
 * @returns Word count
 */
export function getWordCount(html: string): number {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const text = temp.innerText || temp.textContent || "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Get character count from HTML content (including spaces)
 * @param html - HTML content
 * @returns Character count with spaces
 */
export function getCharacterCount(html: string): number {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const text = temp.innerText || temp.textContent || "";
  return text.length;
}

/**
 * Get character count excluding spaces
 * @param html - HTML content
 * @returns Character count without spaces
 */
export function getCharacterCountWithoutSpaces(html: string): number {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const text = temp.innerText || temp.textContent || "";
  return text.replace(/\s/g, "").length;
}

/**
 * Apply font size to selected text or block
 * @param root - Editor root element
 * @param size - Font size (small, normal, large, huge)
 */
export function applyFontSize(
  _root: HTMLElement,
  size: "small" | "normal" | "large" | "huge"
) {
  const sizeMap = {
    small: "0.875em",
    normal: "1em",
    large: "1.25em",
    huge: "1.75em",
  };

  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // At caret position, wrap future text
    const span = document.createElement("span");
    span.style.fontSize = sizeMap[size];
    span.textContent = "\u200B"; // Zero-width space
    range.insertNode(span);
    range.selectNodeContents(span);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Wrap selection in span with font size
    const span = document.createElement("span");
    span.style.fontSize = sizeMap[size];
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    // Restore selection to include the newly created span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

/**
 * Apply text alignment to selected block
 * @param root - Editor root element
 * @param alignment - Text alignment (left, center, right, justify)
 */
export function applyTextAlignment(
  root: HTMLElement,
  alignment: "left" | "center" | "right" | "justify"
) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  // Get the element - if commonAncestorContainer is a text node, use its parent
  let element = range.commonAncestorContainer;
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement as HTMLElement;
  } else {
    element = element as HTMLElement;
  }

  // Helper function to check if an element is a block element that can have text alignment
  const isAlignableBlock = (el: HTMLElement | null): boolean => {
    if (!el?.tagName) return false;
    const tagName = el.tagName.toLowerCase();
    return [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "div",
      "li",
      "blockquote",
    ].includes(tagName);
  };

  // If the common ancestor is the root or very close to it, apply to all block children in the selection
  if (element === root || element?.parentElement === root) {
    // Get all block elements that are at least partially within the selection
    const blockElements: HTMLElement[] = [];

    const collectBlocks = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (isAlignableBlock(el)) {
          blockElements.push(el);
        }
        // Recurse into children
        Array.from(node.childNodes).forEach(collectBlocks);
      }
    };

    // Collect all block elements within the range
    if (element === root) {
      // Select all scenario - apply to all direct block children
      Array.from(root.childNodes).forEach(collectBlocks);
    } else {
      // Apply to the element itself if it's a block
      collectBlocks(element);
    }

    // Apply alignment to all collected blocks
    blockElements.forEach((block) => {
      block.style.textAlign = alignment;
    });

    if (blockElements.length > 0) return;
  }

  // Find the closest block element (original behavior for single element selection)
  while (element && element !== root) {
    if (isAlignableBlock(element as HTMLElement)) {
      (element as HTMLElement).style.textAlign = alignment;
      return;
    }
    const parent = (element as HTMLElement).parentElement;
    if (!parent) break;
    element = parent;
  }
}

/**
 * Apply text color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
export function applyTextColor(_root: HTMLElement, color: string) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // Insert a span with color at caret position
    const span = document.createElement("span");
    span.style.color = color;
    span.textContent = "\u200B"; // Zero-width space
    range.insertNode(span);
    range.selectNodeContents(span);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Wrap selection in span with color
    const span = document.createElement("span");
    span.style.color = color;
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    // Restore selection to include the newly created span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

/**
 * Apply background color to selection
 * @param root - Editor root element
 * @param color - Color value (hex, rgb, etc.)
 */
export function applyBackgroundColor(_root: HTMLElement, color: string) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    const span = document.createElement("span");
    span.style.backgroundColor = color;
    // Ensure text contrast in dark mode
    span.style.color = getContrastColor(color);
    span.style.padding = "2px 4px";
    span.style.borderRadius = "2px";
    span.textContent = "\u200B";
    range.insertNode(span);
    range.selectNodeContents(span);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    const span = document.createElement("span");
    span.style.backgroundColor = color;
    // Ensure text contrast in dark mode
    span.style.color = getContrastColor(color);
    span.style.padding = "2px 4px";
    span.style.borderRadius = "2px";
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    // Restore selection to include the newly created span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

/**
 * Get contrast color (black or white) based on background luminance
 */
function getContrastColor(bgColor: string): string {
  // Convert hex to RGB
  let r = 0,
    g = 0,
    b = 0;

  if (bgColor.startsWith("#")) {
    const hex = bgColor.replace("#", "");
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (bgColor.startsWith("rgb")) {
    const matches = bgColor.match(/\d+/g);
    if (matches && matches.length >= 3) {
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    }
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Insert horizontal rule
 */
export function insertHorizontalRule() {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const hr = document.createElement("hr");
  range.deleteContents();
  range.insertNode(hr);

  // Move cursor after HR
  const newRange = document.createRange();
  newRange.setStartAfter(hr);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * Check if cursor is inside a list and exit list context if needed
 * @returns The range to use for insertion (either original or adjusted)
 */
function exitListContextIfNeeded(selection: Selection): Range | null {
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.startContainer;

  // Find if we're inside a list
  let list: HTMLElement | null = null;

  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "UL" || element.tagName === "OL") {
        list = element;
        break;
      }
    }
    node = node.parentNode;
  }

  // If we're inside a list, insert after the list instead
  if (list) {
    const newRange = document.createRange();
    newRange.setStartAfter(list);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return newRange;
  }

  return range;
}

/**
 * Insert a table at the current cursor position
 * @param root - Editor root element
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @param includeHeader - Whether to include a header row
 */
export function insertTable(
  _root: HTMLElement,
  rows: number,
  cols: number,
  includeHeader: boolean
) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  // Exit list context if we're inside a list
  const range = exitListContextIfNeeded(selection);
  if (!range) return;

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "16px";
  table.style.marginBottom = "16px";

  // Create header row if needed
  if (includeHeader) {
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (let j = 0; j < cols; j++) {
      const th = document.createElement("th");
      th.style.border = "1px solid #d1d5db";
      th.style.padding = "8px 12px";
      th.style.backgroundColor = "#f3f4f6";
      th.style.fontWeight = "600";
      th.style.textAlign = "left";
      th.style.color = "#111827"; // Override any inherited text color
      th.textContent = `Header ${j + 1}`;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // Create body rows
  const tbody = document.createElement("tbody");
  const totalRows = includeHeader ? rows - 1 : rows;

  for (let i = 0; i < totalRows; i++) {
    const tr = document.createElement("tr");

    for (let j = 0; j < cols; j++) {
      const td = document.createElement("td");
      td.style.border = "1px solid #d1d5db";
      td.style.padding = "8px 12px";
      td.textContent = "\u00A0"; // Non-breaking space
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  range.deleteContents();
  range.insertNode(table);

  // Move cursor after table
  const newRange = document.createRange();
  newRange.setStartAfter(table);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * Search and replace text in content
 * @param html - HTML content
 * @param searchText - Text to search for
 * @param replaceText - Text to replace with
 * @param options - Search options
 * @returns Modified HTML
 */
export function searchAndReplace(
  html: string,
  searchText: string,
  replaceText: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): string {
  if (!searchText) return html;

  let flags = "g";
  if (!options.caseSensitive) flags += "i";

  let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);

  const temp = document.createElement("div");
  temp.innerHTML = html;

  const replaceInTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        node.textContent = node.textContent.replace(regex, replaceText);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(replaceInTextNodes);
    }
  };

  replaceInTextNodes(temp);
  return temp.innerHTML;
}

/**
 * Get the table element containing the current selection
 * @returns The table element or null
 */
export function getSelectedTable(): HTMLTableElement | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node = selection.anchorNode;
  while (node && node !== document.body) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).tagName === "TABLE"
    ) {
      return node as HTMLTableElement;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Get the table cell (td or th) containing the current selection
 * @returns The cell element or null
 */
export function getSelectedCell(): HTMLTableCellElement | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node = selection.anchorNode;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "TD" || element.tagName === "TH") {
        return element as HTMLTableCellElement;
      }
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Add a row to a table at the specified position
 * @param table - The table element
 * @param atIndex - Index where to insert the row (default: end)
 */
export function addTableRow(table: HTMLTableElement, atIndex?: number): void {
  const tbody =
    table.tBodies[0] || table.appendChild(document.createElement("tbody"));
  const rows = Array.from(tbody.getElementsByTagName("tr"));
  const existingRow = rows[0];
  if (!existingRow) return;

  const cols = existingRow.cells.length;
  const newRow = document.createElement("tr");

  for (let i = 0; i < cols; i++) {
    const cell = document.createElement("td");
    cell.style.border = "1px solid #d1d5db";
    cell.style.padding = "8px 12px";
    cell.textContent = "\u00A0"; // Non-breaking space
    newRow.appendChild(cell);
  }

  if (atIndex !== undefined && atIndex < rows.length) {
    tbody.insertBefore(newRow, rows[atIndex]);
  } else {
    tbody.appendChild(newRow);
  }
}

/**
 * Remove a row from a table
 * @param table - The table element
 * @param rowIndex - Index of the row to remove
 */
export function removeTableRow(
  table: HTMLTableElement,
  rowIndex: number
): void {
  const tbody = table.tBodies[0];
  if (!tbody) return;

  const rows = Array.from(tbody.getElementsByTagName("tr"));
  if (rows.length <= 1) return; // Keep at least one row

  if (rows[rowIndex]) {
    rows[rowIndex].remove();
  }
}

/**
 * Add a header cell to a table header row
 * @param headerRow - The header row element
 * @param atIndex - Index where to insert the column (default: end)
 */
function addHeaderCell(headerRow: HTMLTableRowElement, atIndex?: number): void {
  const th = document.createElement("th");
  th.style.border = "1px solid #d1d5db";
  th.style.padding = "8px 12px";
  th.style.backgroundColor = "#f3f4f6";
  th.style.fontWeight = "600";
  th.style.textAlign = "left";
  th.style.color = "#111827"; // Override any inherited text color
  th.textContent = `Header ${(atIndex ?? headerRow.cells.length) + 1}`;

  const cells = Array.from(headerRow.cells);
  if (atIndex !== undefined && atIndex < cells.length) {
    headerRow.insertBefore(th, cells[atIndex]);
  } else {
    headerRow.appendChild(th);
  }
}

/**
 * Add a body cell to a table row
 * @param row - The table row element
 * @param atIndex - Index where to insert the column (default: end)
 */
function addBodyCell(row: HTMLTableRowElement, atIndex?: number): void {
  const td = document.createElement("td");
  td.style.border = "1px solid #d1d5db";
  td.style.padding = "8px 12px";
  td.textContent = "\u00A0"; // Non-breaking space

  const cells = Array.from(row.cells);
  if (atIndex !== undefined && atIndex < cells.length) {
    row.insertBefore(td, cells[atIndex]);
  } else {
    row.appendChild(td);
  }
}

/**
 * Add a column to a table
 * @param table - The table element
 * @param atIndex - Index where to insert the column (default: end)
 */
export function addTableColumn(
  table: HTMLTableElement,
  atIndex?: number
): void {
  // Add to header if exists
  if (table.tHead) {
    const headerRows = Array.from(table.tHead.getElementsByTagName("tr"));
    if (headerRows.length > 0) {
      addHeaderCell(headerRows[0], atIndex);
    }
  }

  // Add to body rows
  const tbody = table.tBodies[0];
  if (tbody) {
    const bodyRows = Array.from(tbody.getElementsByTagName("tr"));
    bodyRows.forEach((row) => {
      addBodyCell(row, atIndex);
    });
  }
}

/**
 * Remove a column from a table
 * @param table - The table element
 * @param colIndex - Index of the column to remove
 */
export function removeTableColumn(
  table: HTMLTableElement,
  colIndex: number
): void {
  // Check if we have at least 2 columns by finding max column count
  const allRows = Array.from(table.getElementsByTagName("tr"));
  const maxCols = Math.max(...allRows.map((row) => row.cells.length));
  if (maxCols <= 1) return; // Keep at least one column

  // Remove from header
  if (table.tHead) {
    const headerRows = Array.from(table.tHead.getElementsByTagName("tr"));
    if (headerRows.length > 0) {
      const headerRow = headerRows[0];
      const cells = Array.from(headerRow.cells);
      if (cells[colIndex]) {
        cells[colIndex].remove();
      }
    }
  }

  // Remove from body rows
  const tbody = table.tBodies[0];
  if (tbody) {
    const bodyRows = Array.from(tbody.getElementsByTagName("tr"));
    for (const row of bodyRows) {
      const cells = Array.from(row.cells);
      if (cells[colIndex]) {
        cells[colIndex].remove();
      }
    }
  }
}

/**
 * Delete the entire table
 * @param table - The table element
 */
export function deleteTable(table: HTMLTableElement): void {
  table.remove();
}

/**
 * Apply properties to a table cell
 * @param cell - The table cell element
 * @param properties - Cell properties to apply
 */
export function applyCellProperties(
  cell: HTMLTableCellElement,
  properties: {
    backgroundColor?: string;
    textAlign?: string;
    verticalAlign?: string;
    padding?: number;
    width?: string;
    height?: string;
  }
): void {
  if (properties.backgroundColor !== undefined) {
    if (properties.backgroundColor) {
      cell.style.backgroundColor = properties.backgroundColor;
    } else {
      cell.style.backgroundColor = "";
    }
  }

  if (properties.textAlign !== undefined) {
    cell.style.textAlign = properties.textAlign;
  }

  if (properties.verticalAlign !== undefined) {
    cell.style.verticalAlign = properties.verticalAlign;
  }

  if (properties.padding !== undefined) {
    cell.style.padding = `${properties.padding}px`;
  }

  if (properties.width !== undefined) {
    cell.style.width = properties.width || "";
  }

  if (properties.height !== undefined) {
    cell.style.height = properties.height || "";
  }
}

/**
 * Apply properties to a table
 * @param table - The table element
 * @param properties - Table properties to apply
 */
export function applyTableProperties(
  table: HTMLTableElement,
  properties: {
    borderStyle?: string;
    borderWidth?: number;
    borderColor?: string;
    width?: string;
    backgroundColor?: string;
    borderCollapse?: boolean;
  }
): void {
  if (
    properties.borderStyle ||
    properties.borderWidth !== undefined ||
    properties.borderColor
  ) {
    const width = properties.borderWidth ?? 1;
    const style = properties.borderStyle || "solid";
    const color = properties.borderColor || "#d1d5db";

    // Apply to all cells
    const allCells = table.getElementsByTagName("td");
    const allHeaders = table.getElementsByTagName("th");

    const cells = [...Array.from(allCells), ...Array.from(allHeaders)];
    cells.forEach((cell) => {
      if (style === "none") {
        cell.style.border = "none";
      } else {
        cell.style.border = `${width}px ${style} ${color}`;
      }
    });
  }

  if (properties.width !== undefined) {
    table.style.width = properties.width;
  }

  if (properties.backgroundColor !== undefined) {
    if (properties.backgroundColor) {
      table.style.backgroundColor = properties.backgroundColor;
    } else {
      table.style.backgroundColor = "";
    }
  }

  if (properties.borderCollapse !== undefined) {
    table.style.borderCollapse = properties.borderCollapse
      ? "collapse"
      : "separate";
  }
}

/**
 * Get current cell properties
 * @param cell - The table cell element
 * @returns Current cell properties
 */
export function getCellProperties(cell: HTMLTableCellElement): {
  backgroundColor: string;
  textAlign: string;
  verticalAlign: string;
  padding: number;
  width: string;
  height: string;
} {
  const computedStyle = globalThis.getComputedStyle(cell);
  const padding = Number.parseInt(computedStyle.padding) || 8;

  return {
    backgroundColor: cell.style.backgroundColor || "",
    textAlign: cell.style.textAlign || computedStyle.textAlign || "left",
    verticalAlign:
      cell.style.verticalAlign || computedStyle.verticalAlign || "middle",
    padding: padding,
    width: cell.style.width || "",
    height: cell.style.height || "",
  };
}

/**
 * Get current table properties
 * @param table - The table element
 * @returns Current table properties
 */
/**
 * Normalize a CSS color to #rrggbb hex so it can populate an
 * <input type="color"> (which cannot parse rgb()/rgba() strings and would
 * otherwise fall back to black). Passes through empty values and existing hex.
 */
export function normalizeColorToHex(color: string): string {
  if (!color) return "";
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    // Expand shorthand #abc -> #aabbcc
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return (
        "#" +
        trimmed
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      ).toLowerCase();
    }
    return trimmed.toLowerCase();
  }
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
  );
  if (rgbMatch) {
    const toHex = (n: string) =>
      Math.max(0, Math.min(255, Number.parseInt(n, 10)))
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
  return trimmed;
}

export function getTableProperties(table: HTMLTableElement): {
  borderStyle: string;
  borderWidth: number;
  borderColor: string;
  width: string;
  backgroundColor: string;
  borderCollapse: boolean;
} {
  const computedStyle = globalThis.getComputedStyle(table);

  // Get border properties from first cell
  const firstCell = table.querySelector<HTMLTableCellElement>("td, th");
  let borderStyle = "solid";
  let borderWidth = 1;
  let borderColor = "#d1d5db";

  if (firstCell) {
    const cellStyle = globalThis.getComputedStyle(firstCell);
    borderStyle = cellStyle.borderStyle || "solid";
    borderWidth = Number.parseInt(cellStyle.borderWidth) || 1;
    // Normalize to hex so the color input shows the real color, not black.
    borderColor = normalizeColorToHex(cellStyle.borderColor) || "#d1d5db";
  }

  return {
    borderStyle,
    borderWidth,
    borderColor,
    width: table.style.width || computedStyle.width || "100%",
    backgroundColor: normalizeColorToHex(table.style.backgroundColor),
    borderCollapse: computedStyle.borderCollapse === "collapse",
  };
}
