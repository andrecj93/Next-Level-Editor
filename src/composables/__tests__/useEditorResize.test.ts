import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEditorResize } from "../useEditorResize";

const makeRoot = (width: number, height: number): HTMLElement => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON() {} } as DOMRect);
  return el;
};

const pointer = (x: number, y: number, extra: Partial<PointerEvent> = {}): PointerEvent =>
  ({
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    preventDefault: vi.fn(),
    target: { setPointerCapture: vi.fn() },
    ...extra,
  } as unknown as PointerEvent);

describe("useEditorResize", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 2000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 2000, configurable: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits no style override until the user interacts", () => {
    const r = useEditorResize();
    expect(r.resizeStyles.value).toEqual({});
  });

  it("grows width/height as the pointer drags", () => {
    const r = useEditorResize();
    const root = makeRoot(600, 400);
    r.beginResize(pointer(100, 100), root);
    expect(r.isResizing.value).toBe(true);
    // Simulate the move the composable listens for on window.
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX: 180, clientY: 150 })
    );
    expect(r.resizeStyles.value).toEqual({ width: "680px", height: "450px" });
    window.dispatchEvent(new Event("pointerup"));
    expect(r.isResizing.value).toBe(false);
  });

  it("clamps to the minimum size", () => {
    const r = useEditorResize({ minWidth: 320, minHeight: 240 });
    const root = makeRoot(400, 300);
    r.beginResize(pointer(100, 100), root);
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX: -500, clientY: -500 })
    );
    expect(r.resizeStyles.value).toEqual({ width: "320px", height: "240px" });
  });

  it("clamps width to the viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 700, configurable: true });
    const r = useEditorResize();
    const root = makeRoot(600, 400);
    r.beginResize(pointer(0, 0), root);
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX: 5000, clientY: 0 })
    );
    // 700 - 24 margin = 676
    expect(r.resizeStyles.value.width).toBe("676px");
  });

  it("resizes with arrow keys from the current size", () => {
    const r = useEditorResize({ step: 32 });
    const root = makeRoot(600, 400);
    const key = (k: string) =>
      r.onHandleKeydown(
        { key: k, preventDefault: vi.fn() } as unknown as KeyboardEvent,
        root
      );
    key("ArrowRight");
    key("ArrowDown");
    expect(r.resizeStyles.value).toEqual({ width: "632px", height: "432px" });
    key("ArrowUp");
    expect(r.resizeStyles.value.height).toBe("400px");
  });

  it("reset clears the override", () => {
    const r = useEditorResize();
    const root = makeRoot(600, 400);
    r.onHandleKeydown(
      { key: "ArrowRight", preventDefault: vi.fn() } as unknown as KeyboardEvent,
      root
    );
    expect(r.resizeStyles.value.width).toBeDefined();
    r.resetSize();
    expect(r.resizeStyles.value).toEqual({});
  });

  it("ignores non-primary buttons", () => {
    const r = useEditorResize();
    const root = makeRoot(600, 400);
    r.beginResize(pointer(0, 0, { button: 2 }), root);
    expect(r.isResizing.value).toBe(false);
  });
});
