import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useContextMenu } from "../useContextMenu";

// #10: the context menu must offer target-specific actions for a right-clicked
// link (Open/Copy/Remove Link) or image (Remove Image), and none of those for
// plain text.
describe("useContextMenu target-specific items", () => {
  let editor: HTMLDivElement;

  const makeMenu = () =>
    useContextMenu({
      editorContent: ref(editor),
      handleInlineAction: vi.fn(),
      insertLink: vi.fn(),
      insertImage: vi.fn(),
      rememberSelection: vi.fn(),
      showTableDesigner: ref(false),
      currentTable: ref(null),
      currentCell: ref(null),
      tableDesignerPosition: ref({ x: 0, y: 0 }),
      captureSnapshot: vi.fn(),
      emitUpdate: vi.fn(),
    });

  const rightClick = (
    handleContextMenu: (e: MouseEvent) => void,
    target: EventTarget | null
  ) =>
    handleContextMenu({
      preventDefault: () => {},
      clientX: 5,
      clientY: 5,
      target,
    } as unknown as MouseEvent);

  const ids = (items: { id?: string; divider?: boolean }[]) =>
    items.map((i) => i.id).filter(Boolean);

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
  });

  it("adds link actions when a link is right-clicked", () => {
    editor.innerHTML = '<p><a href="https://example.com">site</a></p>';
    const link = editor.querySelector("a")!;
    const { contextMenuItems, handleContextMenu } = makeMenu();

    rightClick(handleContextMenu, link);
    const menuIds = ids(contextMenuItems.value);
    expect(menuIds).toContain("open-link");
    expect(menuIds).toContain("copy-link");
    expect(menuIds).toContain("remove-link");
    expect(menuIds).not.toContain("remove-image");
  });

  it("Remove Link unwraps the anchor", () => {
    editor.innerHTML = '<p><a href="https://example.com">site</a></p>';
    const link = editor.querySelector("a")!;
    const { contextMenuItems, handleContextMenu } = makeMenu();

    rightClick(handleContextMenu, link);
    const removeLink = contextMenuItems.value.find(
      (i) => i.id === "remove-link"
    );
    removeLink?.onClick?.();

    expect(editor.querySelector("a")).toBeNull();
    expect(editor.textContent).toBe("site");
  });

  it("adds Remove Image when an image is right-clicked", () => {
    editor.innerHTML = '<p><img src="x.png" alt="x" /></p>';
    const img = editor.querySelector("img")!;
    const { contextMenuItems, handleContextMenu } = makeMenu();

    rightClick(handleContextMenu, img);
    const menuIds = ids(contextMenuItems.value);
    expect(menuIds).toContain("remove-image");
    expect(menuIds).not.toContain("open-link");

    const removeImage = contextMenuItems.value.find(
      (i) => i.id === "remove-image"
    );
    removeImage?.onClick?.();
    expect(editor.querySelector("img")).toBeNull();
  });

  it("adds no target items for plain text", () => {
    editor.innerHTML = "<p>plain text</p>";
    const p = editor.querySelector("p")!;
    const { contextMenuItems, handleContextMenu } = makeMenu();

    rightClick(handleContextMenu, p);
    const menuIds = ids(contextMenuItems.value);
    expect(menuIds).not.toContain("open-link");
    expect(menuIds).not.toContain("remove-image");
  });
});
