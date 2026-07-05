import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import EditorToolbar from "../EditorToolbar.vue";
import type { ToolbarAction } from "../../types/toolbar";

describe("EditorToolbar", () => {
  let wrapper: VueWrapper<any>;

  const mockToolbarAction: ToolbarAction = {
    id: "bold",
    label: "Bold",
    icon: "<svg></svg>",
    tooltip: "Bold",
    onClick: vi.fn(),
    isActive: vi.fn(() => false),
  };

  const defaultProps = {
    isToolbarSectionVisible: vi.fn(() => true),
    formatDropdownItems: [
      { label: "Paragraph", value: "p", action: vi.fn() },
      { label: "Heading 1", value: "h1", action: vi.fn() },
    ],
    inlineFormatActions: [mockToolbarAction],
    alignmentDropdownItems: [
      { label: "Left", value: "left", action: vi.fn() },
      { label: "Center", value: "center", action: vi.fn() },
    ],
    listActions: [
      {
        id: "bullet",
        label: "Bullet List",
        icon: "<svg></svg>",
        tooltip: "Bullet List",
        onClick: vi.fn(),
        isActive: vi.fn(() => false),
      },
    ],
    insertDropdownItems: [
      { label: "Image", value: "image", action: vi.fn() },
      { label: "Link", value: "link", action: vi.fn() },
    ],
    showColorsDropdown: false,
    textColor: "#000000",
    backgroundColor: "#ffffff",
    fontSizeDropdownItems: [
      { label: "12px", value: "12px", action: vi.fn() },
      { label: "16px", value: "16px", action: vi.fn() },
    ],
    historyIndex: 5,
    historyLength: 10,
    productivityDropdownItems: [
      { label: "Find/Replace", value: "find", action: vi.fn() },
      { label: "Spell Check", value: "spell", action: vi.fn() },
    ],
    toolActions: [
      {
        id: "clear",
        label: "Clear",
        icon: "<svg></svg>",
        tooltip: "Clear",
        onClick: vi.fn(),
        isActive: vi.fn(() => false),
      },
    ],
    exportDropdownItems: [
      {
        id: "export-html",
        label: "HTML",
        shortcut: ".html",
        icon: "<svg></svg>",
        onClick: vi.fn(),
      },
    ],
    viewMode: "editor" as const,
    theme: "light" as const,
    isFullScreen: false,
  };

  beforeEach(() => {
    wrapper = mount(EditorToolbar, {
      props: defaultProps,
      global: {
        stubs: {
          ToolbarSection: true,
          ColorPicker: true,
        },
      },
    });
  });

  describe("Component Rendering", () => {
    it("should render the toolbar container", () => {
      expect(wrapper.find(".editor-toolbar-modern").exists()).toBe(true);
    });

    it("should render ToolbarSection components", () => {
      const sections = wrapper.findAllComponents({ name: "ToolbarSection" });
      expect(sections.length).toBeGreaterThan(0);
    });

    it("should render colors dropdown trigger button", () => {
      const trigger = wrapper.find(".dropdown-trigger");
      expect(trigger.exists()).toBe(true);
      expect(trigger.text()).toContain("Colors");
    });

    it("should render history controls (Undo/Redo)", () => {
      const historyButtons = wrapper.findAll(".toolbar-btn-modern");
      const undoButton = historyButtons.find(
        (btn) => btn.attributes("aria-label") === "Undo"
      );
      const redoButton = historyButtons.find(
        (btn) => btn.attributes("aria-label") === "Redo"
      );
      expect(undoButton).toBeDefined();
      expect(redoButton).toBeDefined();
    });

    it("should render view mode buttons", () => {
      const viewModeButtons = wrapper.findAll(".view-mode-btn");
      expect(viewModeButtons.length).toBe(4);

      const labels = viewModeButtons.map((btn) => btn.text());
      expect(labels).toContain("Editor");
      expect(labels).toContain("Code");
      expect(labels).toContain("Split");
      expect(labels).toContain("Preview");
    });

    it("should render theme toggle button", () => {
      const themeToggle = wrapper.find(".theme-toggle");
      expect(themeToggle.exists()).toBe(true);
      expect(themeToggle.attributes("aria-label")).toBe(
        "Toggle dark/light theme"
      );
    });

    it("should not render format HTML button in editor view", () => {
      expect(
        wrapper
          .findAll(".toolbar-btn-modern")
          .some((btn) => btn.attributes("aria-label") === "Format HTML")
      ).toBe(false);
    });

    it("should render format HTML button in code view", async () => {
      await wrapper.setProps({ viewMode: "code" });
      const formatButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Format HTML");
      expect(formatButton).toBeDefined();
    });

    it("should render format HTML button in split view", async () => {
      await wrapper.setProps({ viewMode: "split" });
      const formatButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Format HTML");
      expect(formatButton).toBeDefined();
    });
  });

  describe("Colors Dropdown", () => {
    it("should not show colors menu when showColorsDropdown is false", () => {
      expect(wrapper.find(".colors-menu").exists()).toBe(false);
    });

    it("should show colors menu when showColorsDropdown is true", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      expect(wrapper.find(".colors-menu").exists()).toBe(true);
    });

    it("should render ColorPicker components in colors menu", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      const colorPickers = wrapper.findAllComponents({ name: "ColorPicker" });
      expect(colorPickers.length).toBe(2);
    });

    it("should emit toggle-colors-dropdown when colors button clicked", async () => {
      const trigger = wrapper.find(".dropdown-trigger");
      await trigger.trigger("click");
      expect(wrapper.emitted("toggle-colors-dropdown")).toBeTruthy();
      expect(wrapper.emitted("toggle-colors-dropdown")?.length).toBe(1);
    });

    it("should emit remember-selection on colors button mousedown", async () => {
      const trigger = wrapper.find(".dropdown-trigger");
      await trigger.trigger("mousedown");
      expect(wrapper.emitted("remember-selection")).toBeTruthy();
    });

    it("should apply open class when showColorsDropdown is true", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      const trigger = wrapper.find(".dropdown-trigger");
      expect(trigger.classes()).toContain("open");
    });

    it("should not apply open class when showColorsDropdown is false", () => {
      const trigger = wrapper.find(".dropdown-trigger");
      expect(trigger.classes()).not.toContain("open");
    });
  });

  describe("History Controls", () => {
    it("should disable undo button when historyIndex is 0", async () => {
      await wrapper.setProps({ historyIndex: 0 });
      const undoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Undo")!;
      expect(undoButton.attributes("disabled")).toBeDefined();
    });

    it("should enable undo button when historyIndex > 0", () => {
      const undoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Undo")!;
      expect(undoButton.attributes("disabled")).toBeUndefined();
    });

    it("should disable redo button when at latest history", async () => {
      await wrapper.setProps({ historyIndex: 9, historyLength: 10 });
      const redoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Redo")!;
      expect(redoButton.attributes("disabled")).toBeDefined();
    });

    it("should enable redo button when not at latest history", () => {
      const redoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Redo")!;
      expect(redoButton.attributes("disabled")).toBeUndefined();
    });

    it("should emit undo event when undo button clicked", async () => {
      const undoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Undo")!;
      await undoButton.trigger("click");
      expect(wrapper.emitted("undo")).toBeTruthy();
      expect(wrapper.emitted("undo")?.length).toBe(1);
    });

    it("should emit redo event when redo button clicked", async () => {
      const redoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Redo")!;
      await redoButton.trigger("click");
      expect(wrapper.emitted("redo")).toBeTruthy();
      expect(wrapper.emitted("redo")?.length).toBe(1);
    });
  });

  describe("View Mode Toggle", () => {
    it("should mark editor button as active when viewMode is editor", () => {
      const editorButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Editor"))!;
      expect(editorButton.classes()).toContain("active");
    });

    it("should mark code button as active when viewMode is code", async () => {
      await wrapper.setProps({ viewMode: "code" });
      const codeButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Code"))!;
      expect(codeButton.classes()).toContain("active");
    });

    it("should mark split button as active when viewMode is split", async () => {
      await wrapper.setProps({ viewMode: "split" });
      const splitButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Split"))!;
      expect(splitButton.classes()).toContain("active");
    });

    it("should mark preview button as active when viewMode is preview", async () => {
      await wrapper.setProps({ viewMode: "preview" });
      const previewButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Preview"))!;
      expect(previewButton.classes()).toContain("active");
    });

    it("should emit view-mode-change with editor when editor button clicked", async () => {
      await wrapper.setProps({ viewMode: "code" }); // Start from different mode
      const editorButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Editor"))!;
      await editorButton.trigger("click");
      expect(wrapper.emitted("view-mode-change")).toBeTruthy();
      expect(wrapper.emitted("view-mode-change")?.[0]).toEqual(["editor"]);
    });

    it("should emit view-mode-change with code when code button clicked", async () => {
      const codeButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Code"))!;
      await codeButton.trigger("click");
      expect(wrapper.emitted("view-mode-change")).toBeTruthy();
      expect(wrapper.emitted("view-mode-change")?.[0]).toEqual(["code"]);
    });

    it("should emit view-mode-change with split when split button clicked", async () => {
      const splitButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Split"))!;
      await splitButton.trigger("click");
      expect(wrapper.emitted("view-mode-change")).toBeTruthy();
      expect(wrapper.emitted("view-mode-change")?.[0]).toEqual(["split"]);
    });

    it("should emit view-mode-change with preview when preview button clicked", async () => {
      const previewButton = wrapper
        .findAll(".view-mode-btn")
        .find((btn) => btn.text().includes("Preview"))!;
      await previewButton.trigger("click");
      expect(wrapper.emitted("view-mode-change")).toBeTruthy();
      expect(wrapper.emitted("view-mode-change")?.[0]).toEqual(["preview"]);
    });
  });

  describe("Format HTML Button", () => {
    it("should emit format-html when format button clicked in code view", async () => {
      await wrapper.setProps({ viewMode: "code" });
      const formatButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Format HTML")!;
      await formatButton.trigger("click");
      expect(wrapper.emitted("format-html")).toBeTruthy();
      expect(wrapper.emitted("format-html")?.length).toBe(1);
    });

    it("should emit format-html when format button clicked in split view", async () => {
      await wrapper.setProps({ viewMode: "split" });
      const formatButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Format HTML")!;
      await formatButton.trigger("click");
      expect(wrapper.emitted("format-html")).toBeTruthy();
      expect(wrapper.emitted("format-html")?.length).toBe(1);
    });
  });

  describe("Theme Toggle", () => {
    it("should show sun icon when theme is dark", async () => {
      await wrapper.setProps({ theme: "dark" });
      const themeToggle = wrapper.find(".theme-toggle");
      const svg = themeToggle.find("svg");
      // Sun icon has circle element
      expect(svg.find("circle").exists()).toBe(true);
    });

    it("should show moon icon when theme is light", () => {
      const themeToggle = wrapper.find(".theme-toggle");
      const svg = themeToggle.find("svg");
      // Moon icon has path element (not circle for center)
      expect(svg.find("path").exists()).toBe(true);
    });

    it("should emit toggle-theme when theme button clicked", async () => {
      const themeToggle = wrapper.find(".theme-toggle");
      await themeToggle.trigger("click");
      expect(wrapper.emitted("toggle-theme")).toBeTruthy();
      expect(wrapper.emitted("toggle-theme")?.length).toBe(1);
    });
  });

  describe("Fullscreen Toggle", () => {
    it("should render fullscreen toggle button", () => {
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      expect(fullscreenToggle.exists()).toBe(true);
      expect(fullscreenToggle.attributes("aria-label")).toBe(
        "Toggle fullscreen mode"
      );
    });

    it("should show expand icon when not in fullscreen", () => {
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      const svg = fullscreenToggle.find("svg");
      expect(svg.exists()).toBe(true);
    });

    it("should show collapse icon when in fullscreen", async () => {
      await wrapper.setProps({ isFullScreen: true });
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      const svgs = fullscreenToggle.findAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("should set aria-pressed to false when not in fullscreen", () => {
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      expect(fullscreenToggle.attributes("aria-pressed")).toBe("false");
    });

    it("should set aria-pressed to true when in fullscreen", async () => {
      await wrapper.setProps({ isFullScreen: true });
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      expect(fullscreenToggle.attributes("aria-pressed")).toBe("true");
    });

    it("should emit toggle-fullscreen when fullscreen button clicked", async () => {
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      await fullscreenToggle.trigger("click");
      expect(wrapper.emitted("toggle-fullscreen")).toBeTruthy();
      expect(wrapper.emitted("toggle-fullscreen")?.length).toBe(1);
    });

    it("should update isFullScreen prop", async () => {
      await wrapper.setProps({ isFullScreen: true });
      expect(wrapper.vm.$props.isFullScreen).toBe(true);
    });

    it("should handle multiple fullscreen toggle clicks", async () => {
      const fullscreenToggle = wrapper.find(".fullscreen-toggle");
      await fullscreenToggle.trigger("click");
      await fullscreenToggle.trigger("click");
      await fullscreenToggle.trigger("click");
      expect(wrapper.emitted("toggle-fullscreen")?.length).toBe(3);
    });
  });

  describe("Props Reactivity", () => {
    it("should update textColor prop", async () => {
      await wrapper.setProps({
        textColor: "#ff0000",
        showColorsDropdown: true,
      });
      const colorPickers = wrapper.findAllComponents({ name: "ColorPicker" });
      // First ColorPicker is for text color
      expect(colorPickers[0].props("modelValue")).toBe("#ff0000");
    });

    it("should update backgroundColor prop", async () => {
      await wrapper.setProps({
        backgroundColor: "#00ff00",
        showColorsDropdown: true,
      });
      const colorPickers = wrapper.findAllComponents({ name: "ColorPicker" });
      // Second ColorPicker is for background color
      expect(colorPickers[1].props("modelValue")).toBe("#00ff00");
    });

    it("should update historyIndex prop", async () => {
      await wrapper.setProps({ historyIndex: 3 });
      expect(wrapper.vm.$props.historyIndex).toBe(3);
    });

    it("should update historyLength prop", async () => {
      await wrapper.setProps({ historyLength: 20 });
      expect(wrapper.vm.$props.historyLength).toBe(20);
    });

    it("should update viewMode prop", async () => {
      await wrapper.setProps({ viewMode: "preview" });
      expect(wrapper.vm.$props.viewMode).toBe("preview");
    });

    it("should update theme prop", async () => {
      await wrapper.setProps({ theme: "dark" });
      expect(wrapper.vm.$props.theme).toBe("dark");
    });

    it("should update showColorsDropdown prop", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      expect(wrapper.vm.$props.showColorsDropdown).toBe(true);
    });
  });

  describe("ColorPicker Events", () => {
    it("should emit text-color-change when text ColorPicker updates", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      const colorPickers = wrapper.findAllComponents({ name: "ColorPicker" });
      // Emit update:model-value from text color picker
      await colorPickers[0].vm.$emit("update:model-value", "#123456");
      expect(wrapper.emitted("text-color-change")).toBeTruthy();
      expect(wrapper.emitted("text-color-change")?.[0]).toEqual(["#123456"]);
    });

    it("should emit background-color-change when background ColorPicker updates", async () => {
      await wrapper.setProps({ showColorsDropdown: true });
      const colorPickers = wrapper.findAllComponents({ name: "ColorPicker" });
      // Emit update:model-value from background color picker
      await colorPickers[1].vm.$emit("update:model-value", "#abcdef");
      expect(wrapper.emitted("background-color-change")).toBeTruthy();
      expect(wrapper.emitted("background-color-change")?.[0]).toEqual([
        "#abcdef",
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty formatDropdownItems", async () => {
      await wrapper.setProps({ formatDropdownItems: [] });
      // Should not crash
      expect(wrapper.find(".editor-toolbar-modern").exists()).toBe(true);
    });

    it("should handle empty inlineFormatActions", async () => {
      await wrapper.setProps({ inlineFormatActions: [] });
      expect(wrapper.find(".editor-toolbar-modern").exists()).toBe(true);
    });

    it("should handle historyIndex at boundary (0)", async () => {
      await wrapper.setProps({ historyIndex: 0, historyLength: 10 });
      const undoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Undo")!;
      expect(undoButton.attributes("disabled")).toBeDefined();
    });

    it("should handle historyIndex at boundary (max)", async () => {
      await wrapper.setProps({ historyIndex: 9, historyLength: 10 });
      const redoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Redo")!;
      expect(redoButton.attributes("disabled")).toBeDefined();
    });

    it("should handle rapid view mode changes", async () => {
      await wrapper.setProps({ viewMode: "code" });
      await wrapper.setProps({ viewMode: "split" });
      await wrapper.setProps({ viewMode: "preview" });
      await wrapper.setProps({ viewMode: "editor" });
      expect(wrapper.vm.$props.viewMode).toBe("editor");
    });

    it("should handle rapid theme toggles", async () => {
      await wrapper.setProps({ theme: "dark" });
      await wrapper.setProps({ theme: "light" });
      await wrapper.setProps({ theme: "dark" });
      expect(wrapper.vm.$props.theme).toBe("dark");
    });

    it("should handle colors dropdown toggle multiple times", async () => {
      const trigger = wrapper.find(".dropdown-trigger");
      await trigger.trigger("click");
      await trigger.trigger("click");
      await trigger.trigger("click");
      expect(wrapper.emitted("toggle-colors-dropdown")?.length).toBe(3);
    });

    it("should handle multiple undo clicks", async () => {
      const undoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Undo")!;
      await undoButton.trigger("click");
      await undoButton.trigger("click");
      await undoButton.trigger("click");
      expect(wrapper.emitted("undo")?.length).toBe(3);
    });

    it("should handle multiple redo clicks", async () => {
      const redoButton = wrapper
        .findAll(".toolbar-btn-modern")
        .find((btn) => btn.attributes("aria-label") === "Redo")!;
      await redoButton.trigger("click");
      await redoButton.trigger("click");
      await redoButton.trigger("click");
      expect(wrapper.emitted("redo")?.length).toBe(3);
    });

    it("should not crash with null color values", async () => {
      await wrapper.setProps({
        textColor: "",
        backgroundColor: "",
        showColorsDropdown: true,
      });
      expect(wrapper.find(".colors-menu").exists()).toBe(true);
    });
  });
});
