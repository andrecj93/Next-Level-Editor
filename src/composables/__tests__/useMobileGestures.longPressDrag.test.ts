import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useMobileGestures } from "../useMobileGestures";

/**
 * R22-M4: cancelLongPressIfMoved cleared `isLongPressing` on ANY movement past
 * 10px — including movement AFTER the long press had already fired. The touch
 * sequence was then indistinguishable from a tap, so lifting the finger emitted
 * a spurious `tap` (dismissing whatever the long press had just opened) and
 * stamped `lastTapTime`, turning the user's next real tap into a double-tap.
 *
 * Long-press then drag is the ordinary way to adjust a selection on a phone.
 */
describe("useMobileGestures — a fired long press is not re-armed by dragging", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    vi.useRealTimers();
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
  /** touches = still down, changedTouches = the ones this event is about. */
  const touchEvent = (
    type: string,
    touches: Array<{ clientX: number; clientY: number }>,
    changedTouches = touches
  ) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "touches", { value: touches });
    Object.defineProperty(e, "changedTouches", { value: changedTouches });
    return e;
  };

  it("does not emit a tap when the finger drags after the long press fires", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const el = setup({ onLongPress, onTap, onDoubleTap });

    // Press and hold past the 500ms long-press threshold.
    el.dispatchEvent(touchEvent("touchstart", [touch(100, 100)]));
    vi.advanceTimersByTime(600);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    // Drag well past the 10px cancel threshold — adjusting a selection.
    el.dispatchEvent(touchEvent("touchmove", [touch(140, 100)]));
    el.dispatchEvent(touchEvent("touchend", [], [touch(140, 100)]));

    expect(onTap).not.toHaveBeenCalled();
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("still cancels a long press that has not fired yet", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const el = setup({ onLongPress });

    // Move away before the 500ms threshold: the long press must never fire.
    el.dispatchEvent(touchEvent("touchstart", [touch(100, 100)]));
    vi.advanceTimersByTime(200);
    el.dispatchEvent(touchEvent("touchmove", [touch(140, 100)]));
    vi.advanceTimersByTime(600);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("the next real tap after a long-press drag is a single tap, not a double", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const el = setup({ onTap, onDoubleTap });

    // Long press, drag, release — this must leave no tap timestamp behind.
    el.dispatchEvent(touchEvent("touchstart", [touch(100, 100)]));
    vi.advanceTimersByTime(600);
    el.dispatchEvent(touchEvent("touchmove", [touch(140, 100)]));
    el.dispatchEvent(touchEvent("touchend", [], [touch(140, 100)]));

    // A genuine tap immediately afterwards.
    el.dispatchEvent(touchEvent("touchstart", [touch(200, 200)]));
    el.dispatchEvent(touchEvent("touchend", [], [touch(200, 200)]));

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });
});
