import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ToolbarDropdown from "../ToolbarDropdown.vue";

/**
 * R23-23: the trigger claimed aria-haspopup (which maps to "menu") but the
 * popup fulfilled none of the menu contract — no role="menu", no
 * role="menuitem", and ArrowDown did nothing at all, so a keyboard user opened
 * a menu they could not enter. EditorToolbar's roving handler deliberately
 * skips `.dropdown-menu` ("menus own their navigation") — and the menus never
 * implemented any.
 *
 * This is the real WAI-ARIA menu-button keyboard model: ArrowDown/Enter enters
 * the menu, Arrow keys move with wrapping, Home/End jump, Escape returns to the
 * trigger, and Tab or leaving the dropdown closes it so it cannot be orphaned
 * open while focus roves away.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const mountDropdown = () => {
  wrapper = mount(ToolbarDropdown, {
    attachTo: document.body,
    props: {
      label: "Insert",
      items: [
        { id: "link", label: "Link" },
        { id: "image", label: "Image" },
        { divider: true },
        { id: "table", label: "Table" },
      ],
    },
  });
  return wrapper;
};

const trigger = () =>
  wrapper!.find("button.dropdown-trigger").element as HTMLButtonElement;
const items = () =>
  wrapper!.findAll("button.dropdown-item").map((w) => w.element as HTMLElement);

const pressOnTrigger = async (key: string) => {
  await wrapper!.find("button.dropdown-trigger").trigger("keydown", { key });
  await nextTick();
};

/** Dispatch on the FOCUSED item so it bubbles to the menu, as a real key does. */
const pressInMenu = async (key: string) => {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await nextTick();
};

describe("ToolbarDropdown fulfils the menu contract it claims (#R23-23)", () => {
  it("marks the popup as a menu with menuitem children", async () => {
    mountDropdown();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();

    const menu = wrapper!.find("div.dropdown-menu");
    expect(menu.attributes("role")).toBe("menu");
    for (const item of wrapper!.findAll("button.dropdown-item")) {
      expect(item.attributes("role")).toBe("menuitem");
    }
  });

  it("ArrowDown on the trigger opens the menu and focuses the first item", async () => {
    mountDropdown();
    trigger().focus();

    await pressOnTrigger("ArrowDown");

    expect(wrapper!.find("div.dropdown-menu").exists()).toBe(true);
    expect(document.activeElement).toBe(items()[0]);
  });

  it("Arrow keys move between items and wrap", async () => {
    mountDropdown();
    trigger().focus();
    await pressOnTrigger("ArrowDown");

    await pressInMenu("ArrowDown");
    expect(document.activeElement).toBe(items()[1]);

    // Past the last item wraps to the first (a divider is not an item).
    await pressInMenu("ArrowDown");
    expect(document.activeElement).toBe(items()[2]);
    await pressInMenu("ArrowDown");
    expect(document.activeElement).toBe(items()[0]);

    // And backwards from the first wraps to the last.
    await pressInMenu("ArrowUp");
    expect(document.activeElement).toBe(items()[2]);
  });

  it("Home and End jump to the ends", async () => {
    mountDropdown();
    trigger().focus();
    await pressOnTrigger("ArrowDown");

    await pressInMenu("End");
    expect(document.activeElement).toBe(items()[2]);

    await pressInMenu("Home");
    expect(document.activeElement).toBe(items()[0]);
  });

  it("ArrowUp on the trigger opens at the LAST item", async () => {
    mountDropdown();
    trigger().focus();

    await pressOnTrigger("ArrowUp");

    expect(document.activeElement).toBe(items()[2]);
  });

  it("does not leave the menu open when focus roves away from the trigger", async () => {
    // The toolbar's ArrowRight moves the roving stop to the NEXT trigger. The
    // menu used to stay open, still reporting aria-expanded="true", with
    // nothing focused inside it.
    mountDropdown();
    trigger().focus();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();
    expect(wrapper!.find("div.dropdown-menu").exists()).toBe(true);

    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    await wrapper!.find(".toolbar-dropdown").trigger("focusout", {
      relatedTarget: elsewhere,
    });
    await nextTick();

    expect(wrapper!.find("div.dropdown-menu").exists()).toBe(false);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
