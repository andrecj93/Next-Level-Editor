import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import AriaLiveRegion from "../AriaLiveRegion.vue";
import { useAccessibility } from "../../composables/useAccessibility";

/**
 * R23-25 / R23-32: every editor rendered its own
 * `<div id="aria-live-polite">` and `<div id="aria-live-assertive">`, while
 * useAccessibility deliberately keeps its announcement queue in MODULE scope so
 * an announce() from anywhere reaches the regions. With two editors on a page
 * both regions therefore showed the same text at the same moment and a screen
 * reader spoke every message twice. The duplicate element ids are also invalid
 * HTML and break any aria-describedby that ever targets them.
 *
 * Shared state wants a single rendered consumer: exactly one live region per
 * page, whichever editor happens to own it.
 */
describe("aria-live regions are a page singleton (#R23-25)", () => {
  const wrappers: VueWrapper[] = [];

  afterEach(() => {
    while (wrappers.length) wrappers.pop()?.unmount();
    document.body.innerHTML = "";
  });

  const mountRegion = () => {
    const w = mount(AriaLiveRegion, { attachTo: document.body });
    wrappers.push(w);
    return w;
  };

  const politeRegions = () =>
    document.querySelectorAll("#aria-live-polite");
  const assertiveRegions = () =>
    document.querySelectorAll("#aria-live-assertive");

  it("renders one polite and one assertive region for two editors", async () => {
    mountRegion();
    mountRegion();
    await nextTick();

    expect(politeRegions()).toHaveLength(1);
    expect(assertiveRegions()).toHaveLength(1);
  });

  it("still announces through the surviving region", async () => {
    mountRegion();
    mountRegion();
    await nextTick();

    useAccessibility().announce("Undone");
    await nextTick();

    expect(politeRegions()).toHaveLength(1);
    expect(politeRegions()[0].textContent).toContain("Undone");
  });

  it("hands ownership on when the owning editor unmounts", async () => {
    const first = mountRegion();
    mountRegion();
    await nextTick();
    expect(politeRegions()).toHaveLength(1);

    // The first editor is removed from the page; the second must take over so
    // announcements do not go silent.
    first.unmount();
    wrappers.splice(wrappers.indexOf(first), 1);
    await nextTick();

    expect(politeRegions()).toHaveLength(1);

    useAccessibility().announce("Redone");
    await nextTick();
    expect(politeRegions()[0].textContent).toContain("Redone");
  });

  it("renders normally when it is the only editor on the page", async () => {
    mountRegion();
    await nextTick();

    expect(politeRegions()).toHaveLength(1);
    expect(assertiveRegions()).toHaveLength(1);
  });
});
