import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ContextMenu from "../ContextMenu.vue";
import type { ContextMenuItem } from "../../types/contextMenu";

/**
 * Regression tests for #48: ContextMenu leaked its document "click" listener
 * when the component was unmounted while the menu was still open. The listener
 * was added on open and removed only on close, so an unmount-while-open left a
 * dangling handler on `document`. These tests assert the corrected behaviour:
 * onBeforeUnmount removes the listener, and the removed handler is the same one
 * that was added.
 */
describe("ContextMenu - document click listener cleanup (#48)", () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const items: ContextMenuItem[] = [
    { id: "test", label: "Test Item", icon: "📝", onClick: vi.fn() },
  ];

  beforeEach(() => {
    const el = document.createElement("div");
    el.id = "teleport-target";
    document.body.appendChild(el);

    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    const el = document.getElementById("teleport-target");
    if (el) el.remove();
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  it("removes the document click listener when unmounted while open", async () => {
    wrapper = mount(ContextMenu, {
      props: {
        show: false,
        position: { top: 100, left: 200 },
        items,
      },
      attachTo: document.body,
    });

    // Open the menu: the watch (show false -> true) registers the listener
    await wrapper.setProps({ show: true });

    // Let the setTimeout(0) in the watch register the listener
    await new Promise((resolve) => setTimeout(resolve, 10));

    const addClickCalls = vi
      .mocked(document.addEventListener)
      .mock.calls.filter((call) => call[0] === "click");
    expect(addClickCalls.length).toBeGreaterThanOrEqual(1);
    const addedHandler = addClickCalls[0][1];

    // Unmount while the menu is still open (show never went back to false)
    wrapper.unmount();
    wrapper = null;

    const removeClickCalls = vi
      .mocked(document.removeEventListener)
      .mock.calls.filter((call) => call[0] === "click");

    // The same handler that was added must have been removed on unmount
    const removedHandlers = removeClickCalls.map((call) => call[1]);
    expect(removedHandlers).toContain(addedHandler);
  });

  it("does not emit close on document clicks after being unmounted while open", async () => {
    wrapper = mount(ContextMenu, {
      props: {
        show: false,
        position: { top: 100, left: 200 },
        items,
      },
      attachTo: document.body,
    });

    // Open the menu so the document click listener is registered
    await wrapper.setProps({ show: true });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const localWrapper = wrapper;
    wrapper.unmount();
    wrapper = null;

    const emittedBefore = (localWrapper.emitted("close") ?? []).length;

    // A document click after unmount must not trigger the (now removed) handler
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const emittedAfter = (localWrapper.emitted("close") ?? []).length;
    expect(emittedAfter).toBe(emittedBefore);
  });
});
