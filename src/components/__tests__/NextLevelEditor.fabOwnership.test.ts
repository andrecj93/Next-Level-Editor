import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ModalsContainer from "../ModalsContainer.vue";

/**
 * R23-30: the FAB column is `position: fixed; right: 28px`, so every mounted
 * editor paints its comments/stats/variables circles on the SAME viewport
 * pixels. Two editors on a page therefore stack two identical 56px circles: the
 * user cannot tell whose comments they are toggling, and only the last-painted
 * one receives the click. R23-58 is the same bug for the auto-save chip.
 *
 * The fix is ownership (useFloatingChromeOwner), not a layout offset: stacking
 * them in a taller column would still leave two unlabelled circles for the same
 * feature, and the coordinates would collide again on the third instance.
 */
const wrappers: VueWrapper[] = [];

const mountEditor = async (
  props: Record<string, unknown> = {}
): Promise<VueWrapper> => {
  const w = mount(NextLevelEditor, {
    props: { modelValue: "<p>hi</p>", enableComments: true, ...props },
    attachTo: document.body,
  });
  wrappers.push(w);
  await nextTick();
  return w;
};

afterEach(() => {
  while (wrappers.length > 0) wrappers.pop()!.unmount();
  document.body.innerHTML = "";
});

const commentFabs = () =>
  document.querySelectorAll(".comments-toggle-fab").length;

describe("fixed chrome belongs to one editor at a time (#R23-30, #R23-58)", () => {
  it("a lone editor still shows its comments FAB", async () => {
    // Control: the fix must not cost the single-editor page its affordance.
    await mountEditor();

    expect(commentFabs()).toBe(1);
  });

  it("two editors paint only ONE comments FAB", async () => {
    await mountEditor();
    await mountEditor();

    expect(commentFabs()).toBe(1);
  });

  it("the FAB follows the editor the user interacts with", async () => {
    const first = await mountEditor();
    const second = await mountEditor();
    expect(first.find(".comments-toggle-fab").exists()).toBe(true);

    second
      .find(".editor-content")
      .element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();

    expect(second.find(".comments-toggle-fab").exists()).toBe(true);
    expect(first.find(".comments-toggle-fab").exists()).toBe(false);
    expect(commentFabs()).toBe(1);
  });

  it("the writing-stats PANEL follows ownership like its FAB does (#R24-7)", async () => {
    // The stats panel is fixed to the same corner (bottom: 180px; right: 32px).
    // The FAB was gated in batch 127; the panel it opens was missed — so a
    // panel left open floated over the OTHER editor's FAB column after an
    // ownership handover. (v-show, not v-if: see the #R25-6 test below.)
    const first = await mountEditor({ showWritingStats: true });
    const second = await mountEditor({ showWritingStats: true });

    // Open the first editor's stats panel while it owns the corner.
    await first.find(".writing-stats-toggle-fab").trigger("click");
    expect(first.find(".writing-stats-panel").isVisible()).toBe(true);

    // Hand the corner to the second editor.
    second
      .find(".editor-content")
      .element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();

    const panel = first.find(".writing-stats-panel");
    expect(
      !panel.exists() || !panel.isVisible(),
      "the non-owner's panel must leave the corner"
    ).toBe(true);
  });

  it("an ownership bounce does not reset the panel's collapse state (#R25-6)", async () => {
    // Batch 129 gated the panel with v-if, which DESTROYED its internal
    // state: the user's collapse choice silently reverted on every handover
    // (including pure scroll-driven ones). Hidden, not unmounted.
    const first = await mountEditor({ showWritingStats: true });
    const second = await mountEditor({ showWritingStats: true });
    await first.find(".writing-stats-toggle-fab").trigger("click");

    await first.find('[aria-label="Collapse panel"]').trigger("click");
    expect(first.find(".writing-stats-panel").classes()).toContain("collapsed");

    // Bounce ownership away and back.
    second
      .find(".editor-content")
      .element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();
    first
      .find(".editor-content")
      .element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();

    const panel = first.find(".writing-stats-panel");
    expect(panel.isVisible()).toBe(true);
    expect(
      panel.classes(),
      "the user's collapse choice must survive the bounce"
    ).toContain("collapsed");
  });

  it("tells ModalsContainer whether it owns the auto-save chip", async () => {
    const first = await mountEditor();
    const second = await mountEditor();

    expect(
      first.findComponent(ModalsContainer).props("ownsFixedChrome")
    ).toBe(true);
    expect(
      second.findComponent(ModalsContainer).props("ownsFixedChrome")
    ).toBe(false);
  });
});
