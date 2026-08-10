import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useMobileGestures } from "../useMobileGestures";

/**
 * A two-finger gesture ends with the fingers lifting one at a time. State
 * (isSwiping/isPinching) was reset on the FIRST finger's touchend, so the
 * SECOND finger's touchend saw clean single-touch state and fired a spurious
 * 'tap' (then 'double-tap') — a stray caret placement / action after every
 * pinch or two-finger swipe. Taps must only fire for a genuine single-finger
 * sequence (max simultaneous touches === 1).
 */
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
  wrapper = mount(
    defineComponent({
      setup() {
        useMobileGestures(editorRef, callbacks);
        return () => h("div");
      },
    }),
    { attachTo: document.body }
  );
  return el;
};

const t = (x: number, y: number) => ({ clientX: x, clientY: y });
// touches = fingers still down; changedTouches = fingers that changed in THIS event.
const ev = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
  changed: Array<{ clientX: number; clientY: number }>
) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "touches", { value: touches });
  Object.defineProperty(e, "changedTouches", { value: changed });
  return e;
};

describe("useMobileGestures: two-finger release never fires a tap", () => {
  it("does not emit tap/double-tap when two fingers lift one at a time", () => {
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const el = setup({ onTap, onDoubleTap });

    // Two fingers down.
    el.dispatchEvent(
      ev("touchstart", [t(100, 100), t(200, 100)], [t(100, 100), t(200, 100)])
    );
    // A little pinch movement.
    el.dispatchEvent(
      ev("touchmove", [t(90, 100), t(210, 100)], [t(90, 100), t(210, 100)])
    );
    // Finger 1 lifts — one finger still down.
    el.dispatchEvent(ev("touchend", [t(210, 100)], [t(90, 100)]));
    // Finger 2 lifts — all up.
    el.dispatchEvent(ev("touchend", [], [t(210, 100)]));

    expect(onTap).not.toHaveBeenCalled();
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("still emits a tap for a genuine single-finger tap", () => {
    const onTap = vi.fn();
    const el = setup({ onTap });

    el.dispatchEvent(ev("touchstart", [t(100, 100)], [t(100, 100)]));
    el.dispatchEvent(ev("touchend", [], [t(100, 100)]));

    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
