import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import PlayheadPill from "../PlayheadPill.vue";

/**
 * R23-59: useChromeRecede documents its own invariant — "listeners are
 * document-level but ownership-scoped to `root` … so several mounted editors
 * don't recede each other's chrome." The host's `blockWhen` broke it: its
 * second clause was a bare `document.querySelector(".playhead .dropdown-menu")`,
 * so an open pill menu in ANY editor on the page froze EVERY editor's chrome.
 *
 * The clause existed because the pill teleports to <body>, putting its menus
 * outside `rootEl` where the first (correctly scoped) clause cannot see them.
 * The pill already tracks `openMenu` reactively, so the fix is to let it say so
 * instead of sniffing the whole document for someone else's furniture.
 */
let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

/**
 * Pill mode is the reliable way to enable the recede machine under happy-dom:
 * `rootWidth` starts at Infinity, so the >640px gate passes without needing a
 * ResizeObserver that never fires here.
 */
const mountPillEditor = async (): Promise<VueWrapper> => {
  wrapper = mount(NextLevelEditor, {
    props: { modelValue: "<p>hi</p>", toolbarMode: "pill" },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

/** Three writing keystrokes arm the machine; the quiet delay then recedes. */
const typeAndWaitForRecede = async (target: Element) => {
  for (let i = 0; i < 3; i += 1) {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
  }
  vi.advanceTimersByTime(1500);
  await nextTick();
};

/**
 * In pill mode the receded state is not a data attribute (the toolbar shell
 * that carries `data-receded` is not rendered at all) — it is the pill
 * contracting to its "ambient" lozenge. That IS the user-visible consequence,
 * so it is what these tests observe.
 */
const isReceded = (w: VueWrapper): boolean =>
  w.findComponent(PlayheadPill).props("state") === "ambient";

/** A second editor's open pill menu, teleported to <body> exactly as the real one is. */
const addForeignPillMenu = () => {
  const foreign = document.createElement("div");
  foreign.className = "playhead";
  foreign.innerHTML = '<div class="dropdown-menu">someone else\'s menu</div>';
  document.body.appendChild(foreign);
  return foreign;
};

describe("chrome recede is scoped to its own editor (#R23-59)", () => {
  it("recedes after a typing burst", async () => {
    // Harness control: if this fails the other two prove nothing.
    const w = await mountPillEditor();

    await typeAndWaitForRecede(w.find(".editor-content").element);

    expect(isReceded(w)).toBe(true);
  });

  it("still recedes while ANOTHER editor's pill menu is open", async () => {
    const w = await mountPillEditor();
    addForeignPillMenu();

    await typeAndWaitForRecede(w.find(".editor-content").element);

    expect(
      isReceded(w),
      "a foreign editor's open menu must not freeze this editor's chrome"
    ).toBe(true);
  });

  it("unblocks when the pill unmounts with a menu still open (#R24-6)", async () => {
    // isPillMode can flip off without any click (window snap across the 640px
    // gate, a keyboard view-mode switch, a host prop change). The pill's
    // menu-open watch never fires on teardown, so the host's flag stayed true
    // FOREVER: the chrome never receded again until the user happened to open
    // and close another pill menu.
    const w = await mountPillEditor();
    const pill = w.findComponent(PlayheadPill);
    pill.vm.$emit("menu-open-change", true);
    await nextTick();

    // The pill unmounts while its menu is open (no click, no state change).
    await w.setProps({ toolbarMode: "bar" });
    await nextTick();
    expect(w.findComponent(PlayheadPill).exists()).toBe(false);

    // Back to pill mode: a typing burst must recede again.
    await w.setProps({ toolbarMode: "pill" });
    await nextTick();

    await typeAndWaitForRecede(w.find(".editor-content").element);

    expect(
      isReceded(w),
      "a menu that no longer exists must not block the recede"
    ).toBe(true);
  });

  it("does not recede while its OWN pill menu is open", async () => {
    // The guard the document-wide query was there to provide, kept intact:
    // the chrome must never dissolve under a menu the user is reading.
    const w = await mountPillEditor();
    const pill = w.findComponent(PlayheadPill);
    expect(pill.exists(), "pill mode should render the playhead").toBe(true);

    pill.vm.$emit("menu-open-change", true);
    await nextTick();

    await typeAndWaitForRecede(w.find(".editor-content").element);

    expect(isReceded(w)).toBe(false);
  });
});
