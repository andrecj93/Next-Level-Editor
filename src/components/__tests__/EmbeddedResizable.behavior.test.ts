import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import EmbeddedResizable from "../EmbeddedResizable.vue";

// ---------------------------------------------------------------------------
// Real-behaviour suite for EmbeddedResizable.vue — ADDITIVE to
// EmbeddedResizable.test.ts. This file drives the *real* useResizable /
// useDraggable composables THROUGH the mounted component: real mousedown ->
// document mousemove -> document mouseup pointer sequences, real keyboard
// events, the real document-level "click" deselect listener, and real lifecycle
// cleanup. No composable is mocked.
//
// happy-dom limits honoured here:
//  - No layout engine: getBoundingClientRect() is 0x0 and getComputedStyle
//    returns nothing for scoped CSS. The resize/drag MATH does not depend on
//    layout (deltas are computed from clientX/Y we feed in and rects read as 0),
//    so we assert the reactive width/height/left/top the component writes to the
//    element's inline style — not any laid-out geometry.
//  - MouseEvent clientX/clientY: constructed via the init dict, with a defensive
//    defineProperty fallback in case a happy-dom build ignores the init fields.
//  - window.confirm is a no-op; we stub it per-test to drive both branches of
//    handleDelete.
// ---------------------------------------------------------------------------

const SLOT = { default: '<img src="media.jpg" alt="Embedded" />' };

type ERWrapper = ReturnType<typeof mount>;

function mountER(
  props: Record<string, unknown> = {},
  attach = false
): ERWrapper {
  return mount(EmbeddedResizable, {
    props,
    slots: SLOT,
    ...(attach ? { attachTo: document.body } : {}),
  });
}

// A native MouseEvent carrying reliable clientX/clientY for the document-level
// handleResize/handleDrag listeners the composables attach.
function docMouse(type: string, clientX: number, clientY: number): MouseEvent {
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
  if (e.clientX !== clientX || e.clientY !== clientY) {
    Object.defineProperty(e, "clientX", { value: clientX, configurable: true });
    Object.defineProperty(e, "clientY", { value: clientY, configurable: true });
  }
  return e;
}

// A synthetic touch event: the composables branch on `"touches" in event`, so we
// only need a touches[0] with clientX/clientY (TouchEvent isn't constructable in
// happy-dom, a plain Event with a touches property is the real code path).
function docTouch(type: string, clientX: number, clientY: number): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "touches", {
    value: [{ clientX, clientY }],
    configurable: true,
  });
  return e;
}

const styleOf = (w: ERWrapper) =>
  w.get(".embedded-resizable").attributes("style") ?? "";

const lastResize = (w: ERWrapper) => {
  const ev = w.emitted("resize");
  return ev ? (ev.at(-1)![0] as { width: number; height: number }) : undefined;
};

async function selectEditor(w: ERWrapper) {
  await w.get(".embedded-resizable").trigger("click");
}

// mousedown on a resize handle, then move the document pointer once.
async function resizeDrag(
  w: ERWrapper,
  handle: string,
  downX: number,
  downY: number,
  moveX: number,
  moveY: number
) {
  const h = w.get(`[data-handle="${handle}"]`);
  await h.trigger("mousedown", { clientX: downX, clientY: downY });
  document.dispatchEvent(docMouse("mousemove", moveX, moveY));
  await nextTick();
}

async function endResize() {
  document.dispatchEvent(docMouse("mouseup", 0, 0));
  await nextTick();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Belt-and-braces: end any accidentally in-flight resize/drag so composable
  // document listeners never leak into the next test.
  document.dispatchEvent(docMouse("mouseup", 0, 0));
  document.body.innerHTML = "";
});

describe("EmbeddedResizable — real resize pointer math", () => {
  // All 8 handle directions with aspect-ratio OFF, so width and height move
  // independently and we can assert the raw delta arithmetic in useResizable's
  // switch. initial 400x300, default clamps (100..1200) — every case stays in
  // range.
  it.each([
    ["e", 100, 100, 200, 100, 500, 300],
    ["w", 100, 100, 50, 100, 450, 300],
    ["s", 100, 100, 100, 250, 400, 450],
    ["n", 100, 100, 100, 60, 400, 340],
    ["se", 100, 100, 150, 140, 450, 340],
    ["ne", 100, 100, 150, 60, 450, 340],
    ["sw", 100, 100, 50, 140, 450, 340],
    ["nw", 100, 100, 50, 60, 450, 340],
  ])(
    "handle %s applies the delta to size (no aspect lock)",
    async (handle, dx, dy, mx, my, expW, expH) => {
      const w = mountER({ maintainAspectRatio: false });
      await selectEditor(w);
      await resizeDrag(w, handle as string, dx, dy, mx, my);

      expect(styleOf(w)).toContain(`width: ${expW}px`);
      expect(styleOf(w)).toContain(`height: ${expH}px`);
      expect(lastResize(w)).toEqual({ width: expW, height: expH });

      await endResize();
      w.unmount();
    }
  );

  it("locks aspect ratio off a horizontal edge (e): height follows width", async () => {
    // 400x300 => aspect 4:3. Grow width by 100 -> 500, height = 500 / (4/3) = 375.
    const w = mountER({ maintainAspectRatio: true });
    await selectEditor(w);
    await resizeDrag(w, "e", 100, 100, 200, 100);

    expect(styleOf(w)).toContain("width: 500px");
    expect(styleOf(w)).toContain("height: 375px");
    expect(lastResize(w)).toEqual({ width: 500, height: 375 });
    await endResize();
    w.unmount();
  });

  it("locks aspect ratio off a vertical edge (s): width follows height", async () => {
    // Grow height by 150 -> 450, width = 450 * (4/3) = 600.
    const w = mountER({ maintainAspectRatio: true });
    await selectEditor(w);
    await resizeDrag(w, "s", 100, 100, 100, 250);

    expect(styleOf(w)).toContain("width: 600px");
    expect(styleOf(w)).toContain("height: 450px");
    expect(lastResize(w)).toEqual({ width: 600, height: 450 });
    await endResize();
    w.unmount();
  });

  it("locks aspect ratio off a corner (se): height derived from width", async () => {
    // Corner path also uses width->height. deltaX=100 -> width 500 -> height 375
    // (deltaY is ignored once the aspect lock recomputes height from width).
    const w = mountER({ maintainAspectRatio: true });
    await selectEditor(w);
    await resizeDrag(w, "se", 100, 100, 200, 180);

    expect(styleOf(w)).toContain("width: 500px");
    expect(styleOf(w)).toContain("height: 375px");
    await endResize();
    w.unmount();
  });

  it("clamps to minWidth when dragged smaller (no aspect)", async () => {
    // start x=500, move to x=50 -> deltaX -450 -> width 400-450=-50 -> clamp 100.
    const w = mountER({ maintainAspectRatio: false, minWidth: 100 });
    await selectEditor(w);
    await resizeDrag(w, "e", 500, 100, 50, 100);

    expect(styleOf(w)).toContain("width: 100px");
    expect(styleOf(w)).toContain("height: 300px");
    expect(lastResize(w)).toEqual({ width: 100, height: 300 });
    await endResize();
    w.unmount();
  });

  it("clamps to maxWidth when dragged larger (no aspect)", async () => {
    // deltaX +3000 -> width 3400 -> clamp default max 1200.
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);
    await resizeDrag(w, "e", 0, 100, 3000, 100);

    expect(styleOf(w)).toContain("width: 1200px");
    expect(styleOf(w)).toContain("height: 300px");
    await endResize();
    w.unmount();
  });

  it("re-applies the aspect ratio after a MIN clamp (width pinned -> height recomputed)", async () => {
    // minWidth 200. deltaX -300 -> width 100 -> clamp 200 -> height = 200/(4/3)=150.
    const w = mountER({
      maintainAspectRatio: true,
      minWidth: 200,
      minHeight: 100,
    });
    await selectEditor(w);
    await resizeDrag(w, "e", 400, 100, 100, 100);

    expect(styleOf(w)).toContain("width: 200px");
    expect(styleOf(w)).toContain("height: 150px");
    expect(lastResize(w)).toEqual({ width: 200, height: 150 });
    await endResize();
    w.unmount();
  });

  it("re-applies the aspect ratio after a MAX clamp (width pinned -> height recomputed)", async () => {
    // maxWidth 600. deltaX +1000 -> width 1400 -> clamp 600 -> height = 600/(4/3)=450.
    const w = mountER({
      maintainAspectRatio: true,
      maxWidth: 600,
      maxHeight: 1200,
    });
    await selectEditor(w);
    await resizeDrag(w, "e", 0, 100, 1000, 100);

    expect(styleOf(w)).toContain("width: 600px");
    expect(styleOf(w)).toContain("height: 450px");
    expect(lastResize(w)).toEqual({ width: 600, height: 450 });
    await endResize();
    w.unmount();
  });

  it("toggles the is-resizing class for the duration of the drag", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);

    const root = () => w.get(".embedded-resizable");
    expect(root().classes()).not.toContain("is-resizing");

    await w.get('[data-handle="e"]').trigger("mousedown", {
      clientX: 100,
      clientY: 100,
    });
    expect(root().classes()).toContain("is-resizing");

    await endResize();
    expect(root().classes()).not.toContain("is-resizing");
    w.unmount();
  });

  it("reflects the live size in the size-indicator readout (rounded px)", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);
    await resizeDrag(w, "se", 100, 100, 150, 140); // 450 x 340

    expect(w.get(".size-indicator").text()).toBe("450×340px");
    await endResize();
    w.unmount();
  });

  it("resizes through the TOUCH path and cleans up its touch listeners", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);

    const removeSpy = vi.spyOn(document, "removeEventListener");
    const handle = w.get('[data-handle="e"]').element;

    // Real touchstart on the handle -> document touchmove -> touchend.
    handle.dispatchEvent(docTouch("touchstart", 0, 0));
    await nextTick();
    document.dispatchEvent(docTouch("touchmove", 100, 0)); // deltaX +100
    await nextTick();

    expect(styleOf(w)).toContain("width: 500px");
    expect(styleOf(w)).toContain("height: 300px");

    document.dispatchEvent(docTouch("touchend", 0, 0));
    await nextTick();

    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
    w.unmount();
  });

  it("registers document move/up listeners on start and removes them on stop", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);

    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    await w.get('[data-handle="e"]').trigger("mousedown", {
      clientX: 0,
      clientY: 0,
    });
    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

    await endResize();
    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    w.unmount();
  });

  it("stops responding to pointer moves after mouseup (drag ended)", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);
    await resizeDrag(w, "e", 0, 100, 100, 100); // width -> 500
    await endResize();

    // A stray move after the gesture ended must not change the size.
    document.dispatchEvent(docMouse("mousemove", 900, 100));
    await nextTick();
    expect(styleOf(w)).toContain("width: 500px");
    w.unmount();
  });
});

describe("EmbeddedResizable — keyboard nudge resizing", () => {
  const press = (w: ERWrapper, key: string, shiftKey = true) =>
    w.get(".embedded-resizable").trigger("keydown", { key, shiftKey });

  it.each([
    ["ArrowRight", "width: 410px", "height: 300px"],
    ["ArrowLeft", "width: 390px", "height: 300px"],
    ["ArrowDown", "width: 400px", "height: 310px"],
    ["ArrowUp", "width: 400px", "height: 290px"],
  ])(
    "Shift+%s nudges the size by 10px",
    async (key, expW, expH) => {
      const w = mountER({ maintainAspectRatio: false });
      await selectEditor(w);
      await press(w, key);

      expect(styleOf(w)).toContain(expW);
      expect(styleOf(w)).toContain(expH);
      w.unmount();
    }
  );

  it("clamps Shift+ArrowLeft at minWidth", async () => {
    const w = mountER({ initialWidth: 100, minWidth: 100 });
    await selectEditor(w);
    await press(w, "ArrowLeft"); // 100 - 10 -> max(100, 90) = 100
    expect(styleOf(w)).toContain("width: 100px");
    w.unmount();
  });

  it("clamps Shift+ArrowDown at maxHeight", async () => {
    const w = mountER({ initialHeight: 300, maxHeight: 300 });
    await selectEditor(w);
    await press(w, "ArrowDown"); // 300 + 10 -> min(300, 310) = 300
    expect(styleOf(w)).toContain("height: 300px");
    w.unmount();
  });

  it("ignores arrow keys without the Shift modifier", async () => {
    const w = mountER({ maintainAspectRatio: false });
    await selectEditor(w);
    await press(w, "ArrowRight", false);
    expect(styleOf(w)).toContain("width: 400px");
    w.unmount();
  });

  it("ignores keyboard entirely while not selected (early return)", async () => {
    const w = mountER({ maintainAspectRatio: false });
    // No click -> isSelected false -> handleKeyDown returns before the switch.
    await press(w, "ArrowRight");
    expect(styleOf(w)).toContain("width: 400px");
    expect(w.emitted("resize")).toBeUndefined();
    w.unmount();
  });

  it.each(["Delete", "Backspace"])(
    "%s emits delete when the confirm dialog is accepted",
    async (key) => {
      vi.stubGlobal("confirm", vi.fn(() => true));
      const w = mountER();
      await selectEditor(w);
      await w.get(".embedded-resizable").trigger("keydown", { key });

      expect(w.emitted("delete")).toBeTruthy();
      expect(w.emitted("delete")!).toHaveLength(1);
      w.unmount();
    }
  );

  it("Escape deselects and tears down the control overlay", async () => {
    const w = mountER();
    await selectEditor(w);
    expect(w.find(".control-overlay").exists()).toBe(true);

    await w.get(".embedded-resizable").trigger("keydown", { key: "Escape" });
    expect(w.emitted("deselect")).toBeTruthy();
    expect(w.find(".control-overlay").exists()).toBe(false);
    w.unmount();
  });
});

describe("EmbeddedResizable — reset & alignment toolbar", () => {
  const btnByTitle = (w: ERWrapper, title: string) =>
    w.findAll(".toolbar-btn").find((b) => b.attributes("title") === title)!;

  it("Reset Size restores the initial dimensions and emits resize", async () => {
    const w = mountER({ maintainAspectRatio: true });
    await selectEditor(w);
    await resizeDrag(w, "e", 0, 100, 200, 100); // width -> 600, height -> 450
    await endResize();
    expect(styleOf(w)).toContain("width: 600px");

    await btnByTitle(w, "Reset Size").trigger("click");

    expect(styleOf(w)).toContain("width: 400px");
    expect(styleOf(w)).toContain("height: 300px");
    expect(lastResize(w)).toEqual({ width: 400, height: 300 });
    w.unmount();
  });

  it("Align Left sets inline left-flush margins on the container", async () => {
    const w = mountER();
    await selectEditor(w);
    await btnByTitle(w, "Align Left").trigger("click");

    const el = w.get(".embedded-resizable").element as HTMLElement;
    expect(el.style.marginRight).toBe("auto");
    expect(el.style.marginLeft).not.toBe("auto"); // "0" / "0px"
    w.unmount();
  });

  it("Align Center sets auto margins on both sides", async () => {
    const w = mountER();
    await selectEditor(w);
    await btnByTitle(w, "Align Center").trigger("click");

    const el = w.get(".embedded-resizable").element as HTMLElement;
    expect(el.style.marginLeft).toBe("auto");
    expect(el.style.marginRight).toBe("auto");
    w.unmount();
  });

  it("Align Right sets inline right-flush margins on the container", async () => {
    const w = mountER();
    await selectEditor(w);
    await btnByTitle(w, "Align Right").trigger("click");

    const el = w.get(".embedded-resizable").element as HTMLElement;
    expect(el.style.marginLeft).toBe("auto");
    expect(el.style.marginRight).not.toBe("auto"); // "0" / "0px"
    w.unmount();
  });
});

describe("EmbeddedResizable — selection & document-level deselect", () => {
  it("emits select exactly once even when clicked repeatedly", async () => {
    const w = mountER();
    await selectEditor(w);
    await selectEditor(w);
    await selectEditor(w);
    expect(w.emitted("select")!).toHaveLength(1);
    w.unmount();
  });

  it("stops the selecting click from bubbling to the deselect listener", async () => {
    // handleSelect calls e.stopPropagation(); without it the same click would
    // reach the document "click" handler and immediately deselect. Attach to the
    // live document so that listener is actually wired.
    const w = mountER({}, true);
    await selectEditor(w);
    expect(w.find(".control-overlay").exists()).toBe(true);
    expect(w.emitted("deselect")).toBeUndefined();
    w.unmount();
  });

  it("deselects when a click lands outside the container", async () => {
    const w = mountER({}, true);
    await selectEditor(w);
    expect(w.find(".control-overlay").exists()).toBe(true);

    // A real click elsewhere in the document bubbles to the document listener,
    // whose target is not contained by the editor -> deselect.
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(w.emitted("deselect")).toBeTruthy();
    expect(w.find(".control-overlay").exists()).toBe(false);
    outside.remove();
    w.unmount();
  });

  it("does not render a drag handle when enableDrag is false (default)", async () => {
    const w = mountER();
    await selectEditor(w);
    expect(w.find(".control-overlay").exists()).toBe(true);
    expect(w.find(".drag-handle").exists()).toBe(false);
    w.unmount();
  });

  it("does not emit a phantom deselect on an outside click when never selected", async () => {
    // handleDeselect() guards on isSelected: an outside document click BEFORE the
    // component was ever selected must NOT emit `deselect`. Without the guard a
    // parent bound to @deselect received spurious events on essentially every
    // click anywhere on the page.
    const w = mountER({}, true);
    // Deliberately do NOT select first.
    expect(w.emitted("select")).toBeUndefined();

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    // No prior select -> no deselect.
    expect(w.emitted("deselect")).toBeUndefined();
    outside.remove();
    w.unmount();
  });
});

describe("EmbeddedResizable — delete with confirm declined", () => {
  it("does not emit delete nor remove the element when confirm is declined", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const w = mountER({}, true);
    await selectEditor(w);

    const deleteBtn = w
      .findAll(".toolbar-btn")
      .find((b) => b.classes("danger"))!;
    await deleteBtn.trigger("click");

    expect(w.emitted("delete")).toBeUndefined();
    // Element survives — confirm() returned false so .remove() never ran.
    expect(document.body.contains(w.element)).toBe(true);
    w.unmount();
  });
});

describe("EmbeddedResizable — lifecycle listener cleanup", () => {
  it("removes its document 'click' deselect listener on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const w = mountER();
    const clickAdds = addSpy.mock.calls.filter(([t]) => t === "click");
    expect(clickAdds.length).toBeGreaterThanOrEqual(1);
    const registered = clickAdds.at(-1)![1];

    w.unmount();

    const clickRemoves = removeSpy.mock.calls.filter(([t]) => t === "click");
    // The exact handler instance registered on mount is what gets removed.
    expect(clickRemoves.some(([, h]) => h === registered)).toBe(true);
  });

  it("its deselect handler no longer fires after unmount", async () => {
    const w = mountER({}, true);
    await selectEditor(w);
    w.unmount();

    // With the listener gone, an outside click must be inert (no throw).
    expect(() =>
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    ).not.toThrow();
  });
});

describe("EmbeddedResizable — draggable reposition (enableDrag)", () => {
  it("repositions via the drag handle and emits move with the delta", async () => {
    const w = mountER({ enableDrag: true }, true);
    await selectEditor(w);

    const dragHandle = w.get(".drag-handle").element;
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    dragHandle.dispatchEvent(docMouse("mousedown", 50, 50));
    await nextTick();
    expect(w.get(".embedded-resizable").classes()).toContain("is-dragging");
    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

    // rects read as 0 in happy-dom, so newLeft/newTop == deltaX/deltaY.
    document.dispatchEvent(docMouse("mousemove", 80, 90)); // delta +30, +40
    await nextTick();

    const el = w.get(".embedded-resizable").element as HTMLElement;
    expect(el.style.position).toBe("absolute");
    expect(el.style.left).toBe("30px");
    expect(el.style.top).toBe("40px");

    const move = w.emitted("move");
    expect(move).toBeTruthy();
    expect(move!.at(-1)![0]).toEqual({ x: 30, y: 40 });

    document.dispatchEvent(docMouse("mouseup", 0, 0));
    await nextTick();
    expect(w.get(".embedded-resizable").classes()).not.toContain("is-dragging");
    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    w.unmount();
  });
});
