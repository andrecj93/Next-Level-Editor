import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import MobileToolbar from "../MobileToolbar.vue";

// Force "mobile viewport" so the toolbar's device gate is open and the tests
// exercise the `visible` ownership prop / close / dead-button behavior.
vi.mock("../../composables/useDeviceDetection", () => ({
  useDeviceDetection: () => ({ showMobileToolbar: ref(true) }),
}));

const CLEARANCE_PROP = "--nle-mobile-toolbar-clearance";

const bodyToolbar = () => document.body.querySelector(".mobile-toolbar");

describe("MobileToolbar", () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    document.documentElement.style.removeProperty(CLEARANCE_PROP);
  });

  it("renders (teleported to body) when visible on a mobile device", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();
    expect(bodyToolbar()).not.toBeNull();
  });

  it("does NOT render when the owning editor sets visible=false (multi-instance ownership)", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: false } });
    await nextTick();
    expect(bodyToolbar()).toBeNull();
  });

  it("hides when visible flips to false (ownership stolen by another instance)", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();
    expect(bodyToolbar()).not.toBeNull();

    await wrapper.setProps({ visible: false });
    expect(bodyToolbar()).toBeNull();
  });

  it("emits 'close' when the X button is pressed", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();

    const closeBtn = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Close toolbar"]'
    );
    expect(closeBtn).not.toBeNull();
    closeBtn!.click();
    await nextTick();

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("ships no dead buttons: Checklist, Export, Settings, Keyboard Shortcuts are gone", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();

    const labels = Array.from(
      document.body.querySelectorAll(".mobile-toolbar button[aria-label]")
    ).map((b) => b.getAttribute("aria-label"));

    // Removed until real handlers exist (see MobileToolbar.vue comments).
    expect(labels).not.toContain("Convert to Checklist");
    expect(labels).not.toContain("Export");
    expect(labels).not.toContain("Settings");
    expect(labels).not.toContain("Keyboard Shortcuts");

    // Wired actions are still offered.
    expect(labels).toContain("Undo");
    expect(labels).toContain("Redo");
    expect(labels).toContain("Find & Replace");
    expect(labels).toContain("Convert to Quote");
  });

  it("publishes its bottom clearance as a root CSS property while visible, and clears it when hidden", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();
    await nextTick(); // clearance is measured on the tick after render

    expect(
      document.documentElement.style.getPropertyValue(CLEARANCE_PROP)
    ).toMatch(/px$/);

    await wrapper.setProps({ visible: false });
    await nextTick();
    expect(
      document.documentElement.style.getPropertyValue(CLEARANCE_PROP)
    ).toBe("");
  });

  it("clears the clearance property on unmount", async () => {
    wrapper = mount(MobileToolbar, { props: { visible: true } });
    await nextTick();
    await nextTick();
    expect(
      document.documentElement.style.getPropertyValue(CLEARANCE_PROP)
    ).not.toBe("");

    wrapper.unmount();
    wrapper = null;
    expect(
      document.documentElement.style.getPropertyValue(CLEARANCE_PROP)
    ).toBe("");
  });
});
