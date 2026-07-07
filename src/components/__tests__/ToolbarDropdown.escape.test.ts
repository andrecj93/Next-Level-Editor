import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import ToolbarDropdown from "../ToolbarDropdown.vue";

/**
 * Regression tests: every ToolbarDropdown-based menu (Format/Align/Size/
 * Insert/Tools/Export) must close on Escape, consuming the event so the
 * editor's global Escape handler doesn't also dismiss another overlay.
 */
describe("ToolbarDropdown - Escape handling", () => {
  let wrapper: VueWrapper<any> | null = null;

  const items = [
    { id: "small", label: "Small", onClick: vi.fn() },
    { id: "large", label: "Large", onClick: vi.fn() },
  ];

  const mountDropdown = () => {
    wrapper = mount(ToolbarDropdown, {
      props: { label: "Size", items },
      attachTo: document.body,
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

  it("closes an open dropdown on Escape and consumes the event", async () => {
    const w = mountDropdown();
    await w.find(".dropdown-trigger").trigger("click");
    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "true"
    );

    const event = pressKey("Escape");
    await nextTick();

    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "false"
    );
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([false]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores Escape while closed (does not consume the event)", async () => {
    mountDropdown();

    const event = pressKey("Escape");
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
  });

  it("does not close on other keys", async () => {
    const w = mountDropdown();
    await w.find(".dropdown-trigger").trigger("click");

    pressKey("Enter");
    pressKey("a");
    await nextTick();

    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "true"
    );
  });

  it("removes the keydown listener on unmount", async () => {
    const w = mountDropdown();
    await w.find(".dropdown-trigger").trigger("click");
    w.unmount();
    wrapper = null;

    const event = pressKey("Escape");
    expect(event.defaultPrevented).toBe(false);
  });
});
