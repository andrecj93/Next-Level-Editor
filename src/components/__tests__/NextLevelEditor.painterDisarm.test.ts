import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import {
  copyFormat,
  hasFormatCopied,
  clearCopiedFormat,
} from "../../utils/formatPainter";

/**
 * #19: the Format Painter had no disarm path — once a format was copied it
 * stayed armed indefinitely (and the module-level state even leaked across
 * editor instances), with Escape doing nothing. Escape now clears it.
 */
let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  clearCopiedFormat();
  window.getSelection()?.removeAllRanges();
});

describe("Escape disarms the Format Painter (#19)", () => {
  it("clears the copied format on Escape", async () => {
    clearCopiedFormat();
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hello</p>" },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const surface = wrapper.find(".editor-content");
    const p = surface.element.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    // Arm the painter.
    copyFormat(sel);
    expect(hasFormatCopied()).toBe(true);

    // Escape disarms it.
    await surface.trigger("keydown", { key: "Escape" });
    expect(hasFormatCopied()).toBe(false);
  });
});
