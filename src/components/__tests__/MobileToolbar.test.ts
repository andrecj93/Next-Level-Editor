import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import MobileToolbar from "../MobileToolbar.vue";

// MobileToolbar only renders when the device is "mobile": its `showToolbar`
// computed is `props.visible && showMobileToolbar`, and `showMobileToolbar`
// (from useDeviceDetection) is driven by `window.innerWidth < 768`. The
// composable snapshots `window.innerWidth` into a ref at setup time, so we set
// the viewport BEFORE mounting. happy-dom lets us assign `window.innerWidth`.
const MOBILE_WIDTH = 375;
const DESKTOP_WIDTH = 1200;

// The component teleports to <body>. With VTU 2.x, `wrapper.find` does NOT reach
// teleported content, so we stub teleport to keep the markup inside the wrapper
// (matches the FindReplaceModal/EmbedModal suites). This lets us query the DOM
// and assert on emits directly.
const mountToolbar = (props: Record<string, unknown> = {}) =>
  mount(MobileToolbar, {
    props,
    global: { stubs: { teleport: true } },
  });

const originalInnerWidth = window.innerWidth;

beforeEach(() => {
  window.innerWidth = MOBILE_WIDTH;
});

afterEach(() => {
  window.innerWidth = originalInnerWidth;
  // Remove any editor roots appended by theme tests.
  document.querySelectorAll(".next-level-editor").forEach((n) => n.remove());
  // Drop any stubbed navigator.vibrate.
  if ("vibrate" in navigator) {
    // @ts-expect-error - test cleanup of an optional API we stubbed
    delete navigator.vibrate;
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// happy-dom + VTU 2.x: `wrapper.isVisible()` is unreliable for `v-show`, but the
// inline `display` style is set correctly by Vue, so we read it directly.
const displayOf = (w: ReturnType<typeof mountToolbar>, selector: string) =>
  (w.get(selector).element as HTMLElement).style.display;
const isHidden = (w: ReturnType<typeof mountToolbar>, selector: string) =>
  displayOf(w, selector) === "none";

// Panel-scoped button lookups (labels like "Link" appear in more than one panel).
const formatBtn = (w: ReturnType<typeof mountToolbar>, label: string) =>
  w.get(`#panel-format [aria-label="${label}"]`);
const insertBtn = (w: ReturnType<typeof mountToolbar>, label: string) =>
  w.get(`#panel-insert [aria-label="${label}"]`);

describe("MobileToolbar", () => {
  describe("visibility gate", () => {
    it("renders the bottom toolbar on a mobile viewport", () => {
      const w = mountToolbar();
      expect(w.find(".mobile-toolbar").exists()).toBe(true);
      w.unmount();
    });

    it("renders nothing on a desktop viewport (>= 768px)", () => {
      window.innerWidth = DESKTOP_WIDTH;
      const w = mountToolbar();
      expect(w.find(".mobile-toolbar").exists()).toBe(false);
      w.unmount();
    });

    it("renders nothing when visible=false, even on mobile", () => {
      const w = mountToolbar({ visible: false });
      expect(w.find(".mobile-toolbar").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("header", () => {
    it("shows the active tab's label as the title (defaults to Format)", () => {
      const w = mountToolbar();
      expect(w.get(".toolbar-title").text()).toBe("Format");
      w.unmount();
    });

    it("exposes an expanded toggle button by default (aria-expanded=true)", () => {
      const w = mountToolbar();
      const toggle = w.get(".toolbar-toggle");
      expect(toggle.attributes("aria-expanded")).toBe("true");
      expect(toggle.attributes("aria-label")).toBe("Collapse toolbar");
      w.unmount();
    });

    it("emits close when the close button is clicked", async () => {
      const w = mountToolbar();
      await w.get(".toolbar-close").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("close")).toHaveLength(1);
      // Closing is not an editor action.
      expect(w.emitted("action")).toBeUndefined();
      w.unmount();
    });
  });

  describe("collapse / expand of the extra actions", () => {
    it("toggles the collapsed class and the toggle's aria on click", async () => {
      const w = mountToolbar();
      // Re-query after each click: the teleport stub rebuilds its subtree on
      // update, so wrappers captured before a state change go stale.
      expect(w.get(".mobile-toolbar").classes()).not.toContain("toolbar-collapsed");

      await w.get(".toolbar-toggle").trigger("click");
      expect(w.get(".mobile-toolbar").classes()).toContain("toolbar-collapsed");
      expect(w.get(".toolbar-toggle").attributes("aria-expanded")).toBe("false");
      expect(w.get(".toolbar-toggle").attributes("aria-label")).toBe("Expand toolbar");

      await w.get(".toolbar-toggle").trigger("click");
      expect(w.get(".mobile-toolbar").classes()).not.toContain("toolbar-collapsed");
      expect(w.get(".toolbar-toggle").attributes("aria-expanded")).toBe("true");
      w.unmount();
    });

    it("hides the tabs and content while collapsed (v-show)", async () => {
      const w = mountToolbar();
      expect(isHidden(w, ".toolbar-tabs")).toBe(false);
      expect(isHidden(w, ".toolbar-content")).toBe(false);

      await w.get(".toolbar-toggle").trigger("click");
      expect(isHidden(w, ".toolbar-tabs")).toBe(true);
      expect(isHidden(w, ".toolbar-content")).toBe(true);
      w.unmount();
    });

    it("does not emit an action when collapsing/expanding", async () => {
      const w = mountToolbar();
      await w.get(".toolbar-toggle").trigger("click");
      await w.get(".toolbar-toggle").trigger("click");
      expect(w.emitted("action")).toBeUndefined();
      w.unmount();
    });
  });

  describe("tab navigation", () => {
    it("renders the four tabs with a tablist role", () => {
      const w = mountToolbar();
      const tabs = w.findAll('.toolbar-tabs[role="tablist"] .toolbar-tab');
      // Read the text label span (the button also contains an SVG icon glyph).
      expect(tabs.map((t) => t.get(".tab-label").text())).toEqual([
        "Format",
        "Insert",
        "Blocks",
        "More",
      ]);
      w.unmount();
    });

    it("marks Format active by default via aria-selected + tab-active", () => {
      const w = mountToolbar();
      const formatTab = w.findAll(".toolbar-tab")[0];
      expect(formatTab.classes()).toContain("tab-active");
      expect(formatTab.attributes("aria-selected")).toBe("true");
      // Only the format panel is shown.
      expect(isHidden(w, "#panel-format")).toBe(false);
      expect(isHidden(w, "#panel-insert")).toBe(true);
      w.unmount();
    });

    it("switches the active tab, panel and title when another tab is clicked", async () => {
      const w = mountToolbar();

      // Click "Blocks" (index 2).
      await w.findAll(".toolbar-tab")[2].trigger("click");

      // Re-query after the state change (VTU wrappers captured pre-update go stale).
      const tabs = w.findAll(".toolbar-tab");
      expect(tabs[2].classes()).toContain("tab-active");
      expect(tabs[2].attributes("aria-selected")).toBe("true");
      expect(tabs[0].classes()).not.toContain("tab-active");
      expect(tabs[0].attributes("aria-selected")).toBe("false");

      expect(w.get(".toolbar-title").text()).toBe("Blocks");
      expect(isHidden(w, "#panel-blocks")).toBe(false);
      expect(isHidden(w, "#panel-format")).toBe(true);

      // Switching tabs is navigation, not an editor action.
      expect(w.emitted("action")).toBeUndefined();
      w.unmount();
    });

    it("honours the defaultTab prop", () => {
      const w = mountToolbar({ defaultTab: "more" });
      expect(w.get(".toolbar-title").text()).toBe("More");
      expect(isHidden(w, "#panel-more")).toBe(false);
      expect(isHidden(w, "#panel-format")).toBe(true);
      const moreTab = w.findAll(".toolbar-tab")[3];
      expect(moreTab.classes()).toContain("tab-active");
      w.unmount();
    });

    it("wires each tab to its panel via aria-controls", () => {
      const w = mountToolbar();
      const ids = w.findAll(".toolbar-tab").map((t) => t.attributes("aria-controls"));
      expect(ids).toEqual([
        "panel-format",
        "panel-insert",
        "panel-blocks",
        "panel-more",
      ]);
      w.unmount();
    });
  });

  describe("format panel actions", () => {
    it("renders the six formatting buttons", () => {
      const w = mountToolbar();
      const labels = w
        .findAll("#panel-format .toolbar-button")
        .map((b) => b.attributes("aria-label"));
      expect(labels).toEqual([
        "Bold",
        "Italic",
        "Underline",
        "Strikethrough",
        "Code",
        "Link",
      ]);
      w.unmount();
    });

    it("emits the matching action id for every format button", async () => {
      const w = mountToolbar();
      for (const btn of w.findAll("#panel-format .toolbar-button")) {
        await btn.trigger("click");
      }
      expect(w.emitted("action")).toEqual([
        ["bold"],
        ["italic"],
        ["underline"],
        ["strikethrough"],
        ["code"],
        ["link"],
      ]);
      w.unmount();
    });
  });

  describe("active states", () => {
    it("applies the active class to buttons the isActive prop marks active", () => {
      const w = mountToolbar({
        isActive: (id: string) => id === "bold",
      });
      expect(formatBtn(w, "Bold").classes()).toContain("active");
      expect(formatBtn(w, "Italic").classes()).not.toContain("active");
      w.unmount();
    });

    it("re-evaluates active state reactively when isActive changes", async () => {
      const w = mountToolbar({
        isActive: (id: string) => id === "bold",
      });
      expect(formatBtn(w, "Bold").classes()).toContain("active");

      await w.setProps({ isActive: (id: string) => id === "italic" });
      expect(formatBtn(w, "Bold").classes()).not.toContain("active");
      expect(formatBtn(w, "Italic").classes()).toContain("active");
      w.unmount();
    });

    it("never marks the Link format button active (hardcoded false), even if isActive says otherwise", () => {
      const w = mountToolbar({ isActive: () => true });
      expect(formatBtn(w, "Link").classes()).not.toContain("active");
      // sanity: a real toggle action still reflects the prop
      expect(formatBtn(w, "Bold").classes()).toContain("active");
      w.unmount();
    });

    it("marks nothing active when no isActive prop is supplied", () => {
      const w = mountToolbar();
      const anyActive = w
        .findAll("#panel-format .toolbar-button")
        .some((b) => b.classes().includes("active"));
      expect(anyActive).toBe(false);
      w.unmount();
    });
  });

  describe("insert panel", () => {
    it("renders the insert grid buttons and emits their action ids", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[1].trigger("click"); // Insert
      expect(isHidden(w, "#panel-insert")).toBe(false);

      // Full parity with the desktop Insert menu (Code Block lives in Blocks).
      const buttons = w.findAll("#panel-insert .toolbar-button-large");
      expect(buttons.map((b) => b.attributes("aria-label"))).toEqual([
        "Link",
        "Image",
        "File Manager",
        "Video",
        "Table",
        "Divider",
        "Page Break",
        "Contents",
        "Emoji",
      ]);

      for (const btn of buttons) {
        await btn.trigger("click");
      }
      expect(w.emitted("action")).toEqual([
        ["link"],
        ["image"],
        ["file-manager"],
        ["video"],
        ["table"],
        ["hr"],
        ["page-break"],
        ["toc"],
        ["emoji"],
      ]);
      w.unmount();
    });

    it("emits 'link' from the insert Link button (distinct from format Link)", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[1].trigger("click");
      await insertBtn(w, "Link").trigger("click");
      expect(w.emitted("action")).toEqual([["link"]]);
      w.unmount();
    });
  });

  describe("blocks panel", () => {
    it("renders every block conversion button with a 'Convert to X' label", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[2].trigger("click"); // Blocks
      const labels = w
        .findAll("#panel-blocks .block-button")
        .map((b) => b.attributes("aria-label"));
      expect(labels).toEqual([
        "Convert to Paragraph",
        "Convert to Heading 1",
        "Convert to Heading 2",
        "Convert to Heading 3",
        "Convert to Bullet List",
        "Convert to Numbered List",
        "Convert to Checklist",
        "Convert to Quote",
        "Convert to Code Block",
      ]);
      w.unmount();
    });

    it("emits each block's action id (not its label) on click", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[2].trigger("click");
      for (const btn of w.findAll("#panel-blocks .block-button")) {
        await btn.trigger("click");
      }
      expect(w.emitted("action")).toEqual([
        ["paragraph"],
        ["h1"],
        ["h2"],
        ["h3"],
        ["bullet-list"],
        ["numbered-list"],
        ["checklist"],
        ["blockquote"],
        ["code-block"],
      ]);
      w.unmount();
    });
  });

  describe("more panel", () => {
    it("renders the overflow actions and emits their ids", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[3].trigger("click"); // More
      const labels = w
        .findAll("#panel-more .more-button")
        .map((b) => b.attributes("aria-label"));
      // "Keyboard Shortcuts", "Export" and "Settings" are intentionally
      // absent: NextLevelEditor's handleMobileAction has no handlers for
      // them yet, so the buttons silently did nothing (see the NOTE in
      // MobileToolbar.vue's more actions).
      expect(labels).toEqual(["Undo", "Redo", "Find & Replace"]);

      for (const btn of w.findAll("#panel-more .more-button")) {
        await btn.trigger("click");
      }
      expect(w.emitted("action")).toEqual([["undo"], ["redo"], ["find"]]);
      w.unmount();
    });

    it("renders no 'New' badge (the badged Export button was a dead action)", async () => {
      const w = mountToolbar();
      await w.findAll(".toolbar-tab")[3].trigger("click");

      // The old Export action carried a "New" badge while doing nothing at
      // all on click — the whole button was removed with the other dead
      // overflow actions, so no badge remains.
      expect(w.findAll("#panel-more .more-badge")).toHaveLength(0);
      w.unmount();
    });
  });

  describe("theme mirroring (teleported root)", () => {
    it("mirrors .theme-dark from the editor root present at mount", async () => {
      const editor = document.createElement("div");
      editor.className = "next-level-editor theme-dark";
      document.body.appendChild(editor);

      const w = mountToolbar();
      await nextTick(); // syncTheme runs in onMounted, flush the reactive update
      expect(w.get(".mobile-toolbar").classes()).toContain("theme-dark");
      w.unmount();
    });

    it("stays light when the editor root is not in dark mode", async () => {
      const editor = document.createElement("div");
      editor.className = "next-level-editor";
      document.body.appendChild(editor);

      const w = mountToolbar();
      await nextTick();
      expect(w.get(".mobile-toolbar").classes()).not.toContain("theme-dark");
      w.unmount();
    });
  });

  describe("fullscreen mirroring (teleported root, z-index contract)", () => {
    // Flush the MutationObserver callback (delivered async) + Vue reactivity.
    const flushMutations = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await nextTick();
    };

    it("mirrors .fullscreen from an editor root already fullscreen at mount", async () => {
      const editor = document.createElement("div");
      editor.className = "next-level-editor fullscreen";
      document.body.appendChild(editor);

      const w = mountToolbar();
      await nextTick(); // sync runs in onMounted
      expect(w.get(".mobile-toolbar").classes()).toContain("is-fullscreen");
      w.unmount();
    });

    it("toggling the editor's fullscreen class flips is-fullscreen on the toolbar root", async () => {
      const editor = document.createElement("div");
      editor.className = "next-level-editor";
      document.body.appendChild(editor);

      const w = mountToolbar();
      await nextTick();
      expect(w.get(".mobile-toolbar").classes()).not.toContain(
        "is-fullscreen"
      );

      // Enter fullscreen: the z-9999 editor shell would bury the z-900 bar —
      // the mirrored class raises the bar above it (z 10001, below dialogs).
      editor.classList.add("fullscreen");
      await flushMutations();
      expect(w.get(".mobile-toolbar").classes()).toContain("is-fullscreen");

      // Exit fullscreen: back to the normal stacking tier.
      editor.classList.remove("fullscreen");
      await flushMutations();
      expect(w.get(".mobile-toolbar").classes()).not.toContain(
        "is-fullscreen"
      );
      w.unmount();
    });

    it("fullscreen and theme mirroring are independent (both classes coexist)", async () => {
      const editor = document.createElement("div");
      editor.className = "next-level-editor theme-dark";
      document.body.appendChild(editor);

      const w = mountToolbar();
      await nextTick();
      expect(w.get(".mobile-toolbar").classes()).toContain("theme-dark");
      expect(w.get(".mobile-toolbar").classes()).not.toContain(
        "is-fullscreen"
      );

      editor.classList.add("fullscreen");
      await flushMutations();
      const classes = w.get(".mobile-toolbar").classes();
      expect(classes).toContain("theme-dark");
      expect(classes).toContain("is-fullscreen");
      w.unmount();
    });
  });

  describe("haptic feedback", () => {
    it("vibrates and flashes the indicator when acting, then clears it", async () => {
      vi.useFakeTimers();
      const vibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });

      const w = mountToolbar({ enableHaptics: true });
      await formatBtn(w, "Bold").trigger("click");

      // medium intensity = 20ms pulse for an action
      expect(vibrate).toHaveBeenCalledWith(20);
      expect(w.find(".haptic-indicator").exists()).toBe(true);

      // Indicator auto-hides after the pulse (+100ms buffer).
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(w.find(".haptic-indicator").exists()).toBe(false);

      // The action still propagated.
      expect(w.emitted("action")).toEqual([["bold"]]);
      w.unmount();
    });

    it("does not vibrate when enableHaptics is false, but still emits the action", async () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });

      const w = mountToolbar({ enableHaptics: false });
      await formatBtn(w, "Bold").trigger("click");

      expect(vibrate).not.toHaveBeenCalled();
      expect(w.find(".haptic-indicator").exists()).toBe(false);
      expect(w.emitted("action")).toEqual([["bold"]]);
      w.unmount();
    });

    it("swallows a throwing navigator.vibrate: no crash, action still emits", async () => {
      const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
      Object.defineProperty(navigator, "vibrate", {
        value: () => {
          throw new Error("vibrate boom");
        },
        configurable: true,
      });

      const w = mountToolbar({ enableHaptics: true });
      await formatBtn(w, "Bold").trigger("click");

      // The failure is caught and logged; the editor action is unaffected.
      expect(debug).toHaveBeenCalledWith("Haptic feedback failed:", expect.any(Error));
      expect(w.find(".haptic-indicator").exists()).toBe(false);
      expect(w.emitted("action")).toEqual([["bold"]]);
      w.unmount();
    });

    it("acts safely when navigator.vibrate is unavailable (no indicator, action still emits)", async () => {
      // No vibrate defined (default happy-dom navigator) -> triggerHaptic bails early.
      const w = mountToolbar({ enableHaptics: true });
      await formatBtn(w, "Italic").trigger("click");
      expect(w.find(".haptic-indicator").exists()).toBe(false);
      expect(w.emitted("action")).toEqual([["italic"]]);
      w.unmount();
    });
  });
});
