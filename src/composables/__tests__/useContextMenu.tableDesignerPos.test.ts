import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, type Ref } from "vue";
import { useContextMenu } from "../useContextMenu";
import * as commands from "../../utils/commands";

vi.mock("../../utils/commands", () => ({
  getSelectedTable: vi.fn(),
  getSelectedCell: vi.fn(),
}));

/**
 * The TableDesigner is position:absolute inside `.next-level-editor` (the
 * containing block), but its coordinates were computed against `.editor-content`
 * — a CENTERED column inset from the container by (containerWidth-measure)/2.
 * So the designer rendered ~190px left of the cell the user right-clicked in a
 * wide editor. Coordinates must be relative to the container, and clamped so
 * the tall menu is not clipped by the container's overflow:hidden.
 */
describe("useContextMenu: TableDesigner position is container-relative", () => {
  let container: HTMLDivElement;
  let editorContent: Ref<HTMLElement | null>;
  let showTableDesigner: Ref<boolean>;
  let currentTable: Ref<HTMLTableElement | null>;
  let currentCell: Ref<HTMLTableCellElement | null>;
  let tableDesignerPosition: Ref<{ x: number; y: number }>;
  let cell: HTMLTableCellElement;

  const rect = (partial: Partial<DOMRect>): DOMRect =>
    ({
      top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0,
      toJSON: () => ({}),
      ...partial,
    }) as DOMRect;

  beforeEach(() => {
    container = document.createElement("div");
    container.className = "next-level-editor";
    const content = document.createElement("div");
    content.className = "editor-content";
    content.setAttribute("contenteditable", "true");
    content.innerHTML =
      "<table><tbody><tr><td>cell</td></tr></tbody></table>";
    container.appendChild(content);
    document.body.appendChild(container);

    // Wide editor: the content column is centered, inset 190px on the left.
    container.getBoundingClientRect = () =>
      rect({ left: 0, top: 0, width: 1200, height: 900, right: 1200, bottom: 900 });
    content.getBoundingClientRect = () =>
      rect({ left: 190, top: 0, width: 820, height: 900, right: 1010, bottom: 900 });

    editorContent = ref<HTMLElement | null>(content);
    showTableDesigner = ref(false);
    currentTable = ref<HTMLTableElement | null>(null);
    currentCell = ref<HTMLTableCellElement | null>(null);
    tableDesignerPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });

    cell = container.querySelector("td")!;
    vi.mocked(commands.getSelectedTable).mockReturnValue(
      container.querySelector("table")
    );
    vi.mocked(commands.getSelectedCell).mockReturnValue(cell);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  const build = () =>
    useContextMenu({
      editorContent,
      handleInlineAction: vi.fn(),
      insertLink: vi.fn(),
      insertImage: vi.fn(),
      rememberSelection: vi.fn(),
      showTableDesigner,
      currentTable,
      currentCell,
      tableDesignerPosition,
    });

  const rightClick = (clientX: number, clientY: number) => {
    const event = new MouseEvent("contextmenu", {
      clientX,
      clientY,
      cancelable: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: cell });
    return event;
  };

  it("positions relative to .next-level-editor, not the centered content column", () => {
    const { handleContextMenu } = build();
    // Right-click a cell at viewport x=600 (middle of the wide editor).
    handleContextMenu(rightClick(600, 100));

    expect(showTableDesigner.value).toBe(true);
    // Container-relative x = 600 - 0 = 600 (NOT 600 - 190 = 410).
    expect(tableDesignerPosition.value.x).toBe(600);
    expect(tableDesignerPosition.value.y).toBe(100);
  });

  it("clamps y so the tall menu is not clipped at the container's bottom", () => {
    const { handleContextMenu } = build();
    // Right-click near the bottom edge (y=850 of a 900-tall container).
    handleContextMenu(rightClick(600, 850));

    expect(showTableDesigner.value).toBe(true);
    // The ~420px menu can't start at 850 in a 900px container — clamp upward.
    expect(tableDesignerPosition.value.y).toBeLessThan(850);
    expect(tableDesignerPosition.value.y).toBeGreaterThanOrEqual(0);
  });
});
