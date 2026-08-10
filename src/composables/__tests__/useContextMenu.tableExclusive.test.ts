import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useContextMenu } from "../useContextMenu";

// Mock commands utils so we can control table/cell resolution per test
vi.mock("../../utils/commands", () => ({
  getSelectedTable: vi.fn(() => null),
  getSelectedCell: vi.fn(() => null),
}));

/**
 * Regression tests for #49: right-clicking a table could suppress BOTH the
 * context menu and the table designer (they fought each other). A right-click
 * must resolve to exactly one of the two: the table designer for a resolvable
 * table context, or the generic context menu otherwise. Neither outcome may
 * leave both hidden.
 */
describe("useContextMenu - table vs context menu are mutually exclusive (#49)", () => {
  let editorElement: HTMLDivElement;
  let editorContent: Ref<HTMLElement | null>;
  let handleInlineAction: (tag: string) => void;
  let insertLink: () => void;
  let insertImage: () => void;
  let rememberSelection: () => void;
  let showTableDesigner: Ref<boolean>;
  let currentTable: Ref<HTMLTableElement | null>;
  let currentCell: Ref<HTMLTableCellElement | null>;
  let tableDesignerPosition: Ref<{ x: number; y: number }>;

  const makeOptions = () => ({
    editorContent,
    handleInlineAction,
    insertLink,
    insertImage,
    rememberSelection,
    showTableDesigner,
    currentTable,
    currentCell,
    tableDesignerPosition,
  });

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    // getBoundingClientRect in happy-dom returns zeros, which is a valid rect
    document.body.appendChild(editorElement);

    editorContent = ref<HTMLElement | null>(editorElement);
    handleInlineAction = vi.fn(() => {});
    insertLink = vi.fn(() => {});
    insertImage = vi.fn(() => {});
    rememberSelection = vi.fn(() => {});
    showTableDesigner = ref<boolean>(false);
    currentTable = ref<HTMLTableElement | null>(null);
    currentCell = ref<HTMLTableCellElement | null>(null);
    tableDesignerPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  it("shows only the table designer (not the context menu) on a resolvable table right-click", async () => {
    const { getSelectedTable, getSelectedCell } = await import(
      "../../utils/commands"
    );
    const mockTable = document.createElement("table");
    const mockCell = document.createElement("td");
    vi.mocked(getSelectedTable).mockReturnValue(mockTable);
    vi.mocked(getSelectedCell).mockReturnValue(mockCell);

    // Build the table inside the editor so target.closest("table, td, th") matches
    const table = document.createElement("table");
    const td = document.createElement("td");
    td.textContent = "Cell";
    table.appendChild(td);
    editorElement.appendChild(table);

    const { handleContextMenu, showContextMenu } = useContextMenu(makeOptions());

    const event = new MouseEvent("contextmenu", {
      clientX: 100,
      clientY: 200,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: td, enumerable: true });

    handleContextMenu(event);

    expect(showTableDesigner.value).toBe(true);
    // Context menu must stay hidden - the two must not both be shown
    expect(showContextMenu.value).toBe(false);
    // Exactly one of the two is visible
    expect(showTableDesigner.value !== showContextMenu.value).toBe(true);
  });

  it("falls back to the context menu when the table context cannot be resolved", async () => {
    const { getSelectedTable, getSelectedCell } = await import(
      "../../utils/commands"
    );
    // Right-click is on a table element, but selection-based resolution fails
    vi.mocked(getSelectedTable).mockReturnValue(null);
    vi.mocked(getSelectedCell).mockReturnValue(null);

    const table = document.createElement("table");
    const td = document.createElement("td");
    td.textContent = "Cell";
    table.appendChild(td);
    editorElement.appendChild(table);

    const { handleContextMenu, showContextMenu } = useContextMenu(makeOptions());

    const event = new MouseEvent("contextmenu", {
      clientX: 100,
      clientY: 200,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: td, enumerable: true });

    handleContextMenu(event);

    // The right-click must not be swallowed: the context menu is shown instead
    expect(showContextMenu.value).toBe(true);
    expect(showTableDesigner.value).toBe(false);
    expect(rememberSelection).toHaveBeenCalled();
    // Exactly one of the two is visible
    expect(showTableDesigner.value !== showContextMenu.value).toBe(true);
  });

  it("hides the table designer when a subsequent non-table right-click shows the context menu", async () => {
    const { getSelectedTable, getSelectedCell } = await import(
      "../../utils/commands"
    );
    vi.mocked(getSelectedTable).mockReturnValue(null);
    vi.mocked(getSelectedCell).mockReturnValue(null);

    const { handleContextMenu, showContextMenu } = useContextMenu(makeOptions());

    // Simulate the designer already being open from a prior interaction
    showTableDesigner.value = true;

    const event = new MouseEvent("contextmenu", {
      clientX: 50,
      clientY: 60,
      bubbles: true,
    });
    // target is plain text in the editor, not a table element
    const p = editorElement.querySelector("p") as HTMLElement;
    Object.defineProperty(event, "target", { value: p, enumerable: true });

    handleContextMenu(event);

    expect(showContextMenu.value).toBe(true);
    // The designer must be dismissed so the two never coexist
    expect(showTableDesigner.value).toBe(false);
    expect(showTableDesigner.value !== showContextMenu.value).toBe(true);
  });
});
