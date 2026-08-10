import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import CommandPalette from "../CommandPalette.vue";

/**
 * r21-a11y-3 / r21-a11y-4 — screen-reader ANNOUNCEMENT gaps:
 *  - the WYSIWYG surface carried no role and no accessible name, so it was
 *    announced as an unnamed edit region with no hint that it is a multi-line
 *    rich-text field;
 *  - the command palette's results were plain <div>s, so arrow-keying moved a
 *    purely visual highlight: no option name, no selection relationship, and
 *    Enter then ran a command the user was never told about.
 */
describe("editing surface is announced properly (#r21-a11y-3)", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("exposes a textbox role, multiline flag and an accessible name", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>" },
      attachTo: document.body,
    });
    await nextTick();

    const surface = wrapper.find(".editor-content").element as HTMLElement;
    expect(surface.getAttribute("role")).toBe("textbox");
    expect(surface.getAttribute("aria-multiline")).toBe("true");
    expect((surface.getAttribute("aria-label") ?? "").trim().length).
      toBeGreaterThan(0);
  });
});

describe("command palette results are announced (#r21-a11y-4)", () => {
  const commands = [
    {
      id: "bold",
      name: "Bold",
      description: "Make text bold",
      icon: "B",
      category: "Formatting",
      action: vi.fn(),
    },
    {
      id: "italic",
      name: "Italic",
      description: "Make text italic",
      icon: "I",
      category: "Formatting",
      action: vi.fn(),
    },
  ];

  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  const openPalette = async () => {
    wrapper = mount(CommandPalette, {
      props: { show: true, commands },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper;
  };

  it("wires the combobox/listbox relationship", async () => {
    const w = await openPalette();

    const input = w.find(".command-palette-input");
    const list = w.find(".command-palette-results");
    expect(input.attributes("role")).toBe("combobox");
    expect(input.attributes("aria-expanded")).toBe("true");
    expect(list.attributes("role")).toBe("listbox");
    // The input must point at the list it controls.
    expect(input.attributes("aria-controls")).toBe(list.attributes("id"));
    expect((input.attributes("aria-controls") ?? "").length).toBeGreaterThan(0);
  });

  it("marks each result as an option and flags the selected one", async () => {
    const w = await openPalette();

    const items = w.findAll(".command-item");
    expect(items.length).toBeGreaterThan(1);
    for (const item of items) {
      expect(item.attributes("role")).toBe("option");
      expect(item.attributes("id")).toBeTruthy();
    }
    expect(items[0].attributes("aria-selected")).toBe("true");
    expect(items[1].attributes("aria-selected")).toBe("false");
  });

  it("aria-activedescendant follows the arrow-key selection", async () => {
    const w = await openPalette();

    const input = w.find(".command-palette-input");
    const items = () => w.findAll(".command-item");
    const first = input.attributes("aria-activedescendant");
    expect(first).toBeTruthy();
    expect(first).toBe(items()[0].attributes("id"));

    await input.trigger("keydown", { key: "ArrowDown" });
    await nextTick();

    const second = input.attributes("aria-activedescendant");
    expect(second).toBeTruthy();
    expect(second).toBe(items()[1].attributes("id"));
    expect(second).not.toBe(first);
  });
});
