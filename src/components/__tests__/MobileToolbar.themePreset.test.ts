import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import MobileToolbar from "../MobileToolbar.vue";

/**
 * R23-35 (own-recent-code): the teleported mobile bar mirrored only
 * `theme-dark` and `fullscreen` from its editor root — never the
 * `nle-theme-<preset>` class. So with a themePreset the bar fell back to the
 * BASE palette while the editor body, context menu and every modal (which all
 * receive themeClass + themePresetClass) rendered in the preset. The bar must
 * carry the preset class too, or a teleported node cannot resolve the preset
 * tokens (which live on `.nle-theme-<preset>`).
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

const makeEditor = (...classes: string[]): HTMLElement => {
  const el = document.createElement("div");
  el.className = ["next-level-editor", ...classes].join(" ");
  document.body.appendChild(el);
  return el;
};

let wrapper: VueWrapper | null = null;

const mountToolbar = async (editorRoot: HTMLElement) => {
  wrapper = mount(MobileToolbar, {
    props: { visible: true, editorRoot },
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

describe("mobile toolbar mirrors the theme preset (#R23-35)", () => {
  it("carries its editor's nle-theme-<preset> class", async () => {
    const editor = makeEditor("theme-dark", "nle-theme-midnight");
    await mountToolbar(editor);

    const bar = wrapper!.find(".mobile-toolbar");
    expect(bar.classes()).toContain("theme-dark");
    expect(bar.classes()).toContain("nle-theme-midnight");
  });

  it("carries no preset class when the editor has none", async () => {
    const editor = makeEditor("theme-dark");
    await mountToolbar(editor);

    const bar = wrapper!.find(".mobile-toolbar");
    expect(bar.classes().some((c) => c.startsWith("nle-theme-"))).toBe(false);
  });

  it("mirrors a different editor's preset, not the first on the page", async () => {
    makeEditor("nle-theme-warm"); // another editor, first in the DOM
    const own = makeEditor("nle-theme-midnight");

    await mountToolbar(own);

    const bar = wrapper!.find(".mobile-toolbar");
    expect(bar.classes()).toContain("nle-theme-midnight");
    expect(bar.classes()).not.toContain("nle-theme-warm");
  });
});
