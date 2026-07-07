import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import FontSizeSelector from "../FontSizeSelector.vue";

/**
 * Regression tests: the hand-rolled FontSizeSelector dropdown must close on
 * Escape like every other toolbar dropdown (previously it only closed on
 * outside click or item selection).
 */
describe("FontSizeSelector - Escape handling", () => {
  let wrapper: VueWrapper<any> | null = null;

  const mountSelector = () => {
    wrapper = mount(FontSizeSelector, {
      attachTo: document.body,
      global: {
        // Stub <transition> so the menu leaves the DOM synchronously.
        stubs: { transition: true },
      },
    });
    return wrapper;
  };

  const pressKey = (key: string) => {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  };

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("closes the open size dropdown on Escape and consumes the event", async () => {
    const w = mountSelector();
    await w.find(".font-size-button").trigger("click");
    expect(w.find(".size-dropdown").exists()).toBe(true);

    const event = pressKey("Escape");
    await nextTick();

    expect(w.find(".size-dropdown").exists()).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores Escape while closed", async () => {
    const w = mountSelector();

    const event = pressKey("Escape");
    await nextTick();

    expect(w.find(".size-dropdown").exists()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the keydown listener on unmount", async () => {
    const w = mountSelector();
    await w.find(".font-size-button").trigger("click");
    w.unmount();
    wrapper = null;

    const event = pressKey("Escape");
    expect(event.defaultPrevented).toBe(false);
  });
});
