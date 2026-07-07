/**
 * Regression tests for the link-modal dialog behavior:
 * - self-closes after a successful insert
 * - Escape closes the dialog
 * - Tab / Shift+Tab are trapped inside the dialog (aria-modal contract)
 * - focus returns to the previously focused element on close
 */
import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import LinkModal from "../LinkModal.vue";

let wrapper: VueWrapper | null = null;

const mountModal = (isOpen: boolean) => {
  wrapper = mount(LinkModal, { props: { isOpen }, attachTo: document.body });
  return wrapper;
};

/** Mount closed then open, so the isOpen watcher runs like in the real app. */
const openModal = async () => {
  const w = mountModal(false);
  await w.setProps({ isOpen: true });
  await nextTick();
  return w;
};

const pressKey = (init: KeyboardEventInit) => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })
  );
};

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("LinkModal dialog behavior", () => {
  it("emits close (self-closes) after a successful insert", async () => {
    const w = await openModal();
    await w.get("#link-url").setValue("example.com");
    await w.get(".insert-button").trigger("click");
    expect(w.emitted("insert")).toHaveLength(1);
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("does not emit close when submit is attempted with an empty URL", async () => {
    const w = await openModal();
    await w.get("#link-url").trigger("keyup", { key: "Enter" });
    expect(w.emitted("insert")).toBeUndefined();
    expect(w.emitted("close")).toBeUndefined();
  });

  it("closes on Escape", async () => {
    const w = await openModal();
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("does not listen for Escape once closed", async () => {
    const w = await openModal();
    await w.setProps({ isOpen: false });
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toBeUndefined();
  });

  it("moves initial focus to the URL input when opened", async () => {
    const w = await openModal();
    expect(document.activeElement).toBe(w.get("#link-url").element);
  });

  it("traps Tab: wraps from the last enabled control to the first", async () => {
    const w = await openModal();
    // Insert is disabled (empty URL), so Cancel is the last enabled control.
    (w.get(".cancel-button").element as HTMLButtonElement).focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".close-button").element);
  });

  it("traps Shift+Tab: wraps from the first control to the last", async () => {
    const w = await openModal();
    await w.get("#link-url").setValue("example.com");
    (w.get(".close-button").element as HTMLButtonElement).focus();
    pressKey({ key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(w.get(".insert-button").element);
  });

  it("pulls focus back into the dialog when Tab is pressed outside it", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const w = await openModal();
    outside.focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".close-button").element);
  });

  it("returns focus to the previously focused element on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const w = mountModal(false);
    trigger.focus();
    await w.setProps({ isOpen: true });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
    await w.setProps({ isOpen: false });
    await nextTick();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not steal focus on close if the trigger was removed from the DOM", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const w = mountModal(false);
    trigger.focus();
    await w.setProps({ isOpen: true });
    await nextTick();
    trigger.remove();
    await w.setProps({ isOpen: false });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
  });
});
