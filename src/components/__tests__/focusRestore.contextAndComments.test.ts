import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ContextMenu from "../ContextMenu.vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-36: a dialog opened FROM the context menu lost the caret on dismiss.
 * handleItemClick ran the item's onClick (which opens the dialog and records
 * document.activeElement — still the menu item — as the dialog's restore
 * target) and only THEN closed the menu, unmounting that item. So when the
 * dialog closed there was nothing connected to restore to, and focus fell to
 * <body>. Focus must be handed back to what was focused BEFORE the menu opened,
 * SYNCHRONOUSLY, before the item's action runs — so the dialog records the
 * editor, which stays connected.
 *
 * R23-22: the "Open comments" FAB unmounts itself on activation (its v-if
 * includes !showCommentsSidebar), dropping focus to <body>; the sidebar that
 * appears never took focus. Opening it must move focus into the sidebar.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("context-menu item restores focus before its action (#R23-36)", () => {
  it("focus is back on the pre-menu element when the item's action runs", async () => {
    const anchor = document.createElement("button");
    anchor.textContent = "editor";
    document.body.appendChild(anchor);
    anchor.focus();
    expect(document.activeElement).toBe(anchor);

    let activeWhenActionRan: Element | null = null;

    wrapper = mount(ContextMenu, {
      attachTo: document.body,
      props: {
        show: false,
        position: { top: 10, left: 10 },
        items: [
          {
            label: "Insert Link",
            onClick: () => {
              // A dialog opening here would record document.activeElement as
              // its restore target. It must already be the editor, not the
              // (about-to-unmount) menu item.
              activeWhenActionRan = document.activeElement;
            },
          },
        ],
      },
      global: { stubs: { teleport: true } },
    });

    await wrapper.setProps({ show: true });
    await nextTick();

    // Activate the item the way a click/Enter does.
    await wrapper.find(".context-menu-item").trigger("click");

    expect(activeWhenActionRan).toBe(anchor);
  });
});

describe("Open comments FAB moves focus into the sidebar (#R23-22)", () => {
  it("does not drop focus to <body> when the sidebar opens", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>", enableComments: true },
      attachTo: document.body,
    });
    await nextTick();

    const fab = wrapper.find(".comments-toggle-fab");
    expect(fab.exists()).toBe(true);
    (fab.element as HTMLElement).focus();

    await fab.trigger("click");
    await nextTick();
    await nextTick();

    // The FAB has unmounted; focus must NOT be on <body>.
    expect(document.activeElement).not.toBe(document.body);
    const sidebar = document.querySelector(".comments-sidebar-content");
    expect(sidebar).not.toBeNull();
    expect(sidebar!.contains(document.activeElement)).toBe(true);
  });
});
