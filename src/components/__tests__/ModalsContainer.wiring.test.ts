import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import ModalsContainer from "../ModalsContainer.vue";
import TableModal from "../TableModal.vue";
import FindReplaceModal from "../FindReplaceModal.vue";
import CodeBlockModal from "../CodeBlockModal.vue";
import TableDesigner from "../TableDesigner.vue";
import TablePropertiesModal from "../TablePropertiesModal.vue";
import EmojiPicker from "../EmojiPicker.vue";
import LinkModal from "../LinkModal.vue";
import ImageUploadModal from "../ImageUploadModal.vue";
import EmbedModal from "../EmbedModal.vue";
import FileManagerModal from "../FileManagerModal.vue";
import TemplateModal from "../TemplateModal.vue";
import HtmlCodeModal from "../HtmlCodeModal.vue";
import CommandPalette from "../CommandPalette.vue";
import { fileManager } from "../../utils/fileManager";

// This suite mounts ModalsContainer with its REAL child components (no
// vi.mock), unlike the existing ModalsContainer.test.ts which stubs every
// child. That lets us exercise the genuine behaviour of the switcher:
//   - each child's own `v-if` (on show/isOpen) really renders/omits its dialog
//   - the `theme` prop really lands as a class on the teleported overlays
//   - a real DOM interaction inside a child (button click / typed input) makes
//     the child emit, and the container re-emits the mapped outward event
//
// Five modals (Table / FindReplace / CodeBlock / TableProperties / HtmlCode)
// render their root through <teleport to="body">. `stubs: { teleport: true }`
// keeps that teleported content inline in the component subtree so wrapper
// queries and findComponent(...).find(...) can reach it. Vue's <transition>
// wrapping the `v-if` is stubbed by @vue/test-utils by default, so the content
// renders synchronously with no enter/leave timing to await.

// All show-flags default to false; the object is spread and selectively
// overridden per test. `as const` keeps the literal-union props (toastType,
// tablePropertiesMode) narrow.
const baseProps = {
  showTableModal: false,
  showFindReplaceModal: false,
  showCodeBlockModal: false,
  showTableDesigner: false,
  showTablePropertiesModal: false,
  showEmojiPicker: false,
  showLinkModal: false,
  showImageUploadModal: false,
  showEmbedModal: false,
  showFileManagerModal: false,
  showTemplateModal: false,
  showHtmlCodeModal: false,
  showCommandPalette: false,
  showToast: false,
  isSaving: false,
  editorContent: "",
  tableDesignerPosition: { x: 0, y: 0 },
  tablePropertiesMode: "both" as const,
  initialCellProps: {} as Record<string, unknown>,
  initialTableProps: {} as Record<string, unknown>,
  formattedHtmlContent: "",
  commandPaletteCommands: [] as unknown[],
  lastSaved: null as Date | null,
  toastMessage: "",
  toastType: "success" as const,
};

type ContainerProps = InstanceType<typeof ModalsContainer>["$props"];

const mountContainer = (overrides: Record<string, unknown> = {}) =>
  mount(ModalsContainer, {
    props: { ...baseProps, ...overrides } as ContainerProps,
    global: { stubs: { teleport: true } },
  });

// Find a <button> inside a scope by its exact (trimmed) visible text.
const buttonByText = (
  scope: VueWrapper | ReturnType<VueWrapper["findComponent"]>,
  text: string
) => {
  const btn = scope.findAll("button").find((b) => b.text().trim() === text);
  if (!btn) throw new Error(`No <button> with text "${text}"`);
  return btn;
};

afterEach(() => {
  vi.restoreAllMocks();
  // Isolate the fileManager singleton (module-level, localStorage-backed).
  fileManager.clearAll();
});

// ---------------------------------------------------------------------------
// 1. Each child's v-if branch: real dialog content appears only when its flag
//    is set, and is absent otherwise.
// ---------------------------------------------------------------------------
describe("ModalsContainer — conditional rendering of each real modal", () => {
  const MODALS = [
    { name: "TableModal", flag: "showTableModal", comp: TableModal, sel: ".modal-content" },
    { name: "FindReplaceModal", flag: "showFindReplaceModal", comp: FindReplaceModal, sel: ".find-replace-modal" },
    { name: "CodeBlockModal", flag: "showCodeBlockModal", comp: CodeBlockModal, sel: ".code-block-modal" },
    { name: "TableDesigner", flag: "showTableDesigner", comp: TableDesigner, sel: ".table-designer" },
    { name: "TablePropertiesModal", flag: "showTablePropertiesModal", comp: TablePropertiesModal, sel: ".modal-content" },
    { name: "LinkModal", flag: "showLinkModal", comp: LinkModal, sel: "#link-modal-title" },
    { name: "ImageUploadModal", flag: "showImageUploadModal", comp: ImageUploadModal, sel: "#modal-title" },
    { name: "EmbedModal", flag: "showEmbedModal", comp: EmbedModal, sel: "#modal-title" },
    { name: "FileManagerModal", flag: "showFileManagerModal", comp: FileManagerModal, sel: ".file-manager-modal" },
    { name: "TemplateModal", flag: "showTemplateModal", comp: TemplateModal, sel: ".template-modal" },
    { name: "HtmlCodeModal", flag: "showHtmlCodeModal", comp: HtmlCodeModal, sel: ".html-code-modal" },
    { name: "CommandPalette", flag: "showCommandPalette", comp: CommandPalette, sel: ".command-palette" },
  ] as const;

  for (const { name, flag, comp, sel } of MODALS) {
    it(`does NOT render ${name}'s dialog while ${flag} is false`, () => {
      const w = mountContainer();
      // The component instance is always mounted by the container; only its
      // internal v-if content should be absent.
      expect(w.findComponent(comp).exists()).toBe(true);
      expect(w.findComponent(comp).find(sel).exists()).toBe(false);
      w.unmount();
    });

    it(`renders ${name}'s dialog once ${flag} becomes true`, () => {
      const w = mountContainer({ [flag]: true });
      expect(w.findComponent(comp).find(sel).exists()).toBe(true);
      w.unmount();
    });
  }

  it("toggling a flag off tears the real dialog back down", async () => {
    const w = mountContainer({ showLinkModal: true });
    expect(w.findComponent(LinkModal).find("#link-modal-title").exists()).toBe(
      true
    );
    await w.setProps({ showLinkModal: false });
    expect(w.findComponent(LinkModal).find("#link-modal-title").exists()).toBe(
      false
    );
    w.unmount();
  });

  it("wraps the EmojiPicker in the container's own .emoji-picker-overlay v-if", () => {
    const closed = mountContainer();
    expect(closed.find(".emoji-picker-overlay").exists()).toBe(false);
    // Unlike the always-mounted modals (whose own v-if hides content), the
    // EmojiPicker itself lives behind the container's v-if, so the component
    // is not even instantiated while closed.
    expect(closed.findComponent(EmojiPicker).exists()).toBe(false);
    closed.unmount();

    const open = mountContainer({ showEmojiPicker: true });
    expect(open.find(".emoji-picker-overlay").exists()).toBe(true);
    expect(open.findComponent(EmojiPicker).find(".emoji-picker").exists()).toBe(
      true
    );
    open.unmount();
  });
});

// ---------------------------------------------------------------------------
// 2. theme threading onto the teleported children.
// ---------------------------------------------------------------------------
describe("ModalsContainer — theme prop threading", () => {
  const THEME_MODALS = [
    { name: "TableModal", flag: "showTableModal", comp: TableModal },
    { name: "FindReplaceModal", flag: "showFindReplaceModal", comp: FindReplaceModal },
    { name: "CodeBlockModal", flag: "showCodeBlockModal", comp: CodeBlockModal },
    { name: "TablePropertiesModal", flag: "showTablePropertiesModal", comp: TablePropertiesModal },
    { name: "HtmlCodeModal", flag: "showHtmlCodeModal", comp: HtmlCodeModal },
  ] as const;

  for (const { name, flag, comp } of THEME_MODALS) {
    it(`forwards theme="theme-dark" onto ${name}'s teleported overlay`, () => {
      const w = mountContainer({ theme: "theme-dark", [flag]: true });
      const overlay = w.findComponent(comp).get(".modal-overlay");
      expect(overlay.classes()).toContain("theme-dark");
      w.unmount();
    });

    it(`${name} falls back to theme-light when the container omits theme`, () => {
      const w = mountContainer({ [flag]: true });
      const overlay = w.findComponent(comp).get(".modal-overlay");
      expect(overlay.classes()).toContain("theme-light");
      w.unmount();
    });
  }

  it("does NOT leak theme onto modals the container never wires it to (LinkModal)", () => {
    const w = mountContainer({ theme: "theme-dark", showLinkModal: true });
    const overlay = w.findComponent(LinkModal).get(".modal-overlay");
    expect(overlay.classes()).not.toContain("theme-dark");
    w.unmount();
  });
});

// ---------------------------------------------------------------------------
// 3. Child emits -> container re-emits, driven through the REAL child DOM.
// ---------------------------------------------------------------------------
describe("ModalsContainer — re-emits driven by real child interactions", () => {
  it("TableModal: Insert Table -> insert-table (+ close-table-modal), Cancel -> close-table-modal", async () => {
    const w = mountContainer({ showTableModal: true });
    const c = w.findComponent(TableModal);

    await buttonByText(c, "Insert Table").trigger("click");
    expect(w.emitted("insert-table")?.[0]).toEqual([
      { rows: 3, cols: 3, includeHeader: true },
    ]);
    // insertTable() also closes the modal.
    expect(w.emitted("close-table-modal")).toBeTruthy();
    w.unmount();

    const w2 = mountContainer({ showTableModal: true });
    await buttonByText(w2.findComponent(TableModal), "Cancel").trigger("click");
    expect(w2.emitted("close-table-modal")).toBeTruthy();
    expect(w2.emitted("insert-table")).toBeUndefined();
    w2.unmount();
  });

  it("FindReplaceModal: Enter -> find, Replace -> replace, Replace All -> replace-all, ✕ -> close-find-replace-modal", async () => {
    const w = mountContainer({
      showFindReplaceModal: true,
      editorContent: "foo bar foo",
    });
    const c = w.findComponent(FindReplaceModal);

    await c.get("#find-input").setValue("foo"); // matches computed -> 2

    await c.get("#find-input").trigger("keydown", { key: "Enter" });
    expect(w.emitted("find")?.[0]).toEqual([
      { findText: "foo", direction: "next" },
    ]);

    await buttonByText(c, "Replace").trigger("click");
    const replace = w.emitted("replace");
    expect(replace).toBeTruthy();
    expect(replace![0][0]).toMatchObject({ findText: "foo", replaceText: "" });

    await buttonByText(c, "Replace All").trigger("click");
    const replaceAll = w.emitted("replace-all");
    expect(replaceAll).toBeTruthy();
    expect(replaceAll![0][0]).toMatchObject({ findText: "foo" });

    await c.get(".close-btn").trigger("click");
    expect(w.emitted("close-find-replace-modal")).toBeTruthy();
    w.unmount();
  });

  it("CodeBlockModal: typing + Insert Code -> insert-code-block, Cancel -> close-code-block-modal", async () => {
    const w = mountContainer({ showCodeBlockModal: true });
    const c = w.findComponent(CodeBlockModal);

    await c.get("#code-input").setValue("const x = 1");
    await buttonByText(c, "Insert Code").trigger("click");
    expect(w.emitted("insert-code-block")?.[0]).toEqual([
      { code: "const x = 1", language: "javascript" },
    ]);
    // insert also closes.
    expect(w.emitted("close-code-block-modal")).toBeTruthy();
    w.unmount();

    const w2 = mountContainer({ showCodeBlockModal: true });
    await buttonByText(w2.findComponent(CodeBlockModal), "Cancel").trigger(
      "click"
    );
    expect(w2.emitted("close-code-block-modal")).toBeTruthy();
    expect(w2.emitted("insert-code-block")).toBeUndefined();
    w2.unmount();
  });

  it("TableDesigner: every control button maps to its outward event", async () => {
    const w = mountContainer({ showTableDesigner: true });
    const btns = w.findComponent(TableDesigner).findAll(".control-btn");
    const events = [
      "add-row-above",
      "add-row-below",
      "add-column-left",
      "add-column-right",
      "remove-row",
      "remove-column",
      "cell-properties",
      "table-properties",
      "delete-table",
    ] as const;
    expect(btns).toHaveLength(events.length);

    for (let i = 0; i < events.length; i++) {
      await btns[i].trigger("click");
      expect(w.emitted(events[i])).toBeTruthy();
    }
    w.unmount();
  });

  it("TablePropertiesModal: Apply -> apply-table-properties (+ close), Cancel -> close-table-properties-modal", async () => {
    const w = mountContainer({
      showTablePropertiesModal: true,
      tablePropertiesMode: "both",
    });
    const c = w.findComponent(TablePropertiesModal);

    await buttonByText(c, "Apply").trigger("click");
    const applied = w.emitted("apply-table-properties");
    expect(applied).toBeTruthy();
    // mode "both" -> both slices present in the payload.
    expect(applied![0][0]).toHaveProperty("cellProps");
    expect(applied![0][0]).toHaveProperty("tableProps");
    expect(w.emitted("close-table-properties-modal")).toBeTruthy();
    w.unmount();

    const w2 = mountContainer({ showTablePropertiesModal: true });
    await buttonByText(w2.findComponent(TablePropertiesModal), "Cancel").trigger(
      "click"
    );
    expect(w2.emitted("close-table-properties-modal")).toBeTruthy();
    expect(w2.emitted("apply-table-properties")).toBeUndefined();
    w2.unmount();
  });

  it("EmojiPicker: picking an emoji -> insert-emoji, ✕ -> close-emoji-picker", async () => {
    const w = mountContainer({ showEmojiPicker: true });
    const c = w.findComponent(EmojiPicker);

    await c.get(".emoji-btn").trigger("click"); // first smiley "😀"
    expect(w.emitted("insert-emoji")?.[0]).toEqual(["😀"]);

    await c.get(".close-emoji-btn").trigger("click");
    expect(w.emitted("close-emoji-picker")).toBeTruthy();
    w.unmount();
  });

  it("LinkModal: normalizes a bare domain and re-emits insert-link, Cancel -> close-link-modal", async () => {
    const w = mountContainer({ showLinkModal: true });
    const c = w.findComponent(LinkModal);

    await c.get("#link-url").setValue("example.com");
    await c.get(".insert-button").trigger("click");
    // Real LinkModal normalization prepends https:// to a bare domain.
    expect(w.emitted("insert-link")?.[0]).toEqual(["https://example.com", ""]);
    w.unmount();

    const w2 = mountContainer({ showLinkModal: true });
    await w2.findComponent(LinkModal).get(".cancel-button").trigger("click");
    expect(w2.emitted("close-link-modal")).toBeTruthy();
    w2.unmount();
  });

  it("ImageUploadModal: URL entry enables Insert -> insert-image, Cancel -> close-image-upload-modal", async () => {
    const w = mountContainer({ showImageUploadModal: true });
    const c = w.findComponent(ImageUploadModal);

    const insertBtn = () =>
      c.get(".insert-button").element as HTMLButtonElement;
    expect(insertBtn().disabled).toBe(true);

    await c.get("#image-url").setValue("https://ex.com/a.png");
    expect(insertBtn().disabled).toBe(false);

    await c.get(".insert-button").trigger("click");
    expect(w.emitted("insert-image")?.[0]).toEqual([
      "https://ex.com/a.png",
      "",
    ]);
    w.unmount();

    const w2 = mountContainer({ showImageUploadModal: true });
    await w2
      .findComponent(ImageUploadModal)
      .get(".cancel-button")
      .trigger("click");
    expect(w2.emitted("close-image-upload-modal")).toBeTruthy();
    w2.unmount();
  });

  it("EmbedModal: a valid YouTube URL -> insert-embed with embed HTML, Cancel -> close-embed-modal", async () => {
    const w = mountContainer({ showEmbedModal: true });
    const c = w.findComponent(EmbedModal);

    await c.get("#video-url").setValue(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    await c.get(".insert-button").trigger("click");
    const embed = w.emitted("insert-embed");
    expect(embed).toBeTruthy();
    expect(embed![0][0]).toContain(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
    w.unmount();

    const w2 = mountContainer({ showEmbedModal: true });
    await w2.findComponent(EmbedModal).get(".cancel-button").trigger("click");
    expect(w2.emitted("close-embed-modal")).toBeTruthy();
    w2.unmount();
  });

  it("TemplateModal: choosing a template -> select-template + close-template-modal, ✕ -> close-template-modal", async () => {
    const w = mountContainer({ showTemplateModal: true });
    const c = w.findComponent(TemplateModal);

    const firstCard = c.find(".template-card");
    expect(firstCard.exists()).toBe(true);
    await firstCard.trigger("click");
    // selectTemplate() emits both select and close.
    expect(w.emitted("select-template")).toBeTruthy();
    expect(w.emitted("select-template")![0][0]).toBeTruthy();
    expect(w.emitted("close-template-modal")).toBeTruthy();
    w.unmount();

    const w2 = mountContainer({ showTemplateModal: true });
    await w2.findComponent(TemplateModal).get(".close-btn").trigger("click");
    expect(w2.emitted("close-template-modal")).toBeTruthy();
    w2.unmount();
  });

  it("HtmlCodeModal: Close button and overlay backdrop both -> close-html-code-modal", async () => {
    const w = mountContainer({
      showHtmlCodeModal: true,
      formattedHtmlContent: "<p>hi</p>",
    });
    await buttonByText(w.findComponent(HtmlCodeModal), "Close").trigger("click");
    expect(w.emitted("close-html-code-modal")).toBeTruthy();
    w.unmount();

    const w2 = mountContainer({
      showHtmlCodeModal: true,
      formattedHtmlContent: "<p>hi</p>",
    });
    // Backdrop click (target === overlay) closes.
    await w2.findComponent(HtmlCodeModal).get(".modal-overlay").trigger("click");
    expect(w2.emitted("close-html-code-modal")).toBeTruthy();
    w2.unmount();
  });

  it("CommandPalette: clicking a command -> execute-command + close-command-palette", async () => {
    const command = {
      id: "cmd-bold",
      name: "Bold",
      description: "Toggle bold",
      icon: "B",
      category: "Format",
      action: vi.fn(),
    };
    const w = mountContainer({
      showCommandPalette: true,
      commandPaletteCommands: [command],
    });
    const c = w.findComponent(CommandPalette);

    await c.get(".command-item").trigger("click");
    expect(w.emitted("execute-command")?.[0]).toEqual([command]);
    // executeCommand() also closes the palette.
    expect(w.emitted("close-command-palette")).toBeTruthy();
    w.unmount();
  });

  it("CommandPalette: backdrop (@click.self) -> close-command-palette", async () => {
    const w = mountContainer({ showCommandPalette: true });
    await w
      .findComponent(CommandPalette)
      .get(".command-palette-overlay")
      .trigger("click");
    expect(w.emitted("close-command-palette")).toBeTruthy();
    w.unmount();
  });

  it("FileManagerModal: Close button -> close-file-manager-modal", async () => {
    const w = mountContainer({ showFileManagerModal: true });
    await buttonByText(w.findComponent(FileManagerModal), "Close").trigger(
      "click"
    );
    expect(w.emitted("close-file-manager-modal")).toBeTruthy();
    w.unmount();
  });

  it("FileManagerModal: inserting a stored file -> insert-file with the file", async () => {
    // Seed the real fileManager singleton with a text file, then open the
    // modal so its open-watcher loads the list and renders a file card.
    const seeded = await fileManager.uploadFile(
      new File(["hello world"], "note.txt", { type: "text/plain" })
    );

    const w = mountContainer({ showFileManagerModal: false });
    await w.setProps({ showFileManagerModal: true });
    await flushPromises();

    const c = w.findComponent(FileManagerModal);
    const insertBtn = c.find('[title="Insert into editor"]');
    expect(insertBtn.exists()).toBe(true);

    await insertBtn.trigger("click");
    const inserted = w.emitted("insert-file");
    expect(inserted).toBeTruthy();
    expect(inserted![0][0]).toMatchObject({ id: seeded.id, name: "note.txt" });
    w.unmount();
  });
});
