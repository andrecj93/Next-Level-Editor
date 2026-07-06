import { describe, it, expect, vi, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useDraggable } from "../useDraggable";

/**
 * Helpers to build real elements in happy-dom and give them deterministic
 * geometry. happy-dom's getBoundingClientRect() returns all-zero rects, so we
 * stub it per-element to exercise the real position math in useDraggable.
 */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  const full: DOMRect = {
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    right: rect.right ?? 0,
    bottom: rect.bottom ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    toJSON: () => ({}),
  };
  el.getBoundingClientRect = () => full;
}

interface Built {
  container: HTMLElement;
  parent: HTMLElement;
  containerRef: Ref<HTMLElement | null>;
  cleanup: () => void;
}

/** Build a parent > container tree attached to the document body. */
function buildTree(opts?: {
  containerRect?: Partial<DOMRect>;
  parentRect?: Partial<DOMRect>;
  withParent?: boolean;
}): Built {
  const container = document.createElement("div");
  let parent: HTMLElement;

  if (opts?.withParent === false) {
    // Container has no parentElement.
    parent = document.createElement("div"); // unused holder
  } else {
    parent = document.createElement("div");
    parent.appendChild(container);
    document.body.appendChild(parent);
  }

  if (opts?.containerRect) stubRect(container, opts.containerRect);
  if (opts?.parentRect) stubRect(parent, opts.parentRect);

  const containerRef: Ref<HTMLElement | null> = ref(container);

  return {
    container,
    parent,
    containerRef,
    cleanup: () => {
      if (parent.isConnected) parent.remove();
      if (container.isConnected) container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("useDraggable", () => {
  describe("initialization", () => {
    it("initializes with isDragging as false", () => {
      const containerRef: Ref<HTMLElement | null> = ref(
        document.createElement("div")
      );
      const { isDragging } = useDraggable({ containerRef });
      expect(isDragging.value).toBe(false);
    });

    it("exposes startDrag as a function", () => {
      const containerRef: Ref<HTMLElement | null> = ref(
        document.createElement("div")
      );
      const { startDrag } = useDraggable({ containerRef });
      expect(typeof startDrag).toBe("function");
    });
  });

  describe("startDrag", () => {
    it("sets isDragging to true when drag starts", () => {
      const { containerRef, cleanup } = buildTree();
      const { isDragging, startDrag } = useDraggable({ containerRef });

      expect(isDragging.value).toBe(false);
      startDrag(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));
      expect(isDragging.value).toBe(true);

      cleanup();
    });

    it("calls preventDefault and stopPropagation on the event", () => {
      const { containerRef, cleanup } = buildTree();
      const { startDrag } = useDraggable({ containerRef });

      const event = new MouseEvent("mousedown", { clientX: 10, clientY: 20 });
      const prevent = vi.spyOn(event, "preventDefault");
      const stop = vi.spyOn(event, "stopPropagation");

      startDrag(event);

      expect(prevent).toHaveBeenCalledTimes(1);
      expect(stop).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it("returns early and does NOT set isDragging when containerRef is null", () => {
      const containerRef: Ref<HTMLElement | null> = ref(null);
      const { isDragging, startDrag } = useDraggable({ containerRef });

      const event = new MouseEvent("mousedown", { clientX: 5, clientY: 5 });
      const prevent = vi.spyOn(event, "preventDefault");

      startDrag(event);

      // preventDefault/stopPropagation still run before the null-guard.
      expect(prevent).toHaveBeenCalledTimes(1);
      // But the drag never starts.
      expect(isDragging.value).toBe(false);
    });

    it("sets the container to absolute positioning relative to its parent", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 150, top: 90 },
        parentRect: { left: 50, top: 40 },
      });
      const { startDrag } = useDraggable({ containerRef });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));

      expect(container.style.position).toBe("absolute");
      // left = rect.left - parentRect.left = 150 - 50
      expect(container.style.left).toBe("100px");
      // top = rect.top - parentRect.top = 90 - 40
      expect(container.style.top).toBe("50px");

      cleanup();
    });

    it("still starts dragging when the container has no parent element", () => {
      const { container, containerRef, cleanup } = buildTree({
        withParent: false,
        containerRect: { left: 10, top: 10 },
      });
      const { isDragging, startDrag } = useDraggable({ containerRef });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));

      // Drag is active, but the absolute-positioning block is skipped.
      expect(isDragging.value).toBe(true);
      expect(container.style.position).toBe("");

      cleanup();
    });
  });

  describe("handleDrag (mouse)", () => {
    it("updates left/top and calls onMove with clamped-to-parent coordinates", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 200, top: 100 },
        parentRect: { left: 50, top: 30 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      // startDrag captures startX=300, startY=200, initialLeft=200, initialTop=100.
      startDrag(new MouseEvent("mousedown", { clientX: 300, clientY: 200 }));

      // Move by +20 in x, +15 in y.
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 320, clientY: 215 })
      );

      // newLeft = initialLeft - parentRect.left + deltaX = 200 - 50 + 20 = 170
      // newTop  = initialTop  - parentRect.top  + deltaY = 100 - 30 + 15 = 85
      expect(container.style.left).toBe("170px");
      expect(container.style.top).toBe("85px");
      expect(positions).toEqual([{ x: 170, y: 85 }]);

      cleanup();
    });

    it("handles negative deltas (dragging up and to the left)", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 100, top: 100 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 100, clientY: 100 }));
      // Move by -40, -30.
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 60, clientY: 70 })
      );

      // newLeft = 100 - 0 + (-40) = 60 ; newTop = 100 - 0 + (-30) = 70
      expect(container.style.left).toBe("60px");
      expect(container.style.top).toBe("70px");
      expect(positions).toEqual([{ x: 60, y: 70 }]);

      cleanup();
    });

    it("accumulates deltas across multiple move events from the same origin", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));

      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 10, clientY: 10 })
      );
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 25, clientY: 5 })
      );

      // Deltas are always relative to the original startX/startY (0,0).
      expect(positions).toEqual([
        { x: 10, y: 10 },
        { x: 25, y: 5 },
      ]);
      expect(container.style.left).toBe("25px");
      expect(container.style.top).toBe("5px");

      cleanup();
    });

    it("does not throw and skips onMove when there is no onMove callback", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 10, top: 10 },
        parentRect: { left: 5, top: 5 },
      });

      const { startDrag } = useDraggable({ containerRef });
      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));

      expect(() =>
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 30, clientY: 40 })
        )
      ).not.toThrow();

      // Style still updates even without an onMove callback.
      // newLeft = 10 - 5 + 30 = 35 ; newTop = 10 - 5 + 40 = 45
      expect(container.style.left).toBe("35px");
      expect(container.style.top).toBe("45px");

      cleanup();
    });

    it("does nothing on mousemove that fires after dragging has stopped", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag, isDragging } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(isDragging.value).toBe(false);

      // Any listener that might still fire must be a no-op after stop.
      const leftBefore = container.style.left;
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 999, clientY: 999 })
      );
      expect(positions).toHaveLength(0);
      expect(container.style.left).toBe(leftBefore);

      cleanup();
    });

    it("stops updating if the containerRef is cleared mid-drag", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag, isDragging } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
      // isDragging is still true, but the element ref is gone (e.g. unmounted).
      containerRef.value = null;
      expect(isDragging.value).toBe(true);

      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 50 })
      );

      // handleDrag's `!containerRef.value` guard short-circuits: no onMove,
      // and the detached element is untouched.
      expect(positions).toHaveLength(0);
      expect(container.style.left).toBe("0px");

      // Clean up the still-attached mouseup listener.
      document.dispatchEvent(new MouseEvent("mouseup"));
      cleanup();
    });

    it("does nothing when the container element is a no-parent drag", () => {
      // With no parent, handleDrag reads parent === null and skips all updates.
      const { container, containerRef, cleanup } = buildTree({
        withParent: false,
        containerRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 50 })
      );

      expect(positions).toHaveLength(0);
      expect(container.style.left).toBe("");
      expect(container.style.top).toBe("");

      cleanup();
    });
  });

  describe("stopDrag (mouse)", () => {
    it("sets isDragging to false on mouseup", () => {
      const { containerRef, cleanup } = buildTree();
      const { isDragging, startDrag } = useDraggable({ containerRef });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
      expect(isDragging.value).toBe(true);

      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(isDragging.value).toBe(false);

      cleanup();
    });

    it("removes the document move/up listeners so later moves are ignored", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 10, clientY: 10 })
      );
      expect(positions).toHaveLength(1);

      document.dispatchEvent(new MouseEvent("mouseup"));

      // After stop, the listener is gone -> no further onMove calls.
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 50 })
      );
      expect(positions).toHaveLength(1);
      expect(container.style.left).toBe("10px");

      cleanup();
    });
  });

  describe("touch events", () => {
    it("starts a drag from a touchstart using the first touch point", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 120, top: 80 },
        parentRect: { left: 20, top: 10 },
      });
      const { isDragging, startDrag } = useDraggable({ containerRef });

      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientX: 200, clientY: 150 } as Touch],
      });
      startDrag(touchStart);

      expect(isDragging.value).toBe(true);
      expect(container.style.position).toBe("absolute");
      // left = 120 - 20 = 100 ; top = 80 - 10 = 70
      expect(container.style.left).toBe("100px");
      expect(container.style.top).toBe("70px");

      cleanup();
    });

    it("updates position on touchmove using touch deltas", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 100, top: 100 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(
        new TouchEvent("touchstart", {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        })
      );

      document.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientX: 130, clientY: 90 } as Touch],
        })
      );

      // delta = (+30, -10) ; newLeft = 100 - 0 + 30 = 130 ; newTop = 100 - 0 - 10 = 90
      expect(container.style.left).toBe("130px");
      expect(container.style.top).toBe("90px");
      expect(positions).toEqual([{ x: 130, y: 90 }]);

      cleanup();
    });

    it("stops dragging on touchend and ignores later touchmove", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { isDragging, startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(
        new TouchEvent("touchstart", {
          touches: [{ clientX: 0, clientY: 0 } as Touch],
        })
      );
      document.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientX: 15, clientY: 25 } as Touch],
        })
      );
      expect(positions).toHaveLength(1);

      document.dispatchEvent(new TouchEvent("touchend"));
      expect(isDragging.value).toBe(false);

      document.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientX: 500, clientY: 500 } as Touch],
        })
      );
      expect(positions).toHaveLength(1);
      expect(container.style.left).toBe("15px");

      cleanup();
    });

    it("does not register mouse listeners for a touch-initiated drag", () => {
      const { container, containerRef, cleanup } = buildTree({
        containerRect: { left: 0, top: 0 },
        parentRect: { left: 0, top: 0 },
      });

      const positions: Array<{ x: number; y: number }> = [];
      const { startDrag } = useDraggable({
        containerRef,
        onMove: (p) => positions.push(p),
      });

      startDrag(
        new TouchEvent("touchstart", {
          touches: [{ clientX: 0, clientY: 0 } as Touch],
        })
      );
      // startDrag's absolute-positioning block already set left = "0px"
      // (rect.left 0 - parentRect.left 0).
      expect(container.style.left).toBe("0px");

      // A mousemove should be ignored because only touch listeners were bound.
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 40, clientY: 40 })
      );
      // onMove never fires and the position stays exactly as startDrag left it.
      expect(positions).toHaveLength(0);
      expect(container.style.left).toBe("0px");

      cleanup();
    });
  });

  describe("independent instances", () => {
    it("keeps isDragging state isolated between two draggables", () => {
      const a = buildTree({ containerRect: { left: 0, top: 0 }, parentRect: { left: 0, top: 0 } });
      const b = buildTree({ containerRect: { left: 0, top: 0 }, parentRect: { left: 0, top: 0 } });

      const dragA = useDraggable({ containerRef: a.containerRef });
      const dragB = useDraggable({ containerRef: b.containerRef });

      dragA.startDrag(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));

      expect(dragA.isDragging.value).toBe(true);
      expect(dragB.isDragging.value).toBe(false);

      // Stop A; both should end up not dragging.
      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(dragA.isDragging.value).toBe(false);
      expect(dragB.isDragging.value).toBe(false);

      a.cleanup();
      b.cleanup();
    });
  });
});
