import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import SkipLinks from "../SkipLinks.vue";
import AriaLiveRegion from "../AriaLiveRegion.vue";
import { useAccessibility } from "../../composables/useAccessibility";

// SkipLinks does NOT use <Teleport>; it renders a plain <nav> inline, so a
// detached mount + wrapper queries reach everything. We only attach to
// document.body for the activation tests, where handleSkip() calls
// document.getElementById(target) — the landmark has to be in the live document
// for getElementById to find it and for focus() to take effect.

// A thin *real* component that consumes the SAME shared-announcement singleton
// the production <AriaLiveRegion> reads. Mounting it (a real setup context)
// lets us read/reset announcements without the Vue "onMounted outside setup"
// warnings you get from calling useAccessibility() bare in a test. This is the
// genuine integration path — no mocking of the composable.
const A11yProbe = defineComponent({
  name: "A11yProbe",
  setup(_props, { expose }) {
    const a11y = useAccessibility();
    expose(a11y);
    return () => h("div", { class: "a11y-probe" });
  },
});

const mountProbe = () => mount(A11yProbe);

// The default landmark ids SkipLinks ships with.
const DEFAULT_TARGETS = ["main-content", "toolbar", "footer"];

// Track anything we bolt onto document.body so tests stay isolated.
const appended: HTMLElement[] = [];
const addLandmark = (id: string, tabindex?: string): HTMLElement => {
  const el = document.createElement("div");
  el.id = id;
  if (tabindex !== undefined) el.setAttribute("tabindex", tabindex);
  document.body.appendChild(el);
  appended.push(el);
  return el;
};

beforeEach(() => {
  // Reset the shared announcement singleton between tests via a real component
  // instance (warning-free) so leaked/auto-clearing entries can't cross-talk.
  const probe = mountProbe();
  (probe.vm as unknown as { clearAnnouncements: () => void }).clearAnnouncements();
  probe.unmount();
});

afterEach(() => {
  for (const el of appended.splice(0)) el.remove();
  // Blur whatever ended up focused so activeElement doesn't leak into the next test.
  (document.activeElement as HTMLElement | null)?.blur?.();
});

describe("SkipLinks", () => {
  describe("rendering the configured links", () => {
    it("renders a labelled navigation landmark", () => {
      const w = mount(SkipLinks);
      const nav = w.get("nav.skip-links");
      expect(nav.element.tagName).toBe("NAV");
      expect(nav.attributes("aria-label")).toBe("Skip links");
      w.unmount();
    });

    it("renders exactly the three default skip links with their labels", () => {
      const w = mount(SkipLinks);
      const links = w.findAll("a.skip-link");
      expect(links).toHaveLength(3);
      expect(links.map((l) => l.text())).toEqual([
        "Skip to main content",
        "Skip to toolbar",
        "Skip to footer",
      ]);
      w.unmount();
    });

    it("points each default href at its landmark id (#target)", () => {
      const w = mount(SkipLinks);
      const hrefs = w.findAll("a.skip-link").map((l) => l.attributes("href"));
      expect(hrefs).toEqual(["#main-content", "#toolbar", "#footer"]);
      w.unmount();
    });

    it("gives every link the .skip-link class used by the off-screen CSS", () => {
      const w = mount(SkipLinks);
      const links = w.findAll("nav.skip-links > a");
      expect(links).toHaveLength(3);
      expect(links.every((l) => l.classes("skip-link"))).toBe(true);
      w.unmount();
    });
  });

  describe("customLinks prop", () => {
    it("appends custom links after the defaults, preserving order + hrefs", () => {
      const w = mount(SkipLinks, {
        props: {
          customLinks: [
            { id: "skip-sidebar", label: "Skip to sidebar", target: "sidebar" },
            { id: "skip-search", label: "Skip to search", target: "search" },
          ],
        },
      });
      const links = w.findAll("a.skip-link");
      expect(links).toHaveLength(5);
      expect(links.map((l) => l.text())).toEqual([
        "Skip to main content",
        "Skip to toolbar",
        "Skip to footer",
        "Skip to sidebar",
        "Skip to search",
      ]);
      expect(links.map((l) => l.attributes("href"))).toEqual([
        "#main-content",
        "#toolbar",
        "#footer",
        "#sidebar",
        "#search",
      ]);
      w.unmount();
    });

    it("renders only the defaults when customLinks is omitted (default [])", () => {
      const w = mount(SkipLinks);
      expect(w.findAll("a.skip-link")).toHaveLength(3);
      w.unmount();
    });
  });

  describe("activation: focus moves to the landmark", () => {
    it("focuses the matching landmark element when a link is clicked", async () => {
      const main = addLandmark("main-content");
      const w = mount(SkipLinks, { attachTo: document.body });

      await w.findAll("a.skip-link")[0].trigger("click");

      expect(document.activeElement).toBe(main);
      w.unmount();
    });

    it("focuses the right landmark for each default link", async () => {
      const els = DEFAULT_TARGETS.map((id) => addLandmark(id));
      const w = mount(SkipLinks, { attachTo: document.body });
      const links = w.findAll("a.skip-link");

      for (let i = 0; i < links.length; i++) {
        await links[i].trigger("click");
        expect(document.activeElement).toBe(els[i]);
      }
      w.unmount();
    });

    it("activates a custom link's landmark too", async () => {
      const custom = addLandmark("editor-canvas");
      const w = mount(SkipLinks, {
        attachTo: document.body,
        props: {
          customLinks: [
            { id: "skip-canvas", label: "Skip to canvas", target: "editor-canvas" },
          ],
        },
      });

      await w.findAll("a.skip-link")[3].trigger("click");
      expect(document.activeElement).toBe(custom);
      w.unmount();
    });
  });

  describe("activation: making the target focusable", () => {
    it("adds tabindex=-1 to a landmark that has none", async () => {
      const main = addLandmark("main-content");
      expect(main.hasAttribute("tabindex")).toBe(false);

      const w = mount(SkipLinks, { attachTo: document.body });
      await w.findAll("a.skip-link")[0].trigger("click");

      expect(main.getAttribute("tabindex")).toBe("-1");
      w.unmount();
    });

    it("makes the landmark focusable BEFORE focusing it (focus() no-ops on a not-yet-focusable element)", async () => {
      // Regression guard: in a real browser, element.focus() on a <main>/<footer>
      // that is not yet focusable is a SILENT no-op. So tabindex="-1" must be
      // applied BEFORE setFocus() runs — otherwise the very first skip-link
      // activation fails to move focus, defeating the entire feature. happy-dom
      // focuses any element regardless of tabindex, so we assert the call ORDER
      // (which encodes the bug) rather than the focus outcome it masks.
      const main = addLandmark("main-content");
      const setAttrSpy = vi.spyOn(main, "setAttribute");
      const focusSpy = vi.spyOn(main, "focus");

      const w = mount(SkipLinks, { attachTo: document.body });
      await w.findAll("a.skip-link")[0].trigger("click");

      const tabindexCallIdx = setAttrSpy.mock.calls.findIndex(
        ([name, value]) => name === "tabindex" && value === "-1"
      );
      expect(tabindexCallIdx).toBeGreaterThanOrEqual(0);
      expect(focusSpy).toHaveBeenCalled();

      const tabindexOrder = setAttrSpy.mock.invocationCallOrder[tabindexCallIdx];
      const focusOrder = focusSpy.mock.invocationCallOrder[0];
      expect(tabindexOrder).toBeLessThan(focusOrder);

      w.unmount();
    });

    it("does NOT overwrite a landmark's pre-existing tabindex", async () => {
      const main = addLandmark("main-content", "0");
      const w = mount(SkipLinks, { attachTo: document.body });

      await w.findAll("a.skip-link")[0].trigger("click");

      expect(main.getAttribute("tabindex")).toBe("0");
      w.unmount();
    });

    it("removes the injected tabindex once the landmark loses focus (blur cleanup)", async () => {
      const main = addLandmark("main-content");
      const w = mount(SkipLinks, { attachTo: document.body });

      await w.findAll("a.skip-link")[0].trigger("click");
      expect(main.getAttribute("tabindex")).toBe("-1");

      main.dispatchEvent(new FocusEvent("blur"));
      expect(main.hasAttribute("tabindex")).toBe(false);
      w.unmount();
    });

    it("keeps a pre-existing tabindex after blur (no cleanup listener was registered)", async () => {
      const main = addLandmark("main-content", "0");
      const w = mount(SkipLinks, { attachTo: document.body });

      await w.findAll("a.skip-link")[0].trigger("click");
      main.dispatchEvent(new FocusEvent("blur"));

      expect(main.getAttribute("tabindex")).toBe("0");
      w.unmount();
    });
  });

  describe("activation: missing landmark", () => {
    it("does not throw or move focus when the target id is absent", async () => {
      // No #main-content in the document.
      const before = document.activeElement;
      const w = mount(SkipLinks, { attachTo: document.body });

      await expect(
        w.findAll("a.skip-link")[0].trigger("click")
      ).resolves.not.toThrow();

      // Focus never landed on a (non-existent) landmark.
      expect(document.getElementById("main-content")).toBeNull();
      expect(document.activeElement).toBe(before);
      w.unmount();
    });

    it("makes an assertive screen-reader announcement about the missing target", async () => {
      // Read the announcement two ways: through the shared-state API (probe) and
      // through the real <AriaLiveRegion> that renders it to the a11y tree.
      const liveRegion = mount(AriaLiveRegion);
      const probe = mountProbe();
      const w = mount(SkipLinks, { attachTo: document.body });

      await w.findAll("a.skip-link")[1].trigger("click"); // target "toolbar" (absent)
      await liveRegion.vm.$nextTick();

      const assertive = (
        probe.vm as unknown as {
          getAnnouncements: (p: string) => string;
        }
      ).getAnnouncements("assertive");
      expect(assertive).toContain("Target toolbar not found");

      // And it reached the rendered assertive live region.
      expect(liveRegion.get("#aria-live-assertive").text()).toContain(
        "Target toolbar not found"
      );

      w.unmount();
      probe.unmount();
      liveRegion.unmount();
    });
  });

  describe("visually-hidden-until-focused contract", () => {
    // NOTE: happy-dom does not evaluate scoped-CSS layout — getComputedStyle on
    // a .skip-link returns empty position/top, so the "off-screen at top:-100px,
    // slides to top:0 on :focus" behaviour cannot be asserted here (it is covered
    // by the visual/e2e layer). What we CAN verify is the DOM-level a11y contract
    // the CSS depends on: the links are always present in the accessibility tree
    // (never display:none / hidden) and are genuine keyboard-focusable anchors,
    // so a keyboard user can Tab to reveal them.
    it("keeps skip links in the DOM / accessibility tree (not hidden)", () => {
      const w = mount(SkipLinks);
      const links = w.findAll("a.skip-link");
      expect(links).toHaveLength(3);
      for (const l of links) {
        const el = l.element as HTMLElement;
        expect(el.hasAttribute("hidden")).toBe(false);
        expect(el.getAttribute("aria-hidden")).toBeNull();
        expect(el.style.display).not.toBe("none");
        // A real href keeps it in the tab order (this is what "reveal on Tab" needs).
        expect(el.getAttribute("href")).toMatch(/^#/);
      }
      w.unmount();
    });

    it("a skip link is keyboard-focusable (an href anchor receives focus)", () => {
      const w = mount(SkipLinks, { attachTo: document.body });
      const first = w.get("a.skip-link").element as HTMLAnchorElement;

      first.focus();
      expect(document.activeElement).toBe(first);
      w.unmount();
    });
  });
});
