import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import MobileToolbar from "../MobileToolbar.vue";

/**
 * R22-M3: the bar teleports to <body>, so it mirrors the editor's `theme-dark`
 * / `fullscreen` classes onto itself. It found them with a DOCUMENT-WIDE
 * `querySelector(".next-level-editor…")`, which is the FIRST editor on the
 * page, not its own. With two editors mounted (a docs page with a light and a
 * dark example, the classic case), the light editor's bar rendered dark, and
 * its MutationObserver watched the other editor's element — so toggling its own
 * theme or entering fullscreen changed nothing.
 */
const MOBILE_WIDTH = 375;
const originalInnerWidth = window.innerWidth;

const simulateTouchDevice = () => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 5,
    configurable: true,
  });
  (window as unknown as Record<string, unknown>).ontouchstart = () => {};
};

/** A stand-in editor root, as NextLevelEditor renders it. */
const makeEditor = (extraClass = ""): HTMLElement => {
  const el = document.createElement("div");
  el.className = `next-level-editor ${extraClass}`.trim();
  document.body.appendChild(el);
  return el;
};

/**
 * happy-dom delivers MutationObserver records on a MACROTASK, not the
 * microtask checkpoint a real browser uses — `nextTick()` alone never sees
 * them. Wait a timer turn, then let Vue re-render off the updated refs.
 */
const flushClassObserver = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

let wrapper: VueWrapper | null = null;

/**
 * NOTE: `isDark`/`isFullscreen` are resolved in onMounted, i.e. AFTER the first
 * render, so every assertion must wait a tick. Without it these tests pass
 * vacuously — the class simply has not been applied yet either way.
 */
const mountToolbar = async (props: Record<string, unknown>) => {
  wrapper = mount(MobileToolbar, {
    props: { visible: true, ...props },
    global: { stubs: { teleport: true } },
  });
  await nextTick();
  return wrapper;
};

beforeEach(() => {
  window.innerWidth = MOBILE_WIDTH;
  simulateTouchDevice();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  window.innerWidth = originalInnerWidth;
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
  delete (window as unknown as Record<string, unknown>).ontouchstart;
  document.body.innerHTML = "";
});

describe("MobileToolbar — mirrors ITS OWN editor (#R22-M3)", () => {
  it("stays light when a different editor on the page is dark", async () => {
    makeEditor("theme-dark"); // another editor, mounted first
    const own = makeEditor(); // ours: light

    await mountToolbar({ editorRoot: own });

    const bar = wrapper!.find(".mobile-toolbar");
    expect(bar.exists()).toBe(true);
    expect(bar.classes()).not.toContain("theme-dark");
  });

  it("does not go fullscreen because another editor did", async () => {
    makeEditor("fullscreen");
    const own = makeEditor();

    await mountToolbar({ editorRoot: own });

    expect(wrapper!.find(".mobile-toolbar").classes()).not.toContain(
      "is-fullscreen"
    );
  });

  it("follows its own editor's theme toggle, not the first editor's", async () => {
    const other = makeEditor();
    const own = makeEditor();

    await mountToolbar({ editorRoot: own });
    expect(wrapper!.find(".mobile-toolbar").classes()).not.toContain(
      "theme-dark"
    );

    // The OTHER editor going dark must not drag us with it.
    other.classList.add("theme-dark");
    await flushClassObserver();
    expect(wrapper!.find(".mobile-toolbar").classes()).not.toContain(
      "theme-dark"
    );

    // Our own editor going dark must.
    own.classList.add("theme-dark");
    await flushClassObserver();
    expect(wrapper!.find(".mobile-toolbar").classes()).toContain("theme-dark");
  });

  it("picks up an editorRoot that arrives after mount", async () => {
    // This is the REAL wiring: NextLevelEditor passes its own `rootEl` template
    // ref, which is still null while this child mounts. If the element were
    // only resolved in onMounted, every editor would be stuck on the
    // first-on-the-page fallback forever.
    makeEditor("theme-dark"); // the other editor, found by the fallback
    const own = makeEditor();

    await mountToolbar({ editorRoot: null });
    expect(wrapper!.find(".mobile-toolbar").classes()).toContain("theme-dark");

    await wrapper!.setProps({ editorRoot: own });
    await nextTick();
    expect(wrapper!.find(".mobile-toolbar").classes()).not.toContain(
      "theme-dark"
    );

    // …and the observer must now be watching OUR element.
    own.classList.add("fullscreen");
    await flushClassObserver();
    expect(wrapper!.find(".mobile-toolbar").classes()).toContain(
      "is-fullscreen"
    );
  });

  it("still mirrors the page's editor when no editorRoot is given", async () => {
    makeEditor("theme-dark");

    await mountToolbar({});

    expect(wrapper!.find(".mobile-toolbar").classes()).toContain("theme-dark");
  });
});
