import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ToolbarDropdown from "../ToolbarDropdown.vue";

/**
 * R23-4: closing the dropdown tore the focused .dropdown-item out of the DOM
 * without moving focus first, so focus fell to <body>. For a keyboard user that
 * loses their place entirely — the next Tab restarts at the top of the HOST
 * page. It also poisoned every overlay opened FROM the menu: useModalDialog
 * records document.activeElement when it activates, so the Link modal captured
 * <body> (or a detached node) and its restore-on-close was a no-op.
 */
describe("ToolbarDropdown returns focus to its trigger (#R23-4)", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const mountDropdown = (onClick?: () => void) => {
    wrapper = mount(ToolbarDropdown, {
      attachTo: document.body,
      props: {
        label: "Insert",
        items: [
          { id: "link", label: "Link", onClick },
          { id: "image", label: "Image" },
        ],
      },
    });
    return wrapper;
  };

  const trigger = () =>
    wrapper!.find("button.dropdown-trigger").element as HTMLButtonElement;

  it("moves focus back to the trigger when Escape closes the menu", async () => {
    mountDropdown();
    trigger().focus();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();

    const item = wrapper!.findAll("button.dropdown-item")[0]
      .element as HTMLButtonElement;
    item.focus();
    expect(document.activeElement).toBe(item);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(document.activeElement).toBe(trigger());
  });

  it("moves focus back to the trigger when an item is activated", async () => {
    mountDropdown();
    trigger().focus();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();

    const item = wrapper!.findAll("button.dropdown-item")[0];
    (item.element as HTMLButtonElement).focus();
    await item.trigger("click");
    await nextTick();

    expect(document.activeElement).toBe(trigger());
  });

  it("does NOT steal focus from an overlay the item just opened", async () => {
    // The Link item opens a modal and focuses its URL field. Closing the menu
    // afterwards must leave that field focused, not yank focus to the toolbar.
    const field = document.createElement("input");
    document.body.appendChild(field);

    mountDropdown(() => field.focus());
    trigger().focus();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();

    const item = wrapper!.findAll("button.dropdown-item")[0];
    (item.element as HTMLButtonElement).focus();
    await item.trigger("click");
    await nextTick();

    expect(document.activeElement).toBe(field);
  });

  it("does not move focus when the menu never had it", async () => {
    // Clicking outside closes the menu; focus is wherever the user clicked and
    // must stay there.
    mountDropdown();
    await wrapper!.find("button.dropdown-trigger").trigger("click");
    await nextTick();

    const elsewhere = document.createElement("input");
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(document.activeElement).toBe(elsewhere);
  });
});
