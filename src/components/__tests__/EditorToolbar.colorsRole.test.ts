import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import EditorToolbar from "../EditorToolbar.vue";

/**
 * R23-24: the Colors popup declared role="menu" but contained ZERO elements
 * with a menu-item role — 23 plain focusables, including two nested vendor
 * colour pickers with their own text inputs. Screen readers announced a menu
 * whose contents contradict the role.
 *
 * It is not a menu and must not claim to be one: arrow-key menu navigation
 * would fight those inputs. It is a DISCLOSURE — a trigger with aria-expanded
 * revealing a labelled group of controls, navigated with Tab like any other
 * form region. (Contrast ToolbarDropdown, which really is a list of actions and
 * therefore does implement the full menu contract — #R23-23.)
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

/** Minimal props EditorToolbar needs to render (mirrors EditorToolbar.test.ts). */
const baseProps = {
  isToolbarSectionVisible: vi.fn(() => true),
  formatDropdownItems: [{ label: "Paragraph", value: "p", action: vi.fn() }],
  inlineFormatActions: [],
  alignmentDropdownItems: [{ label: "Left", value: "left", action: vi.fn() }],
  listActions: [],
  insertDropdownItems: [{ label: "Link", value: "link", action: vi.fn() }],
  textColor: "#000000",
  backgroundColor: "#ffffff",
  fontSizeDropdownItems: [{ label: "16px", value: "16px", action: vi.fn() }],
  historyIndex: 0,
  historyLength: 1,
  productivityDropdownItems: [],
  toolActions: [],
  exportDropdownItems: [],
  viewMode: "editor" as const,
  theme: "light" as const,
  isFullScreen: false,
};

const mountToolbar = async (
  showColorsDropdown: boolean,
  listeners: Record<string, (...args: unknown[]) => void> = {}
) => {
  wrapper = mount(EditorToolbar, {
    attachTo: document.body,
    props: { ...baseProps, showColorsDropdown },
    attrs: listeners,
  });
  await nextTick();
  return wrapper;
};

describe("the Colors popup does not claim to be a menu (#R23-24)", () => {
  it("is a labelled group, not a role=menu with no menu items", async () => {
    await mountToolbar(true);

    const panel = wrapper!.find(".colors-menu");
    expect(panel.exists()).toBe(true);
    expect(panel.attributes("role")).not.toBe("menu");
    expect(panel.attributes("role")).toBe("group");
    expect(panel.attributes("aria-label")).toBeTruthy();
  });

  it("never contained menu items to justify the old role", async () => {
    await mountToolbar(true);

    const panel = wrapper!.find(".colors-menu");
    const menuItems = panel.element.querySelectorAll(
      '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'
    );
    expect(menuItems.length).toBe(0);
  });

  it("the trigger advertises a disclosure, not a popup menu", async () => {
    await mountToolbar(true);

    const trigger = wrapper!.find('button[aria-label="Colors"]');
    expect(trigger.exists()).toBe(true);
    // aria-haspopup="true" is synonymous with "menu" in ARIA — wrong here.
    expect(trigger.attributes("aria-haspopup")).toBeFalsy();
    expect(trigger.attributes("aria-expanded")).toBe("true");
  });
});

describe("the Colors disclosure dismisses like the menus around it (#R24-11)", () => {
  it("Escape from a focused swatch closes and returns focus to the trigger", async () => {
    // The global Escape handler only flips the flag; the panel unmounted with
    // focus inside and activeElement fell to <body> — the exact harm
    // ToolbarDropdown.close() prevents, never ported to this disclosure.
    await mountToolbar(true);
    const swatch = wrapper!.find(".colors-menu .colors-swatch");
    expect(swatch.exists()).toBe(true);
    (swatch.element as HTMLElement).focus();

    await swatch.trigger("keydown", { key: "Escape" });
    await nextTick();
    await nextTick();

    expect(wrapper!.emitted("close-colors-dropdown")).toBeTruthy();
    expect(
      document.activeElement,
      "focus must land on the trigger, not <body>"
    ).toBe(wrapper!.get('button[aria-label="Colors"]').element);
  });

  it("focus leaving the disclosure closes it (rove-away parity)", async () => {
    // ArrowLeft/Right roving moves focus off the trigger while the panel
    // floats open with aria-expanded stuck true — ToolbarDropdown got a
    // focusout closer for exactly this (#R23-23); the disclosure needs it too.
    await mountToolbar(true);
    const trigger = wrapper!.get('button[aria-label="Colors"]');
    (trigger.element as HTMLElement).focus();

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    trigger.element.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: outside })
    );
    await nextTick();

    expect(wrapper!.emitted("close-colors-dropdown")).toBeTruthy();
  });

  it("a pointerdown outside — e.g. on another dropdown's trigger — closes it", async () => {
    // ToolbarDropdown triggers stop click propagation, so the document CLICK
    // closer never fires and the colors panel stayed open UNDER the newly
    // opened menu. A capture-phase pointerdown closer (the same pattern
    // ToolbarDropdown itself uses) does not care about stopped clicks.
    await mountToolbar(true);

    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true })
    );
    await nextTick();

    expect(wrapper!.emitted("close-colors-dropdown")).toBeTruthy();
  });

  it("applying a color does not close the panel, even as focus moves to the editor (#R25-12)", async () => {
    // Every color emit makes the HOST focus the editor (performWithSelection →
    // ensureEditorFocus), which blurs the focused picker control — a focusout
    // whose relatedTarget is genuinely outside the wrap. Batch 131's closer
    // treated that as a dismissal: the custom picker died after ONE
    // adjustment, and keyboard Enter on a swatch closed the stay-open panel.
    const editorStandIn = document.createElement("div");
    editorStandIn.tabIndex = -1;
    document.body.appendChild(editorStandIn);
    // The host reacts to the emit by focusing the editor — synchronously,
    // exactly like handleTextColor's performWithSelection does. The focusout
    // that causes lands DURING the pick.
    await mountToolbar(true, {
      onTextColorChange: () => {
        wrapper!
          .find(".colors-menu .colors-swatch")
          .element.dispatchEvent(
            new FocusEvent("focusout", {
              bubbles: true,
              relatedTarget: editorStandIn,
            })
          );
      },
    });
    const swatch = wrapper!.find(".colors-menu .colors-swatch");
    (swatch.element as HTMLElement).focus();

    await swatch.trigger("click");
    await nextTick();

    expect(
      wrapper!.emitted("close-colors-dropdown"),
      "the apply-driven focus move must not dismiss the panel"
    ).toBeFalsy();
  });

  it("a focusout with NO relatedTarget does not close the panel (#R25-13)", async () => {
    // The vendor saturation canvas is non-focusable and does not prevent
    // mousedown: pressing it blurs the focused hex/slider to body —
    // relatedTarget null — and the panel vanished under the pointer
    // mid-interaction. Outside presses are the pointerdown closer's job.
    await mountToolbar(true);
    const swatch = wrapper!.find(".colors-menu .colors-swatch");
    (swatch.element as HTMLElement).focus();

    swatch.element.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: null })
    );
    await nextTick();

    expect(wrapper!.emitted("close-colors-dropdown")).toBeFalsy();
  });

  it("a pointerdown INSIDE the panel does not close it (control)", async () => {
    await mountToolbar(true);
    const swatch = wrapper!.find(".colors-menu .colors-swatch");

    swatch.element.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true })
    );
    await nextTick();

    expect(wrapper!.emitted("close-colors-dropdown")).toBeFalsy();
  });
});
