import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
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
  anchorRect?: { top: number; left: number; width: number } | null;
  selectionPosition?: { top: number; left: number; below: boolean } | null;
  formatLabel?: string;
  wordCount?: number;
  isSaving?: boolean;
  inlineActions?: ToolbarAction[];
  formatItems?: PlayheadMenuItem[];
  insertItems?: PlayheadMenuItem[];
  overflowItems?: PlayheadMenuItem[];
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

  describe("mount-settle guard (nothing animates on mount)", () => {
    it("has no is-settled morph class on initial mount", () => {
      const { w } = mountPill({ state: "home" });
      expect(w.get(".playhead").classes()).not.toContain("is-settled");
    });

    it("arms transitions (is-settled) only after the post-mount frames", async () => {
      const { w } = mountPill({ state: "home" });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      await nextTick();
      expect(w.get(".playhead").classes()).toContain("is-settled");
    });
  });

  describe("remember-selection (EditorToolbar's mousedown.prevent pattern)", () => {
    it("emits remember-selection on inline-button mousedown", async () => {
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

    it("prevents default on mousedown so the editor selection survives", () => {
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

  describe("chrome contract", () => {
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
