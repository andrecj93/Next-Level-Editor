import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ToolbarSection from "../ToolbarSection.vue";
import type { ToolbarAction } from "../../types/toolbar";

// ---------------------------------------------------------------------------
// ToolbarSection is a thin, data-driven switch: `type` decides whether it
// renders a group of <button>s, delegates to the real <ToolbarDropdown>, or
// exposes a <slot/>. We mount the REAL component (and, for dropdowns, the real
// child — never stubbed) and drive it with real DOM events, asserting on
// rendered output + the callbacks/emits it actually wires up.
//
// Note on clicks: in "buttons" mode the component does NOT emit a click event —
// it invokes the action's own `onClick()` directly from the template. So button
// activation is asserted via the action callback (a vi.fn()), while
// `remember-selection` is the one thing it re-emits (on mousedown).
// ---------------------------------------------------------------------------

const ICON = "<svg class='sec-icon'><path d='M1 1'/></svg>";

const makeAction = (overrides: Partial<ToolbarAction> = {}): ToolbarAction => ({
  id: "bold",
  label: "Bold",
  tooltip: "Bold (Ctrl+B)",
  icon: ICON,
  onClick: vi.fn(),
  ...overrides,
});

describe("ToolbarSection", () => {
  describe("type='buttons'", () => {
    it("renders a .toolbar-group with one button per item", () => {
      const items = [
        makeAction({ id: "bold", label: "Bold" }),
        makeAction({ id: "italic", label: "Italic", tooltip: "Italic" }),
      ];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      expect(w.find(".toolbar-group").exists()).toBe(true);
      expect(w.findAll(".toolbar-btn-modern")).toHaveLength(2);
      w.unmount();
    });

    it("renders each item's icon via v-html and its label as aria-label + tooltip", () => {
      const items = [makeAction({ id: "bold", label: "Bold" })];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      const btn = w.get(".toolbar-btn-modern");
      // v-html icon landed inside the button
      expect(btn.find("svg.sec-icon").exists()).toBe(true);
      expect(btn.attributes("aria-label")).toBe("Bold");
      expect(btn.attributes("data-tooltip")).toBe("Bold (Ctrl+B)");
      w.unmount();
    });

    it("invokes the clicked action's onClick (and only that one), not an emit", async () => {
      const items = [
        makeAction({ id: "bold", label: "Bold" }),
        makeAction({ id: "italic", label: "Italic" }),
      ];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      await w.findAll(".toolbar-btn-modern")[0].trigger("click");
      expect(items[0].onClick).toHaveBeenCalledTimes(1);
      expect(items[1].onClick).not.toHaveBeenCalled();
      // Activation runs the action callback directly — it is not re-emitted as
      // a "remember-selection" (that only fires on mousedown).
      expect(w.emitted("remember-selection")).toBeUndefined();
      w.unmount();
    });

    it("emits remember-selection on button mousedown", async () => {
      const items = [makeAction()];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      await w.get(".toolbar-btn-modern").trigger("mousedown");
      expect(w.emitted("remember-selection")).toBeTruthy();
      expect(w.emitted("remember-selection")).toHaveLength(1);
      w.unmount();
    });

    it("marks an active item with .active and aria-pressed='true'", () => {
      const items = [
        makeAction({ id: "bold", label: "Bold", isActive: () => true }),
        makeAction({ id: "italic", label: "Italic", isActive: () => false }),
      ];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      const [bold, italic] = w.findAll(".toolbar-btn-modern");
      expect(bold.classes()).toContain("active");
      expect(bold.attributes("aria-pressed")).toBe("true");

      expect(italic.classes()).not.toContain("active");
      expect(italic.attributes("aria-pressed")).toBe("false");
      w.unmount();
    });

    it("omits aria-pressed for a non-toggle action and stays clickable when isActive/isDisabled are omitted", async () => {
      const onClick = vi.fn();
      // No isActive, no isDisabled -> exercises the `?.()` optional-call branches.
      const items = [
        { id: "x", label: "Plain", tooltip: "Plain", icon: ICON, onClick },
      ];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      const btn = w.get(".toolbar-btn-modern");
      // A pure action (no isActive) is NOT a toggle: emitting aria-pressed
      // would make screen readers announce it as an unpressed toggle button.
      expect(btn.attributes("aria-pressed")).toBeUndefined();
      expect(btn.classes()).not.toContain("disabled");
      expect((btn.element as HTMLButtonElement).disabled).toBe(false);

      await btn.trigger("click");
      expect(onClick).toHaveBeenCalledTimes(1);
      w.unmount();
    });

    it("renders a per-item disabled button and does not invoke its onClick", async () => {
      const onClick = vi.fn();
      const items = [
        makeAction({ id: "bold", label: "Bold", isDisabled: () => true, onClick }),
      ];
      const w = mount(ToolbarSection, { props: { type: "buttons", items } });

      const btn = w.get(".toolbar-btn-modern");
      expect(btn.classes()).toContain("disabled");
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);

      await btn.trigger("click");
      expect(onClick).not.toHaveBeenCalled();
      w.unmount();
    });

    it("when visible=false, disables every button, suffixes the tooltip and swallows clicks", async () => {
      const items = [makeAction({ id: "bold", label: "Bold" })];
      const w = mount(ToolbarSection, {
        props: { type: "buttons", visible: false, items },
      });

      const btn = w.get(".toolbar-btn-modern");
      expect(btn.classes()).toContain("disabled");
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);
      expect(btn.attributes("data-tooltip")).toBe(
        "Bold (Ctrl+B) (not available for current selection)"
      );

      await btn.trigger("click");
      expect(items[0].onClick).not.toHaveBeenCalled();
      w.unmount();
    });

    it("renders an empty group when items is empty (default)", () => {
      const w = mount(ToolbarSection, { props: { type: "buttons" } });
      expect(w.find(".toolbar-group").exists()).toBe(true);
      expect(w.findAll(".toolbar-btn-modern")).toHaveLength(0);
      w.unmount();
    });
  });

  describe("type='dropdown' (real ToolbarDropdown)", () => {
    const dropdownItems = () => [
      { id: "p", label: "Paragraph", icon: ICON, onClick: vi.fn(), isActive: () => false },
      { id: "h1", label: "Heading 1", shortcut: "Ctrl+1", onClick: vi.fn(), isActive: () => false },
    ];

    const openable = (props: Record<string, unknown>) =>
      mount(ToolbarSection, {
        props: { type: "dropdown", label: "Format", tooltip: "Paragraph format", ...props },
        attachTo: document.body,
      });

    it("renders a closed dropdown trigger showing the static label", () => {
      const w = openable({ items: dropdownItems() });
      const trigger = w.find(".dropdown-trigger");
      expect(trigger.exists()).toBe(true);
      expect(w.get(".dropdown-label").text()).toBe("Format");
      expect(trigger.attributes("aria-expanded")).toBe("false");
      expect(w.find(".dropdown-menu").exists()).toBe(false);
      w.unmount();
    });

    it("forwards the icon to the trigger", () => {
      const w = openable({ items: dropdownItems(), icon: ICON });
      expect(w.get(".dropdown-trigger").find("svg.sec-icon").exists()).toBe(true);
      w.unmount();
    });

    it("opens the menu on trigger click and lists the items with icon/label/shortcut", async () => {
      const w = openable({ items: dropdownItems() });

      await w.get(".dropdown-trigger").trigger("click");
      expect(w.find(".dropdown-menu").exists()).toBe(true);
      expect(w.get(".dropdown-trigger").attributes("aria-expanded")).toBe("true");

      const menuItems = w.findAll(".dropdown-item");
      expect(menuItems).toHaveLength(2);
      expect(menuItems[0].find("svg.sec-icon").exists()).toBe(true);
      expect(menuItems[0].find(".item-label").text()).toBe("Paragraph");
      expect(menuItems[1].find(".item-shortcut").text()).toBe("Ctrl+1");
      w.unmount();
    });

    it("clicking the trigger again toggles the menu closed", async () => {
      const w = openable({ items: dropdownItems() });
      await w.get(".dropdown-trigger").trigger("click");
      expect(w.find(".dropdown-menu").exists()).toBe(true);

      await w.get(".dropdown-trigger").trigger("click");
      expect(w.find(".dropdown-menu").exists()).toBe(false);
      w.unmount();
    });

    it("invokes the item's onClick and closes the menu when an item is chosen", async () => {
      const items = dropdownItems();
      const w = openable({ items });

      await w.get(".dropdown-trigger").trigger("click");
      await w.findAll(".dropdown-item")[1].trigger("click");

      expect(items[1].onClick).toHaveBeenCalledTimes(1);
      expect(items[0].onClick).not.toHaveBeenCalled();
      expect(w.find(".dropdown-menu").exists()).toBe(false);
      w.unmount();
    });

    it("closes when clicking outside the dropdown", async () => {
      const w = openable({ items: dropdownItems() });
      await w.get(".dropdown-trigger").trigger("click");
      expect(w.find(".dropdown-menu").exists()).toBe(true);

      // A real click anywhere outside the dropdown root bubbles to the
      // document-level handleClickOutside listener registered by ToolbarDropdown.
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();

      expect(w.find(".dropdown-menu").exists()).toBe(false);
      w.unmount();
    });

    it("highlights the active item and, by default, shows its label on the trigger", async () => {
      const items = [
        { id: "p", label: "Paragraph", onClick: vi.fn(), isActive: () => false },
        { id: "h1", label: "Heading 1", onClick: vi.fn(), isActive: () => true },
      ];
      const w = openable({ items });

      // Trigger reflects the active item's label + active styling.
      expect(w.get(".dropdown-label").text()).toBe("Heading 1");
      expect(w.get(".dropdown-trigger").classes()).toContain("active");

      await w.get(".dropdown-trigger").trigger("click");
      const menuItems = w.findAll(".dropdown-item");
      expect(menuItems[0].classes()).not.toContain("active");
      expect(menuItems[1].classes()).toContain("active");
      w.unmount();
    });

    it("keeps the static label when preserveLabel is set, even with an active item", () => {
      const items = [
        { id: "h1", label: "Heading 1", onClick: vi.fn(), isActive: () => true },
      ];
      const w = openable({ items, preserveLabel: true });
      expect(w.get(".dropdown-label").text()).toBe("Format");
      w.unmount();
    });

    it("renders divider items as .dropdown-divider (not clickable items)", async () => {
      const items = [
        { id: "cut", label: "Cut", onClick: vi.fn() },
        { divider: true },
        { id: "paste", label: "Paste", onClick: vi.fn() },
      ];
      const w = openable({ items });

      await w.get(".dropdown-trigger").trigger("click");
      expect(w.findAll(".dropdown-divider")).toHaveLength(1);
      expect(w.findAll(".dropdown-item")).toHaveLength(2);
      w.unmount();
    });

    it("emits remember-selection (forwarded from the child) on trigger mousedown", async () => {
      const w = openable({ items: dropdownItems() });
      await w.get(".dropdown-trigger").trigger("mousedown");
      expect(w.emitted("remember-selection")).toBeTruthy();
      w.unmount();
    });

    it("when visible=false, disables the trigger, suffixes the tooltip and refuses to open", async () => {
      const w = openable({ items: dropdownItems(), visible: false });

      const root = w.get(".toolbar-dropdown");
      expect(root.classes()).toContain("toolbar-section-disabled");

      const trigger = w.get(".dropdown-trigger");
      expect((trigger.element as HTMLButtonElement).disabled).toBe(true);
      expect(trigger.attributes("data-tooltip")).toBe(
        "Paragraph format (not available for current selection)"
      );

      await trigger.trigger("click");
      expect(w.find(".dropdown-menu").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("type='custom' (slot passthrough)", () => {
    it("renders the default slot content", () => {
      const w = mount(ToolbarSection, {
        props: { type: "custom" },
        slots: { default: '<span class="custom-content">Hi</span>' },
      });
      expect(w.find(".custom-content").text()).toBe("Hi");
      // no button/dropdown chrome in custom mode
      expect(w.find(".toolbar-btn-modern").exists()).toBe(false);
      expect(w.find(".dropdown-trigger").exists()).toBe(false);
      w.unmount();
    });

    it("applies toolbar-section-disabled to the wrapper only when not visible", () => {
      // The template is a v-if/v-else-if chain with no v-else, so the component
      // has a fragment root (comment anchors for the inactive branches). Query
      // the wrapper <div> directly rather than reading wrapper.classes(), which
      // would resolve to a comment anchor node.
      const visible = mount(ToolbarSection, {
        props: { type: "custom", visible: true },
        slots: { default: "<span>x</span>" },
      });
      expect(visible.get("div").classes()).not.toContain(
        "toolbar-section-disabled"
      );
      visible.unmount();

      const hidden = mount(ToolbarSection, {
        props: { type: "custom", visible: false },
        slots: { default: "<span>x</span>" },
      });
      expect(hidden.get("div").classes()).toContain("toolbar-section-disabled");
      hidden.unmount();
    });
  });
});
