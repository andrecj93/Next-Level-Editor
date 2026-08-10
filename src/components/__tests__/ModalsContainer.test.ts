import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ModalsContainer from "../ModalsContainer.vue";

// Mock all child components
vi.mock("../TableModal.vue", () => ({
  default: {
    name: "TableModal",
    template: '<div class="mock-table-modal"></div>',
    props: ["show"],
    emits: ["close", "insert"],
  },
}));

vi.mock("../FindReplaceModal.vue", () => ({
  default: {
    name: "FindReplaceModal",
    template: '<div class="mock-find-replace-modal"></div>',
    props: ["show", "content"],
    emits: ["close", "find", "replace"],
  },
}));

vi.mock("../CodeBlockModal.vue", () => ({
  default: {
    name: "CodeBlockModal",
    template: '<div class="mock-code-block-modal"></div>',
    props: ["show"],
    emits: ["close", "insert"],
  },
}));

vi.mock("../TableDesigner.vue", () => ({
  default: {
    name: "TableDesigner",
    template: '<div class="mock-table-designer"></div>',
    props: ["show", "x", "y"],
    emits: [
      "add-row-above",
      "add-row-below",
      "add-column-left",
      "add-column-right",
      "remove-row",
      "remove-column",
      "cell-properties",
      "table-properties",
      "delete-table",
    ],
  },
}));

vi.mock("../TablePropertiesModal.vue", () => ({
  default: {
    name: "TablePropertiesModal",
    template: '<div class="mock-table-properties-modal"></div>',
    props: ["show", "mode", "initialCellProps", "initialTableProps"],
    emits: ["close", "apply"],
  },
}));

vi.mock("../EmojiPicker.vue", () => ({
  default: {
    name: "EmojiPicker",
    template: '<div class="mock-emoji-picker"></div>',
    props: ["show"],
    emits: ["select", "close"],
  },
}));

vi.mock("../ImageUploadModal.vue", () => ({
  default: {
    name: "ImageUploadModal",
    template: '<div class="mock-image-upload-modal"></div>',
    props: ["isOpen"],
    emits: ["close", "insert"],
  },
}));

vi.mock("../EmbedModal.vue", () => ({
  default: {
    name: "EmbedModal",
    template: '<div class="mock-embed-modal"></div>',
    props: ["isOpen"],
    emits: ["close", "insert"],
  },
}));

vi.mock("../FileManagerModal.vue", () => ({
  default: {
    name: "FileManagerModal",
    template: '<div class="mock-file-manager-modal"></div>',
    props: ["isOpen"],
    emits: ["close", "insert"],
  },
}));

vi.mock("../TemplateModal.vue", () => ({
  default: {
    name: "TemplateModal",
    template: '<div class="mock-template-modal"></div>',
    props: ["show"],
    emits: ["close", "select"],
  },
}));

vi.mock("../HtmlCodeModal.vue", () => ({
  default: {
    name: "HtmlCodeModal",
    template: '<div class="mock-html-code-modal"></div>',
    props: ["show", "htmlContent"],
    emits: ["close"],
  },
}));

vi.mock("../CommandPalette.vue", () => ({
  default: {
    name: "CommandPalette",
    template: '<div class="mock-command-palette"></div>',
    props: ["show", "commands"],
    emits: ["close", "execute"],
  },
}));

describe("ModalsContainer", () => {
  const defaultProps = {
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
    initialCellProps: {},
    initialTableProps: {},
    formattedHtmlContent: "",
    commandPaletteCommands: [],
    lastSaved: null,
    toastMessage: "",
    toastType: "success" as const,
  };

  describe("Rendering", () => {
    it("should render without errors", () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("should render all child modal components", () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      expect(wrapper.find(".mock-table-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-find-replace-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-code-block-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-table-designer").exists()).toBe(true);
      expect(wrapper.find(".mock-table-properties-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-image-upload-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-embed-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-file-manager-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-template-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-html-code-modal").exists()).toBe(true);
      expect(wrapper.find(".mock-command-palette").exists()).toBe(true);
    });

    it("should show emoji picker when showEmojiPicker is true", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showEmojiPicker: true,
        },
      });

      expect(wrapper.find(".emoji-picker-overlay").exists()).toBe(true);
      expect(wrapper.find(".mock-emoji-picker").exists()).toBe(true);
    });

    it("should not show emoji picker when showEmojiPicker is false", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showEmojiPicker: false,
        },
      });

      expect(wrapper.find(".emoji-picker-overlay").exists()).toBe(false);
    });
  });

  describe("Auto-save Indicator", () => {
    it("should show saving indicator when isSaving is true", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          isSaving: true,
        },
      });

      const indicator = wrapper.find(".auto-save-indicator");
      expect(indicator.exists()).toBe(true);
      // Real spinner icon, not an emoji.
      expect(indicator.find(".saving svg").exists()).toBe(true);
      expect(indicator.find(".saving").text()).toContain("Saving");
    });

    it("should show saved indicator with timestamp when lastSaved is set", () => {
      const lastSaved = new Date("2025-01-20T10:30:00");
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          lastSaved,
        },
      });

      const indicator = wrapper.find(".auto-save-indicator");
      expect(indicator.exists()).toBe(true);
      // Real check icon, not an emoji.
      expect(indicator.find(".saved svg").exists()).toBe(true);
      expect(indicator.find(".saved").text()).toContain("Saved at");
      expect(indicator.find(".saved").text()).toContain(
        lastSaved.toLocaleTimeString()
      );
    });

    it("should not show indicator when not saving and no lastSaved", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          isSaving: false,
          lastSaved: null,
        },
      });

      expect(wrapper.find(".auto-save-indicator").exists()).toBe(false);
    });

    it("should prioritize saving indicator over saved indicator", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          isSaving: true,
          lastSaved: new Date(),
        },
      });

      expect(wrapper.find(".saving").exists()).toBe(true);
      expect(wrapper.find(".saved").exists()).toBe(false);
    });

    it("should hide the chip for an editor that does not own the fixed chrome", () => {
      // The chip is `position: fixed; bottom: 20px; left: 20px`, so two
      // instances put two chips on the same pixels and one hides the other.
      // #R23-58
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          isSaving: true,
          ownsFixedChrome: false,
        },
      });

      expect(wrapper.find(".auto-save-indicator").exists()).toBe(false);
    });

    it("should show a FAILED save even without ownership", () => {
      // A hidden failure is the exact bug #r20-2 closed: a silent save error
      // must never be traded away for tidier corners. Two simultaneous
      // failures overlapping is the far rarer, far lesser evil.
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          isSaving: false,
          lastSaved: null,
          saveStatus: "error" as const,
          ownsFixedChrome: false,
        },
      });

      const indicator = wrapper.find(".auto-save-indicator");
      expect(indicator.exists()).toBe(true);
      expect(indicator.find(".save-error").exists()).toBe(true);
    });
  });

  describe("Toast Notification", () => {
    it("should show toast when showToast is true", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showToast: true,
          toastMessage: "Operation successful",
          toastType: "success",
        },
      });

      const toast = wrapper.find(".toast-notification");
      expect(toast.exists()).toBe(true);
      expect(toast.text()).toBe("Operation successful");
      expect(toast.classes()).toContain("success");
    });

    it("should show error toast", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showToast: true,
          toastMessage: "Operation failed",
          toastType: "error",
        },
      });

      const toast = wrapper.find(".toast-notification");
      expect(toast.exists()).toBe(true);
      expect(toast.text()).toBe("Operation failed");
      expect(toast.classes()).toContain("error");
    });

    it("should not show toast when showToast is false", () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showToast: false,
        },
      });

      expect(wrapper.find(".toast-notification").exists()).toBe(false);
    });
  });

  describe("Props Passing", () => {
    it("should pass editorContent to FindReplaceModal", () => {
      const editorContent = "<p>Test content</p>";
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          editorContent,
        },
      });

      const findReplaceModal = wrapper.findComponent({
        name: "FindReplaceModal",
      });
      expect(findReplaceModal.props("content")).toBe(editorContent);
    });

    it("should pass tableDesignerPosition to TableDesigner", () => {
      const position = { x: 100, y: 200 };
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          tableDesignerPosition: position,
        },
      });

      const tableDesigner = wrapper.findComponent({ name: "TableDesigner" });
      expect(tableDesigner.props("x")).toBe(100);
      expect(tableDesigner.props("y")).toBe(200);
    });

    it("should pass table properties to TablePropertiesModal", () => {
      const cellProps = { width: "100px" };
      const tableProps = { border: "1px" };
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          tablePropertiesMode: "cell",
          initialCellProps: cellProps,
          initialTableProps: tableProps,
        },
      });

      const modal = wrapper.findComponent({ name: "TablePropertiesModal" });
      expect(modal.props("mode")).toBe("cell");
      expect(modal.props("initialCellProps")).toEqual(cellProps);
      expect(modal.props("initialTableProps")).toEqual(tableProps);
    });

    it("should pass formattedHtmlContent to HtmlCodeModal", () => {
      const htmlContent = "<div>Formatted HTML</div>";
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          formattedHtmlContent: htmlContent,
        },
      });

      const modal = wrapper.findComponent({ name: "HtmlCodeModal" });
      expect(modal.props("htmlContent")).toBe(htmlContent);
    });

    it("should pass commands to CommandPalette", () => {
      const commands = [{ id: "1", name: "Test" }];
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          commandPaletteCommands: commands,
        },
      });

      const palette = wrapper.findComponent({ name: "CommandPalette" });
      expect(palette.props("commands")).toEqual(commands);
    });
  });

  describe("Event Emissions", () => {
    it("should emit close-table-modal event", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const tableModal = wrapper.findComponent({ name: "TableModal" });
      await tableModal.vm.$emit("close");

      expect(wrapper.emitted("close-table-modal")).toBeTruthy();
    });

    it("should emit insert-table event with data", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const tableModal = wrapper.findComponent({ name: "TableModal" });
      const tableData = { rows: 3, cols: 3 };
      await tableModal.vm.$emit("insert", tableData);

      expect(wrapper.emitted("insert-table")?.[0]).toEqual([tableData]);
    });

    it("should emit find and replace events", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const modal = wrapper.findComponent({ name: "FindReplaceModal" });

      await modal.vm.$emit("find", { text: "test" });
      expect(wrapper.emitted("find")?.[0]).toEqual([{ text: "test" }]);

      await modal.vm.$emit("replace", { from: "old", to: "new" });
      expect(wrapper.emitted("replace")?.[0]).toEqual([
        { from: "old", to: "new" },
      ]);
    });

    it("should emit table designer events", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const designer = wrapper.findComponent({ name: "TableDesigner" });

      await designer.vm.$emit("add-row-above");
      expect(wrapper.emitted("add-row-above")).toBeTruthy();

      await designer.vm.$emit("add-row-below");
      expect(wrapper.emitted("add-row-below")).toBeTruthy();

      await designer.vm.$emit("add-column-left");
      expect(wrapper.emitted("add-column-left")).toBeTruthy();

      await designer.vm.$emit("add-column-right");
      expect(wrapper.emitted("add-column-right")).toBeTruthy();

      await designer.vm.$emit("remove-row");
      expect(wrapper.emitted("remove-row")).toBeTruthy();

      await designer.vm.$emit("remove-column");
      expect(wrapper.emitted("remove-column")).toBeTruthy();

      await designer.vm.$emit("cell-properties");
      expect(wrapper.emitted("cell-properties")).toBeTruthy();

      await designer.vm.$emit("table-properties");
      expect(wrapper.emitted("table-properties")).toBeTruthy();

      await designer.vm.$emit("delete-table");
      expect(wrapper.emitted("delete-table")).toBeTruthy();
    });

    it("should emit close-emoji-picker when the emoji overlay backdrop is clicked", async () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showEmojiPicker: true,
        },
      });

      await wrapper.get(".emoji-picker-overlay").trigger("click");

      expect(wrapper.emitted("close-emoji-picker")).toHaveLength(1);
    });

    it("should not emit close-emoji-picker when the click lands inside the picker", async () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showEmojiPicker: true,
        },
      });

      // @click.self: a click bubbling up from the picker must not dismiss it.
      await wrapper.get(".mock-emoji-picker").trigger("click");

      expect(wrapper.emitted("close-emoji-picker")).toBeUndefined();
    });

    it("should emit emoji picker events", async () => {
      const wrapper = mount(ModalsContainer, {
        props: {
          ...defaultProps,
          showEmojiPicker: true,
        },
      });

      const picker = wrapper.findComponent({ name: "EmojiPicker" });

      await picker.vm.$emit("select", "😀");
      expect(wrapper.emitted("insert-emoji")?.[0]).toEqual(["😀"]);

      await picker.vm.$emit("close");
      expect(wrapper.emitted("close-emoji-picker")).toBeTruthy();
    });

    it("should emit image upload events", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const modal = wrapper.findComponent({ name: "ImageUploadModal" });

      await modal.vm.$emit(
        "insert",
        "https://example.com/image.jpg",
        "Alt text"
      );
      expect(wrapper.emitted("insert-image")?.[0]).toEqual([
        "https://example.com/image.jpg",
        "Alt text",
      ]);

      await modal.vm.$emit("close");
      expect(wrapper.emitted("close-image-upload-modal")).toBeTruthy();
    });

    it("should emit command palette events", async () => {
      const wrapper = mount(ModalsContainer, {
        props: defaultProps,
      });

      const palette = wrapper.findComponent({ name: "CommandPalette" });

      const command = { id: "test", action: vi.fn() };
      await palette.vm.$emit("execute", command);
      expect(wrapper.emitted("execute-command")?.[0]).toEqual([command]);

      await palette.vm.$emit("close");
      expect(wrapper.emitted("close-command-palette")).toBeTruthy();
    });
  });
});
