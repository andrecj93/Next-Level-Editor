/**
 * Tests for the shared WAI-ARIA dialog behavior composable:
 * - Escape closes the dialog (and can be intercepted via onEscape)
 * - Tab / Shift+Tab are trapped inside the dialog
 * - initial focus goes to the requested element (or first focusable)
 * - focus returns to the previously focused element on close
 * - listeners are detached on close and on unmount
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { defineComponent, ref, nextTick, type PropType } from "vue";
import {
  useModalDialog,
  type ModalDialogOptions,
} from "../useModalDialog";

type HostOptions = Partial<
  Pick<ModalDialogOptions, "onEscape"> & { useInitialFocus: boolean }
>;

const Host = defineComponent({
  props: {
    isOpen: { type: Boolean, required: true },
    onEscapeHook: {
      type: Function as PropType<() => boolean>,
      default: undefined,
    },
    useInitialFocus: { type: Boolean, default: false },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const container = ref<HTMLElement | null>(null);
    const second = ref<HTMLElement | null>(null);
    useModalDialog({
      isOpen: () => props.isOpen,
      container,
      onClose: () => emit("close"),
      onEscape: props.onEscapeHook,
      initialFocus: props.useInitialFocus ? () => second.value : undefined,
    });
    return { container, second };
  },
  template: `
    <div v-if="isOpen" ref="container" role="dialog">
      <button class="first">First</button>
      <input class="second" ref="second" />
      <button class="last">Last</button>
    </div>
  `,
});

let wrapper: VueWrapper | null = null;

const openHost = async (extra: HostOptions = {}) => {
  wrapper = mount(Host, {
    props: {
      isOpen: false,
      onEscapeHook: extra.onEscape,
      useInitialFocus: extra.useInitialFocus ?? false,
    },
    attachTo: document.body,
  });
  await wrapper.setProps({ isOpen: true });
  await nextTick();
  return wrapper;
};

const pressKey = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
};

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("useModalDialog", () => {
  it("focuses the first focusable element on open by default", async () => {
    const w = await openHost();
    expect(document.activeElement).toBe(w.get(".first").element);
  });

  it("focuses the initialFocus element when provided", async () => {
    const w = await openHost({ useInitialFocus: true });
    expect(document.activeElement).toBe(w.get(".second").element);
  });

  it("closes on Escape and consumes the event", async () => {
    const w = await openHost();
    const event = pressKey({ key: "Escape" });
    expect(w.emitted("close")).toHaveLength(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets onEscape intercept Escape without closing", async () => {
    const onEscape = vi.fn(() => true);
    const w = await openHost({ onEscape });
    pressKey({ key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(w.emitted("close")).toBeUndefined();
  });

  it("closes when onEscape declines to handle the key", async () => {
    const onEscape = vi.fn(() => false);
    const w = await openHost({ onEscape });
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("stops listening for Escape after the dialog closes", async () => {
    const w = await openHost();
    await w.setProps({ isOpen: false });
    pressKey({ key: "Escape" });
    expect(w.emitted("close")).toBeUndefined();
  });

  it("stops listening for Escape after unmount", async () => {
    const w = await openHost();
    const emitted = w.emitted();
    w.unmount();
    wrapper = null;
    pressKey({ key: "Escape" });
    expect(emitted["close"]).toBeUndefined();
  });

  it("traps Tab: wraps from the last control to the first", async () => {
    const w = await openHost();
    (w.get(".last").element as HTMLElement).focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".first").element);
  });

  it("traps Shift+Tab: wraps from the first control to the last", async () => {
    const w = await openHost();
    (w.get(".first").element as HTMLElement).focus();
    pressKey({ key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(w.get(".last").element);
  });

  it("pulls focus back into the dialog when Tab is pressed outside", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const w = await openHost();
    outside.focus();
    pressKey({ key: "Tab" });
    expect(document.activeElement).toBe(w.get(".first").element);
  });

  it("does not hijack Tab when focus is mid-dialog", async () => {
    const w = await openHost();
    (w.get(".second").element as HTMLElement).focus();
    const event = pressKey({ key: "Tab" });
    expect(event.defaultPrevented).toBe(false);
  });

  it("returns focus to the previously focused element on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    wrapper = mount(Host, {
      props: { isOpen: false },
      attachTo: document.body,
    });
    trigger.focus();
    await wrapper.setProps({ isOpen: true });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
    await wrapper.setProps({ isOpen: false });
    await nextTick();
    expect(document.activeElement).toBe(trigger);
  });

  it("does not restore focus to a trigger removed from the DOM", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    wrapper = mount(Host, {
      props: { isOpen: false },
      attachTo: document.body,
    });
    trigger.focus();
    await wrapper.setProps({ isOpen: true });
    await nextTick();
    trigger.remove();
    await wrapper.setProps({ isOpen: false });
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);
  });
});
