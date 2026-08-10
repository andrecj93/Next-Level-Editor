import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import FloatingToolbar from "../FloatingToolbar.vue";

// FloatingToolbar has NO coords props: it computes its own position from
// window.getSelection() -> Range.getBoundingClientRect(). happy-dom ships no
// layout engine, so that rect is always 0x0 and the toolbar could never appear.
// The ONE unavoidable mock is therefore getSelection: we hand the component a
// real Selection-shaped object whose range returns a rect WE control, then
// assert the component's REAL behaviour through it (visibility gate, the exact
// px math in updatePosition, the reposition-on-event wiring). Everything else —
// button rendering, click callbacks, active state — is driven with real DOM.
//
// Teleport is stubbed so the bubble renders inside the wrapper (query-able with
// wrapper.find). Transition is stubbed so v-if enter/leave is synchronous
// (happy-dom never fires transitionend, so an un-stubbed leave would linger).

interface ToolbarAction {
  id: string;
  label: string;
  tooltip: string;
  icon?: string;
  onClick: () => void;
  isActive?: () => boolean;
}

// The live selection the stubbed window.getSelection() returns. Tests mutate
// this to simulate "no selection", "empty selection" and "selection with rect".
let selectionValue: Selection | null = null;

const rectSelection = (rect: Partial<DOMRect>): Selection => {
  const full = {
    top: 0, left: 0, right: 0, bottom: 0,
    width: 0, height: 0, x: 0, y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect;
  return {
    rangeCount: 1,
    getRangeAt: () => ({ getBoundingClientRect: () => full } as unknown as Range),
  } as unknown as Selection;
};

const EMPTY_SELECTION = { rangeCount: 0 } as unknown as Selection;

// Mirrors updatePosition()'s math so assertions stay robust to happy-dom's
// scroll/innerWidth defaults instead of hard-coding pixels.
const expectedPos = (rect: Partial<DOMRect>) => {
  const top = Math.max(10, (rect.top ?? 0) + window.scrollY - 50);
  const left = Math.max(
    10,
    Math.min((rect.left ?? 0) + window.scrollX + (rect.width ?? 0) / 2, window.innerWidth - 300)
  );
  return { top: `${top}px`, left: `${left}px` };
};

const makeActions = (): ToolbarAction[] => [
  {
    id: "bold",
    label: "Bold",
    tooltip: "Bold (Ctrl+B)",
    icon: '<svg data-testid="bold-svg"><path/></svg>',
    onClick: vi.fn(),
    isActive: () => true,
  },
  {
    id: "italic",
    label: "Italic",
    tooltip: "Italic (Ctrl+I)",
    icon: '<svg data-testid="italic-svg"></svg>',
    onClick: vi.fn(),
    isActive: () => false,
  },
  // No icon (label-fallback path) and no isActive (never active).
  { id: "link", label: "Link", tooltip: "Insert link", onClick: vi.fn() },
];

// Track every wrapper so we can unmount them; the component registers window +
// document listeners in onMounted, and a leaked instance would react to events
// dispatched by later tests.
const mounted: ReturnType<typeof mount>[] = [];

const mountToolbar = (props: { show: boolean; actions: ToolbarAction[] }) => {
  const w = mount(FloatingToolbar, {
    props,
    global: { stubs: { teleport: true, transition: true } },
  });
  mounted.push(w);
  return w;
};

const flushShowTimer = () => new Promise((r) => setTimeout(r, 15));

// Mount hidden then flip show:false -> true, which is the real trigger path:
// the watch fires and schedules setTimeout(updatePosition, 10).
const mountVisible = async (opts: { rect?: Partial<DOMRect>; actions?: ToolbarAction[] } = {}) => {
  const rect = opts.rect ?? { top: 100, left: 200, width: 80, height: 20 };
  const actions = opts.actions ?? makeActions();
  selectionValue = rectSelection(rect);
  const w = mountToolbar({ show: false, actions });
  await w.setProps({ show: true });
  await flushShowTimer();
  await nextTick();
  return { w, actions, rect };
};

beforeEach(() => {
  selectionValue = null;
  vi.spyOn(window, "getSelection").mockImplementation(() => selectionValue);
});

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  vi.restoreAllMocks();
});

describe("FloatingToolbar", () => {
  describe("visibility gate (show + a resolvable position)", () => {
    it("renders nothing while show is false", async () => {
      selectionValue = rectSelection({ top: 100, left: 200, width: 80, height: 20 });
      const w = mountToolbar({ show: false, actions: makeActions() });
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("renders nothing on initial mount even with show:true (watch only fires on change)", async () => {
      // The watch is not immediate, so a component mounted already-shown has a
      // null position and stays hidden until something recomputes it.
      selectionValue = rectSelection({ top: 100, left: 200, width: 80, height: 20 });
      const w = mountToolbar({ show: true, actions: makeActions() });
      await flushShowTimer();
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("appears when show flips false->true over a non-empty selection", async () => {
      const { w } = await mountVisible();
      expect(w.find(".floating-toolbar").exists()).toBe(true);
    });

    it("stays hidden when show is true but there is no selection", async () => {
      selectionValue = null;
      const w = mountToolbar({ show: false, actions: makeActions() });
      await w.setProps({ show: true });
      await flushShowTimer();
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("stays hidden when the selection has no ranges (rangeCount 0)", async () => {
      selectionValue = EMPTY_SELECTION;
      const w = mountToolbar({ show: false, actions: makeActions() });
      await w.setProps({ show: true });
      await flushShowTimer();
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("stays hidden when the selection rect is empty (0x0 — a collapsed caret)", async () => {
      selectionValue = rectSelection({ top: 100, left: 200, width: 0, height: 0 });
      const w = mountToolbar({ show: false, actions: makeActions() });
      await w.setProps({ show: true });
      await flushShowTimer();
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("hides again when show goes true->false (position is cleared)", async () => {
      const { w } = await mountVisible();
      expect(w.find(".floating-toolbar").exists()).toBe(true);
      await w.setProps({ show: false });
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });
  });

  describe("positioning (real updatePosition math)", () => {
    it("anchors above and horizontally centred on the selection rect", async () => {
      const rect = { top: 100, left: 200, width: 80, height: 20 };
      const { w } = await mountVisible({ rect });
      const el = w.get(".floating-toolbar").element as HTMLElement;
      const { top, left } = expectedPos(rect);
      expect(el.style.top).toBe(top); // rect.top - 50
      expect(el.style.left).toBe(left); // rect.left + width/2
    });

    // The clamp math changed with the measured-width positioning fix: `left`
    // is the bubble CENTER (translateX(-50%)), clamped so the bubble's real
    // edges stay inside the viewport, and a selection near the viewport top
    // FLIPS the bubble below instead of clamping it over the text. The full
    // matrix lives in FloatingToolbar.positioning.test.ts; these document the
    // rendered wiring.
    it("flips BELOW the selection near the viewport top (is-below arrow)", async () => {
      const rect = { top: 5, left: 300, width: 40, height: 18 };
      const { w } = await mountVisible({ rect });
      const el = w.get(".floating-toolbar").element as HTMLElement;
      // top 5 < FLIP_THRESHOLD 60 -> placed below at rect.bottom + scrollY +
      // 8. (This suite's rect stub carries no computed `bottom`, so it reads
      // as 0 -> "8px"; the exact-geometry matrix lives in
      // FloatingToolbar.positioning.test.ts.)
      expect(el.classList.contains("is-below")).toBe(true);
      expect(el.style.top).toBe("8px");
    });

    it("keeps the bubble's LEFT EDGE on-screen for a selection near the viewport left", async () => {
      const rect = { top: 400, left: -1000, width: 0, height: 18 };
      const { w } = await mountVisible({ rect });
      const el = w.get(".floating-toolbar").element as HTMLElement;
      // Unmeasurable in happy-dom -> ESTIMATED_WIDTH 240; the CENTER is
      // clamped to halfWidth + margin = 120 + 10.
      expect(el.style.left).toBe("130px");
    });

    it("keeps the bubble's RIGHT EDGE on-screen for a selection near the viewport right", async () => {
      const rect = { top: 400, left: 100000, width: 0, height: 18 };
      const { w } = await mountVisible({ rect });
      const el = w.get(".floating-toolbar").element as HTMLElement;
      // CENTER clamped to innerWidth - halfWidth(120) - margin(10).
      expect(el.style.left).toBe(`${window.innerWidth - 130}px`);
    });

    it("recomputes position on window resize while shown (follows the selection)", async () => {
      const { w } = await mountVisible({ rect: { top: 100, left: 200, width: 80, height: 20 } });
      const el = w.get(".floating-toolbar").element as HTMLElement;
      expect(el.style.top).toBe("50px");

      // Selection moved; a resize should re-run updatePosition via handleResize.
      selectionValue = rectSelection({ top: 300, left: 400, width: 60, height: 20 });
      window.dispatchEvent(new Event("resize"));
      await nextTick();

      const moved = expectedPos({ top: 300, left: 400, width: 60 });
      expect(el.style.top).toBe(moved.top); // 300 - 50 = 250
      expect(el.style.left).toBe(moved.left); // 400 + 30 = 430
    });

    it("recomputes position on a selectionchange event while shown", async () => {
      const { w } = await mountVisible({ rect: { top: 100, left: 200, width: 80, height: 20 } });
      const el = w.get(".floating-toolbar").element as HTMLElement;

      selectionValue = rectSelection({ top: 500, left: 250, width: 100, height: 20 });
      document.dispatchEvent(new Event("selectionchange"));
      await nextTick();

      const moved = expectedPos({ top: 500, left: 250, width: 100 });
      expect(el.style.top).toBe(moved.top);
      expect(el.style.left).toBe(moved.left);
    });

    it("hides when a reposition event finds the selection collapsed to nothing", async () => {
      const { w } = await mountVisible();
      expect(w.find(".floating-toolbar").exists()).toBe(true);

      // Selection collapsed -> rect 0x0 -> position null -> toolbar gone.
      selectionValue = rectSelection({ top: 100, left: 200, width: 0, height: 0 });
      window.dispatchEvent(new Event("scroll"));
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });

    it("does NOT reposition on events while hidden (handleResize is gated on show)", async () => {
      selectionValue = rectSelection({ top: 100, left: 200, width: 80, height: 20 });
      const w = mountToolbar({ show: false, actions: makeActions() });
      window.dispatchEvent(new Event("resize"));
      await nextTick();
      expect(w.find(".floating-toolbar").exists()).toBe(false);
    });
  });

  describe("action buttons", () => {
    it("renders one button per action with aria-label + title from the action", async () => {
      const { w, actions } = await mountVisible();
      const btns = w.findAll(".floating-btn");
      expect(btns).toHaveLength(actions.length);
      actions.forEach((action, i) => {
        expect(btns[i].attributes("aria-label")).toBe(action.label);
        expect(btns[i].attributes("title")).toBe(action.tooltip);
      });
    });

    it("renders the action icon via v-html when present", async () => {
      const { w } = await mountVisible();
      const bold = w.get('[aria-label="Bold"]');
      expect(bold.html()).toContain('data-testid="bold-svg"');
      expect(bold.find("svg").exists()).toBe(true);
    });

    it("falls back to the label text when an action has no icon", async () => {
      const { w } = await mountVisible();
      const link = w.get('[aria-label="Link"]');
      expect(link.find("svg").exists()).toBe(false);
      expect(link.text()).toBe("Link");
    });

    it("reflects each action's active state as the .active class", async () => {
      const { w } = await mountVisible();
      // bold.isActive() => true, italic.isActive() => false, link has no isActive
      expect(w.get('[aria-label="Bold"]').classes()).toContain("active");
      expect(w.get('[aria-label="Italic"]').classes()).not.toContain("active");
      expect(w.get('[aria-label="Link"]').classes()).not.toContain("active");
    });

    it("re-renders active state when the underlying formatting flag changes", async () => {
      const boldOn = ref(false);
      const actions: ToolbarAction[] = [
        {
          id: "bold",
          label: "Bold",
          tooltip: "Bold",
          icon: "<svg></svg>",
          onClick: vi.fn(),
          isActive: () => boldOn.value,
        },
      ];
      const { w } = await mountVisible({ actions });
      const bold = () => w.get('[aria-label="Bold"]');
      expect(bold().classes()).not.toContain("active");

      // isActive() reads boldOn during render, so mutating it re-renders.
      boldOn.value = true;
      await nextTick();
      expect(bold().classes()).toContain("active");
    });
  });

  describe("invoking actions", () => {
    it("runs an action's onClick when its button is clicked", async () => {
      const { w, actions } = await mountVisible();
      await w.get('[aria-label="Bold"]').trigger("click");
      expect(actions[0].onClick).toHaveBeenCalledTimes(1);
      // other actions untouched
      expect(actions[1].onClick).not.toHaveBeenCalled();
      expect(actions[2].onClick).not.toHaveBeenCalled();
    });

    it("wires each button to its own action independently", async () => {
      const { w, actions } = await mountVisible();
      await w.get('[aria-label="Italic"]').trigger("click");
      await w.get('[aria-label="Link"]').trigger("click");
      expect(actions[0].onClick).not.toHaveBeenCalled();
      expect(actions[1].onClick).toHaveBeenCalledTimes(1);
      expect(actions[2].onClick).toHaveBeenCalledTimes(1);
    });

    it("prevents default on mousedown so the text selection survives the click", async () => {
      const { w } = await mountVisible();
      const el = w.get(".floating-toolbar").element as HTMLElement;
      const ev = new Event("mousedown", { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("removes its window + document listeners on unmount", async () => {
      const winRemove = vi.spyOn(window, "removeEventListener");
      const docRemove = vi.spyOn(document, "removeEventListener");
      const { w } = await mountVisible();
      w.unmount();
      // pop the reference we just manually unmounted so afterEach doesn't double-unmount
      mounted.pop();

      expect(winRemove).toHaveBeenCalledWith("resize", expect.any(Function));
      expect(winRemove).toHaveBeenCalledWith("scroll", expect.any(Function), true);
      expect(docRemove).toHaveBeenCalledWith("selectionchange", expect.any(Function));
    });
  });
});
