import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PlayheadPill from "../PlayheadPill.vue";
import type {
  PlayheadState,
  PlayheadMenuItem,
} from "../PlayheadPill.types";
import type { ToolbarAction } from "../../types/toolbar";

// PlayheadPill is purely presentational: the host owns the state machine and
// all geometry (anchorRect / selectionPosition), so these tests drive it
// entirely through props and assert the rendered contract — which layer is
// live, the transform the geometry produces, menu open/close mechanics, and
// the remember-selection emit. Teleport is stubbed so the pill renders inside
// the wrapper (query-able); Transition is stubbed so menu v-if enter/leave is
// synchronous (happy-dom never fires transitionend).

const makeInlineActions = (): ToolbarAction[] => [
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
    icon: "<svg></svg>",
    onClick: vi.fn(),
    isActive: () => false,
  },
  // No icon (label-fallback path), no isActive, plus a disabled gate.
  {
    id: "link",
    label: "Link",
    tooltip: "Insert link",
    onClick: vi.fn(),
    isDisabled: () => true,
  },
];

const makeMenuItems = (prefix: string): PlayheadMenuItem[] => [
  {
    id: `${prefix}-one`,
    label: `${prefix} one`,
    icon: "<svg></svg>",
    onClick: vi.fn(),
  },
  { divider: true },
  {
    id: `${prefix}-two`,
    label: `${prefix} two`,
    shortcut: "Ctrl+K",
    onClick: vi.fn(),
    isActive: () => true,
  },
];

interface MountOverrides {
  state?: PlayheadState;
  anchorRect?: {
    top: number;
    left: number;
    width: number;
    bottom?: number;
  } | null;
  selectionPosition?: { top: number; left: number; below: boolean } | null;
  formatLabel?: string;
  wordCount?: number;
  isSaving?: boolean;
  inlineActions?: ToolbarAction[];
  formatItems?: PlayheadMenuItem[];
  insertItems?: PlayheadMenuItem[];
  overflowItems?: PlayheadMenuItem[];
  alignmentItems?: PlayheadMenuItem[];
  sizeItems?: PlayheadMenuItem[];
  listActions?: ToolbarAction[];
  textColorPresets?: string[];
  highlightColorPresets?: string[];
  textColor?: string;
  backgroundColor?: string;
  theme?: string;
}

// Track wrappers for teardown: the component registers document listeners in
// onMounted, and a leaked instance would react to later tests' events.
const mounted: ReturnType<typeof mount>[] = [];

const mountPill = (overrides: MountOverrides = {}) => {
  const inlineActions = overrides.inlineActions ?? makeInlineActions();
  const formatItems = overrides.formatItems ?? makeMenuItems("format");
  const insertItems = overrides.insertItems ?? makeMenuItems("insert");
  const overflowItems = overrides.overflowItems ?? makeMenuItems("overflow");
  const w = mount(PlayheadPill, {
    props: {
      state: "ambient" as PlayheadState,
      anchorRect: { top: 40, left: 100, width: 600 },
      selectionPosition: null,
      formatLabel: "Paragraph",
      wordCount: 42,
      isSaving: false,
      ...overrides,
      inlineActions,
      formatItems,
      insertItems,
      overflowItems,
    },
    global: { stubs: { teleport: true, transition: true } },
  });
  mounted.push(w);
  return { w, inlineActions, formatItems, insertItems, overflowItems };
};

const layer = (w: ReturnType<typeof mount>, name: string) =>
  w.get(`.layer-${name}`);

/** Two post-mount frames arm the transitions (the mount-settle guard). */
const settle = async () => {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
  await nextTick();
};

const tabIndexOf = (w: ReturnType<typeof mount>, selector: string): number =>
  (w.get(selector).element as HTMLButtonElement).tabIndex;

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  vi.restoreAllMocks();
});

describe("PlayheadPill", () => {
  describe("state layers (two-layer crossfade, all pre-rendered)", () => {
    it("pre-renders all three layers regardless of state", () => {
      const { w } = mountPill({ state: "ambient" });
      expect(w.find(".layer-ambient").exists()).toBe(true);
      expect(w.find(".layer-home").exists()).toBe(true);
      expect(w.find(".layer-selection").exists()).toBe(true);
    });

    it("ambient: shows the word count and the save dot, layer is-active", () => {
      const { w } = mountPill({ state: "ambient", wordCount: 42 });
      const ambient = layer(w, "ambient");
      expect(ambient.classes()).toContain("is-active");
      expect(ambient.text()).toContain("42 words");
      expect(ambient.find(".playhead-dot").exists()).toBe(true);
      // inactive layers are hidden from AT and inert
      expect(layer(w, "home").attributes("aria-hidden")).toBe("true");
      expect(layer(w, "home").attributes("inert")).toBeDefined();
      expect(layer(w, "selection").attributes("aria-hidden")).toBe("true");
      // the ACTIVE ambient layer is neither hidden nor inert — it holds a
      // real control
      expect(ambient.attributes("aria-hidden")).toBeUndefined();
      expect(ambient.attributes("inert")).toBeUndefined();
    });

    it("singularizes the word count label", () => {
      const { w } = mountPill({ state: "ambient", wordCount: 1 });
      expect(layer(w, "ambient").text()).toContain("1 word");
      expect(layer(w, "ambient").text()).not.toContain("1 words");
    });

    it("pulses the save dot while isSaving", async () => {
      const { w } = mountPill({ state: "ambient", isSaving: false });
      expect(w.get(".playhead-dot").classes()).not.toContain("is-saving");
      await w.setProps({ isSaving: true });
      expect(w.get(".playhead-dot").classes()).toContain("is-saving");
    });

    it("home: shows the serif Format label, inline actions, insert + and overflow triggers", () => {
      const { w } = mountPill({ state: "home", formatLabel: "Heading 2" });
      const home = layer(w, "home");
      expect(home.classes()).toContain("is-active");
      expect(home.attributes("aria-hidden")).toBeUndefined();
      expect(home.get(".playhead-format-label").text()).toBe("Heading 2");
      // inline formatting set
      expect(home.find('[aria-label="Bold"]').exists()).toBe(true);
      expect(home.find('[aria-label="Italic"]').exists()).toBe(true);
      expect(home.find('[aria-label="Link"]').exists()).toBe(true);
      // menu triggers
      expect(home.find('[aria-label="Insert"]').exists()).toBe(true);
      expect(home.find('[aria-label="More options"]').exists()).toBe(true);
    });

    it("home: renders listActions inline after the inline formatting set", () => {
      const bulletClick = vi.fn();
      const { w } = mountPill({
        state: "home",
        listActions: [
          {
            id: "bullet-list",
            label: "Bullet list",
            tooltip: "Bullet list",
            icon: "<svg></svg>",
            onClick: bulletClick,
            isActive: () => true,
          },
          {
            id: "numbered-list",
            label: "Numbered list",
            tooltip: "Numbered list",
            onClick: vi.fn(),
          },
        ],
      });
      const home = layer(w, "home");
      const bullet = home.get('[aria-label="Bullet list"]');
      expect(bullet.classes()).toContain("active");
      expect(home.find('[aria-label="Numbered list"]').exists()).toBe(true);
      // ordering: list toggles come after the inline set
      const labels = home
        .findAll(".playhead-btn")
        .map((b) => b.attributes("aria-label"));
      expect(labels).toEqual([
        "Bold",
        "Italic",
        "Link",
        "Bullet list",
        "Numbered list",
      ]);
      bullet.trigger("click");
      expect(bulletClick).toHaveBeenCalledTimes(1);
    });

    it("selection: shows the inline formatting set, layer is-active", () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 220, left: 333, below: false },
      });
      const sel = layer(w, "selection");
      expect(sel.classes()).toContain("is-active");
      expect(sel.find('[aria-label="Bold"]').exists()).toBe(true);
      expect(sel.find('[aria-label="Italic"]').exists()).toBe(true);
      expect(sel.find('[aria-label="Link"]').exists()).toBe(true);
      // ambient/home are parked
      expect(layer(w, "ambient").classes()).not.toContain("is-active");
      expect(layer(w, "home").classes()).not.toContain("is-active");
    });

    it("a state prop change swaps the is-active layer and data-state", async () => {
      const { w } = mountPill({ state: "ambient" });
      expect(w.get(".playhead").attributes("data-state")).toBe("ambient");
      await w.setProps({ state: "home" });
      expect(w.get(".playhead").attributes("data-state")).toBe("home");
      expect(layer(w, "home").classes()).toContain("is-active");
      expect(layer(w, "ambient").classes()).not.toContain("is-active");
      expect(layer(w, "ambient").attributes("aria-hidden")).toBe("true");
    });

    it("reflects active formatting as accent .active + aria-pressed, and isDisabled as disabled", () => {
      const { w } = mountPill({ state: "home" });
      const home = layer(w, "home");
      const bold = home.get('[aria-label="Bold"]');
      expect(bold.classes()).toContain("active");
      expect(bold.attributes("aria-pressed")).toBe("true");
      expect(home.get('[aria-label="Italic"]').classes()).not.toContain(
        "active"
      );
      expect(
        home.get('[aria-label="Link"]').attributes("disabled")
      ).toBeDefined();
    });

    it("runs an action's own onClick handler on click", async () => {
      const { w, inlineActions } = mountPill({ state: "home" });
      await layer(w, "home").get('[aria-label="Bold"]').trigger("click");
      expect(inlineActions[0].onClick).toHaveBeenCalledTimes(1);
      expect(inlineActions[1].onClick).not.toHaveBeenCalled();
    });
  });

  describe("ambient expand affordance (real button, keyboard-reachable)", () => {
    it("the ambient lozenge is a focusable button labelled 'Show toolbar'", () => {
      const { w } = mountPill({ state: "ambient" });
      const btn = w.get(".playhead-ambient-btn");
      expect(btn.element.tagName).toBe("BUTTON");
      expect(btn.attributes("aria-label")).toBe("Show toolbar");
      // it is the ambient layer's roving Tab stop
      expect((btn.element as HTMLButtonElement).tabIndex).toBe(0);
    });

    it("clicking the lozenge emits expand", async () => {
      const { w } = mountPill({ state: "ambient" });
      await w.get(".playhead-ambient-btn").trigger("click");
      expect(w.emitted("expand")).toHaveLength(1);
    });

    it("focusing the lozenge emits expand (keyboard restore path)", async () => {
      const { w } = mountPill({ state: "ambient" });
      await w.get(".playhead-ambient-btn").trigger("focus");
      expect(w.emitted("expand")).toHaveLength(1);
    });
  });

  describe("positioning (everything through transform)", () => {
    it("ambient/home: centers over the anchorRect, 12px below its top edge", () => {
      const { w } = mountPill({
        state: "home",
        anchorRect: { top: 40, left: 100, width: 600 },
      });
      const el = w.get(".playhead").element as HTMLElement;
      // x = left + width/2 = 400, y = top + 12 = 52; centered via translateX(-50%)
      expect(el.style.transform).toBe(
        "translate3d(400px, 52px, 0) translateX(-50%)"
      );
      expect(el.style.top).toBe("");
      expect(el.style.left).toBe("");
    });

    it("selection: selectionPosition drives the transform verbatim", () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 220, left: 333, below: false },
      });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(333px, 220px, 0) translateX(-50%)"
      );
    });

    it("marks the flipped placement with is-below", async () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 30, left: 200, below: true },
      });
      expect(w.get(".playhead").classes()).toContain("is-below");
      await w.setProps({
        selectionPosition: { top: 220, left: 200, below: false },
      });
      expect(w.get(".playhead").classes()).not.toContain("is-below");
    });

    it("selection state without a selectionPosition falls back to the anchor", () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: null,
        anchorRect: { top: 40, left: 100, width: 600 },
      });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(400px, 52px, 0) translateX(-50%)"
      );
    });

    it("renders nothing without any geometry (no anchorRect, no selectionPosition)", () => {
      const { w } = mountPill({ anchorRect: null, selectionPosition: null });
      expect(w.find(".playhead").exists()).toBe(false);
    });
  });

  describe("viewport clamping (ambient/home)", () => {
    it("clamps y to the viewport top edge when the editor top scrolls offscreen", () => {
      const { w } = mountPill({
        state: "home",
        anchorRect: { top: -100, left: 100, width: 600 },
      });
      const el = w.get(".playhead").element as HTMLElement;
      // y = max(-100 + 12, EDGE_MARGIN 10) = 10 — the pill parks at the edge
      expect(el.style.transform).toBe(
        "translate3d(400px, 10px, 0) translateX(-50%)"
      );
    });

    it("clamps x so the pill center never leaves the viewport gutter", () => {
      const { w } = mountPill({
        state: "home",
        // raw center = -400; with an unmeasurable (0) width the clamp floor
        // is EDGE_MARGIN
        anchorRect: { top: 40, left: -500, width: 200 },
      });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(10px, 52px, 0) translateX(-50%)"
      );
    });

    it("clamps x using the MEASURED pill width (right edge)", async () => {
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
        400
      );
      const { w } = mountPill({
        state: "home",
        // raw center = 1000; viewport (happy-dom) = 1024 wide
        anchorRect: { top: 40, left: 700, width: 600 },
      });
      await nextTick(); // measurement lands after mount
      const el = w.get(".playhead").element as HTMLElement;
      // max center = 1024 - 400/2 - 10 = 814
      expect(el.style.transform).toBe(
        "translate3d(814px, 52px, 0) translateX(-50%)"
      );
    });

    it("a pill wider than the viewport is simply centered", async () => {
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
        2000
      );
      const { w } = mountPill({
        state: "home",
        anchorRect: { top: 40, left: 700, width: 600 },
      });
      await nextTick();
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(512px, 52px, 0) translateX(-50%)"
      );
    });

    it("stays parked (visible) while the editor bottom is within the exit grace", () => {
      const { w } = mountPill({
        state: "home",
        anchorRect: { top: -3000, left: 100, width: 600, bottom: -10 },
      });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(400px, 10px, 0) translateX(-50%)"
      );
    });

    it("hides entirely once the editor rect is fully above the viewport past the grace", () => {
      const { w } = mountPill({
        state: "home",
        anchorRect: { top: -3000, left: 100, width: 600, bottom: -30 },
      });
      expect(w.find(".playhead").exists()).toBe(false);
    });

    it("selection state is exempt from the anchor clamp (host clamps it)", () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 5, left: 5, below: true },
      });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(5px, 5px, 0) translateX(-50%)"
      );
    });
  });

  describe("mount-settle guard (nothing animates on mount)", () => {
    it("has no is-settled morph class on initial mount", () => {
      const { w } = mountPill({ state: "home" });
      expect(w.get(".playhead").classes()).not.toContain("is-settled");
    });

    it("arms transitions (is-settled) only after the post-mount frames", async () => {
      const { w } = mountPill({ state: "home" });
      await settle();
      expect(w.get(".playhead").classes()).toContain("is-settled");
    });
  });

  describe("travel vs scroll tracking (is-traveling)", () => {
    it("a state morph arms is-traveling; scroll-driven anchor refreshes do not", async () => {
      const { w } = mountPill({ state: "home" });
      await settle();
      // scroll-follow: same state, new anchor — must reposition INSTANTLY
      await w.setProps({ anchorRect: { top: 10, left: 100, width: 600 } });
      const el = w.get(".playhead").element as HTMLElement;
      expect(el.style.transform).toBe(
        "translate3d(400px, 22px, 0) translateX(-50%)"
      );
      expect(w.get(".playhead").classes()).not.toContain("is-traveling");
      // logical target change: state morph — travel eases
      await w.setProps({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      expect(w.get(".playhead").classes()).toContain("is-traveling");
    });

    it("selection-position refreshes in the same state track instantly", async () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      await settle();
      await w.setProps({
        selectionPosition: { top: 180, left: 300, below: false },
      });
      expect(w.get(".playhead").classes()).not.toContain("is-traveling");
    });

    it("a below-flip within selection state counts as travel", async () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      await settle();
      await w.setProps({
        selectionPosition: { top: 40, left: 300, below: true },
      });
      expect(w.get(".playhead").classes()).toContain("is-traveling");
    });

    it("is-traveling clears after the travel window", async () => {
      const { w } = mountPill({ state: "home" });
      await settle();
      await w.setProps({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      expect(w.get(".playhead").classes()).toContain("is-traveling");
      await new Promise((resolve) => setTimeout(resolve, 420));
      expect(w.get(".playhead").classes()).not.toContain("is-traveling");
    });

    it("state changes before the mount settles never arm travel", async () => {
      const { w } = mountPill({ state: "home" });
      await w.setProps({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      expect(w.get(".playhead").classes()).not.toContain("is-traveling");
    });
  });

  describe("remember-selection (home layer only — the selection layer's selection is LIVE)", () => {
    it("emits remember-selection on home inline-button mousedown", async () => {
      const { w } = mountPill({ state: "home" });
      await layer(w, "home").get('[aria-label="Bold"]').trigger("mousedown");
      expect(w.emitted("remember-selection")).toHaveLength(1);
    });

    it("emits remember-selection on menu-trigger mousedown", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("mousedown");
      await w.get('[aria-label="Paragraph format"]').trigger("mousedown");
      expect(w.emitted("remember-selection")).toHaveLength(2);
    });

    it("does NOT emit remember-selection from selection-layer buttons", async () => {
      // Contract: the selection layer's mousedown must never reach host-side
      // suppression — a remember-selection routed through
      // suppressFloatingToolbar would flip the pill out of selection state
      // mid-press and the click would never land (FloatingToolbar.vue's
      // bare @mousedown.prevent contract).
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 220, left: 333, below: false },
      });
      await layer(w, "selection")
        .get('[aria-label="Bold"]')
        .trigger("mousedown");
      expect(w.emitted("remember-selection")).toBeUndefined();
    });

    it("selection-layer mousedown still prevents default (focus preservation)", () => {
      const { w } = mountPill({
        state: "selection",
        selectionPosition: { top: 220, left: 333, below: false },
      });
      const btn = layer(w, "selection").get('[aria-label="Bold"]')
        .element as HTMLElement;
      const ev = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      btn.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    });

    it("selection-layer clicks run the action (mousedown must not kill them)", async () => {
      const { w, inlineActions } = mountPill({
        state: "selection",
        selectionPosition: { top: 220, left: 333, below: false },
      });
      const bold = layer(w, "selection").get('[aria-label="Bold"]');
      await bold.trigger("mousedown");
      await bold.trigger("click");
      expect(inlineActions[0].onClick).toHaveBeenCalledTimes(1);
    });

    it("prevents default on home mousedown so the editor selection survives", () => {
      const { w } = mountPill({ state: "home" });
      const btn = layer(w, "home").get('[aria-label="Bold"]')
        .element as HTMLElement;
      const ev = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      btn.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    });
  });

  describe("roving tabindex (APG toolbar pattern)", () => {
    it("exactly one control in the active layer is the Tab stop", () => {
      const { w } = mountPill({ state: "home" });
      expect(tabIndexOf(w, '[aria-label="Paragraph format"]')).toBe(0);
      expect(tabIndexOf(w, '.layer-home [aria-label="Bold"]')).toBe(-1);
      expect(tabIndexOf(w, '.layer-home [aria-label="Italic"]')).toBe(-1);
      expect(tabIndexOf(w, '[aria-label="Insert"]')).toBe(-1);
      expect(tabIndexOf(w, '[aria-label="More options"]')).toBe(-1);
      // inactive layers are parked out of the Tab order too
      expect(tabIndexOf(w, ".playhead-ambient-btn")).toBe(-1);
      expect(tabIndexOf(w, '.layer-selection [aria-label="Bold"]')).toBe(-1);
    });

    it("ArrowRight moves the stop to the next control (skipping disabled)", async () => {
      const { w } = mountPill({ state: "home" });
      const format = w.get('[aria-label="Paragraph format"]');
      await format.trigger("keydown", { key: "ArrowRight" });
      expect(tabIndexOf(w, '.layer-home [aria-label="Bold"]')).toBe(0);
      expect(tabIndexOf(w, '[aria-label="Paragraph format"]')).toBe(-1);
      await w
        .get('.layer-home [aria-label="Bold"]')
        .trigger("keydown", { key: "ArrowRight" });
      await w
        .get('.layer-home [aria-label="Italic"]')
        .trigger("keydown", { key: "ArrowRight" });
      // disabled Link is skipped: Italic -> Insert
      expect(tabIndexOf(w, '[aria-label="Insert"]')).toBe(0);
      expect(tabIndexOf(w, '.layer-home [aria-label="Link"]')).toBe(-1);
    });

    it("ArrowLeft wraps from the first control to the last", async () => {
      const { w } = mountPill({ state: "home" });
      await w
        .get('[aria-label="Paragraph format"]')
        .trigger("keydown", { key: "ArrowLeft" });
      expect(tabIndexOf(w, '[aria-label="More options"]')).toBe(0);
    });

    it("Home and End jump to the first/last control", async () => {
      const { w } = mountPill({ state: "home" });
      await w
        .get('[aria-label="Paragraph format"]')
        .trigger("keydown", { key: "End" });
      expect(tabIndexOf(w, '[aria-label="More options"]')).toBe(0);
      await w
        .get('[aria-label="More options"]')
        .trigger("keydown", { key: "Home" });
      expect(tabIndexOf(w, '[aria-label="Paragraph format"]')).toBe(0);
    });

    it("resets the stop to the new layer's first control on state change", async () => {
      const { w } = mountPill({ state: "home" });
      await w
        .get('[aria-label="Paragraph format"]')
        .trigger("keydown", { key: "End" });
      await w.setProps({
        state: "selection",
        selectionPosition: { top: 200, left: 300, below: false },
      });
      await nextTick();
      expect(tabIndexOf(w, '.layer-selection [aria-label="Bold"]')).toBe(0);
      expect(tabIndexOf(w, '.layer-selection [aria-label="Italic"]')).toBe(-1);
    });

    it("focus landing on a control adopts it as the roving stop", async () => {
      const { w } = mountPill({ state: "home" });
      await layer(w, "home").get('[aria-label="Italic"]').trigger("focusin");
      expect(tabIndexOf(w, '.layer-home [aria-label="Italic"]')).toBe(0);
      expect(tabIndexOf(w, '[aria-label="Paragraph format"]')).toBe(-1);
    });

    it("the ambient lozenge is the single stop in ambient state", () => {
      const { w } = mountPill({ state: "ambient" });
      expect(tabIndexOf(w, ".playhead-ambient-btn")).toBe(0);
      expect(tabIndexOf(w, '[aria-label="Paragraph format"]')).toBe(-1);
    });
  });

  describe("menus (Format / insert / overflow)", () => {
    it("opens the insert menu below the pill with its items", async () => {
      const { w } = mountPill({ state: "home" });
      expect(w.find(".playhead-menu").exists()).toBe(false);
      await w.get('[aria-label="Insert"]').trigger("click");
      const menu = w.get(".playhead-menu");
      expect(menu.classes()).toContain("dropdown-menu");
      const items = menu.findAll(".dropdown-item");
      expect(items.map((i) => i.text())).toEqual([
        "insert one",
        "insert twoCtrl+K",
      ]);
      expect(menu.find(".dropdown-divider").exists()).toBe(true);
      expect(items[1].classes()).toContain("active");
      expect(
        w.get('[aria-label="Insert"]').attributes("aria-expanded")
      ).toBe("true");
    });

    it("opens the Format menu from the serif trigger", async () => {
      const { w, formatItems } = mountPill({ state: "home" });
      await w.get('[aria-label="Paragraph format"]').trigger("click");
      const menu = w.get(".playhead-menu");
      expect(menu.text()).toContain("format one");
      await menu.findAll(".dropdown-item")[0].trigger("click");
      expect(formatItems[0].onClick).toHaveBeenCalledTimes(1);
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("clicking an item runs its onClick and closes the menu", async () => {
      const { w, insertItems } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("click");
      await w.get(".playhead-menu").findAll(".dropdown-item")[0].trigger("click");
      expect(insertItems[0].onClick).toHaveBeenCalledTimes(1);
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("a second trigger click toggles the menu closed", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="More options"]').trigger("click");
      expect(w.find(".playhead-menu").exists()).toBe(true);
      await w.get('[aria-label="More options"]').trigger("click");
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("only one menu is open at a time", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("click");
      await w.get('[aria-label="More options"]').trigger("click");
      const menus = w.findAll(".playhead-menu");
      expect(menus).toHaveLength(1);
      expect(menus[0].text()).toContain("overflow one");
    });

    it("Escape closes an open menu", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("click");
      expect(w.find(".playhead-menu").exists()).toBe(true);
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await nextTick();
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("a click outside the pill closes an open menu", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("click");
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("leaving the home state closes an open menu", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="Insert"]').trigger("click");
      expect(w.find(".playhead-menu").exists()).toBe(true);
      await w.setProps({
        state: "selection",
        selectionPosition: { top: 100, left: 100, below: false },
      });
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });
  });

  describe("overflow sections (alignment + size folded into '⋯')", () => {
    it("prepends alignment and size sections separated by hairline dividers", async () => {
      const alignClick = vi.fn();
      const { w } = mountPill({
        state: "home",
        alignmentItems: [
          { id: "align-left", label: "Align left", onClick: alignClick },
          { id: "align-center", label: "Align center", onClick: vi.fn() },
        ],
        sizeItems: [
          {
            id: "size-large",
            label: "Large",
            onClick: vi.fn(),
            isActive: () => true,
          },
        ],
      });
      await w.get('[aria-label="More options"]').trigger("click");
      const menu = w.get(".playhead-menu");
      const items = menu.findAll(".dropdown-item");
      expect(items.map((i) => i.text())).toEqual([
        "Align left",
        "Align center",
        "Large",
        "overflow one",
        "overflow twoCtrl+K",
      ]);
      // 2 section hairlines + 1 divider inside the host overflow items
      expect(menu.findAll(".dropdown-divider")).toHaveLength(3);
      // active-state items (e.g. current view mode / size) render active
      expect(items[2].classes()).toContain("active");
      await items[0].trigger("click");
      expect(alignClick).toHaveBeenCalledTimes(1);
      expect(w.find(".playhead-menu").exists()).toBe(false);
    });

    it("without alignment/size props the overflow is unchanged", async () => {
      const { w } = mountPill({ state: "home" });
      await w.get('[aria-label="More options"]').trigger("click");
      const items = w.get(".playhead-menu").findAll(".dropdown-item");
      expect(items.map((i) => i.text())).toEqual([
        "overflow one",
        "overflow twoCtrl+K",
      ]);
    });
  });

  describe("colors menu (swatch grid, EditorToolbar grammar)", () => {
    const colorProps = {
      state: "home" as PlayheadState,
      textColorPresets: ["#ff0000", "#00ff00"],
      highlightColorPresets: ["#ffff00"],
    };

    it("renders no Colors trigger without presets", () => {
      const { w } = mountPill({ state: "home" });
      expect(w.find('[aria-label="Colors"]').exists()).toBe(false);
    });

    it("opens a swatch-grid menu with Text color and Highlight sections", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      const menu = w.get(".playhead-colors-menu");
      const labels = menu.findAll(".colors-section-label");
      expect(labels.map((l) => l.text())).toEqual(["Text color", "Highlight"]);
      // 2 text swatches + none swatch + 1 highlight swatch
      expect(menu.findAll(".colors-swatch")).toHaveLength(4);
      expect(
        w.get('[aria-label="Colors"]').attributes("aria-expanded")
      ).toBe("true");
    });

    it("marks the swatch matching the LIVE selection color active (hex vs rgb tolerant)", async () => {
      // Active state derives from the actual selection, not the last-applied
      // prop: build a colored selection, then open the menu.
      const root = document.createElement("div");
      root.setAttribute("contenteditable", "true");
      root.innerHTML =
        '<span style="color: rgb(255, 0, 0); background-color: rgb(255, 255, 0)">x</span>';
      document.body.appendChild(root);
      const span = root.querySelector("span")!;
      const range = document.createRange();
      range.selectNodeContents(span);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");

      expect(
        w.get('[aria-label="Text color #ff0000"]').classes()
      ).toContain("active");
      expect(
        w.get('[aria-label="Highlight #ffff00"]').classes()
      ).toContain("active");
      expect(w.get('[aria-label="No highlight"]').classes()).not.toContain(
        "active"
      );

      document.body.removeChild(root);
    });

    it("marks 'no highlight' active when no background color is applied", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      expect(w.get('[aria-label="No highlight"]').classes()).toContain(
        "active"
      );
    });

    it("picking a text swatch emits text-color-change and closes the menu", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      const swatch = w.get('[aria-label="Text color #ff0000"]');
      await swatch.trigger("mousedown");
      expect(w.emitted("remember-selection")).toHaveLength(1);
      await swatch.trigger("click");
      expect(w.emitted("text-color-change")).toEqual([["#ff0000"]]);
      expect(w.find(".playhead-colors-menu").exists()).toBe(false);
    });

    it("picking a highlight swatch emits background-color-change", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      await w.get('[aria-label="Highlight #ffff00"]').trigger("click");
      expect(w.emitted("background-color-change")).toEqual([["#ffff00"]]);
    });

    it("'no highlight' emits background-color-change with transparent", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      await w.get('[aria-label="No highlight"]').trigger("click");
      expect(w.emitted("background-color-change")).toEqual([["transparent"]]);
    });

    it("Escape closes the colors menu", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await nextTick();
      expect(w.find(".playhead-colors-menu").exists()).toBe(false);
    });

    it("leaving home state closes the colors menu", async () => {
      const { w } = mountPill(colorProps);
      await w.get('[aria-label="Colors"]').trigger("click");
      await w.setProps({ state: "ambient" });
      expect(w.find(".playhead-colors-menu").exists()).toBe(false);
    });
  });

  describe("chrome contract", () => {
    // Scoped SFC styles are not applied by happy-dom, so the stacking and
    // motion contracts are asserted against the source (same approach as
    // src/styles/__tests__/focus-indicators.theme.test.ts).
    const sfcSource = readFileSync(
      resolve(process.cwd(), "src/components/PlayheadPill.vue"),
      "utf-8"
    );

    it("is a labelled toolbar", () => {
      const { w } = mountPill({ state: "home" });
      const root = w.get(".playhead");
      expect(root.attributes("role")).toBe("toolbar");
      expect(root.attributes("aria-label")).toBe("Editor toolbar");
    });

    it("carries the theme passthrough classes on the teleported root", () => {
      const { w } = mountPill({ theme: "theme-dark nle-theme-warm" });
      const classes = w.get(".playhead").classes();
      expect(classes).toContain("theme-dark");
      expect(classes).toContain("nle-theme-warm");
    });

    it("sits in the floating-chrome stacking band (pill 10001 > panels 10000 > shell 9999 > FABs 9998)", () => {
      expect(sfcSource).toContain("z-index: var(--nle-z-playhead, 10001)");
      expect(sfcSource).not.toContain("1060");
    });

    it("gates the transform travel transition behind is-traveling (scroll tracking is instant)", () => {
      expect(sfcSource).toMatch(
        /\.playhead\.is-settled\.is-traveling\s*\{\s*transition:\s*transform/
      );
      // the bare .is-settled root rule must NOT ease transform — that is what
      // rubber-banded scroll-following
      expect(sfcSource).not.toMatch(
        /\.playhead\.is-settled\s*\{\s*transition:\s*transform/
      );
    });

    it("removes its document listeners on unmount", () => {
      const docRemove = vi.spyOn(document, "removeEventListener");
      const { w } = mountPill({ state: "home" });
      w.unmount();
      mounted.pop(); // already unmounted; keep afterEach from double-unmounting
      expect(docRemove).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        true
      );
      expect(docRemove).toHaveBeenCalledWith("click", expect.any(Function));
    });
  });
});
