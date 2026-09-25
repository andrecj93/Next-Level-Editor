import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import CommandMenu from "../CommandMenu.vue";
import type { SlashCommandOption } from "../../composables/useSlashCommands";

/**
 * Behavioural mount tests for CommandMenu.vue — the slash "Quick Actions" menu.
 *
 * Notes on test strategy:
 * - VTU v2 stubs <Transition> by default and renders its slot synchronously, so
 *   the `v-if="show"` branch is observable without waiting on animation.
 * - Geometry is mocked because happy-dom has no layout. The scrolling tests
 *   ensure only this list moves, without a document-wide scrollIntoView.
 */

const makeOption = (
  id: string,
  label: string,
  description: string
): SlashCommandOption => ({
  id,
  label,
  description,
  action: vi.fn(),
});

const defaultOptions: SlashCommandOption[] = [
  makeOption("h1", "Heading 1", "Big section heading"),
  makeOption("bullet", "Bulleted list", "Create a simple list"),
  makeOption("quote", "Quote", "Capture a quotation"),
];

const basePosition = { top: 120, left: 48 };

function factory(props: Record<string, unknown> = {}, attachTo?: Element) {
  return mount(CommandMenu, {
    attachTo,
    props: {
      show: true,
      position: basePosition,
      options: defaultOptions,
      ...props,
    },
  });
}

describe("CommandMenu.vue", () => {
  describe("show branch (v-if)", () => {
    it("renders nothing when show is false", () => {
      const wrapper = factory({ show: false });
      expect(wrapper.find(".command-menu").exists()).toBe(false);
      expect(wrapper.find("ul[role='listbox']").exists()).toBe(false);
    });

    it("renders the menu shell when show is true", () => {
      const wrapper = factory();
      expect(wrapper.find(".command-menu").exists()).toBe(true);
      expect(wrapper.find(".command-menu-header").text()).toBe("Quick Actions");
      expect(wrapper.find("ul[role='listbox']").exists()).toBe(true);
    });

    it("toggles visibility reactively when show flips", async () => {
      const wrapper = factory({ show: false });
      expect(wrapper.find(".command-menu").exists()).toBe(false);

      await wrapper.setProps({ show: true });
      expect(wrapper.find(".command-menu").exists()).toBe(true);

      await wrapper.setProps({ show: false });
      expect(wrapper.find(".command-menu").exists()).toBe(false);
    });
  });

  describe("options rendering", () => {
    it("renders one option row per option with label + description", () => {
      const wrapper = factory();
      const rows = wrapper.findAll("li[role='option']");
      expect(rows).toHaveLength(defaultOptions.length);

      const titles = wrapper.findAll(".command-title").map((n) => n.text());
      const descriptions = wrapper
        .findAll(".command-description")
        .map((n) => n.text());
      expect(titles).toEqual([
        "Heading 1",
        "Bulleted list",
        "Quote",
      ]);
      expect(descriptions).toEqual([
        "Big section heading",
        "Create a simple list",
        "Capture a quotation",
      ]);
    });

    it("renders the header and a 'No matching commands' empty state when options is empty", () => {
      // A blank listbox reads as broken — the menu shows an explicit empty
      // state instead (and no listbox at all, so AT users aren't offered an
      // empty list).
      const wrapper = factory({ options: [] });
      expect(wrapper.find(".command-menu-header").exists()).toBe(true);
      expect(wrapper.find("ul[role='listbox']").exists()).toBe(false);
      expect(wrapper.find(".command-menu-empty").text()).toBe(
        "No matching commands"
      );
    });

    it("re-renders rows when the options prop changes", async () => {
      const wrapper = factory();
      expect(wrapper.findAll("li[role='option']")).toHaveLength(3);

      await wrapper.setProps({
        options: [makeOption("only", "Divider", "Insert a divider")],
      });
      const rows = wrapper.findAll("li[role='option']");
      expect(rows).toHaveLength(1);
      expect(rows[0].find(".command-title").text()).toBe("Divider");
    });
  });

  describe("selectedIndex highlight", () => {
    it("highlights index 0 by default (withDefaults)", () => {
      // selectedIndex intentionally omitted -> default 0
      const wrapper = mount(CommandMenu, {
        props: { show: true, position: basePosition, options: defaultOptions },
      });
      const rows = wrapper.findAll("li[role='option']");
      expect(rows[0].classes()).toContain("selected");
      expect(rows[0].attributes("aria-selected")).toBe("true");
      expect(rows[1].attributes("aria-selected")).toBe("false");
    });

    it("moves the selected class + aria-selected to the given index", async () => {
      const wrapper = factory({ selectedIndex: 0 });
      let rows = wrapper.findAll("li[role='option']");
      expect(rows[0].classes()).toContain("selected");

      await wrapper.setProps({ selectedIndex: 2 });
      rows = wrapper.findAll("li[role='option']");
      expect(rows[0].classes()).not.toContain("selected");
      expect(rows[2].classes()).toContain("selected");
      expect(rows[2].attributes("aria-selected")).toBe("true");

      // Exactly one row is ever highlighted.
      const highlighted = rows.filter((r) => r.classes().includes("selected"));
      expect(highlighted).toHaveLength(1);
    });

    it("highlights no row when selectedIndex is out of range", () => {
      const wrapper = factory({ selectedIndex: 99 });
      const highlighted = wrapper
        .findAll("li[role='option']")
        .filter((r) => r.classes().includes("selected"));
      expect(highlighted).toHaveLength(0);
    });
  });

  describe("selection events", () => {
    it("emits select with the clicked option payload", async () => {
      const wrapper = factory();
      const rows = wrapper.findAll("li[role='option']");

      await rows[1].trigger("click");

      const emitted = wrapper.emitted("select");
      expect(emitted).toHaveLength(1);
      // Payload is Vue's reactive proxy of the option, so compare structurally.
      expect(emitted![0][0]).toStrictEqual(defaultOptions[1]);
      expect((emitted![0][0] as SlashCommandOption).id).toBe("bullet");
    });

    it("emits a distinct payload for each row clicked", async () => {
      const wrapper = factory();
      const rows = wrapper.findAll("li[role='option']");

      await rows[0].trigger("click");
      await rows[2].trigger("click");

      const emitted = wrapper.emitted("select")!;
      expect(emitted).toHaveLength(2);
      expect((emitted[0][0] as SlashCommandOption).id).toBe("h1");
      expect((emitted[1][0] as SlashCommandOption).id).toBe("quote");
    });

    it("prevents default on mousedown so the editor keeps its selection", () => {
      const wrapper = factory();
      const li = wrapper.find("li[role='option']").element;
      const ev = new Event("mousedown", { bubbles: true, cancelable: true });
      li.dispatchEvent(ev);
      // @mousedown.prevent must cancel the event (avoids blurring contenteditable).
      expect(ev.defaultPrevented).toBe(true);
    });
  });

  describe("position styling", () => {
    it("applies top/left from position and omits max-height when absent", () => {
      const wrapper = factory({ position: { top: 200, left: 30 } });
      const style = wrapper.find(".command-menu").attributes("style") ?? "";
      expect(style).toContain("top: 200px");
      expect(style).toContain("left: 30px");
      expect(style).not.toContain("max-height");
    });

    it("applies max-height when position.maxHeight is provided", () => {
      const wrapper = factory({
        position: { top: 10, left: 10, maxHeight: 240 },
      });
      const style = wrapper.find(".command-menu").attributes("style") ?? "";
      expect(style).toContain("max-height: 240px");
    });

    it("updates the inline style when position changes", async () => {
      const wrapper = factory({ position: { top: 5, left: 5 } });
      await wrapper.setProps({ position: { top: 300, left: 90 } });
      const style = wrapper.find(".command-menu").attributes("style") ?? "";
      expect(style).toContain("top: 300px");
      expect(style).toContain("left: 90px");
    });
  });

  describe("selectedIndex watcher (scroll-into-view)", () => {
    let scrollSpy: ReturnType<typeof vi.fn>;
    let originalScroll: typeof Element.prototype.scrollIntoView;

    beforeEach(() => {
      originalScroll = Element.prototype.scrollIntoView;
      scrollSpy = vi.fn();
      Element.prototype.scrollIntoView =
        scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
    });

    afterEach(() => {
      Element.prototype.scrollIntoView = originalScroll;
    });

    it("scrolls only its own list to reveal the selected row", async () => {
      const wrapper = factory({ selectedIndex: 0 }, document.body);
      const other = factory({ selectedIndex: 0 }, document.body);
      const geometry = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          return this.tagName === "UL"
            ? { top: 100, bottom: 200 } as DOMRect
            : { top: 220, bottom: 260 } as DOMRect;
        });
      scrollSpy.mockClear();

      await wrapper.setProps({ selectedIndex: 2 });
      await nextTick(); // watcher schedules its query inside nextTick

      expect(wrapper.get("ul").element.scrollTop).toBe(60);
      expect(other.get("ul").element.scrollTop).toBe(0);
      expect(scrollSpy).not.toHaveBeenCalled();

      wrapper.unmount();
      other.unmount();
      geometry.mockRestore();
    });

    it("does not scroll while the menu is closed", async () => {
      const wrapper = factory({ show: false, selectedIndex: 0 }, document.body);
      scrollSpy.mockClear();

      await wrapper.setProps({ selectedIndex: 1 });
      await nextTick();

      // watcher early-returns on !show
      expect(scrollSpy).not.toHaveBeenCalled();

      wrapper.unmount();
    });
  });
});
