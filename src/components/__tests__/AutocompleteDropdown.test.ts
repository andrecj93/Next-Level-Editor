import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import AutocompleteDropdown from "../AutocompleteDropdown.vue";
import type { AutocompleteType } from "../../composables/useSmartAutocomplete";

/**
 * AutocompleteDropdown drives REAL behaviour:
 *  - v-if branches (visible / empty suggestions / help text)
 *  - computed positioning style from cursorPosition
 *  - type-label mapping (all 6 types + fallback)
 *  - click + mouseenter selection
 *  - document-level keyboard nav (ArrowUp/Down/Enter/Tab/Escape)
 *  - click-outside-to-close (document mousedown)
 *  - reset-on-reopen + reset-on-suggestions-change watchers
 *
 * The component attaches keydown/mousedown listeners to `document` in
 * onMounted, so every wrapper is mounted with `attachTo: document.body` and
 * torn down in afterEach — otherwise stale listeners from a prior test would
 * fire on the shared document and pollute the next test.
 */

type Suggestion = { label: string; value: string; type: AutocompleteType };

const SUGGESTIONS: Suggestion[] = [
  { label: "Grinning", value: "😀", type: "emoji" },
  { label: "Website", value: "https://example.com", type: "url" },
  { label: "Contact", value: "me@example.com", type: "email" },
];

let wrapper: VueWrapper | null = null;

function mountDropdown(props: Record<string, unknown> = {}) {
  wrapper = mount(AutocompleteDropdown, {
    attachTo: document.body,
    props: {
      visible: true,
      suggestions: SUGGESTIONS,
      ...props,
    },
  });
  return wrapper;
}

/** Dispatch a real keydown on document (that is where the listener lives). */
async function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  await nextTick();
}

beforeEach(() => {
  // scrollToSelected() -> smoothScrollIntoView() calls scrollIntoView, which
  // happy-dom does not implement. Stub it so keyboard-nav tests don't throw.
   
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    vi.fn();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("AutocompleteDropdown.vue", () => {
  describe("visibility / v-if branches", () => {
    it("does not render when visible is false", () => {
      mountDropdown({ visible: false });
      expect(wrapper!.find(".autocomplete-dropdown").exists()).toBe(false);
    });

    it("leaves keys alone while visible with no suggestions yet (#R22-DROP-3)", async () => {
      // A consumer sets visible=true the moment a query starts and fills
      // `suggestions` when the async lookup returns. The listener only checked
      // `visible`, but the dropdown renders on `visible && suggestions.length`
      // — so during that window nothing was on screen while Enter, Tab, Escape
      // and the arrows were preventDefault-ed document-wide. Enter simply
      // stopped making paragraphs.
      mountDropdown({ suggestions: [] });
      expect(wrapper!.find(".autocomplete-dropdown").exists()).toBe(false);

      for (const key of ["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp"]) {
        const event = new KeyboardEvent("keydown", { key, cancelable: true });
        document.dispatchEvent(event);
        await nextTick();
        expect(
          event.defaultPrevented,
          `${key} must reach the page when the dropdown is not rendered`
        ).toBe(false);
      }
      expect(wrapper!.emitted("close")).toBeUndefined();
      expect(wrapper!.emitted("select")).toBeUndefined();
    });

    it("does not render when visible is true but suggestions is empty", () => {
      mountDropdown({ suggestions: [] });
      expect(wrapper!.find(".autocomplete-dropdown").exists()).toBe(false);
    });

    it("renders the listbox when visible with suggestions", () => {
      mountDropdown();
      const box = wrapper!.find(".autocomplete-dropdown");
      expect(box.exists()).toBe(true);
      expect(box.attributes("role")).toBe("listbox");
    });

    it("renders one option per suggestion with value + label + type label", () => {
      mountDropdown();
      const items = wrapper!.findAll(".suggestion-item");
      expect(items).toHaveLength(3);

      expect(items[0].find(".suggestion-value").text()).toBe("😀");
      expect(items[0].find(".suggestion-label").text()).toBe("Grinning");
      expect(items[0].find(".suggestion-type").text()).toBe("Emoji");
      expect(items[0].attributes("role")).toBe("option");
    });
  });

  describe("help-text footer", () => {
    it("renders the footer by default", () => {
      mountDropdown();
      expect(wrapper!.find(".dropdown-footer").exists()).toBe(true);
    });

    it("hides the footer when showHelpText is false", () => {
      mountDropdown({ showHelpText: false });
      expect(wrapper!.find(".dropdown-footer").exists()).toBe(false);
    });
  });

  describe("aria-label", () => {
    it("uses the default aria-label", () => {
      mountDropdown();
      expect(wrapper!.find(".autocomplete-dropdown").attributes("aria-label")).toBe(
        "Autocomplete suggestions"
      );
    });

    it("uses a custom aria-label", () => {
      mountDropdown({ ariaLabel: "Mentions" });
      expect(wrapper!.find(".autocomplete-dropdown").attributes("aria-label")).toBe(
        "Mentions"
      );
    });
  });

  describe("positioning style", () => {
    it("defaults to cursor 0,0 (top offset 20px, left 0px)", () => {
      mountDropdown();
      const style = wrapper!.find(".autocomplete-dropdown").attributes("style") ?? "";
      expect(style).toContain("top: 20px");
      expect(style).toContain("left: 0px");
    });

    it("offsets 20px below the cursor and aligns to cursor x", () => {
      mountDropdown({ cursorPosition: { x: 140, y: 200 } });
      const style = wrapper!.find(".autocomplete-dropdown").attributes("style") ?? "";
      expect(style).toContain("top: 220px");
      expect(style).toContain("left: 140px");
    });
  });

  describe("type-label mapping", () => {
    const cases: Array<[AutocompleteType, string]> = [
      ["url", "URL"],
      ["email", "Email"],
      ["markdown", "Markdown"],
      ["smartQuote", "Smart Quote"],
      ["emoji", "Emoji"],
      ["smartPunctuation", "Punctuation"],
    ];

    it.each(cases)("maps %s -> %s", (type, label) => {
      mountDropdown({ suggestions: [{ label: "x", value: "y", type }] });
      expect(wrapper!.find(".suggestion-type").text()).toBe(label);
    });

    it("falls back to the raw type for an unknown type", () => {
      mountDropdown({
        suggestions: [
          { label: "x", value: "y", type: "mystery" as unknown as AutocompleteType },
        ],
      });
      expect(wrapper!.find(".suggestion-type").text()).toBe("mystery");
    });
  });

  describe("selection by click", () => {
    it("emits select (with the suggestion) and close when an item is clicked", async () => {
      mountDropdown();
      await wrapper!.findAll(".suggestion-item")[1].trigger("click");

      const select = wrapper!.emitted("select");
      expect(select).toHaveLength(1);
      expect(select![0][0]).toEqual(SUGGESTIONS[1]);
      expect(wrapper!.emitted("close")).toHaveLength(1);
    });

    it("moves the highlight on mouseenter", async () => {
      mountDropdown();
      const items = wrapper!.findAll(".suggestion-item");
      // First item selected by default
      expect(items[0].classes()).toContain("selected");

      await items[2].trigger("mouseenter");
      const after = wrapper!.findAll(".suggestion-item");
      expect(after[2].classes()).toContain("selected");
      expect(after[0].classes()).not.toContain("selected");
      expect(after[2].attributes("aria-selected")).toBe("true");
    });
  });

  describe("keyboard navigation", () => {
    it("selects the first item by default (aria-selected)", () => {
      mountDropdown();
      const items = wrapper!.findAll(".suggestion-item");
      expect(items[0].attributes("aria-selected")).toBe("true");
      expect(items[1].attributes("aria-selected")).toBe("false");
    });

    it("ArrowDown advances the selection", async () => {
      mountDropdown();
      await pressKey("ArrowDown");
      const items = wrapper!.findAll(".suggestion-item");
      expect(items[1].classes()).toContain("selected");
      expect(items[0].classes()).not.toContain("selected");
    });

    it("ArrowDown wraps from the last item back to the first", async () => {
      mountDropdown();
      await pressKey("ArrowDown"); // 1
      await pressKey("ArrowDown"); // 2
      await pressKey("ArrowDown"); // wraps -> 0
      expect(wrapper!.findAll(".suggestion-item")[0].classes()).toContain("selected");
    });

    it("ArrowUp wraps from the first item to the last", async () => {
      mountDropdown();
      await pressKey("ArrowUp");
      expect(wrapper!.findAll(".suggestion-item")[2].classes()).toContain("selected");
    });

    it("Enter selects the highlighted item -> emits select + close", async () => {
      mountDropdown();
      await pressKey("ArrowDown"); // highlight index 1
      await pressKey("Enter");

      expect(wrapper!.emitted("select")![0][0]).toEqual(SUGGESTIONS[1]);
      expect(wrapper!.emitted("close")).toHaveLength(1);
    });

    it("Tab also selects the highlighted item", async () => {
      mountDropdown();
      await pressKey("Tab");
      expect(wrapper!.emitted("select")![0][0]).toEqual(SUGGESTIONS[0]);
      expect(wrapper!.emitted("close")).toHaveLength(1);
    });

    it("Escape emits close but not select", async () => {
      mountDropdown();
      await pressKey("Escape");
      expect(wrapper!.emitted("close")).toHaveLength(1);
      expect(wrapper!.emitted("select")).toBeUndefined();
    });

    it("ignores keydown while not visible", async () => {
      mountDropdown({ visible: false });
      await pressKey("ArrowDown");
      await pressKey("Enter");
      await pressKey("Escape");
      expect(wrapper!.emitted("select")).toBeUndefined();
      expect(wrapper!.emitted("close")).toBeUndefined();
    });
  });

  describe("click-outside to close", () => {
    it("emits close when mousedown lands outside the dropdown", () => {
      mountDropdown();
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(wrapper!.emitted("close")).toHaveLength(1);
    });

    it("does NOT close when mousedown lands inside the dropdown", () => {
      mountDropdown();
      wrapper!
        .find(".suggestion-item")
        .element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(wrapper!.emitted("close")).toBeUndefined();
    });

    it("does not close on outside mousedown while not visible", () => {
      mountDropdown({ visible: false });
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(wrapper!.emitted("close")).toBeUndefined();
    });
  });

  describe("watchers reset the highlight", () => {
    it("resets to the first item when reopened", async () => {
      mountDropdown();
      await pressKey("ArrowDown"); // move to index 1
      expect(wrapper!.findAll(".suggestion-item")[1].classes()).toContain("selected");

      await wrapper!.setProps({ visible: false });
      await wrapper!.setProps({ visible: true });
      await nextTick();

      expect(wrapper!.findAll(".suggestion-item")[0].classes()).toContain("selected");
    });

    it("resets to the first item when the suggestions change", async () => {
      mountDropdown();
      await pressKey("ArrowDown"); // index 1
      await pressKey("ArrowDown"); // index 2
      expect(wrapper!.findAll(".suggestion-item")[2].classes()).toContain("selected");

      await wrapper!.setProps({
        suggestions: [
          { label: "New A", value: "a", type: "markdown" as AutocompleteType },
          { label: "New B", value: "b", type: "url" as AutocompleteType },
        ],
      });

      const items = wrapper!.findAll(".suggestion-item");
      expect(items).toHaveLength(2);
      expect(items[0].classes()).toContain("selected");
    });

    it("focuses the dropdown when it becomes visible", async () => {
      mountDropdown({ visible: false });
      await wrapper!.setProps({ visible: true });
      await nextTick();
      await nextTick();
      expect(document.activeElement).toBe(
        wrapper!.find(".autocomplete-dropdown").element
      );
    });
  });

  describe("teardown removes global listeners", () => {
    it("stops responding to document keydown after unmount", async () => {
      mountDropdown();
      const w = wrapper!;
      w.unmount();
      wrapper = null;

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      // No 'close' recorded because the listener was removed in onUnmounted.
      expect(w.emitted("close")).toBeUndefined();
    });
  });
});
