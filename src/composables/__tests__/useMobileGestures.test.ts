import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useMobileGestures } from "../useMobileGestures";

/**
 * Regression: a single two-finger swipe used to fire swipe (→ undo/redo)
 * once per touchmove because detectSwipe guarded on the wrong flag and no
 * gesture latched. A two-finger gesture must emit exactly ONCE per touch
 * sequence. Same for pinch → zoom.
 */
describe("useMobileGestures — two-finger gesture fires once", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const setup = (callbacks: Record<string, unknown>) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const editorRef = { value: el };
    const TestComponent = defineComponent({
      setup() {
        useMobileGestures(editorRef, callbacks);
        return () => h("div");
      },
    });
    wrapper = mount(TestComponent, { attachTo: document.body });
    return el;
  };

  const touch = (x: number, y: number) => ({ clientX: x, clientY: y });
  const touchEvent = (
    type: string,
    touches: Array<{ clientX: number; clientY: number }>
  ) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "touches", { value: touches });
    Object.defineProperty(e, "changedTouches", { value: touches });
    return e;
  };

  it("emits swipe-right (undo) exactly once across many touchmove events", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const el = setup({ onUndo, onRedo });

    // Two fingers down (100px apart horizontally).
    el.dispatchEvent(touchEvent("touchstart", [touch(100, 100), touch(200, 100)]));
    // Slide both fingers right, keeping the inter-finger distance constant so
    // it reads as a swipe (not a pinch). Many moves past the 50px threshold.
    for (const dx of [70, 90, 110, 130, 150]) {
      el.dispatchEvent(
        touchEvent("touchmove", [touch(100 + dx, 100), touch(200 + dx, 100)])
      );
    }
    el.dispatchEvent(touchEvent("touchend", []));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("emits pinch-out (zoom in) exactly once across many touchmove events", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const el = setup({ onZoomIn, onZoomOut });

    // Two fingers 100px apart.
    el.dispatchEvent(touchEvent("touchstart", [touch(150, 100), touch(250, 100)]));
    // Spread the fingers apart well past the 40px pinch threshold, repeatedly.
    for (const spread of [60, 90, 120, 150]) {
      el.dispatchEvent(
        touchEvent("touchmove", [
          touch(150 - spread, 100),
          touch(250 + spread, 100),
        ])
      );
    }
    el.dispatchEvent(touchEvent("touchend", []));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).not.toHaveBeenCalled();
  });

  it("re-arms for a second gesture after touchend", () => {
    const onUndo = vi.fn();
    const el = setup({ onUndo });

    const swipeRight = () => {
      el.dispatchEvent(
        touchEvent("touchstart", [touch(100, 100), touch(200, 100)])
      );
      for (const dx of [70, 120]) {
        el.dispatchEvent(
          touchEvent("touchmove", [touch(100 + dx, 100), touch(200 + dx, 100)])
        );
      }
      el.dispatchEvent(touchEvent("touchend", []));
    };

    swipeRight();
    swipeRight();
    expect(onUndo).toHaveBeenCalledTimes(2);
  });
});
