import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  describe("Focus mode toggle", () => {
    it("renders the focus-mode button with an enter label at rest", () => {
      const focus = wrapper.find(".focus-toggle");
      expect(focus.exists()).toBe(true);
      expect(focus.attributes("aria-label")).toBe("Enter focus mode");
      expect(focus.attributes("aria-pressed")).toBe("false");
    });

    it("reflects active focus mode with an exit label and aria-pressed", async () => {
      await wrapper.setProps({ isFocusMode: true });
      const focus = wrapper.find(".focus-toggle");
      expect(focus.attributes("aria-label")).toBe("Exit focus mode");
      expect(focus.attributes("aria-pressed")).toBe("true");
    });

    it("emits toggle-focus when clicked", async () => {
      await wrapper.find(".focus-toggle").trigger("click");
      expect(wrapper.emitted("toggle-focus")).toBeTruthy();
      expect(wrapper.emitted("toggle-focus")?.length).toBe(1);
    });

    it("is distinct from the OS fullscreen button (both present)", () => {
      expect(wrapper.find(".focus-toggle").exists()).toBe(true);
      expect(wrapper.find(".fullscreen-toggle").exists()).toBe(true);
    });

    it("compact ⋯ More lists both Focus mode and Fullscreen", async () => {
      const compact = mount(EditorToolbar, {
        props: { ...defaultProps, toolbarLayout: "compact" as const },
        global: { stubs: { ColorPicker: true } },
      });
      const moreTrigger = compact
        .findAll("button.dropdown-trigger")
        .find((b) => b.attributes("aria-label") === "More");
      await moreTrigger!.trigger("click");
      const labels = compact
        .findAll(".dropdown-item")
        .map((i) => i.attributes("aria-label"));
      expect(labels).toEqual(
        expect.arrayContaining(["Focus mode", "Fullscreen"])
      );
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

  describe("Toolbar layout", () => {
    it("is comfortable (no is-compact) by default", () => {
      expect(wrapper.find(".editor-toolbar-modern").classes()).not.toContain(
        "is-compact"
      );
    });

    it("adds the is-compact class when toolbarLayout is 'compact'", () => {
      const compact = mount(EditorToolbar, {
        props: { ...defaultProps, toolbarLayout: "compact" as const },
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });
      expect(compact.find(".editor-toolbar-modern").classes()).toContain(
        "is-compact"
      );
    });

    it("compact tucks view-modes into a ⋯ More menu and still switches mode", async () => {
      // Render the real ToolbarSection/ToolbarDropdown so the More menu
      // (and its compactMoreItems) actually run; only stub the heavy picker.
      const compact = mount(EditorToolbar, {
        props: { ...defaultProps, toolbarLayout: "compact" as const },
        global: { stubs: { ColorPicker: true } },
      });

      // The view-mode switch is no longer inline in compact.
      expect(compact.find(".view-mode-group").exists()).toBe(false);

      // Open the "More" dropdown.
      const moreTrigger = compact
        .findAll("button.dropdown-trigger")
        .find((b) => b.attributes("aria-label") === "More");
      expect(moreTrigger).toBeTruthy();
      await moreTrigger!.trigger("click");

      // It aggregates the tool actions + the four view modes + fullscreen.
      const items = compact.findAll(".dropdown-item");
      const labels = items.map((i) => i.attributes("aria-label"));
      expect(labels).toEqual(
        expect.arrayContaining([
          "Editor view",
          "Code view",
          "Split view",
          "Preview view",
          "Fullscreen",
        ])
      );

      // The active mode is marked, and picking another emits view-mode-change.
      const codeItem = items.find(
        (i) => i.attributes("aria-label") === "Code view"
      );
      await codeItem!.trigger("click");
      expect(compact.emitted("view-mode-change")?.[0]).toEqual(["code"]);
    });
  });

  describe("Mini toolbar list trimming", () => {
    const listAction = (id: string): ToolbarAction => ({
      id,
      label: id,
      icon: "<svg></svg>",
      tooltip: id,
      onClick: vi.fn(),
    });

    const fullListActions = [
      listAction("bullet-list"),
      listAction("numbered-list"),
      listAction("increase-indent"),
      listAction("decrease-indent"),
    ];

    /** The stubbed ToolbarSection that received the list actions. */
    const findListSection = (w: VueWrapper<any>) =>
      w.findAllComponents({ name: "ToolbarSection" }).find((s) => {
        const items = s.props("items") as ToolbarAction[] | undefined;
        return Array.isArray(items) && items.some((i) => i.id === "bullet-list");
      })!;

    const idsOf = (w: VueWrapper<any>) =>
      (findListSection(w).props("items") as ToolbarAction[]).map((i) => i.id);

    it("mini state keeps only the two list toggles (indent/outdent behind expand)", async () => {
      const compact = mount(EditorToolbar, {
        props: {
          ...defaultProps,
          listActions: fullListActions,
          toolbarLayout: "compact" as const,
        },
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });

      // Collapsed (mini): the essentials row must not carry indent/outdent, or
      // the nowrap row overflows narrow phones and clips the expand toggle.
      expect(idsOf(compact)).toEqual(["bullet-list", "numbered-list"]);

      // Expanding restores the full list set.
      await compact.find(".toolbar-expand-toggle").trigger("click");
      expect(idsOf(compact)).toEqual([
        "bullet-list",
        "numbered-list",
        "increase-indent",
        "decrease-indent",
      ]);

      // Collapsing trims it again.
      await compact.find(".toolbar-expand-toggle").trigger("click");
      expect(idsOf(compact)).toEqual(["bullet-list", "numbered-list"]);
    });

    it("comfortable layout always passes the full list actions through", () => {
      const comfortable = mount(EditorToolbar, {
        props: { ...defaultProps, listActions: fullListActions },
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });
      expect(idsOf(comfortable)).toEqual([
        "bullet-list",
        "numbered-list",
        "increase-indent",
        "decrease-indent",
      ]);
    });
  });

  describe("Position-variant panel wrapper", () => {
    // The left-rail toolbar position floats the non-essential families as a
    // panel; that needs them under ONE wrapper. The wrapper must be
    // layout-inert everywhere else (display: contents via CSS), so the
    // structural contract is: essentials + expand toggle stay direct nav
    // children, the other three families live inside .nle-toolbar-panel.
    it("wraps exactly the three non-essential families", () => {
      const panels = wrapper.findAll(".nle-toolbar-panel");
      expect(panels.length).toBe(1);
      const panel = panels[0];

      const grouped = panel
        .findAll(".toolbar-section-group")
        .map((g) => g.attributes("aria-label"));
      expect(grouped).toEqual([
        "Insert and styling",
        "Tools",
        "View and display controls",
      ]);
    });

    it("keeps the essentials family and expand toggle outside the panel", () => {
      const compact = mount(EditorToolbar, {
        props: { ...defaultProps, toolbarLayout: "compact" as const },
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });
      const panel = compact.find(".nle-toolbar-panel");
      expect(panel.exists()).toBe(true);
      expect(panel.find('[aria-label="Text formatting"]').exists()).toBe(
        false
      );
      expect(panel.find(".toolbar-expand-toggle").exists()).toBe(false);
      // Both still render — as siblings of the panel inside the nav.
      const nav = compact.find(".editor-toolbar-modern");
      expect(nav.find('[aria-label="Text formatting"]').exists()).toBe(true);
      expect(nav.find(".toolbar-expand-toggle").exists()).toBe(true);
    });

    it("is a plain layout wrapper — no role, no label", () => {
      const panel = wrapper.find(".nle-toolbar-panel");
      expect(panel.attributes("role")).toBeUndefined();
      expect(panel.attributes("aria-label")).toBeUndefined();
    });
  });

  describe("Unfold choreography (title-sequence staging)", () => {
    const mountCompact = () =>
      mount(EditorToolbar, {
        props: { ...defaultProps, toolbarLayout: "compact" as const },
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("never carries a choreography class on initial mount", () => {
      // Comfortable (starts fully expanded) and compact (starts mini): the
      // one-shot classes only ever come from the toggle handler / watcher.
      for (const w of [wrapper, mountCompact()]) {
        const classes = w.find(".editor-toolbar-modern").classes();
        expect(classes).not.toContain("is-unfolding");
        expect(classes).not.toContain("is-folding");
        expect(classes).not.toContain("is-sweeping");
      }
    });

    it("expand adds is-unfolding and clears it after the one-shot window", async () => {
      vi.useFakeTimers();
      const compact = mountCompact();
      await compact.find(".toolbar-expand-toggle").trigger("click");
      const nav = compact.find(".editor-toolbar-modern");
      expect(nav.classes()).toContain("is-unfolding");
      expect(nav.classes()).not.toContain("is-folding");

      vi.advanceTimersByTime(450);
      await compact.vm.$nextTick();
      expect(nav.classes()).not.toContain("is-unfolding");
    });

    it("collapse does NOT add is-unfolding — it runs the fast is-folding settle", async () => {
      vi.useFakeTimers();
      const compact = mountCompact();
      const toggle = compact.find(".toolbar-expand-toggle");

      await toggle.trigger("click"); // expand
      vi.advanceTimersByTime(450);
      await compact.vm.$nextTick();

      await toggle.trigger("click"); // collapse
      const nav = compact.find(".editor-toolbar-modern");
      expect(nav.classes()).not.toContain("is-unfolding");
      expect(nav.classes()).toContain("is-folding");

      vi.advanceTimersByTime(250);
      await compact.vm.$nextTick();
      expect(nav.classes()).not.toContain("is-folding");
    });

    it("collapsing mid-unfold cancels the unfold one-shot", async () => {
      vi.useFakeTimers();
      const compact = mountCompact();
      const toggle = compact.find(".toolbar-expand-toggle");

      await toggle.trigger("click"); // expand
      await toggle.trigger("click"); // collapse immediately
      const nav = compact.find(".editor-toolbar-modern");
      expect(nav.classes()).not.toContain("is-unfolding");
      expect(nav.classes()).toContain("is-folding");
    });

    it("staggers the revealed families left-to-right via --nle-group-i", () => {
      const compact = mountCompact();
      const groups = compact.findAll(".nle-unfold");
      expect(groups.length).toBe(4);
      groups.forEach((g, i) => {
        expect(g.attributes("style")).toContain(`--nle-group-i: ${i}`);
      });
    });

    it("a density change runs the one-shot light sweep (is-sweeping)", async () => {
      vi.useFakeTimers();
      const nav = wrapper.find(".editor-toolbar-modern");
      expect(nav.classes()).not.toContain("is-sweeping");

      await wrapper.setProps({ toolbarLayout: "compact" });
      expect(nav.classes()).toContain("is-sweeping");

      vi.advanceTimersByTime(500);
      await wrapper.vm.$nextTick();
      expect(nav.classes()).not.toContain("is-sweeping");
    });

    it("renders the sweep as its own clipped, inert overlay", () => {
      const clip = wrapper.find(".toolbar-sweep-clip");
      expect(clip.exists()).toBe(true);
      expect(clip.attributes("aria-hidden")).toBe("true");
      expect(clip.find(".toolbar-sweep").exists()).toBe(true);
    });
  });

  describe("Elevation on scroll", () => {
    let host: HTMLElement;
    let content: HTMLElement;
    let attached: VueWrapper<any>;

    beforeEach(() => {
      // Elevation reads immediately inside the scroll handler's rAF; run it
      // synchronously so the test is deterministic. Return 0 so the throttle
      // guard doesn't latch: the sync callback resets the handle BEFORE the
      // return value is assigned (real rAF assigns first, fires later).
      vi.stubGlobal(
        "requestAnimationFrame",
        (cb: FrameRequestCallback): number => {
          cb(0);
          return 0;
        }
      );
      host = document.createElement("div");
      host.className = "next-level-editor";
      document.body.appendChild(host);
      attached = mount(EditorToolbar, {
        props: defaultProps,
        attachTo: host,
        global: { stubs: { ToolbarSection: true, ColorPicker: true } },
      });
      content = document.createElement("div");
      content.className = "editor-content";
      host.appendChild(content);
    });

    afterEach(() => {
      try {
        attached.unmount();
      } catch {
        // already unmounted inside the test
      }
      host.remove();
      vi.unstubAllGlobals();
    });

    const setScrollTop = (value: number) =>
      Object.defineProperty(content, "scrollTop", {
        value,
        configurable: true,
      });

    it("is not elevated at mount", () => {
      expect(attached.find(".editor-toolbar-modern").classes()).not.toContain(
        "is-elevated"
      );
    });

    it("adds is-elevated when the editor content scrolls, removes it back at top", async () => {
      const nav = attached.find(".editor-toolbar-modern");

      setScrollTop(120);
      content.dispatchEvent(new Event("scroll"));
      await attached.vm.$nextTick();
      expect(nav.classes()).toContain("is-elevated");

      setScrollTop(0);
      content.dispatchEvent(new Event("scroll"));
      await attached.vm.$nextTick();
      expect(nav.classes()).not.toContain("is-elevated");
    });

    it("ignores scrolls when there is no surrounding editor content", async () => {
      // The default (non-attached) wrapper has no .next-level-editor ancestor:
      // document-level scrolls must be a no-op, not a crash.
      document.dispatchEvent(new Event("scroll"));
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".editor-toolbar-modern").classes()).not.toContain(
        "is-elevated"
      );
    });

    it("stops reacting after unmount (listener cleaned up)", async () => {
      attached.unmount();
      setScrollTop(120);
      // Must not throw once the component is gone.
      expect(() => content.dispatchEvent(new Event("scroll"))).not.toThrow();
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
