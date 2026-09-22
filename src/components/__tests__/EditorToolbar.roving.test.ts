import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import EditorToolbar from "../EditorToolbar.vue";
import type { ToolbarAction } from "../../types/toolbar";

// role="toolbar" promises the ARIA toolbar pattern: ONE tab stop for the whole
// masthead, ArrowLeft/ArrowRight roving between controls, Home/End to the
// extremes. These tests pin the roving-tabindex contract (the audit found ~30
// individual tab stops and dead arrow keys).

const mockAction = (id: string): ToolbarAction => ({
  id,
  label: id,
  icon: "<svg></svg>",
  tooltip: id,
  onClick: vi.fn(),
  isActive: vi.fn(() => false),
});

const defaultProps = {
  isToolbarSectionVisible: vi.fn(() => true),
  formatDropdownItems: [],
  inlineFormatActions: [mockAction("bold")],
  alignmentDropdownItems: [],
  listActions: [mockAction("bullet-list"), mockAction("numbered-list")],
  insertDropdownItems: [],
  showColorsDropdown: false,
  textColor: "#000000",
  backgroundColor: "#ffffff",
  fontSizeDropdownItems: [],
  historyIndex: 5,
  historyLength: 10,
  productivityDropdownItems: [],
  toolActions: [mockAction("clear")],
  exportDropdownItems: [],
  viewMode: "editor" as const,
  theme: "light" as const,
  isFullScreen: false,
};

// Stub the composite sections; the native buttons (colors trigger, undo/redo,
// view modes, format-html, fullscreen, theme toggle) are plenty to rove over.
const mountToolbar = (props: Partial<typeof defaultProps> & { toolbarLayout?: "comfortable" | "compact" } = {}) =>
  mount(EditorToolbar, {
    props: { ...defaultProps, ...props },
    attachTo: document.body,
    global: { stubs: { ToolbarSection: true, ColorPicker: true } },
  });

/** The controls the roving pattern manages: enabled, visible, outside menus. */
const managedControls = (wrapper: VueWrapper<any>): HTMLElement[] =>
  Array.from(
    (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
      "button:not([disabled])"
    )
  ).filter((el) => !el.closest(".dropdown-menu") && visible(el, wrapper));

const visible = (el: HTMLElement, wrapper: VueWrapper<any>): boolean => {
  let node: HTMLElement | null = el;
  while (node && node !== wrapper.element) {
    if (node.style.display === "none") return false;
    node = node.parentElement;
  }
  return true;
};

describe("EditorToolbar roving tabindex", () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = mountToolbar();
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("exposes exactly one tab stop after mount, all other controls tabindex=-1", () => {
    const controls = managedControls(wrapper);
    expect(controls.length).toBeGreaterThan(5);
    const stops = controls.filter((el) => el.tabIndex === 0);
    expect(stops.length).toBe(1);
    expect(stops[0]).toBe(controls[0]);
    for (const el of controls.slice(1)) expect(el.tabIndex).toBe(-1);
  });

  it("ArrowRight moves focus and the tab stop to the next control", async () => {
    const controls = managedControls(wrapper);
    controls[0].focus();
    await wrapper.find("button").trigger("keydown", { key: "ArrowRight" });

    expect(document.activeElement).toBe(controls[1]);
    expect(controls[1].tabIndex).toBe(0);
    expect(controls[0].tabIndex).toBe(-1);
  });

  it("ArrowLeft wraps from the first control to the last", async () => {
    const controls = managedControls(wrapper);
    controls[0].focus();
    await wrapper.find("button").trigger("keydown", { key: "ArrowLeft" });

    const last = controls[controls.length - 1];
    expect(document.activeElement).toBe(last);
    expect(last.tabIndex).toBe(0);
  });

  it("ArrowRight wraps from the last control back to the first", async () => {
    const controls = managedControls(wrapper);
    const last = controls[controls.length - 1];
    last.focus();
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(controls[0]);
    expect(controls[0].tabIndex).toBe(0);
  });

  it("Home and End jump to the first and last control", async () => {
    const controls = managedControls(wrapper);
    controls[2].focus();
    controls[2].dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(controls[controls.length - 1]);

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(controls[0]);
    expect(controls[0].tabIndex).toBe(0);
  });

  it("re-anchors the tab stop on focusin (mouse/skip-link entry)", async () => {
    const controls = managedControls(wrapper);
    const target = controls[3];
    target.focus();
    target.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(target.tabIndex).toBe(0);
    const stops = managedControls(wrapper).filter((el) => el.tabIndex === 0);
    expect(stops).toEqual([target]);
  });

  it("skips disabled controls (undo at history start never becomes the stop)", async () => {
    await wrapper.setProps({ historyIndex: 0 });
    await wrapper.vm.$nextTick();

    const undo = wrapper
      .findAll("button")
      .find((b) => b.attributes("aria-label") === "Undo")!.element;
    expect(undo.hasAttribute("disabled")).toBe(true);
    expect((undo as HTMLElement).tabIndex).toBe(-1);

    const controls = managedControls(wrapper);
    expect(controls).not.toContain(undo);
    // Walk the full cycle: focus never lands on the disabled control.
    controls[0].focus();
    for (let i = 0; i < controls.length; i++) {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      );
      await wrapper.vm.$nextTick();
      expect(document.activeElement).not.toBe(undo);
    }
  });

  it("does not hijack arrow keys inside an open dropdown menu", async () => {
    await wrapper.setProps({ showColorsDropdown: true });
    const swatch = wrapper.find(".colors-menu button");
    expect(swatch.exists()).toBe(true);

    const before = document.activeElement;
    await swatch.trigger("keydown", { key: "ArrowRight" });
    // The toolbar handler must not move focus out of the menu.
    expect(document.activeElement).toBe(before);
  });

  it("re-manages the stop when the mini fold hides the current control", async () => {
    const compact = mountToolbar({ toolbarLayout: "compact" });
    try {
      // Expand, rove onto the theme toggle (lives in a v-show'd family).
      await compact.find(".toolbar-expand-toggle").trigger("click");
      await compact.vm.$nextTick();
      const themeToggle = compact.find(".theme-toggle").element as HTMLElement;
      themeToggle.focus();
      themeToggle.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await compact.vm.$nextTick();
      expect(themeToggle.tabIndex).toBe(0);

      // Collapse: the toggle's family is display:none'd — the tab stop must
      // move to a control that is still visible.
      await compact.find(".toolbar-expand-toggle").trigger("click");
      await compact.vm.$nextTick();
      await compact.vm.$nextTick();

      const controls = managedControls(compact);
      expect(controls).not.toContain(themeToggle);
      expect(themeToggle.tabIndex).toBe(-1);
      const stops = controls.filter((el) => el.tabIndex === 0);
      expect(stops.length).toBe(1);
    } finally {
      compact.unmount();
    }
  });

  it("keeps the aria toolbar contract intact (role + label unchanged)", () => {
    const nav = wrapper.find('[role="toolbar"]');
    expect(nav.exists()).toBe(true);
    expect(nav.attributes("aria-label")).toBe("Text formatting toolbar");
  });

  it("moves the tab stop when a responsive layout hides its control", async () => {
    const controls = managedControls(wrapper);
    controls[0].focus();
    controls[0].style.display = "none";
    window.dispatchEvent(new Event("resize"));
    await wrapper.vm.$nextTick();

    expect(controls[0].tabIndex).toBe(-1);
    expect(controls[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(controls[1]);
    expect(wrapper.findAll('button[tabindex="0"]')).toHaveLength(1);
  });

  it("includes writing colors in the toolbar's single keyboard sequence", async () => {
    await wrapper.setProps({ writingMode: true });
    await wrapper.get('.writing-more-format').trigger('click');
    await wrapper.vm.$nextTick();
    const close = wrapper.get('[aria-label="Close more formatting"]').element as HTMLElement;
    const text = wrapper.get('[aria-label="Text color"]').element as HTMLElement;
    const highlight = wrapper.get('[aria-label="Highlight color"]').element as HTMLElement;
    close.focus();

    await wrapper.get('[aria-label="Close more formatting"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(highlight);
    await wrapper.get('[aria-label="Highlight color"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(text);
    await wrapper.get('[aria-label="Text color"]').trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(highlight);
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1);
    expect(highlight.tabIndex).toBe(0);

    await wrapper.setProps({ isToolbarSectionVisible: (section: string) => section !== 'colors' });
    await wrapper.vm.$nextTick();
    expect(highlight.tabIndex).toBe(-1);
    expect(text.tabIndex).toBe(-1);
    expect(document.activeElement).not.toBe(highlight);
  });

  it("survives a smart-toolbar context change disabling the stop holder (#r21-a11y-1)", async () => {
    // The smart toolbar swaps which sections are available per context (caret
    // in a code block, image selected...). If the control holding the roving
    // stop is disabled by that swap and the stop is not moved, Tab skips the
    // whole toolbar — it becomes keyboard-unreachable.
    const ctx = mountToolbar({ isToolbarSectionVisible: vi.fn(() => true) });
    try {
      await ctx.vm.$nextTick();

      // Labelled "Colors", not "Colors menu": the popup is a disclosure holding
      // a group of controls, not a menu, so announcing "Colors menu, button"
      // would be a lie. #R23-24
      const colorsBtn = (ctx.element as HTMLElement).querySelector<HTMLElement>(
        '[aria-label="Colors"]'
      )!;
      expect(colorsBtn).toBeTruthy();

      // Park the roving stop on the colors trigger.
      colorsBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await ctx.vm.$nextTick();
      expect(colorsBtn.tabIndex).toBe(0);

      // Context change: colors is no longer available -> the trigger is
      // disabled, so it can no longer hold the tab stop.
      await ctx.setProps({
        isToolbarSectionVisible: (section: string) => section !== "colors",
      });
      await ctx.vm.$nextTick();
      await ctx.vm.$nextTick();

      expect(colorsBtn.hasAttribute("disabled")).toBe(true);
      const stops = managedControls(ctx).filter((el) => el.tabIndex === 0);
      expect(stops.length).toBe(1);
    } finally {
      ctx.unmount();
    }
  });
});
