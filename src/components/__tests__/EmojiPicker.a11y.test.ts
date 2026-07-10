/**
 * Regression tests for the emoji-picker dialog behavior (shared
 * useModalDialog contract, same as LinkModal.a11y.test.ts):
 * - role="dialog" / aria-modal on the picker root
 * - Escape closes the picker
 * - Tab / Shift+Tab are trapped inside the picker (aria-modal contract)
 * - focus moves to the search input on open
 * - focus returns to the previously focused element on close
 */
import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import EmojiPicker from "../EmojiPicker.vue";

let wrapper: VueWrapper | null = null;

const mountPicker = (show: boolean) => {
  wrapper = mount(EmojiPicker, { props: { show }, attachTo: document.body });
  return wrapper;
};

/** Mount closed then open, so the show watcher runs like in the real app. */
const openPicker = async () => {
  const w = mountPicker(false);
  await w.setProps({ show: true });
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

describe("EmojiPicker dialog behavior", () => {
  it("exposes the WAI-ARIA dialog contract on the picker root", async () => {
    const w = await openPicker();
    const root = w.get(".emoji-picker");
    expect(root.attributes("role")).toBe("dialog");
    expect(root.attributes("aria-modal")).toBe("true");
    expect(root.attributes("aria-label")).toBe("Emoji picker");
  });

  it("closes on Escape", async () => {
    const w = await openPicker();
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("does not listen for Escape once closed", async () => {
    const w = await openPicker();
    await w.setProps({ show: false });
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toBeUndefined();
  });

  it("moves initial focus to the search input when opened", async () => {
    const w = await openPicker();
    expect(document.activeElement).toBe(w.get(".emoji-search").element);
  });

  it("traps Tab: wraps from the last control to the first (search input)", async () => {
    const w = await openPicker();
    const emojiButtons = w.findAll(".emoji-btn");
    const last = emojiButtons[emojiButtons.length - 1]
      .element as HTMLButtonElement;
    last.focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".emoji-search").element);
  });

  it("traps Shift+Tab: wraps from the first control to the last", async () => {
    const w = await openPicker();
    const emojiButtons = w.findAll(".emoji-btn");
    const last = emojiButtons[emojiButtons.length - 1].element;
    (w.get(".emoji-search").element as HTMLInputElement).focus();
    pressKey({ key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("pulls focus back into the picker when Tab is pressed outside it", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const w = await openPicker();
    outside.focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".emoji-search").element);
  });

  it("returns focus to the previously focused element on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const w = mountPicker(false);
    trigger.focus();
    await w.setProps({ show: true });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
    await w.setProps({ show: false });
    await nextTick();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not steal focus on close if the trigger was removed from the DOM", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const w = mountPicker(false);
    trigger.focus();
    await w.setProps({ show: true });
    await nextTick();
    trigger.remove();
    await w.setProps({ show: false });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
  });
});
