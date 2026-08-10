import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R26-4: mounting straight into Preview (newly viable since #R25-18) skipped
 * the mount-time editor init — useEditorSetup's onMounted bails when no
 * surface exists. Switching to Editor later only filled innerHTML: the
 * pristine-document history BASELINE was never captured, so after the first
 * edit canUndo stayed false and the user could never undo back to the loaded
 * document. (The keydown listener was already safe — the surface watch
 * re-binds it — and spellcheck init rides along with the late baseline.)
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("preview-first mount still gets a working editor (#R26-4)", () => {
  it("the first edit after switching to Editor is undoable back to the document", async () => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: "<p>loaded document</p>",
        defaultViewMode: "preview",
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const vm = wrapper.vm as unknown as {
      viewMode: string;
      historyIndex: number;
      undo: () => void;
    };
    vm.viewMode = "editor";
    await nextTick();
    await nextTick();

    const surface = wrapper.find(".editor-content");
    expect(surface.exists()).toBe(true);
    expect(surface.element.innerHTML).toContain("loaded document");

    // One real edit through the input pipeline.
    surface.element.innerHTML = "<p>loaded document edited</p>";
    await surface.trigger("input");
    await nextTick();

    expect(
      vm.historyIndex,
      "the loaded document must exist as the undo baseline beneath the edit"
    ).toBeGreaterThan(0);

    vm.undo();
    await nextTick();
    expect(surface.element.innerHTML).toContain("loaded document");
    expect(surface.element.innerHTML).not.toContain("edited");
  });
});
