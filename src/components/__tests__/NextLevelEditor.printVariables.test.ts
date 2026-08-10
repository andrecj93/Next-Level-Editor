import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * #17 wiring: the editor re-resolves every variable pill's data-value on the
 * browser's `beforeprint` event, so the print CSS (content: attr(data-value))
 * shows current values instead of the stale one stamped at insertion.
 */
let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("variable pills refresh before printing (#17)", () => {
  it("re-resolves a stale pill data-value on beforeprint", async () => {
    wrapper = mount(NextLevelEditor, {
      props: {
        enableVariables: true,
        modelValue:
          '<p><span class="editor-variable" contenteditable="false" ' +
          'data-variable="date.now" data-value="STALE">{{ date.now }}</span></p>',
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const pill = () =>
      wrapper!
        .find(".editor-content")
        .element.querySelector<HTMLElement>(".editor-variable");
    // The stale value is present after mount…
    expect(pill()?.getAttribute("data-value")).toBe("STALE");

    window.dispatchEvent(new Event("beforeprint"));
    await nextTick();

    // …and refreshed to a current, non-empty value before print.
    const refreshed = pill()?.getAttribute("data-value");
    expect(refreshed).toBeTruthy();
    expect(refreshed).not.toBe("STALE");
  });
});
