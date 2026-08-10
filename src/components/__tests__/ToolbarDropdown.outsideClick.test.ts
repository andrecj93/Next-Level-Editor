import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import ToolbarDropdown from "../ToolbarDropdown.vue";

/**
 * Regression: the trigger uses @click.stop, which stopped a bubble-phase
 * document 'click' listener from ever firing — so opening another dropdown
 * left the first one open. Outside-close now runs on capture-phase pointerdown.
 */
describe("ToolbarDropdown - outside pointerdown closes", () => {
  let wrapper: VueWrapper<any> | null = null;

  const mountDropdown = () => {
    wrapper = mount(ToolbarDropdown, {
      props: {
        label: "Size",
        items: [{ id: "s", label: "Small", onClick: vi.fn() }],
      },
      attachTo: document.body,
    });
    return wrapper;
  };

  const pointerDownOn = (target: EventTarget) =>
    target.dispatchEvent(
      new Event("pointerdown", { bubbles: true, cancelable: true })
    );

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("closes when a pointerdown lands outside the dropdown", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    const w = mountDropdown();
    await w.find(".dropdown-trigger").trigger("click");
    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe("true");

    pointerDownOn(outside);
    await nextTick();

    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "false"
    );
  });

  it("stays open when the pointerdown is inside the dropdown", async () => {
    const w = mountDropdown();
    await w.find(".dropdown-trigger").trigger("click");

    pointerDownOn(w.find(".dropdown-trigger").element);
    await nextTick();

    expect(w.find(".dropdown-trigger").attributes("aria-expanded")).toBe("true");
  });

  it("a second dropdown's trigger press closes the first (no two-open state)", async () => {
    const first = mountDropdown();
    await first.find(".dropdown-trigger").trigger("click");
    expect(first.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "true"
    );

    // A second dropdown elsewhere; pressing its trigger emits a pointerdown
    // that the first dropdown sees (capture phase, unaffected by @click.stop).
    const second = mount(ToolbarDropdown, {
      props: {
        label: "Align",
        items: [{ id: "l", label: "Left", onClick: vi.fn() }],
      },
      attachTo: document.body,
    });
    pointerDownOn(second.find(".dropdown-trigger").element);
    await nextTick();

    expect(first.find(".dropdown-trigger").attributes("aria-expanded")).toBe(
      "false"
    );
    second.unmount();
  });
});
