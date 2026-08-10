import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import EditorPanels from "../EditorPanels.vue";

/**
 * R23-55: the split-view right-hand editing surface was a bare contenteditable
 * with no role="textbox", aria-multiline or aria-label — the main surface has
 * all three — so a screen-reader user could not tell they were in an editor,
 * nor which of the two surfaces. Give it the same accessible name as the main.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("split editing surface has editor semantics (#R23-55)", () => {
  it("names the right-hand editor like the main surface", () => {
    wrapper = mount(EditorPanels, {
      props: { viewMode: "split", splitRightMode: "editor" },
    });

    // The VISIBLE right-hand editor, not the hidden display:none WYSIWYG mirror
    // that code/split view also renders.
    const splitSurface = wrapper.find(".split-editor-panel .editor-content");
    expect(splitSurface.exists()).toBe(true);
    expect(splitSurface.attributes("role")).toBe("textbox");
    expect(splitSurface.attributes("aria-multiline")).toBe("true");
    expect(splitSurface.attributes("aria-label")).toBeTruthy();
  });
});
