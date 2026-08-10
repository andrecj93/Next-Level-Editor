import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-26: the History Timeline panel was a bare <div> — no role, no accessible
 * name — so nothing was announced when it opened. Focus never moved into it
 * either: its Clear/Export/entry controls were only reachable by Tab-ing from
 * the top of the page, and Escape closed it without restoring focus.
 *
 * It is a NON-MODAL panel (the page stays interactive, no focus trap), so the
 * correct ARIA is a labelled `region` landmark — not `dialog`, which would also
 * collide with the e2e specs that locate modals by [role="dialog"].
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const mountEditor = async () => {
  wrapper = mount(NextLevelEditor, {
    props: { modelValue: "<p>hi</p>" },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
};

const toggleTimeline = async () => {
  (
    wrapper!.vm as unknown as { showHistoryTimeline: boolean }
  ).showHistoryTimeline = true;
  await nextTick();
  await nextTick();
};

describe("History Timeline panel is announced and takes focus (#R23-26)", () => {
  it("exposes a labelled region, not an anonymous div", async () => {
    await mountEditor();
    await toggleTimeline();

    const panel = wrapper!.find(".history-timeline-panel");
    expect(panel.exists()).toBe(true);
    expect(panel.attributes("role")).toBe("region");
    expect(panel.attributes("aria-label")).toBeTruthy();
  });

  it("moves focus into the panel when it opens", async () => {
    await mountEditor();
    // Somewhere sensible to come back to.
    const surface = wrapper!.find(".editor-content").element as HTMLElement;
    surface.focus();

    await toggleTimeline();

    const panel = wrapper!.find(".history-timeline-panel").element;
    expect(document.activeElement).not.toBe(document.body);
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to where it came from when it closes", async () => {
    await mountEditor();
    const surface = wrapper!.find(".editor-content").element as HTMLElement;
    surface.focus();
    await toggleTimeline();
    // Precondition: focus really did leave the surface for the panel, so the
    // restore below is load-bearing rather than "focus never moved".
    expect(document.activeElement).not.toBe(surface);

    // Escape / the Tools toggle both route through the same close.
    (
      wrapper!.vm as unknown as { showHistoryTimeline: boolean }
    ).showHistoryTimeline = false;
    await nextTick();
    await nextTick();

    // The panel is destroyed by v-if, so without a restore focus falls to body.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(surface);
  });
});
