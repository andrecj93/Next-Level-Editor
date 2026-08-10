import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { defineComponent, ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useAccessibility } from "../useAccessibility";

/**
 * Full behavioural suite for useAccessibility.
 *
 * The composable is a factory whose *announcement* state is a shared singleton.
 * Every test resets that singleton in beforeEach so announcement assertions are
 * isolated. Functions that only touch per-instance/local state (focus trap,
 * ARIA attr builder, contrast math, keyboard nav) are driven directly against a
 * fresh instance and exercised with real happy-dom elements and real events.
 */

// useAccessibility() registers onMounted/onUnmounted unconditionally, so calling
// it outside a component (which the pure-function tests intentionally do) makes
// Vue emit a benign "lifecycle hook called with no active component instance"
// warning. Filter *only* that exact message so real warnings still surface and
// the suite output stays clean. Assertions are unaffected.
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("is called when there is no active component instance")
    ) {
      return;
    }
    originalWarn(...(args as []));
  };
});
afterAll(() => {
  console.warn = originalWarn;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build focusable elements inside a real container attached to the document. */
function buildContainer(): {
  container: HTMLElement;
  buttons: HTMLButtonElement[];
} {
  const container = document.createElement("div");
  const buttons: HTMLButtonElement[] = [];
  for (let i = 0; i < 3; i++) {
    const b = document.createElement("button");
    b.textContent = `btn-${i}`;
    container.appendChild(b);
    buttons.push(b);
  }
  document.body.appendChild(container);
  return { container, buttons };
}

/**
 * Install a fake canvas 2d context so parseColor() works under happy-dom
 * (which returns null from getContext("2d")). The fake parses the fillStyle a
 * color string into RGB and reports it back through getImageData, letting the
 * real luminance/contrast math run. Returns a restore function.
 */
function installCanvasStub(): () => void {
  const original = HTMLCanvasElement.prototype.getContext;

  const parse = (color: string): [number, number, number] => {
    const c = color.trim().toLowerCase();
    if (c === "white" || c === "#ffffff" || c === "#fff") return [255, 255, 255];
    if (c === "black" || c === "#000000" || c === "#000") return [0, 0, 0];
    // rgb(r, g, b) / rgba(r, g, b, a)
    const rgbMatch = c.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
    );
    if (rgbMatch) {
      return [
        Number(rgbMatch[1]),
        Number(rgbMatch[2]),
        Number(rgbMatch[3]),
      ];
    }
    // #rrggbb
    const hexMatch = c.match(/^#([0-9a-f]{6})$/);
    if (hexMatch) {
      const n = parseInt(hexMatch[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    // named fallbacks used in tests
    if (c === "red") return [255, 0, 0];
    if (c === "gray" || c === "grey") return [128, 128, 128];
    return [0, 0, 0];
  };

  (HTMLCanvasElement.prototype as unknown as {
    getContext: (id: string) => unknown;
  }).getContext = function () {
    let current = "#000000";
    return {
      set fillStyle(v: string) {
        current = v;
      },
      get fillStyle() {
        return current;
      },
      fillRect() {
        /* no-op */
      },
      getImageData() {
        const [r, g, b] = parse(current);
        return { data: [r, g, b, 255] };
      },
    };
  };

  return () => {
    HTMLCanvasElement.prototype.getContext = original;
  };
}

// ---------------------------------------------------------------------------
// Reset shared announcement singleton before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAccessibility().clearAnnouncements();
});

// ===========================================================================
// Announcements
// ===========================================================================

describe("useAccessibility - announcements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announce() immediately pushes a polite announcement by default", () => {
    const a = useAccessibility();
    a.announce("Hello");
    expect(a.getAnnouncements("polite")).toBe("Hello");
    expect(a.announcements.value).toHaveLength(1);
    expect(a.announcements.value[0]).toMatchObject({
      message: "Hello",
      priority: "polite",
    });
  });

  it("respects an explicit priority", () => {
    const a = useAccessibility();
    a.announce("Urgent", { priority: "assertive" });
    expect(a.getAnnouncements("assertive")).toBe("Urgent");
    expect(a.getAnnouncements("polite")).toBe("");
  });

  it("surfaces only the latest announcement (never a re-read backlog)", () => {
    // aria-atomic regions re-read the whole region on change, so the region
    // must show just the most-recent message — not a join of the last 5s of
    // messages, which re-spoke earlier ones.
    const a = useAccessibility();
    a.announce("One");
    a.announce("Two");
    expect(a.getAnnouncements("polite")).toBe("Two");
  });

  it("clearPrevious wipes existing announcements before adding", () => {
    const a = useAccessibility();
    a.announce("stale");
    a.announce("fresh", { clearPrevious: true });
    expect(a.announcements.value).toHaveLength(1);
    expect(a.getAnnouncements("polite")).toBe("fresh");
  });

  it("delays the announcement when delay > 0", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    a.announce("later", { delay: 200 });
    // Not present yet.
    expect(a.announcements.value).toHaveLength(0);
    vi.advanceTimersByTime(199);
    expect(a.announcements.value).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(a.getAnnouncements("polite")).toBe("later");
  });

  it("auto-clears an announcement after 5 seconds", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    a.announce("temporary");
    expect(a.announcements.value).toHaveLength(1);
    vi.advanceTimersByTime(4999);
    expect(a.announcements.value).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(a.announcements.value).toHaveLength(0);
  });

  it("assigns unique incrementing ids so auto-clear only removes its own", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    a.announce("first");
    vi.advanceTimersByTime(2000);
    a.announce("second");
    // Advance so only the first's 5s window elapses.
    vi.advanceTimersByTime(3000); // first total 5000 -> cleared
    expect(a.getAnnouncements("polite")).toBe("second");
    vi.advanceTimersByTime(2000); // second total 5000 -> cleared
    expect(a.announcements.value).toHaveLength(0);
  });

  it("clearAnnouncements empties everything", () => {
    const a = useAccessibility();
    a.announce("a");
    a.announce("b", { priority: "assertive" });
    a.clearAnnouncements();
    expect(a.announcements.value).toHaveLength(0);
    expect(a.getAnnouncements("polite")).toBe("");
    expect(a.getAnnouncements("assertive")).toBe("");
  });

  it("getAnnouncements returns empty string for a priority with no entries", () => {
    const a = useAccessibility();
    expect(a.getAnnouncements("off")).toBe("");
  });
});

// ===========================================================================
// Focus management
// ===========================================================================

describe("useAccessibility - setFocus", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("is a no-op for a null element (does not throw, no focused element)", () => {
    const a = useAccessibility();
    expect(() => a.setFocus(null)).not.toThrow();
    expect(a.focusedElement.value).toBeNull();
  });

  it("focuses the element and records it in focusedElement", () => {
    const a = useAccessibility();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    a.setFocus(btn);
    expect(document.activeElement).toBe(btn);
    expect(a.focusedElement.value).toBe(btn);
  });

  it("emits a delayed announcement when options.announce is given", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    a.setFocus(btn, { announce: "Focused the button" });
    // announce uses delay: 100, so nothing yet.
    expect(a.getAnnouncements("polite")).toBe("");
    vi.advanceTimersByTime(100);
    expect(a.getAnnouncements("polite")).toBe("Focused the button");
  });

  it("passes preventScroll through without error", () => {
    const a = useAccessibility();
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    expect(() => a.setFocus(btn, { preventScroll: true })).not.toThrow();
    expect(document.activeElement).toBe(btn);
  });
});

describe("useAccessibility - getFocusableElements", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("collects the standard focusable element types", () => {
    const a = useAccessibility();
    const container = document.createElement("div");
    container.innerHTML = `
      <a href="#x">link</a>
      <button>btn</button>
      <textarea></textarea>
      <input type="text" />
      <select><option>o</option></select>
      <div tabindex="0">tab0</div>
      <div contenteditable="true">ce</div>
    `;
    document.body.appendChild(container);
    const focusables = a.getFocusableElements(container);
    expect(focusables.length).toBe(7);
  });

  it("excludes disabled controls, hidden inputs and tabindex=-1", () => {
    const a = useAccessibility();
    const container = document.createElement("div");
    container.innerHTML = `
      <button disabled>no</button>
      <input type="hidden" />
      <input disabled />
      <div tabindex="-1">no</div>
      <button>yes</button>
    `;
    document.body.appendChild(container);
    const focusables = a.getFocusableElements(container);
    expect(focusables).toHaveLength(1);
    expect(focusables[0].textContent).toBe("yes");
  });

  it("filters out display:none and visibility:hidden elements", () => {
    const a = useAccessibility();
    const container = document.createElement("div");
    const visible = document.createElement("button");
    visible.textContent = "visible";
    const hiddenDisplay = document.createElement("button");
    hiddenDisplay.textContent = "none";
    hiddenDisplay.style.display = "none";
    const hiddenVisibility = document.createElement("button");
    hiddenVisibility.textContent = "hidden";
    hiddenVisibility.style.visibility = "hidden";
    container.append(visible, hiddenDisplay, hiddenVisibility);
    document.body.appendChild(container);

    const focusables = a.getFocusableElements(container);
    expect(focusables).toHaveLength(1);
    expect(focusables[0]).toBe(visible);
  });

  it("excludes controls hidden by an ANCESTOR (v-show-collapsed panel)", () => {
    const a = useAccessibility();
    const container = document.createElement("div");
    const panel = document.createElement("div");
    panel.style.display = "none"; // collapsed panel/sidebar
    const buried = document.createElement("button");
    buried.textContent = "buried";
    panel.appendChild(buried);
    const visible = document.createElement("button");
    visible.textContent = "visible";
    container.append(panel, visible);
    document.body.appendChild(container);

    const focusables = a.getFocusableElements(container);
    expect(focusables).toHaveLength(1);
    expect(focusables[0]).toBe(visible);
  });

  it("defaults to document.body when no container is passed", () => {
    const a = useAccessibility();
    const btn = document.createElement("button");
    btn.textContent = "body-btn";
    document.body.appendChild(btn);
    const focusables = a.getFocusableElements();
    expect(focusables).toContain(btn);
  });

  it("returns an empty array for an empty container", () => {
    const a = useAccessibility();
    const container = document.createElement("div");
    document.body.appendChild(container);
    expect(a.getFocusableElements(container)).toEqual([]);
  });
});

describe("useAccessibility - getAdjacentFocusable", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when there are no focusables", () => {
    const a = useAccessibility();
    expect(a.getAdjacentFocusable("next")).toBeNull();
  });

  it("with no current element, 'next' returns the first focusable", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    expect(a.getAdjacentFocusable("next")).toBe(buttons[0]);
  });

  it("with no current element, 'previous' returns the last focusable", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    expect(a.getAdjacentFocusable("previous")).toBe(buttons[2]);
  });

  it("returns the next element for a mid-list current element", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    expect(a.getAdjacentFocusable("next", buttons[0])).toBe(buttons[1]);
    expect(a.getAdjacentFocusable("previous", buttons[2])).toBe(buttons[1]);
  });

  it("wraps forward from the last element to the first", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    expect(a.getAdjacentFocusable("next", buttons[2])).toBe(buttons[0]);
  });

  it("wraps backward from the first element to the last", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    expect(a.getAdjacentFocusable("previous", buttons[0])).toBe(buttons[2]);
  });

  it("returns the first focusable when the current element is not in the list", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    const stranger = document.createElement("button");
    document.body.appendChild(stranger);
    expect(a.getAdjacentFocusable("next", stranger)).toBe(buttons[0]);
  });

  it("falls back to document.body when no containerRef was supplied", () => {
    const { buttons } = buildContainer();
    const a = useAccessibility(); // no containerRef
    // document.body now contains the buttons; first focusable should be buttons[0]
    expect(a.getAdjacentFocusable("next")).toBe(buttons[0]);
  });
});

describe("useAccessibility - navigateToAdjacent", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does nothing when there are no focusables", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const a = useAccessibility(ref(container));
    expect(() => a.navigateToAdjacent("next")).not.toThrow();
    expect(a.focusedElement.value).toBeNull();
  });

  it("'first' focuses the first focusable element", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    a.navigateToAdjacent("first");
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("'last' focuses the last focusable element", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    a.navigateToAdjacent("last");
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("'next' moves focus forward from the active element", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    buttons[0].focus();
    a.navigateToAdjacent("next");
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("'previous' moves focus backward from the active element", () => {
    const { container, buttons } = buildContainer();
    const a = useAccessibility(ref(container));
    buttons[2].focus();
    a.navigateToAdjacent("previous");
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("falls back to document.body when no containerRef is supplied", () => {
    const { buttons } = buildContainer();
    const a = useAccessibility(); // no containerRef -> uses document.body
    a.navigateToAdjacent("first");
    expect(document.activeElement).toBe(buttons[0]);
  });
});

// ===========================================================================
// Focus trap (lifecycle-bound via a mounted component)
// ===========================================================================

describe("useAccessibility - trapFocus / releaseFocusTrap", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  /** Mount a component so onMounted/onUnmounted run, exposing the API. */
  function mountAccessibility() {
    let api!: ReturnType<typeof useAccessibility>;
    const Comp = defineComponent({
      setup() {
        api = useAccessibility();
        return () => null;
      },
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    return { api, wrapper };
  }

  it("activates the trap and focuses the first focusable after nextTick", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    expect(api.focusTrapActive.value).toBe(true);

    await nextTick();
    expect(document.activeElement).toBe(buttons[0]);

    cleanup();
    wrapper.unmount();
  });

  it("honours an explicit initialFocus element", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container, { initialFocus: buttons[1] });
    await nextTick();
    expect(document.activeElement).toBe(buttons[1]);

    cleanup();
    wrapper.unmount();
  });

  it("wraps focus to the first element when Tab is pressed on the last", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();

    buttons[2].focus();
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);

    cleanup();
    wrapper.unmount();
  });

  it("wraps focus to the last element on Shift+Tab from the first", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();

    buttons[0].focus();
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[2]);

    cleanup();
    wrapper.unmount();
  });

  it("does not intercept Tab in the middle of the list", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();

    buttons[1].focus();
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);

    // No wrap logic triggered -> not prevented, focus unchanged by the trap.
    expect(ev.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(buttons[1]);

    cleanup();
    wrapper.unmount();
  });

  it("bails out of the Tab handler when the trapped container has no focusables", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();

    // Empty the container after the trap is active; the Tab handler must hit the
    // `focusables.length === 0` early return without throwing.
    buttons.forEach((b) => b.remove());
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    expect(() => document.dispatchEvent(ev)).not.toThrow();
    expect(ev.defaultPrevented).toBe(false);

    cleanup();
    wrapper.unmount();
  });

  it("ignores non-Tab keys", async () => {
    const { container } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();

    const ev = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);

    cleanup();
    wrapper.unmount();
  });

  it("cleanup removes the tab handler so wrapping stops", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container);
    await nextTick();
    cleanup();

    buttons[2].focus();
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);
    // Handler removed -> no preventDefault, focus stays put.
    expect(ev.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(buttons[2]);

    wrapper.unmount();
  });

  it("blocks an outside mousedown when allowOutsideClick is false", async () => {
    const { container } = buildContainer();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container, { allowOutsideClick: false });
    await nextTick();

    const ev = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    outside.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);

    cleanup();
    wrapper.unmount();
  });

  it("does not block a mousedown inside the trapped container", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container, { allowOutsideClick: false });
    await nextTick();

    const ev = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    buttons[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);

    cleanup();
    wrapper.unmount();
  });

  it("allowOutsideClick=true does not register the outside-click blocker", async () => {
    const { container } = buildContainer();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const { api, wrapper } = mountAccessibility();

    const cleanup = api.trapFocus(container, { allowOutsideClick: true });
    await nextTick();

    const ev = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    outside.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);

    cleanup();
    wrapper.unmount();
  });

  it("releaseFocusTrap deactivates and returns focus to the previously active element", async () => {
    const { container } = buildContainer();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { api, wrapper } = mountAccessibility();
    const cleanup = api.trapFocus(container, { returnFocus: true });
    await nextTick();
    // Focus moved into the trap.
    expect(document.activeElement).not.toBe(opener);

    api.releaseFocusTrap();
    expect(api.focusTrapActive.value).toBe(false);
    expect(document.activeElement).toBe(opener);

    cleanup();
    wrapper.unmount();
  });

  it("releaseFocusTrap without a stored return element just deactivates", async () => {
    const { container } = buildContainer();
    const { api, wrapper } = mountAccessibility();
    // returnFocus:false -> no focusReturnElement stored.
    const cleanup = api.trapFocus(container, { returnFocus: false });
    await nextTick();
    expect(() => api.releaseFocusTrap()).not.toThrow();
    expect(api.focusTrapActive.value).toBe(false);

    cleanup();
    wrapper.unmount();
  });

  it("Tab handler is inert once the trap has been released (focusTrapActive false)", async () => {
    const { container, buttons } = buildContainer();
    const { api, wrapper } = mountAccessibility();
    const cleanup = api.trapFocus(container);
    await nextTick();

    // Release without running cleanup so the listener is still attached, but the
    // active-guard inside the handler should short-circuit.
    api.releaseFocusTrap();
    buttons[2].focus();
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);

    cleanup();
    wrapper.unmount();
  });
});

// ===========================================================================
// Keyboard navigation - handleArrowNavigation
// ===========================================================================

describe("useAccessibility - handleArrowNavigation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function makeItems(n: number): HTMLElement[] {
    const items: HTMLElement[] = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement("button");
      document.body.appendChild(b);
      items.push(b);
    }
    return items;
  }

  function keydown(key: string): KeyboardEvent {
    return new KeyboardEvent("keydown", { key, cancelable: true });
  }

  it("ArrowDown moves to the next index (vertical) and focuses it", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    const ev = keydown("ArrowDown");
    const next = a.handleArrowNavigation(ev, items, 0);
    expect(next).toBe(1);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[1]);
  });

  it("ArrowUp moves to the previous index (vertical)", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    const ev = keydown("ArrowUp");
    expect(a.handleArrowNavigation(ev, items, 2)).toBe(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("ArrowDown wraps to 0 at the end when wrap=true (default)", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    expect(a.handleArrowNavigation(keydown("ArrowDown"), items, 2)).toBe(0);
  });

  it("ArrowUp wraps to the last index at the top when wrap=true", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    expect(a.handleArrowNavigation(keydown("ArrowUp"), items, 0)).toBe(2);
  });

  it("clamps instead of wrapping when wrap=false", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    expect(
      a.handleArrowNavigation(keydown("ArrowDown"), items, 2, { wrap: false })
    ).toBe(2);
    expect(
      a.handleArrowNavigation(keydown("ArrowUp"), items, 0, { wrap: false })
    ).toBe(0);
  });

  it("ignores ArrowUp/Down for horizontal orientation", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    const ev = keydown("ArrowDown");
    expect(
      a.handleArrowNavigation(ev, items, 1, { orientation: "horizontal" })
    ).toBe(1);
    // Not handled -> not prevented.
    expect(ev.defaultPrevented).toBe(false);
  });

  it("ArrowRight / ArrowLeft work for horizontal orientation", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    expect(
      a.handleArrowNavigation(keydown("ArrowRight"), items, 0, {
        orientation: "horizontal",
      })
    ).toBe(1);
    expect(
      a.handleArrowNavigation(keydown("ArrowLeft"), items, 1, {
        orientation: "horizontal",
      })
    ).toBe(0);
  });

  it("ArrowLeft/Right are ignored for vertical orientation", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    const right = keydown("ArrowRight");
    expect(a.handleArrowNavigation(right, items, 0)).toBe(0);
    expect(right.defaultPrevented).toBe(false);
    // ArrowLeft too (exercises its non-horizontal/grid else branch).
    const left = keydown("ArrowLeft");
    expect(a.handleArrowNavigation(left, items, 1)).toBe(1);
    expect(left.defaultPrevented).toBe(false);
  });

  it("ArrowUp is ignored for horizontal orientation", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    const ev = keydown("ArrowUp");
    // Exercises the non-vertical/grid else branch of ArrowUp.
    expect(
      a.handleArrowNavigation(ev, items, 1, { orientation: "horizontal" })
    ).toBe(1);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("horizontal ArrowRight wraps to 0 and ArrowLeft wraps to last", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    expect(
      a.handleArrowNavigation(keydown("ArrowRight"), items, 2, {
        orientation: "horizontal",
      })
    ).toBe(0);
    expect(
      a.handleArrowNavigation(keydown("ArrowLeft"), items, 0, {
        orientation: "horizontal",
      })
    ).toBe(2);
  });

  it("horizontal clamps (no wrap) at both ends", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    // ArrowLeft at index 0, wrap:false -> stays 0 (exercises the ": 0" branch).
    expect(
      a.handleArrowNavigation(keydown("ArrowLeft"), items, 0, {
        orientation: "horizontal",
        wrap: false,
      })
    ).toBe(0);
    // ArrowRight at last index, wrap:false -> clamps to last.
    expect(
      a.handleArrowNavigation(keydown("ArrowRight"), items, 2, {
        orientation: "horizontal",
        wrap: false,
      })
    ).toBe(2);
  });

  it("grid orientation also handles ArrowLeft", () => {
    const a = useAccessibility();
    const items = makeItems(6);
    expect(
      a.handleArrowNavigation(keydown("ArrowLeft"), items, 1, {
        orientation: "grid",
        columns: 3,
      })
    ).toBe(0);
  });

  it("grid orientation steps by the column count vertically", () => {
    const a = useAccessibility();
    const items = makeItems(6); // 2 rows x 3 cols
    // From index 0, ArrowDown with columns:3 -> 3
    expect(
      a.handleArrowNavigation(keydown("ArrowDown"), items, 0, {
        orientation: "grid",
        columns: 3,
      })
    ).toBe(3);
    // From index 3, ArrowUp with columns:3 -> 0
    expect(
      a.handleArrowNavigation(keydown("ArrowUp"), items, 3, {
        orientation: "grid",
        columns: 3,
      })
    ).toBe(0);
    // Grid also handles horizontal.
    expect(
      a.handleArrowNavigation(keydown("ArrowRight"), items, 0, {
        orientation: "grid",
        columns: 3,
      })
    ).toBe(1);
  });

  it("Home jumps to first, End jumps to last", () => {
    const a = useAccessibility();
    const items = makeItems(4);
    const home = keydown("Home");
    expect(a.handleArrowNavigation(home, items, 3)).toBe(0);
    expect(home.defaultPrevented).toBe(true);

    const end = keydown("End");
    expect(a.handleArrowNavigation(end, items, 0)).toBe(3);
    expect(end.defaultPrevented).toBe(true);
  });

  it("returns the current index unchanged for an unhandled key and does not move focus", () => {
    const a = useAccessibility();
    const items = makeItems(3);
    items[0].focus();
    const ev = keydown("PageDown");
    expect(a.handleArrowNavigation(ev, items, 1)).toBe(1);
    expect(ev.defaultPrevented).toBe(false);
    // No focus change requested.
    expect(document.activeElement).toBe(items[0]);
  });

  it("does not call setFocus when the target index is missing", () => {
    const a = useAccessibility();
    const items = makeItems(2);
    items[0].focus();
    // Home on already-first stays 0 == currentIndex -> no focus call.
    const ev = keydown("Home");
    const result = a.handleArrowNavigation(ev, items, 0);
    expect(result).toBe(0);
    // index unchanged, focus untouched by nav.
    expect(document.activeElement).toBe(items[0]);
  });
});

// ===========================================================================
// ARIA attribute builder
// ===========================================================================

describe("useAccessibility - getAriaAttributes", () => {
  it("always includes the role and omits unset options", () => {
    const a = useAccessibility();
    const attrs = a.getAriaAttributes("button");
    expect(attrs).toEqual({ role: "button" });
  });

  it("maps every provided option to the correct aria-* attribute", () => {
    const a = useAccessibility();
    const attrs = a.getAriaAttributes("menuitem", {
      label: "Save",
      labelledBy: "lbl",
      describedBy: "desc",
      expanded: true,
      selected: false,
      checked: "mixed",
      pressed: true,
      disabled: true,
      hasPopup: "menu",
      controls: "menu-1",
      owns: "owned-1",
      live: "assertive",
      atomic: true,
      relevant: "additions",
      busy: false,
      current: "page",
      invalid: true,
      required: true,
      level: 2,
      posInSet: 3,
      setSize: 9,
    });

    expect(attrs).toMatchObject({
      role: "menuitem",
      "aria-label": "Save",
      "aria-labelledby": "lbl",
      "aria-describedby": "desc",
      "aria-expanded": "true",
      "aria-selected": "false",
      "aria-checked": "mixed",
      "aria-pressed": "true",
      "aria-disabled": "true",
      "aria-haspopup": "menu",
      "aria-controls": "menu-1",
      "aria-owns": "owned-1",
      "aria-live": "assertive",
      "aria-atomic": "true",
      "aria-relevant": "additions",
      "aria-busy": "false",
      "aria-current": "page",
      "aria-invalid": "true",
      "aria-required": "true",
      "aria-level": "2",
      "aria-posinset": "3",
      "aria-setsize": "9",
    });
  });

  it("serialises boolean expanded/selected/checked via String()", () => {
    const a = useAccessibility();
    const attrs = a.getAriaAttributes("checkbox", {
      expanded: false,
      selected: true,
      checked: true,
    });
    expect(attrs["aria-expanded"]).toBe("false");
    expect(attrs["aria-selected"]).toBe("true");
    expect(attrs["aria-checked"]).toBe("true");
  });

  it("omits falsy-but-optional flags that are gated by truthiness", () => {
    const a = useAccessibility();
    // disabled:false, invalid:false, required:false, hasPopup:false are gated by
    // `if (options.x)` so they must NOT appear.
    const attrs = a.getAriaAttributes("button", {
      disabled: false,
      invalid: false,
      required: false,
      hasPopup: false,
      controls: "",
      current: false,
      level: 0,
      posInSet: 0,
      setSize: 0,
    });
    expect(attrs).toEqual({ role: "button" });
  });

  it("includes aria-busy=true only when busy is explicitly true, false when false", () => {
    const a = useAccessibility();
    expect(a.getAriaAttributes("region", { busy: true })["aria-busy"]).toBe(
      "true"
    );
    expect(a.getAriaAttributes("region", { busy: false })["aria-busy"]).toBe(
      "false"
    );
    // undefined -> omitted
    expect(a.getAriaAttributes("region")["aria-busy"]).toBeUndefined();
  });
});

// ===========================================================================
// Color contrast (canvas stubbed so parseColor can resolve RGB)
// ===========================================================================

describe("useAccessibility - contrast math", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installCanvasStub();
  });
  afterEach(() => {
    restore();
    document.body.innerHTML = "";
  });

  it("black-on-white yields the maximum 21:1 ratio", () => {
    const a = useAccessibility();
    const ratio = a.getContrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("is symmetric regardless of argument order", () => {
    const a = useAccessibility();
    const r1 = a.getContrastRatio("#000000", "#ffffff");
    const r2 = a.getContrastRatio("#ffffff", "#000000");
    expect(r1).toBeCloseTo(r2, 5);
  });

  it("identical colors give a 1:1 ratio", () => {
    const a = useAccessibility();
    expect(a.getContrastRatio("#808080", "#808080")).toBeCloseTo(1, 5);
  });

  it("returns 0 when a color cannot be parsed (canvas unavailable)", () => {
    // Temporarily undo the stub so getContext returns null again.
    restore();
    const a = useAccessibility();
    expect(a.getContrastRatio("#000000", "#ffffff")).toBe(0);
    // reinstall so afterEach restore() is balanced
    restore = installCanvasStub();
  });

  it("meetsContrastRequirement enforces AAA 7:1 for normal text", () => {
    const a = useAccessibility();
    expect(a.meetsContrastRequirement(7, "AAA", false)).toBe(true);
    expect(a.meetsContrastRequirement(6.99, "AAA", false)).toBe(false);
  });

  it("meetsContrastRequirement enforces AAA 4.5:1 for large text", () => {
    const a = useAccessibility();
    expect(a.meetsContrastRequirement(4.5, "AAA", true)).toBe(true);
    expect(a.meetsContrastRequirement(4.49, "AAA", true)).toBe(false);
  });

  it("meetsContrastRequirement enforces AA 4.5:1 normal / 3:1 large", () => {
    const a = useAccessibility();
    expect(a.meetsContrastRequirement(4.5, "AA", false)).toBe(true);
    expect(a.meetsContrastRequirement(4.49, "AA", false)).toBe(false);
    expect(a.meetsContrastRequirement(3, "AA", true)).toBe(true);
    expect(a.meetsContrastRequirement(2.99, "AA", true)).toBe(false);
  });

  it("defaults to AAA / normal text when level and largeText are omitted", () => {
    const a = useAccessibility();
    expect(a.meetsContrastRequirement(7)).toBe(true);
    expect(a.meetsContrastRequirement(5)).toBe(false);
  });
});

describe("useAccessibility - validateContrast", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installCanvasStub();
  });
  afterEach(() => {
    restore();
    document.body.innerHTML = "";
  });

  it("reports a passing AAA result for black text on a white background", () => {
    const a = useAccessibility();
    const el = document.createElement("p");
    el.style.color = "rgb(0, 0, 0)";
    el.style.backgroundColor = "rgb(255, 255, 255)";
    el.style.fontSize = "16px";
    document.body.appendChild(el);

    const result = a.validateContrast(el);
    expect(result).not.toBeNull();
    expect(result!.ratio).toBeGreaterThan(7);
    expect(result!.meetsAA).toBe(true);
    expect(result!.meetsAAA).toBe(true);
    expect(result!.foreground).toBe("rgb(0, 0, 0)");
    expect(result!.background).toBe("rgb(255, 255, 255)");
  });

  it("walks up the DOM tree for an effective background when the element is transparent", () => {
    const a = useAccessibility();
    const parent = document.createElement("div");
    parent.style.backgroundColor = "rgb(255, 255, 255)";
    const child = document.createElement("span");
    child.style.color = "rgb(0, 0, 0)";
    // Explicitly transparent so the walk-up loop condition is satisfied
    // (happy-dom reports an *unset* background as "" which would skip the loop).
    child.style.backgroundColor = "rgba(0, 0, 0, 0)";
    parent.appendChild(child);
    document.body.appendChild(parent);

    const result = a.validateContrast(child);
    expect(result).not.toBeNull();
    // Effective background resolved from the parent, not the transparent child.
    expect(result!.background).toBe("rgb(255, 255, 255)");
    expect(result!.ratio).toBeGreaterThan(7);
  });

  it("falls back to #ffffff when the background is transparent all the way up", () => {
    const a = useAccessibility();
    const el = document.createElement("span");
    el.style.color = "rgb(0, 0, 0)";
    el.style.backgroundColor = "transparent";
    document.body.appendChild(el);

    const result = a.validateContrast(el);
    expect(result).not.toBeNull();
    // No opaque ancestor background -> the "#ffffff" default is used.
    expect(result!.background).toBe("#ffffff");
    expect(result!.ratio).toBeGreaterThan(7);
  });

  it("treats large bold text with the large-text thresholds", () => {
    const a = useAccessibility();
    const el = document.createElement("p");
    el.style.color = "rgb(0, 0, 0)";
    el.style.backgroundColor = "rgb(255, 255, 255)";
    el.style.fontSize = "14px";
    el.style.fontWeight = "bold";
    document.body.appendChild(el);

    const result = a.validateContrast(el);
    // 21:1 passes both regardless, but this exercises the large-text branch.
    expect(result!.meetsAAA).toBe(true);
  });
});

// ===========================================================================
// Landmarks
// ===========================================================================

describe("useAccessibility - getLandmarks", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns an empty array when there are no landmarks", () => {
    const a = useAccessibility();
    // happy-dom's body may be empty here.
    expect(a.getLandmarks()).toEqual([]);
  });

  it("finds landmarks declared via role attributes and captures aria-label", () => {
    const a = useAccessibility();
    const nav = document.createElement("div");
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", "Primary");
    document.body.appendChild(nav);

    const landmarks = a.getLandmarks();
    const found = landmarks.find((l) => l.element === nav);
    expect(found).toBeDefined();
    expect(found!.role).toBe("navigation");
    expect(found!.label).toBe("Primary");
  });

  it("finds landmarks via semantic HTML tags and maps them to roles", () => {
    const a = useAccessibility();
    const header = document.createElement("header");
    const main = document.createElement("main");
    const aside = document.createElement("aside");
    document.body.append(header, main, aside);

    const landmarks = a.getLandmarks();
    expect(landmarks.some((l) => l.element === header && l.role === "banner")).toBe(
      true
    );
    expect(landmarks.some((l) => l.element === main && l.role === "main")).toBe(
      true
    );
    expect(
      landmarks.some((l) => l.element === aside && l.role === "complementary")
    ).toBe(true);
  });

  it("does not double-count a semantic element that also carries an explicit role", () => {
    const a = useAccessibility();
    const nav = document.createElement("nav");
    nav.setAttribute("role", "navigation");
    document.body.appendChild(nav);

    const matches = a.getLandmarks().filter((l) => l.element === nav);
    // Counted once via the role scan; the semantic scan skips it because it has a role.
    expect(matches).toHaveLength(1);
  });

  it("leaves label undefined when there is no aria-label", () => {
    const a = useAccessibility();
    const main = document.createElement("main");
    document.body.appendChild(main);
    const found = a.getLandmarks().find((l) => l.element === main);
    expect(found!.label).toBeUndefined();
  });
});

describe("useAccessibility - navigateToLandmark", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("does nothing when there are no landmarks", () => {
    const a = useAccessibility();
    expect(() => a.navigateToLandmark("next")).not.toThrow();
    expect(a.currentLandmark.value).toBeNull();
  });

  it("focuses the first landmark and records currentLandmark when none is active", () => {
    const a = useAccessibility();
    const nav = document.createElement("nav");
    // Make it focusable so focus() takes effect.
    nav.setAttribute("tabindex", "-1");
    const main = document.createElement("main");
    main.setAttribute("tabindex", "-1");
    document.body.append(nav, main);

    a.navigateToLandmark("next");
    expect(a.currentLandmark.value).toBe("navigation");
    expect(document.activeElement).toBe(nav);
  });

  it("moves to the next landmark relative to the active one and wraps around", () => {
    const a = useAccessibility();
    const nav = document.createElement("nav");
    nav.setAttribute("tabindex", "-1");
    const main = document.createElement("main");
    main.setAttribute("tabindex", "-1");
    document.body.append(nav, main);

    // Put focus in the first landmark.
    nav.focus();
    a.navigateToLandmark("next");
    expect(a.currentLandmark.value).toBe("main");
    expect(document.activeElement).toBe(main);

    // From the last landmark, 'next' wraps to the first.
    a.navigateToLandmark("next");
    expect(a.currentLandmark.value).toBe("navigation");
    expect(document.activeElement).toBe(nav);
  });

  it("'previous' wraps from the first landmark to the last", () => {
    const a = useAccessibility();
    const nav = document.createElement("nav");
    nav.setAttribute("tabindex", "-1");
    const main = document.createElement("main");
    main.setAttribute("tabindex", "-1");
    document.body.append(nav, main);

    nav.focus();
    a.navigateToLandmark("previous");
    expect(a.currentLandmark.value).toBe("main");
    expect(document.activeElement).toBe(main);
  });

  it("emits a 'Navigating to ... landmark' announcement using the label when present", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    const nav = document.createElement("nav");
    nav.setAttribute("tabindex", "-1");
    nav.setAttribute("aria-label", "Primary nav");
    document.body.appendChild(nav);

    a.navigateToLandmark("next");
    // setFocus announce uses delay 100.
    vi.advanceTimersByTime(100);
    expect(a.getAnnouncements("polite")).toContain(
      "Navigating to Primary nav landmark"
    );
  });

  it("falls back to the role in the announcement when no label is set", () => {
    vi.useFakeTimers();
    const a = useAccessibility();
    const main = document.createElement("main");
    main.setAttribute("tabindex", "-1");
    document.body.appendChild(main);

    a.navigateToLandmark("next");
    vi.advanceTimersByTime(100);
    expect(a.getAnnouncements("polite")).toContain(
      "Navigating to main landmark"
    );
  });
});

// ===========================================================================
// User preferences + lifecycle (mounted so onMounted registers listeners)
// ===========================================================================

describe("useAccessibility - user preferences and lifecycle", () => {
  let originalMatchMedia: typeof window.matchMedia;
  interface FakeMQL {
    media: string;
    matches: boolean;
    listeners: Array<(e: MediaQueryListEvent) => void>;
    addEventListener: (t: string, cb: (e: MediaQueryListEvent) => void) => void;
    removeEventListener: (
      t: string,
      cb: (e: MediaQueryListEvent) => void
    ) => void;
  }
  let queries: Map<string, FakeMQL>;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    queries = new Map();
    const factory = (media: string): FakeMQL => {
      let mql = queries.get(media);
      if (!mql) {
        mql = {
          media,
          matches: false,
          listeners: [],
          addEventListener(_t, cb) {
            this.listeners.push(cb);
          },
          removeEventListener(_t, cb) {
            this.listeners = this.listeners.filter((l) => l !== cb);
          },
        };
        queries.set(media, mql);
      }
      return mql;
    };
    window.matchMedia = factory as unknown as typeof window.matchMedia;
    (globalThis as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
      factory as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    (globalThis as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
      originalMatchMedia;
    document.body.innerHTML = "";
  });

  function fire(media: string, matches: boolean) {
    const mql = queries.get(media)!;
    mql.matches = matches;
    mql.listeners.forEach((l) =>
      l({ matches } as MediaQueryListEvent)
    );
  }

  function mountAccessibility() {
    let api!: ReturnType<typeof useAccessibility>;
    const Comp = defineComponent({
      setup() {
        api = useAccessibility();
        return () => null;
      },
    });
    const wrapper = mount(Comp);
    return { api, wrapper };
  }

  it("exposes initial preference state derived from matchMedia", () => {
    // All fakes report matches:false initially.
    const { api, wrapper } = mountAccessibility();
    expect(api.prefersReducedMotion.value).toBe(false);
    expect(api.prefersHighContrast.value).toBe(false);
    expect(api.prefersColorScheme.value).toBe("light");
    wrapper.unmount();
  });

  it("updates prefersReducedMotion and announces when the media query changes", () => {
    const { api, wrapper } = mountAccessibility();
    fire("(prefers-reduced-motion: reduce)", true);
    expect(api.prefersReducedMotion.value).toBe(true);
    expect(api.getAnnouncements("polite")).toContain(
      "Animations disabled for reduced motion"
    );

    fire("(prefers-reduced-motion: reduce)", false);
    expect(api.prefersReducedMotion.value).toBe(false);
    expect(api.getAnnouncements("polite")).toContain("Animations enabled");
    wrapper.unmount();
  });

  it("updates prefersHighContrast and announces on change", () => {
    const { api, wrapper } = mountAccessibility();
    fire("(prefers-contrast: more)", true);
    expect(api.prefersHighContrast.value).toBe(true);
    expect(api.getAnnouncements("polite")).toContain(
      "High contrast mode enabled"
    );

    fire("(prefers-contrast: more)", false);
    expect(api.prefersHighContrast.value).toBe(false);
    expect(api.getAnnouncements("polite")).toContain("Standard contrast mode");
    wrapper.unmount();
  });

  it("initialises prefersColorScheme to 'dark' when the OS reports dark mode", () => {
    // Pre-seed the dark query so the constructor reads matches:true at init
    // (exercises the "dark" side of the color-scheme ternary).
    const darkMedia = "(prefers-color-scheme: dark)";
    const seeded: FakeMQL = {
      media: darkMedia,
      matches: true,
      listeners: [],
      addEventListener(_t, cb) {
        this.listeners.push(cb);
      },
      removeEventListener(_t, cb) {
        this.listeners = this.listeners.filter((l) => l !== cb);
      },
    };
    queries.set(darkMedia, seeded);

    const { api, wrapper } = mountAccessibility();
    expect(api.prefersColorScheme.value).toBe("dark");
    wrapper.unmount();
  });

  it("updates prefersColorScheme without announcing", () => {
    const { api, wrapper } = mountAccessibility();
    fire("(prefers-color-scheme: dark)", true);
    expect(api.prefersColorScheme.value).toBe("dark");
    // No announcement text for color scheme changes.
    expect(api.getAnnouncements("polite")).toBe("");

    fire("(prefers-color-scheme: dark)", false);
    expect(api.prefersColorScheme.value).toBe("light");
    wrapper.unmount();
  });

  it("registers change listeners on mount for all three queries", () => {
    const { wrapper } = mountAccessibility();
    expect(
      queries.get("(prefers-reduced-motion: reduce)")!.listeners.length
    ).toBeGreaterThanOrEqual(1);
    expect(
      queries.get("(prefers-contrast: more)")!.listeners.length
    ).toBeGreaterThanOrEqual(1);
    expect(
      queries.get("(prefers-color-scheme: dark)")!.listeners.length
    ).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });

  it("clears announcements on unmount", () => {
    const { api, wrapper } = mountAccessibility();
    api.announce("will be cleared");
    expect(api.announcements.value.length).toBeGreaterThan(0);
    wrapper.unmount();
    expect(api.announcements.value).toHaveLength(0);
  });

  it("releases an active focus trap on unmount", async () => {
    const { api, wrapper } = mountAccessibility();
    const container = document.createElement("div");
    const btn = document.createElement("button");
    container.appendChild(btn);
    document.body.appendChild(container);

    api.trapFocus(container);
    await nextTick();
    expect(api.focusTrapActive.value).toBe(true);

    wrapper.unmount();
    expect(api.focusTrapActive.value).toBe(false);
  });
});

// ===========================================================================
// Screen reader detection (exercised indirectly through mount -> onMounted)
// ===========================================================================

describe("useAccessibility - screenReaderActive detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountAccessibility() {
    let api!: ReturnType<typeof useAccessibility>;
    const Comp = defineComponent({
      setup() {
        api = useAccessibility();
        return () => null;
      },
    });
    const wrapper = mount(Comp);
    return { api, wrapper };
  }

  it("flags a screen reader as active when an aria-live region exists", () => {
    const live = document.createElement("div");
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);

    const { api, wrapper } = mountAccessibility();
    expect(api.screenReaderActive.value).toBe(true);
    wrapper.unmount();
  });

  it("flags a screen reader as active when sr-only text exists", () => {
    const sr = document.createElement("span");
    sr.className = "sr-only";
    document.body.appendChild(sr);

    const { api, wrapper } = mountAccessibility();
    expect(api.screenReaderActive.value).toBe(true);
    wrapper.unmount();
  });

  it("leaves screenReaderActive false with no detectable markers", () => {
    // Ensure the body has no aria-live / sr-only markers.
    document.body.innerHTML = "";
    const { api, wrapper } = mountAccessibility();
    expect(api.screenReaderActive.value).toBe(false);
    wrapper.unmount();
  });
});
