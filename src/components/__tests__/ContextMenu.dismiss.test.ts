import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ContextMenu from "../ContextMenu.vue";
import type { ContextMenuItem } from "../../types/contextMenu";

/**
 * Tests for #31: the context menu must also close on page scroll, window
 * resize, and Escape (in addition to outside-click), and must clean up all of
 * those listeners on close/unmount.
 */
describe("ContextMenu - scroll/resize/Escape dismissal (#31)", () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  const items: ContextMenuItem[] = [
    { id: "test", label: "Test Item", icon: "📝", onClick: vi.fn() },
  ];

  const mountOpen = async () => {
    wrapper = mount(ContextMenu, {
      props: { show: false, position: { top: 10, left: 20 }, items },
      attachTo: document.body,
    });
    // Opening registers the dismissal listeners via a deferred setTimeout(0).
    await wrapper.setProps({ show: true });
    await new Promise((resolve) => setTimeout(resolve, 10));
    return wrapper;
  };

  beforeEach(() => {
    const el = document.createElement("div");
    el.id = "teleport-target";
    document.body.appendChild(el);
    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
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

  it("emits close on window scroll while open", async () => {
    const w = await mountOpen();
    window.dispatchEvent(new Event("scroll"));
    expect(w.emitted("close")).toBeTruthy();
  });

  it("emits close on window resize while open", async () => {
    const w = await mountOpen();
    window.dispatchEvent(new Event("resize"));
    expect(w.emitted("close")).toBeTruthy();
  });

  it("emits close on Escape keydown while open", async () => {
    const w = await mountOpen();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("close")).toBeTruthy();
  });

  it("ignores non-Escape keydown", async () => {
    const w = await mountOpen();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(w.emitted("close")).toBeFalsy();
  });

  it("registers scroll/resize/keydown listeners on open", async () => {
    await mountOpen();
    expect(window.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(document.addEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("removes all dismissal listeners when unmounted while open", async () => {
    const w = await mountOpen();

    const addedScroll = vi
      .mocked(window.addEventListener)
      .mock.calls.find((c) => c[0] === "scroll")?.[1];
    const addedKeydown = vi
      .mocked(document.addEventListener)
      .mock.calls.find((c) => c[0] === "keydown")?.[1];

    w.unmount();
    wrapper = null;

    const removedScroll = vi
      .mocked(window.removeEventListener)
      .mock.calls.map((c) => c[1]);
    const removedKeydown = vi
      .mocked(document.removeEventListener)
      .mock.calls.map((c) => c[1]);

    expect(removedScroll).toContain(addedScroll);
    expect(removedKeydown).toContain(addedKeydown);
  });

  it("does not emit close on scroll after being closed", async () => {
    const w = await mountOpen();
    await w.setProps({ show: false });

    const before = (w.emitted("close") ?? []).length;
    window.dispatchEvent(new Event("scroll"));
    const after = (w.emitted("close") ?? []).length;
    expect(after).toBe(before);
  });
});
