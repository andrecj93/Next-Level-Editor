import { describe, it, expect, afterEach } from "vitest";
import { getTableProperties } from "../commands";

// Regression coverage for the borderless-table read: getTableProperties used
// `Number.parseInt(borderWidth) || 1`, which reports a genuinely borderless
// (0px) table as width 1. It now NaN-guards the parse so 0 round-trips.
function makeTable(border: {
  width?: string;
  style?: string;
  color?: string;
}): HTMLTableElement {
  const table = document.createElement("table");
  const td = document.createElement("td");
  if (border.width !== undefined) td.style.borderWidth = border.width;
  if (border.style !== undefined) td.style.borderStyle = border.style;
  if (border.color !== undefined) td.style.borderColor = border.color;
  const tr = document.createElement("tr");
  tr.appendChild(td);
  const tbody = document.createElement("tbody");
  tbody.appendChild(tr);
  table.appendChild(tbody);
  document.body.appendChild(table);
  return table;
}

describe("getTableProperties border width", () => {
  const created: HTMLTableElement[] = [];
  afterEach(() => {
    created.forEach((t) => t.remove());
    created.length = 0;
  });

  it("reads a borderless (0px) table as width 0, not the default 1", () => {
    const table = makeTable({ width: "0px", style: "solid" });
    created.push(table);
    expect(getTableProperties(table).borderWidth).toBe(0);
  });

  it("reads a non-zero border width faithfully", () => {
    const table = makeTable({ width: "6px", style: "solid" });
    created.push(table);
    expect(getTableProperties(table).borderWidth).toBe(6);
  });

  it("falls back to the default 1 when no border width is set/parseable", () => {
    const table = makeTable({ style: "solid" });
    created.push(table);
    expect(getTableProperties(table).borderWidth).toBe(1);
  });
});
