import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useTableActions } from "../useTableActions";

/**
 * R29-3 — the TableDesigner popover survived its own "properties" actions.
 *
 * Destructive designer actions (remove row/column, delete table) close the
 * popover, but Cell Properties / Table Properties opened their modal and left
 * the designer standing: it sat UNDER the modal, and after Cancel it lingered
 * over the table — parked exactly where it was summoned (the right-clicked
 * cell), intercepting the user's next click into their own table. The e2e
 * suite caught it as "flaky": whether the leftover popover covered the first
 * cell depended on where the post-insert scroll landed.
 *
 * The fix follows the #R23-36 context-menu rule, including its focus half:
 * hand focus back to the editing surface BEFORE the modal opens, because the
 * modal captures document.activeElement at open as its close-restore target —
 * a designer button about to unmount would leave focus falling to <body>.
 */
describe("useTableActions - designer yields to the properties modal (R29-3)", () => {
  let host: HTMLDivElement;
  let table: HTMLTableElement;
  let cell: HTMLTableCellElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    host = document.createElement("div");
    host.contentEditable = "true";
    host.tabIndex = -1;
    table = document.createElement("table");
    const tbody = document.createElement("tbody");
    const row = document.createElement("tr");
    cell = document.createElement("td");
    cell.textContent = "x";
    row.appendChild(cell);
    tbody.appendChild(row);
    table.appendChild(tbody);
    host.appendChild(table);
    document.body.appendChild(host);
  });

  const build = (overrides: Record<string, unknown> = {}) => {
    const showTableDesigner = ref(true);
    const showTablePropertiesModal = ref(false);
    const openTablePropertiesModal = vi.fn();
    const actions = useTableActions({
      currentTable: ref(table),
      currentCell: ref(cell),
      showTableDesigner,
      showTablePropertiesModal,
      openTablePropertiesModal,
      initialCellProps: ref({}),
      initialTableProps: ref({}),
      tablePropertiesMode: ref("both" as const),
      onUpdate: vi.fn(),
      ...overrides,
    });
    return {
      actions,
      showTableDesigner,
      showTablePropertiesModal,
      openTablePropertiesModal,
    };
  };

  it("Table Properties closes the designer before the modal opens", () => {
    const { actions, showTableDesigner, openTablePropertiesModal } = build();

    actions.handleTableProperties();

    expect(openTablePropertiesModal).toHaveBeenCalledTimes(1);
    expect(showTableDesigner.value).toBe(false);
  });

  it("Cell Properties closes the designer too", () => {
    const { actions, showTableDesigner, showTablePropertiesModal } = build();

    actions.handleCellProperties();

    expect(showTablePropertiesModal.value).toBe(true);
    expect(showTableDesigner.value).toBe(false);
  });

  it("focus is back on the editing surface BY the time the modal opens", () => {
    const { actions, openTablePropertiesModal } = build();
    let activeAtOpen: Element | null = null;
    openTablePropertiesModal.mockImplementation(() => {
      activeAtOpen = document.activeElement;
    });

    actions.handleTableProperties();

    expect(activeAtOpen).toBe(host);
  });

  it("a non-modal action keeps the designer open for repeat use (control)", () => {
    const { actions, showTableDesigner } = build();

    actions.handleAddRowBelow();

    expect(showTableDesigner.value).toBe(true);
  });
});
