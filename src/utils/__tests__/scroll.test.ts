import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";
import {
  isSmoothScrollSupported,
  smoothScrollIntoView,
  scrollToTop,
  animateScrollTo,
  scrollIntoViewInContainer,
  getScrollSupport,
} from "../scroll";

/**
 * These utilities lean on browser layout/scroll APIs that happy-dom only stubs
 * (getBoundingClientRect returns zeros, there is no real scrolling). Each test
 * therefore controls the pieces of environment the branch depends on: whether
 * smooth scroll is "supported", element rects, window geometry, and
 * requestAnimationFrame. We assert on the REAL computed values the module feeds
 * to scrollTo / scrollIntoView / scrollTop — not merely that a mock was called.
 *
 * Note on timestamps: the module anchors its animation start time with
 * `if (!startTime) startTime = currentTime`. Because `!0` is truthy, a first
 * frame timestamp of 0 would never "stick". Real browsers always hand rAF a
 * non-zero DOMHighResTimeStamp for the first frame, so these tests use non-zero
 * timestamps (anchoring at 1000, then advancing) to mirror real behaviour.
 */

// A conventional non-zero anchor for the first animation frame.
const T0 = 1000;

// ---------------------------------------------------------------------------
// Environment control helpers
// ---------------------------------------------------------------------------

/**
 * Force `isSmoothScrollSupported()` to report false by swapping
 * document.documentElement.style for a plain object that lacks the
 * `scrollBehavior` key. Returns a restore function.
 *
 * In happy-dom `scrollBehavior` lives on the CSSStyleDeclaration prototype, so
 * we cannot simply delete it — overriding the `style` accessor is the clean way
 * to make `"scrollBehavior" in style` evaluate to false.
 */
function disableSmoothScroll(): () => void {
  const de = document.documentElement;
  Object.defineProperty(de, "style", {
    configurable: true,
    get() {
      // A plain object without a scrollBehavior property.
      return { color: "" } as unknown as CSSStyleDeclaration;
    },
  });
  return () => {
    // Remove the own accessor so the prototype getter (real style) resurfaces.
    delete (de as unknown as { style?: unknown }).style;
  };
}

/** Temporarily override a window numeric property (scrollY, innerHeight). */
function setWindowProp(name: string, value: number): () => void {
  const original = Object.getOwnPropertyDescriptor(window, name);
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, name, original);
    } else {
      delete (window as unknown as Record<string, unknown>)[name];
    }
  };
}

/** Give an element a fixed bounding rect. */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  const full: DOMRect = {
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? 0,
    bottom: rect.bottom ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    toJSON: () => ({}),
  };
  el.getBoundingClientRect = () => full;
}

/**
 * Deterministic requestAnimationFrame driver. Instead of running frames on a
 * real clock we capture each scheduled callback and let the test feed exact
 * timestamps. This exercises the animation `step` closures (easing math, the
 * progress<1 recursion, and the final frame) with zero timing flakiness.
 */
interface RafHarness {
  /** Run the next queued frame with the given timestamp. */
  flush(timestamp: number): void;
  /** Number of frames currently queued. */
  pending(): number;
  restore(): void;
}

function installRaf(): RafHarness {
  const queue: FrameRequestCallback[] = [];
  const spy = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb: FrameRequestCallback): number => {
      queue.push(cb);
      return queue.length;
    });
  return {
    flush(timestamp: number) {
      const cb = queue.shift();
      if (!cb) throw new Error("no frame queued to flush");
      cb(timestamp);
    },
    pending() {
      return queue.length;
    },
    restore() {
      spy.mockRestore();
    },
  };
}

/**
 * Spy on window.scrollTo that records args without invoking happy-dom's own
 * scrollTo (which coerces positional args oddly). Returns the spy.
 */
function spyWindowScrollTo(): MockInstance {
  return vi.spyOn(window, "scrollTo").mockImplementation(() => {});
}

// ---------------------------------------------------------------------------

describe("scroll utilities", () => {
  let restores: Array<() => void>;

  beforeEach(() => {
    restores = [];
  });

  afterEach(() => {
    for (const r of restores.reverse()) r();
    restores = [];
    vi.restoreAllMocks();
  });

  function track(restore: () => void): void {
    restores.push(restore);
  }

  // -------------------------------------------------------------------------
  // isSmoothScrollSupported
  // -------------------------------------------------------------------------
  describe("isSmoothScrollSupported", () => {
    it("returns true when scrollBehavior is present on the root element style", () => {
      // happy-dom's CSSStyleDeclaration prototype exposes scrollBehavior.
      expect(isSmoothScrollSupported()).toBe(true);
    });

    it("returns false when scrollBehavior is absent from the style object", () => {
      track(disableSmoothScroll());
      expect(isSmoothScrollSupported()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // smoothScrollIntoView
  // -------------------------------------------------------------------------
  describe("smoothScrollIntoView", () => {
    it("uses native scrollIntoView with default options when smooth scroll is supported", () => {
      const el = document.createElement("div");
      const spy = vi.fn();
      el.scrollIntoView = spy as unknown as typeof el.scrollIntoView;

      smoothScrollIntoView(el);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    });

    it("passes through caller-provided options to native scrollIntoView", () => {
      const el = document.createElement("div");
      const spy = vi.fn();
      el.scrollIntoView = spy as unknown as typeof el.scrollIntoView;

      smoothScrollIntoView(el, {
        behavior: "smooth",
        block: "center",
        inline: "end",
      });

      expect(spy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
        inline: "end",
      });
    });

    it("uses native scrollIntoView for behavior 'auto' even when smooth is unsupported", () => {
      track(disableSmoothScroll());
      const el = document.createElement("div");
      const spy = vi.fn();
      el.scrollIntoView = spy as unknown as typeof el.scrollIntoView;

      smoothScrollIntoView(el, { behavior: "auto" });

      expect(spy).toHaveBeenCalledWith({
        behavior: "auto",
        block: "start",
        inline: "nearest",
      });
    });

    it("falls back to manual animation (no native call) when smooth is unsupported", () => {
      track(disableSmoothScroll());
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));
      track(setWindowProp("innerHeight", 1000));

      const el = document.createElement("div");
      const nativeSpy = vi.fn();
      el.scrollIntoView = nativeSpy as unknown as typeof el.scrollIntoView;
      stubRect(el, { top: 500, bottom: 600, height: 100 });

      const scrollToSpy = spyWindowScrollTo();

      smoothScrollIntoView(el, { behavior: "smooth", block: "start" });

      // Native path must NOT be used in the fallback.
      expect(nativeSpy).not.toHaveBeenCalled();
      // The animation must have scheduled a frame.
      expect(raf.pending()).toBe(1);

      // block "start" => targetY = rect.top(500) + scrollY(0) = 500.
      raf.flush(T0); // anchor startTime, progress 0 => scrollTo(0, startY 0)
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0);

      // Final frame: elapsed >= duration => progress clamped to 1 => reach target.
      raf.flush(T0 + 1000);
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 500);
    });
  });

  // -------------------------------------------------------------------------
  // smoothScrollIntoView fallback: animateScrollToElement block branches.
  //
  // Reached only via the fallback path, so every case disables smooth scroll.
  // We drive to the final frame (progress clamped to 1) where the scrolled Y
  // equals the computed targetY, then assert that value per block mode.
  // -------------------------------------------------------------------------
  describe("smoothScrollIntoView fallback block alignment", () => {
    function runFallback(
      block: ScrollLogicalPosition,
      rect: Partial<DOMRect>,
      opts: { scrollY?: number; innerHeight?: number } = {}
    ): { scrollToSpy: MockInstance; raf: RafHarness } {
      track(disableSmoothScroll());
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", opts.scrollY ?? 0));
      track(setWindowProp("innerHeight", opts.innerHeight ?? 1000));

      const el = document.createElement("div");
      el.scrollIntoView = vi.fn() as unknown as typeof el.scrollIntoView;
      stubRect(el, rect);

      const scrollToSpy = spyWindowScrollTo();
      smoothScrollIntoView(el, { behavior: "smooth", block });
      return { scrollToSpy, raf };
    }

    it("block 'start' targets the element's absolute top", () => {
      // absoluteTop = top(700) + scrollY(100) = 800
      const { scrollToSpy, raf } = runFallback(
        "start",
        { top: 700, bottom: 750, height: 50 },
        { scrollY: 100 }
      );
      raf.flush(T0);
      raf.flush(T0 + 1000); // clamp to target
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 800);
    });

    it("block 'center' centers the element in the viewport", () => {
      // absoluteTop = 500 + 0 = 500
      // targetY = 500 - innerHeight/2 (500) + height/2 (25) = 25
      const { scrollToSpy, raf } = runFallback(
        "center",
        { top: 500, bottom: 550, height: 50 },
        { scrollY: 0, innerHeight: 1000 }
      );
      raf.flush(T0);
      raf.flush(T0 + 1000);
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 25);
    });

    it("block 'end' aligns the element's bottom with the viewport bottom", () => {
      // absoluteTop = 900 + 0 = 900
      // targetY = 900 - innerHeight(1000) + height(50) = -50
      const { scrollToSpy, raf } = runFallback(
        "end",
        { top: 900, bottom: 950, height: 50 },
        { scrollY: 0, innerHeight: 1000 }
      );
      raf.flush(T0);
      raf.flush(T0 + 1000);
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, -50);
    });

    it("block 'nearest' does nothing when the element is already fully visible", () => {
      // top >= 0 and bottom <= innerHeight => early return, no frame scheduled.
      const { scrollToSpy, raf } = runFallback(
        "nearest",
        { top: 10, bottom: 200, height: 190 },
        { scrollY: 0, innerHeight: 1000 }
      );
      expect(raf.pending()).toBe(0);
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it("block 'nearest' scrolls to top when the element is closer to the top edge", () => {
      // top = -50 (above viewport), bottom = 50, innerHeight 1000
      // |top| = 50; |bottom - innerHeight| = |50 - 1000| = 950 => closer to top
      // absoluteTop = -50 + scrollY(200) = 150 => targetY = 150
      const { scrollToSpy, raf } = runFallback(
        "nearest",
        { top: -50, bottom: 50, height: 100 },
        { scrollY: 200, innerHeight: 1000 }
      );
      expect(raf.pending()).toBe(1);
      raf.flush(T0);
      raf.flush(T0 + 1000);
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 150);
    });

    it("block 'nearest' scrolls to bottom when the element is closer to the bottom edge", () => {
      // top = 1400, bottom = 1500, innerHeight 1000 (element below viewport)
      // |top| = 1400; |bottom - innerHeight| = |1500 - 1000| = 500 => closer to bottom
      // absoluteTop = 1400 + scrollY(0) = 1400
      // targetY = 1400 - innerHeight(1000) + height(100) = 500
      const { scrollToSpy, raf } = runFallback(
        "nearest",
        { top: 1400, bottom: 1500, height: 100 },
        { scrollY: 0, innerHeight: 1000 }
      );
      expect(raf.pending()).toBe(1);
      raf.flush(T0);
      raf.flush(T0 + 1000);
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 500);
    });

    it("nearest boundary: element partially clipped at the top still animates to its top", () => {
      // top = -1, bottom = 100 => not fully visible (top<0), enters distance branch.
      const { scrollToSpy, raf } = runFallback(
        "nearest",
        { top: -1, bottom: 100, height: 101 },
        { scrollY: 0, innerHeight: 1000 }
      );
      expect(raf.pending()).toBe(1);
      raf.flush(T0);
      raf.flush(T0 + 1000);
      // closer to top: |−1| = 1 < |100 − 1000| = 900 => targetY = absoluteTop = -1
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, -1);
    });

    it("falls back to the element's absolute top for an unrecognised block value (default case)", () => {
      // The switch has a default arm for a block outside the typed union.
      // We cast an invalid value to reach it: targetY = absoluteTop.
      const { scrollToSpy, raf } = runFallback(
        "somewhere" as unknown as ScrollLogicalPosition,
        { top: 300, bottom: 340, height: 40 },
        { scrollY: 50, innerHeight: 1000 }
      );
      raf.flush(T0);
      raf.flush(T0 + 1000);
      // default => targetY = absoluteTop = top(300) + scrollY(50) = 350
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 350);
    });
  });

  // -------------------------------------------------------------------------
  // scrollToTop
  // -------------------------------------------------------------------------
  describe("scrollToTop", () => {
    it("uses native window.scrollTo({top:0}) with smooth when supported", () => {
      const spy = spyWindowScrollTo();
      scrollToTop();
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });

    it("uses native scrollTo with the provided behavior", () => {
      const spy = spyWindowScrollTo();
      scrollToTop("auto");
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    });

    it("uses native scrollTo for 'auto' even when smooth is unsupported", () => {
      track(disableSmoothScroll());
      const spy = spyWindowScrollTo();
      scrollToTop("auto");
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    });

    it("falls back to animateScrollTo(0) when smooth is unsupported and behavior is smooth", () => {
      track(disableSmoothScroll());
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 400));

      const spy = spyWindowScrollTo();
      scrollToTop("smooth");

      // Fallback schedules a rAF-driven animation instead of the object-form call.
      expect(raf.pending()).toBe(1);
      raf.flush(T0); // progress 0 => scrollTo(0, startY 400)
      expect(spy).toHaveBeenLastCalledWith(0, 400);
      raf.flush(T0 + 1000); // progress 1 => scrollTo(0, target 0)
      expect(spy).toHaveBeenLastCalledWith(0, 0);
    });
  });

  // -------------------------------------------------------------------------
  // animateScrollTo (public)
  // -------------------------------------------------------------------------
  describe("animateScrollTo", () => {
    it("schedules a requestAnimationFrame", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));

      animateScrollTo(500);
      expect(raf.pending()).toBe(1);
    });

    it("on the first frame anchors startTime and scrolls to the start position", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 100));
      const spy = spyWindowScrollTo();

      animateScrollTo(600, 300);
      // First frame: startTime = currentTime, elapsed 0, progress 0, eased 0.
      raf.flush(T0);
      expect(spy).toHaveBeenLastCalledWith(0, 100); // startY + distance*0
      // Not yet complete -> another frame queued.
      expect(raf.pending()).toBe(1);
    });

    it("reaches the exact target on the final frame and stops scheduling", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 100));
      const spy = spyWindowScrollTo();

      animateScrollTo(600, 300);
      raf.flush(T0); // anchor, elapsed 0 -> scrolls to start
      expect(spy).toHaveBeenLastCalledWith(0, 100);
      expect(raf.pending()).toBe(1);

      // elapsed = 300 = duration => progress 1 => reach 600, no more frames.
      raf.flush(T0 + 300);
      expect(spy).toHaveBeenLastCalledWith(0, 600);
      expect(raf.pending()).toBe(0);
    });

    it("applies eased interpolation at the animation midpoint", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));
      const spy = spyWindowScrollTo();

      animateScrollTo(1000, 200);
      raf.flush(T0); // anchor startTime
      // Halfway: elapsed 100 / duration 200 => progress 0.5.
      // easeInOutCubic(0.5) = 4 * 0.5^3 = 0.5 (t<0.5 is false at exactly 0.5,
      // but both branches yield 0.5 at the midpoint).
      raf.flush(T0 + 100);
      expect(spy).toHaveBeenLastCalledWith(0, 500);
      // Still animating.
      expect(raf.pending()).toBe(1);
    });

    it("eases below the linear value early in the animation (ease-in)", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));
      const spy = spyWindowScrollTo();

      animateScrollTo(1000, 200);
      raf.flush(T0);
      // 25% through: progress 0.25, easeInOutCubic(0.25) = 4*0.25^3 = 0.0625.
      // 1000 * 0.0625 = 62.5 (well below the linear 250).
      raf.flush(T0 + 50);
      expect(spy).toHaveBeenLastCalledWith(0, 62.5);
    });

    it("continues to clamp progress when elapsed exceeds duration", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));
      const spy = spyWindowScrollTo();

      animateScrollTo(800, 100);
      raf.flush(T0);
      // elapsed 5000 >> duration 100 => Math.min(50, 1) = 1 => target, stop.
      raf.flush(T0 + 5000);
      expect(spy).toHaveBeenLastCalledWith(0, 800);
      expect(raf.pending()).toBe(0);
    });

    it("uses the default duration of 300ms when omitted", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 0));
      const spy = spyWindowScrollTo();

      animateScrollTo(300);
      raf.flush(T0);
      // At exactly 300ms elapsed the default duration is complete.
      raf.flush(T0 + 300);
      expect(spy).toHaveBeenLastCalledWith(0, 300);
      expect(raf.pending()).toBe(0);
    });

    it("handles a negative distance (scrolling upward)", () => {
      const raf = installRaf();
      track(() => raf.restore());
      track(setWindowProp("scrollY", 900));
      const spy = spyWindowScrollTo();

      animateScrollTo(100, 200); // distance = 100 - 900 = -800
      raf.flush(T0);
      expect(spy).toHaveBeenLastCalledWith(0, 900);
      raf.flush(T0 + 200);
      expect(spy).toHaveBeenLastCalledWith(0, 100);
    });
  });

  // -------------------------------------------------------------------------
  // scrollIntoViewInContainer
  // -------------------------------------------------------------------------
  describe("scrollIntoViewInContainer", () => {
    function makePair(): { el: HTMLElement; container: HTMLElement } {
      const container = document.createElement("div");
      const el = document.createElement("div");
      container.appendChild(el);
      return { el, container };
    }

    function setOffsetTop(el: HTMLElement, value: number): void {
      Object.defineProperty(el, "offsetTop", { configurable: true, value });
    }

    it("returns early without scrolling when the element is already visible", () => {
      const { el, container } = makePair();
      stubRect(el, { top: 20, bottom: 80 });
      stubRect(container, { top: 0, bottom: 200, height: 200 });

      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;
      const raf = installRaf();
      track(() => raf.restore());

      scrollIntoViewInContainer(el, container, "smooth");

      expect(containerScrollTo).not.toHaveBeenCalled();
      expect(raf.pending()).toBe(0);
    });

    it("uses native container.scrollTo with smooth when supported and behavior is smooth", () => {
      const { el, container } = makePair();
      // element above container's visible area => not visible.
      stubRect(el, { top: -50, bottom: -10, height: 40 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });

      // happy-dom returns 0 for offsetTop; define explicitly for a real assertion.
      setOffsetTop(el, 100);
      setOffsetTop(container, 10);

      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;

      scrollIntoViewInContainer(el, container, "smooth");

      // targetScrollTop = offsetTop(100) - container.offsetTop(10)
      //                   - containerRect.height/2 (150) + elementRect.height/2 (20)
      //                 = 100 - 10 - 150 + 20 = -40
      expect(containerScrollTo).toHaveBeenCalledWith({
        top: -40,
        behavior: "smooth",
      });
    });

    it("defaults to smooth behavior and native scrollTo when called without a behavior arg", () => {
      const { el, container } = makePair();
      stubRect(el, { top: -50, bottom: -10, height: 40 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });
      setOffsetTop(el, 200);
      setOffsetTop(container, 0);

      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;

      scrollIntoViewInContainer(el, container); // behavior defaults to "smooth"

      // targetScrollTop = 200 - 0 - 150 + 20 = 70
      expect(containerScrollTo).toHaveBeenCalledWith({
        top: 70,
        behavior: "smooth",
      });
    });

    it("falls back to manual container animation when behavior is 'auto'", () => {
      const { el, container } = makePair();
      stubRect(el, { top: 400, bottom: 460, height: 60 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });
      setOffsetTop(el, 400);
      setOffsetTop(container, 0);
      container.scrollTop = 0;

      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;
      const raf = installRaf();
      track(() => raf.restore());

      scrollIntoViewInContainer(el, container, "auto");

      // behavior !== "smooth" => manual animation, native scrollTo not used.
      expect(containerScrollTo).not.toHaveBeenCalled();
      expect(raf.pending()).toBe(1);

      // targetScrollTop = 400 - 0 - 150 + 30 = 280.
      raf.flush(T0); // anchor, progress 0 => scrollTop = startScrollTop(0)
      expect(container.scrollTop).toBe(0);
      raf.flush(T0 + 1000); // progress 1 => scrollTop = target 280
      expect(container.scrollTop).toBe(280);
      expect(raf.pending()).toBe(0);
    });

    it("falls back to manual container animation when smooth scroll is unsupported", () => {
      track(disableSmoothScroll());
      const { el, container } = makePair();
      stubRect(el, { top: 400, bottom: 460, height: 60 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });
      setOffsetTop(el, 500);
      setOffsetTop(container, 0);
      container.scrollTop = 20;

      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;
      const raf = installRaf();
      track(() => raf.restore());

      scrollIntoViewInContainer(el, container, "smooth");

      // Smooth unsupported => manual animation even with behavior "smooth".
      expect(containerScrollTo).not.toHaveBeenCalled();
      expect(raf.pending()).toBe(1);

      // targetScrollTop = 500 - 0 - 150 + 30 = 380. startScrollTop = 20.
      raf.flush(T0);
      expect(container.scrollTop).toBe(20); // progress 0 keeps start
      raf.flush(T0 + 1000);
      expect(container.scrollTop).toBe(380);
    });

    it("animates the container through an eased midpoint before completing", () => {
      const { el, container } = makePair();
      stubRect(el, { top: 400, bottom: 460, height: 60 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });
      setOffsetTop(el, 400);
      setOffsetTop(container, 0);
      container.scrollTop = 0;
      container.scrollTo = vi.fn() as unknown as typeof container.scrollTo;
      const raf = installRaf();
      track(() => raf.restore());

      // behavior "auto" forces the manual animation path (duration 300).
      scrollIntoViewInContainer(el, container, "auto");

      // target = 400 - 0 - 150 + 30 = 280, distance = 280 from start 0.
      raf.flush(T0); // anchor
      // Halfway: elapsed 150 / 300 => progress 0.5, eased 0.5 => 0 + 280*0.5 = 140.
      raf.flush(T0 + 150);
      expect(container.scrollTop).toBe(140);
      expect(raf.pending()).toBe(1);
      raf.flush(T0 + 300);
      expect(container.scrollTop).toBe(280);
      expect(raf.pending()).toBe(0);
    });

    it("treats an element flush with the container top/bottom as visible (boundary)", () => {
      const { el, container } = makePair();
      // element top === container top and element bottom === container bottom.
      stubRect(el, { top: 0, bottom: 300 });
      stubRect(container, { top: 0, bottom: 300, height: 300 });
      const containerScrollTo = vi.fn();
      container.scrollTo =
        containerScrollTo as unknown as typeof container.scrollTo;
      const raf = installRaf();
      track(() => raf.restore());

      scrollIntoViewInContainer(el, container, "smooth");

      // >= / <= boundaries make it "visible" => early return.
      expect(containerScrollTo).not.toHaveBeenCalled();
      expect(raf.pending()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getScrollSupport
  // -------------------------------------------------------------------------
  describe("getScrollSupport", () => {
    it("reports capabilities and user agent when smooth scroll is supported", () => {
      const info = getScrollSupport();
      expect(info).toEqual({
        smoothScrollSupported: true,
        scrollBehavior: true,
        userAgent: navigator.userAgent,
      });
      expect(typeof info.userAgent).toBe("string");
    });

    it("reflects the unsupported state for both flags", () => {
      track(disableSmoothScroll());
      const info = getScrollSupport();
      expect(info.smoothScrollSupported).toBe(false);
      expect(info.scrollBehavior).toBe(false);
      // userAgent is unaffected by the style override.
      expect(info.userAgent).toBe(navigator.userAgent);
    });
  });
});
