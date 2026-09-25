import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

// Force "mobile viewport" so MobileToolbar's device gate is open — these tests
// verify the OWNERSHIP layer on top of it: on a page with several editor
// instances, only the one owning the last focus/interaction may show the
// (teleported, position:fixed) mobile toolbar. Regression for the home page
// stacking 4 identical toolbars once the mini demos mounted.
vi.mock("../../composables/useDeviceDetection", () => ({
  useDeviceDetection: () => ({ showMobileToolbar: ref(true) }),
}));

const visibleToolbars = () =>
  document.body.querySelectorAll(".mobile-toolbar").length;

const pointerdownOn = (el: Element) => {
  el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
};

describe("NextLevelEditor - mobile toolbar ownership", () => {
  let wrappers: ReturnType<typeof mount>[] = [];

  const mountEditor = () =>
    mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>" },
      attachTo: document.body,
    });

  beforeEach(() => {
    wrappers = [];
  });

  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    document.body.innerHTML = "";
  });

  it("shows NO mobile toolbar before any editor is focused/interacted with", async () => {
    wrappers.push(mountEditor(), mountEditor());
    await nextTick();
    expect(visibleToolbars()).toBe(0);
  });

  it("shows exactly ONE toolbar — for the interacted instance — on multi-editor pages", async () => {
    const a = mountEditor();
    const b = mountEditor();
    wrappers.push(a, b);
    await nextTick();

    pointerdownOn(a.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);

    // Interacting with the second instance transfers ownership: still one.
    pointerdownOn(b.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);
  });

  it("releases ownership (toolbar hides) when interacting outside any editor", async () => {
    const a = mountEditor();
    wrappers.push(a);
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    await nextTick();

    pointerdownOn(a.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);

    pointerdownOn(outside);
    await nextTick();
    expect(visibleToolbars()).toBe(0);
  });

  it("keeps the toolbar open while interacting with the toolbar itself (it is teleported outside the editor root)", async () => {
    const a = mountEditor();
    wrappers.push(a);
    await nextTick();

    pointerdownOn(a.element);
    await nextTick();
    const toolbar = document.body.querySelector(".mobile-toolbar");
    expect(toolbar).not.toBeNull();

    pointerdownOn(toolbar!);
    await nextTick();
    expect(visibleToolbars()).toBe(1);
  });

  it("Close (X) actually hides the toolbar, and focusing the editor again brings it back", async () => {
    const a = mountEditor();
    wrappers.push(a);
    await nextTick();

    pointerdownOn(a.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);

    const closeBtn = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Close toolbar"]'
    );
    expect(closeBtn).not.toBeNull();
    closeBtn!.click();
    await nextTick();
    expect(visibleToolbars()).toBe(0);

    // Interacting with the editor again re-opens it.
    pointerdownOn(a.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);
  });

  it("hides the fixed toolbar when its editor scrolls off screen", async () => {
    const a = mountEditor();
    wrappers.push(a);
    let top = 100;
    a.element.getBoundingClientRect = () => ({
      top, bottom: top + 300, left: 0, right: 350, width: 350, height: 300,
    } as DOMRect);
    pointerdownOn(a.element);
    await nextTick();
    expect(visibleToolbars()).toBe(1);
    top = -500;
    document.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(visibleToolbars()).toBe(0);
  });

  it('does not insert a dock under a first tap on Comments or another footer action', async () => {
    const editor = mount(NextLevelEditor, { props: { modelValue: '<p>Saved writing.</p>', writingMode: true, enableComments: true }, attachTo: document.body });
    wrappers.push(editor);
    await nextTick();
    const footerButtons = editor.findAll('.writing-footer-actions button');
    for (const button of footerButtons) {
      pointerdownOn(button.element);
      (button.element as HTMLButtonElement).focus();
      await nextTick();
      expect(visibleToolbars()).toBe(0);
    }
    await footerButtons.find(button => button.text() === 'Comments')!.trigger('click');
    expect(editor.find('.comments-sidebar-open').exists()).toBe(true);
    expect(visibleToolbars()).toBe(0);
  });
});
