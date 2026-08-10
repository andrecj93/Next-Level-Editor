import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

// Force the device gate open (same approach as
// NextLevelEditor.mobileToolbar.test.ts) so these tests exercise the CLEARANCE
// OWNERSHIP layer rather than the width/touch gate, which has its own suite.
vi.mock("../../composables/useDeviceDetection", () => ({
  useDeviceDetection: () => ({ showMobileToolbar: ref(true) }),
}));

/**
 * R22-M2: --nle-mobile-toolbar-clearance is a SINGLE global property on <html>,
 * and MobileToolbar's showToolbar watcher is `immediate`. So a second,
 * NON-OWNING (hidden) toolbar ran clearClearance() at setup and erased the
 * OWNER's published value — and did it again on unmount — collapsing the
 * z-9998 FAB column down onto the visible bar.
 */
const CLEARANCE = "--nle-mobile-toolbar-clearance";

describe("clearance is only cleared by the toolbar that published it (#R22-M2)", () => {
  const wrappers: ReturnType<typeof mount>[] = [];

  const mountEditor = () => {
    const w = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>" },
      attachTo: document.body,
    });
    wrappers.push(w);
    return w;
  };

  const claimOwnership = async (w: ReturnType<typeof mount>) => {
    w.find(".editor-content").element.dispatchEvent(
      new Event("pointerdown", { bubbles: true })
    );
    await nextTick();
    await nextTick();
  };

  afterEach(() => {
    wrappers.splice(0).forEach((w) => w.unmount());
    document.body.innerHTML = "";
    document.documentElement.style.removeProperty(CLEARANCE);
  });

  it("a second, non-owning editor does not erase the owner's clearance", async () => {
    const a = mountEditor();
    await nextTick();
    await claimOwnership(a);

    const owned = document.documentElement.style.getPropertyValue(CLEARANCE);
    expect(owned).not.toBe("");

    mountEditor();
    await nextTick();
    await nextTick();

    expect(document.documentElement.style.getPropertyValue(CLEARANCE)).toBe(
      owned
    );
  });

  it("unmounting a non-owning editor does not erase the owner's clearance", async () => {
    const a = mountEditor();
    await nextTick();
    await claimOwnership(a);
    const owned = document.documentElement.style.getPropertyValue(CLEARANCE);
    expect(owned).not.toBe("");

    const b = mount(NextLevelEditor, {
      props: { modelValue: "<p>other</p>" },
      attachTo: document.body,
    });
    await nextTick();
    b.unmount();
    await nextTick();

    expect(document.documentElement.style.getPropertyValue(CLEARANCE)).toBe(
      owned
    );
  });
});
