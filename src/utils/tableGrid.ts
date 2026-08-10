/**
 * Colspan/rowspan-aware VIRTUAL GRID for table operations.
 *
 * Pasted tables routinely carry merged cells (the sanitizer allowlists
 * colspan/rowspan), and once a cell spans, raw DOM cell indexes stop matching
 * VISUAL columns: `row.cells[2]` can sit in visual column 4, and `rows[0]` can
 * have a single DOM cell covering three columns. Every structural operation
 * (add/remove row/column) must therefore reason on this grid, never on DOM
 * indexes.
 */

export interface GridSlot {
  /** The DOM cell occupying this visual slot (shared across its span). */
  cell: HTMLTableCellElement;
  /** True only at the cell's top-left slot. */
  origin: boolean;
}

/**
 * Build the visual grid over ALL sections (thead + tbodies + tfoot) in
 * document order — `table.rows` order. Each grid row is a dense array of
 * slots; a cell with colspan/rowspan occupies several slots, `origin` marking
 * its top-left one.
 */
export function buildTableGrid(table: HTMLTableElement): GridSlot[][] {
  const rows = Array.from(table.rows);
  const grid: (GridSlot | undefined)[][] = rows.map(() => []);

  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of Array.from(row.cells)) {
      // Skip slots already claimed by rowspans from rows above.
      while (grid[r][c] !== undefined) c++;
      const colSpan = Math.max(1, cell.colSpan);
      const rowSpan = Math.max(1, cell.rowSpan);
      for (let dr = 0; dr < rowSpan && r + dr < grid.length; dr++) {
        for (let dc = 0; dc < colSpan; dc++) {
          grid[r + dr][c + dc] = {
            cell,
            origin: dr === 0 && dc === 0,
          };
        }
      }
      c += colSpan;
    }
  });

  // Densify: a ragged short row leaves trailing undefined slots — drop them so
  // consumers can rely on `grid[r].length` being that row's real visual width.
  return grid.map((row) => {
    const dense: GridSlot[] = [];
    for (const slot of row) {
      if (slot === undefined) break;
      dense.push(slot);
    }
    return dense;
  });
}

/** The table's visual column count (widest grid row). */
export function visualColumnCount(table: HTMLTableElement): number {
  const grid = buildTableGrid(table);
  return grid.reduce((max, row) => Math.max(max, row.length), 0);
}

/**
 * The visual column of a cell's top-left slot, or -1 when the cell is not in
 * this table.
 */
export function visualColumnOfCell(
  table: HTMLTableElement,
  cell: HTMLTableCellElement
): number {
  const grid = buildTableGrid(table);
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      if (row[c].cell === cell && row[c].origin) return c;
    }
  }
  return -1;
}
