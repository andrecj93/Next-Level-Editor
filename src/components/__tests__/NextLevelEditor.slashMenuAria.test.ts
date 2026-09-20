import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-5: the slash menu was completely silent to screen readers while
 * swallowing every key. The `.command-menu` root had no role, no label and no
 * id; the editing surface kept DOM focus but gained no aria-expanded /
 * aria-controls / aria-activedescendant, so the inner listbox was never
 * referenced by the focused element and assistive tech ignored it entirely.
 * Meanwhile the menu's key handler preventDefaults every printable character,
 * Enter, Tab and the arrows — so a screen-reader user typed "/", saw nothing
 * inserted, heard nothing, and then Enter silently applied "Heading 1".
 *
 * The editing surface is the focused element here (unlike the command palette,
 * which owns a real <input>), so the combobox wiring has to live on it.
 */
describe("slash menu is announced to assistive tech (#R23-5)", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const openMenu = async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hello</p>" },
      attachTo: document.body,
    });
    await nextTick();

    const surface = wrapper.find(".editor-content").element as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(surface.querySelector("p") ?? surface);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    (wrapper.vm as unknown as { openCommandMenu: () => void }).openCommandMenu();
    await nextTick();
    await nextTick();
    return surface;
  };

  it("points the editing surface at the listbox it drives", async () => {
    const surface = await openMenu();

    expect(document.querySelector(".command-menu")).not.toBeNull();
    // NOT aria-expanded: ARIA 1.2 forbids it on role="textbox" (axe reports
    // it critical), and this element is a multiline rich-text field first.
    // The open state is announced through the live region instead. #R32-1
    expect(surface.getAttribute("aria-expanded")).toBeNull();
    expect(surface.getAttribute("aria-haspopup")).toBe("listbox");

    const controls = surface.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    // The id must resolve to the rendered listbox, not dangle.
    const listbox = document.getElementById(controls!);
    expect(listbox).not.toBeNull();
    expect(listbox!.getAttribute("role")).toBe("listbox");
  });

  it("points aria-activedescendant at the highlighted option", async () => {
    const surface = await openMenu();

    const activeId = surface.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();

    const option = document.getElementById(activeId!);
    expect(option).not.toBeNull();
    expect(option!.getAttribute("role")).toBe("option");
    expect(option!.getAttribute("aria-selected")).toBe("true");
  });

  it("gives the menu an accessible name", async () => {
    await openMenu();

    const listbox = document.querySelector('.command-menu [role="listbox"]');
    expect(listbox?.getAttribute("aria-label")).toBeTruthy();
  });

  it("drops the listbox wiring again once the menu closes", async () => {
    const surface = await openMenu();
    expect(surface.getAttribute("aria-controls")).toBeTruthy();

    // Close it the way a user does.
    (
      wrapper!.vm as unknown as { handleEscape: (e: KeyboardEvent) => void }
    ).handleEscape(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(surface.getAttribute("aria-controls")).toBeNull();
    expect(surface.getAttribute("aria-activedescendant")).toBeNull();
    // Never present in either state.
    expect(surface.getAttribute("aria-expanded")).toBeNull();
  });

  it("announces the popup in the live region, since the attribute cannot", async () => {
    await openMenu();
    const live = document.querySelector('[aria-live], [role="status"]');
    expect(live, "no live region to announce into").not.toBeNull();
    await nextTick();
    expect(live!.textContent || "").toMatch(/suggestion/i);
  });
});
