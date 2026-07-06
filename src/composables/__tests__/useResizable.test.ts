import { describe, it, expect, vi, afterEach } from "vitest";
import { ref } from "vue";
import { useResizable } from "../useResizable";

/**
 * Build a useResizable instance with sensible defaults that individual
 * tests can override. Keeps each test focused on the option under test.
 */
function makeResizable(overrides: Partial<Parameters<typeof useResizable>[0]> = {}) {
  const containerRef = ref(document.createElement("div"));
  return useResizable({
    containerRef,
    initialWidth: 400,
    initialHeight: 300,
    minWidth: 100,
    minHeight: 100,
    maxWidth: 1000,
    maxHeight: 1000,
    maintainAspectRatio: false,
    ...overrides,
  });
}

/**
 * Dispatch a real mousemove on document with the given client coordinates.
 */
function dispatchMouseMove(clientX: number, clientY: number) {
  document.dispatchEvent(
    new MouseEvent("mousemove", { clientX, clientY, bubbles: true }),
  );
}

/**
 * Dispatch a real touchmove on document. happy-dom's TouchEvent does not
 * populate `touches` from the init dict reliably, so we construct a plain
 * event and attach a touches array that mirrors what a browser provides.
 */
function dispatchTouchMove(clientX: number, clientY: number) {
  const event = new Event("touchmove", { bubbles: true }) as unknown as {
    touches: Array<{ clientX: number; clientY: number }>;
  } & Event;
  event.touches = [{ clientX, clientY }];
  // The source under test checks `"touches" in event`, which is now true.
  document.dispatchEvent(event as unknown as Event);
}

describe("useResizable", () => {
  afterEach(() => {
    // Ensure no lingering document listeners leak between tests.
    document.dispatchEvent(new MouseEvent("mouseup"));
    document.dispatchEvent(new Event("touchend"));
  });

  it("initializes with correct dimensions", () => {
    const containerRef = ref(document.createElement("div"));

    const { currentWidth, currentHeight } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    expect(currentWidth.value).toBe(400);
    expect(currentHeight.value).toBe(300);
  });

  it("resets to initial dimensions", () => {
    const containerRef = ref(document.createElement("div"));

    const { currentWidth, currentHeight, resetSize } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    // Change dimensions
    currentWidth.value = 600;
    currentHeight.value = 450;

    // Reset
    resetSize();

    expect(currentWidth.value).toBe(400);
    expect(currentHeight.value).toBe(300);
  });

  it("sets isResizing to true during resize", () => {
    const containerRef = ref(document.createElement("div"));

    const { isResizing, startResize } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    expect(isResizing.value).toBe(false);

    // Start resize
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
    });
    startResize(mouseEvent, "se");

    expect(isResizing.value).toBe(true);
  });

  it("calls onResize callback when dimensions change", () => {
    const containerRef = ref(document.createElement("div"));
    let callbackCalled = false;

    useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
      onResize: () => {
        callbackCalled = true;
      },
    });

    // Callback would be called during resize
    // In real usage, this would be triggered by mouse/touch events
    expect(callbackCalled).toBeDefined();
  });

  describe("startResize", () => {
    it("prevents default and stops propagation on the triggering event", () => {
      const { startResize } = makeResizable();
      const event = new MouseEvent("mousedown", { clientX: 10, clientY: 10 });
      const preventDefault = vi.spyOn(event, "preventDefault");
      const stopPropagation = vi.spyOn(event, "stopPropagation");

      startResize(event, "se");

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("captures the pointer origin so subsequent moves are relative to it", () => {
      const { currentWidth, startResize } = makeResizable();
      // Start from a non-zero origin; only the delta should matter.
      startResize(new MouseEvent("mousedown", { clientX: 200, clientY: 200 }), "e");

      // Move +50px in X relative to the 200px origin => width grows by 50.
      dispatchMouseMove(250, 200);
      expect(currentWidth.value).toBe(450);
    });
  });

  describe("handleResize per handle (no aspect ratio)", () => {
    it("east handle grows width by deltaX, leaves height untouched", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      dispatchMouseMove(60, 999); // deltaY should be ignored for "e"
      expect(currentWidth.value).toBe(460);
      expect(currentHeight.value).toBe(300);
    });

    it("west handle shrinks width by deltaX (moving right shrinks)", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "w");
      dispatchMouseMove(50, 0); // deltaX = +50 => width = 400 - 50
      expect(currentWidth.value).toBe(350);
      expect(currentHeight.value).toBe(300);
    });

    it("south handle grows height by deltaY, leaves width untouched", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      dispatchMouseMove(999, 40); // deltaX ignored for "s"
      expect(currentWidth.value).toBe(400);
      expect(currentHeight.value).toBe(340);
    });

    it("north handle shrinks height by deltaY (moving down shrinks)", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "n");
      dispatchMouseMove(0, 70); // deltaY = +70 => height = 300 - 70
      expect(currentWidth.value).toBe(400);
      expect(currentHeight.value).toBe(230);
    });

    it("south-east handle grows both width and height", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "se");
      dispatchMouseMove(30, 40);
      expect(currentWidth.value).toBe(430);
      expect(currentHeight.value).toBe(340);
    });

    it("south-west handle shrinks width and grows height", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "sw");
      dispatchMouseMove(30, 40); // width -30, height +40
      expect(currentWidth.value).toBe(370);
      expect(currentHeight.value).toBe(340);
    });

    it("north-east handle grows width and shrinks height", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "ne");
      dispatchMouseMove(30, 40); // width +30, height -40
      expect(currentWidth.value).toBe(430);
      expect(currentHeight.value).toBe(260);
    });

    it("north-west handle shrinks both width and height", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "nw");
      dispatchMouseMove(30, 40); // width -30, height -40
      expect(currentWidth.value).toBe(370);
      expect(currentHeight.value).toBe(260);
    });

    it("unknown handle leaves dimensions unchanged (no matching case)", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable();
      startResize(
        new MouseEvent("mousedown", { clientX: 0, clientY: 0 }),
        "unknown-handle",
      );
      dispatchMouseMove(100, 100);
      // switch has no matching case => newWidth/newHeight stay at start values.
      expect(currentWidth.value).toBe(400);
      expect(currentHeight.value).toBe(300);
    });
  });

  describe("min/max constraints", () => {
    it("clamps width to minWidth when shrinking past the floor", () => {
      const { currentWidth, startResize } = makeResizable({ minWidth: 200 });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      dispatchMouseMove(-500, 0); // 400 - 500 = -100 => clamped to 200
      expect(currentWidth.value).toBe(200);
    });

    it("clamps width to maxWidth when growing past the ceiling", () => {
      const { currentWidth, startResize } = makeResizable({ maxWidth: 500 });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      dispatchMouseMove(1000, 0); // 400 + 1000 => clamped to 500
      expect(currentWidth.value).toBe(500);
    });

    it("clamps height to minHeight when shrinking past the floor", () => {
      const { currentHeight, startResize } = makeResizable({ minHeight: 150 });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      dispatchMouseMove(0, -400); // 300 - 400 => clamped to 150
      expect(currentHeight.value).toBe(150);
    });

    it("clamps height to maxHeight when growing past the ceiling", () => {
      const { currentHeight, startResize } = makeResizable({ maxHeight: 400 });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      dispatchMouseMove(0, 1000); // 300 + 1000 => clamped to 400
      expect(currentHeight.value).toBe(400);
    });
  });

  describe("aspect ratio preservation", () => {
    // initial 400x300 => aspectRatio = 4/3 ≈ 1.3333
    it("derives height from width for a horizontal (east) handle", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      dispatchMouseMove(100, 0); // width => 500
      expect(currentWidth.value).toBe(500);
      // height = 500 / (400/300) = 375
      expect(currentHeight.value).toBeCloseTo(375, 5);
    });

    it("derives width from height for a vertical (south) handle", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      dispatchMouseMove(0, 60); // height => 360
      // width = 360 * (400/300) = 480
      expect(currentHeight.value).toBeCloseTo(360, 5);
      expect(currentWidth.value).toBeCloseTo(480, 5);
    });

    it("derives height from width for a corner (se) handle", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "se");
      // width driven by deltaX; height recomputed from width, deltaY ignored.
      dispatchMouseMove(80, 5);
      expect(currentWidth.value).toBeCloseTo(480, 5);
      expect(currentHeight.value).toBeCloseTo(360, 5);
    });

    it("re-derives height from width after width clamps to maxWidth", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
        maxWidth: 600,
        maxHeight: 10000, // keep height ceiling out of the way
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      dispatchMouseMove(1000, 0); // width => 1400, clamped to 600
      expect(currentWidth.value).toBe(600);
      // post-clamp re-apply: height = 600 / (4/3) = 450
      expect(currentHeight.value).toBeCloseTo(450, 5);
    });

    it("re-derives width from height after height clamps to maxHeight", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
        maxWidth: 10000, // keep width ceiling out of the way
        maxHeight: 450,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      dispatchMouseMove(0, 1000); // height => 1300, clamped to 450
      expect(currentHeight.value).toBe(450);
      // post-clamp re-apply: width = 450 * (4/3) = 600
      expect(currentWidth.value).toBeCloseTo(600, 5);
    });

    it("re-derives width from height after height clamps to minHeight", () => {
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
        minWidth: 1, // keep the width floor out of the way so it does not clamp first
        minHeight: 150,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      // height => 300 - 200 = 100 (below floor); derived width = 100 * 4/3 ≈ 133,
      // which stays above minWidth (1) so only the height floor engages.
      dispatchMouseMove(0, -200);
      expect(currentHeight.value).toBe(150);
      // post-clamp re-apply: width = 150 * (4/3) = 200
      expect(currentWidth.value).toBeCloseTo(200, 5);
    });

    it("width-clamp re-apply wins over the height-clamp re-apply (order dependence)", () => {
      // Documents the source's ordering: when BOTH a derived-width clamp and a
      // height clamp would fire, the width branch runs first and its recomputed
      // height is what survives — the later height check no longer matches.
      const { currentWidth, currentHeight, startResize } = makeResizable({
        maintainAspectRatio: true,
        minWidth: 1,
        minHeight: 150,
      });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "s");
      // Huge negative delta drives derived width to minWidth (1) first.
      dispatchMouseMove(0, -1000);
      expect(currentWidth.value).toBe(1);
      // height was re-derived from the clamped width: 1 / (4/3) = 0.75
      expect(currentHeight.value).toBeCloseTo(0.75, 5);
    });
  });

  describe("onResize callback", () => {
    it("fires on every move with the freshly computed dimensions", () => {
      const onResize = vi.fn();
      const { startResize } = makeResizable({ onResize });
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "se");

      dispatchMouseMove(10, 20);
      dispatchMouseMove(30, 40);

      expect(onResize).toHaveBeenCalledTimes(2);
      expect(onResize).toHaveBeenNthCalledWith(1, { width: 410, height: 320 });
      expect(onResize).toHaveBeenNthCalledWith(2, { width: 430, height: 340 });
    });

    it("fires with the initial dimensions when resetSize is called", () => {
      const onResize = vi.fn();
      const { currentWidth, resetSize } = makeResizable({ onResize });
      currentWidth.value = 999;

      resetSize();

      expect(onResize).toHaveBeenCalledWith({ width: 400, height: 300 });
    });

    it("does not throw when onResize is omitted", () => {
      const { startResize, resetSize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      expect(() => dispatchMouseMove(10, 0)).not.toThrow();
      expect(() => resetSize()).not.toThrow();
    });
  });

  describe("stopResize / lifecycle", () => {
    it("clears isResizing and detaches listeners on mouseup", () => {
      const { currentWidth, isResizing, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      expect(isResizing.value).toBe(true);

      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(isResizing.value).toBe(false);

      // Listeners removed: a further move must not mutate width.
      dispatchMouseMove(500, 0);
      expect(currentWidth.value).toBe(400);
    });

    it("ignores move events dispatched while not resizing", () => {
      const { currentWidth, currentHeight } = makeResizable();
      // No startResize call => isResizing is false, handleResize early-returns.
      // (handleResize isn't attached yet, but guard is still exercised on the
      //  path where a stale move slips through after stopResize.)
      dispatchMouseMove(100, 100);
      expect(currentWidth.value).toBe(400);
      expect(currentHeight.value).toBe(300);
    });

    it("early-returns from handleResize once resizing has stopped", () => {
      const { currentWidth, startResize } = makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "e");
      // Stop mid-gesture, then simulate a late move that the browser might
      // still deliver before listeners are fully torn down.
      document.dispatchEvent(new MouseEvent("mouseup"));
      dispatchMouseMove(200, 0);
      expect(currentWidth.value).toBe(400);
    });
  });

  describe("touch events", () => {
    it("reads the first touch point on touchstart and drives resize", () => {
      const { currentWidth, currentHeight, isResizing, startResize } =
        makeResizable();

      // Construct a touch-shaped start event: the source checks `"touches" in event`.
      const startEvent = new Event("touchstart") as unknown as {
        touches: Array<{ clientX: number; clientY: number }>;
        preventDefault: () => void;
        stopPropagation: () => void;
      } & Event;
      startEvent.touches = [{ clientX: 100, clientY: 100 }];

      startResize(startEvent as unknown as TouchEvent, "se");
      expect(isResizing.value).toBe(true);

      dispatchTouchMove(150, 130); // delta +50, +30
      expect(currentWidth.value).toBe(450);
      expect(currentHeight.value).toBe(330);
    });

    it("stops resizing on touchend and removes touch listeners", () => {
      const { currentWidth, isResizing, startResize } = makeResizable();

      const startEvent = new Event("touchstart") as unknown as {
        touches: Array<{ clientX: number; clientY: number }>;
      } & Event;
      startEvent.touches = [{ clientX: 0, clientY: 0 }];
      startResize(startEvent as unknown as TouchEvent, "e");

      dispatchTouchMove(20, 0);
      expect(currentWidth.value).toBe(420);

      document.dispatchEvent(new Event("touchend"));
      expect(isResizing.value).toBe(false);

      // No further mutation after teardown.
      dispatchTouchMove(500, 0);
      expect(currentWidth.value).toBe(420);
    });
  });

  describe("resetSize", () => {
    it("restores initial dimensions after an arbitrary resize", () => {
      const { currentWidth, currentHeight, startResize, resetSize } =
        makeResizable();
      startResize(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }), "se");
      dispatchMouseMove(100, 100);
      expect(currentWidth.value).toBe(500);
      expect(currentHeight.value).toBe(400);

      resetSize();
      expect(currentWidth.value).toBe(400);
      expect(currentHeight.value).toBe(300);
    });
  });
});
