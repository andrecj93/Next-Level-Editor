import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * r13 #12 end-to-end wiring: the input event's inputType flows
 * EditorPanels → NextLevelEditor.onInput → useEditorEvents → useEditorContent
 * → useEditorHistory, so a rapid typing burst coalesces into ONE undo step —
 * a single Ctrl+Z reverts the whole run instead of one character.
 */
let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  window.getSelection()?.removeAllRanges();
});

describe("typing burst coalesces into one undo step (#12)", () => {
  it("a single Ctrl+Z reverts a rapid multi-keystroke burst", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>start</p>" },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const surface = wrapper.find(".editor-content");
    const el = surface.element as HTMLElement;

    // Keyless boundary capture — the pre-burst state undo must land on.
    el.innerHTML = "<p>base</p>";
    await surface.trigger("input");
    await nextTick();

    // Rapid typing burst (real inputType, as the browser sends it).
    el.innerHTML = "<p>basea</p>";
    await surface.trigger("input", { inputType: "insertText" });
    el.innerHTML = "<p>baseab</p>";
    await surface.trigger("input", { inputType: "insertText" });
    el.innerHTML = "<p>baseabc</p>";
    await surface.trigger("input", { inputType: "insertText" });
    await nextTick();

    // ONE undo reverts the whole burst, not one character.
    await surface.trigger("keydown", { key: "z", ctrlKey: true });
    await nextTick();
    await nextTick();

    expect(el.textContent).toBe("base");
  });
});
