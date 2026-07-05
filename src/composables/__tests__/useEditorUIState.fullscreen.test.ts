import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useEditorUIState } from "../useEditorUIState";

// Regression for #5: isFullScreen must follow the real fullscreen state, so it
// does not get stuck "on" when the user exits fullscreen via Esc/F11 (which the
// browser handles directly, bypassing toggleFullScreen).
describe("useEditorUIState fullscreen sync", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
  });

  const setFullscreenElement = (el: Element | null) => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: el,
    });
  };

  it("updates isFullScreen from the fullscreenchange event", async () => {
    let api!: ReturnType<typeof useEditorUIState>;
    const TestComponent = defineComponent({
      setup() {
        api = useEditorUIState();
        return () => h("div");
      },
    });
    wrapper = mount(TestComponent);

    expect(api.isFullScreen.value).toBe(false);

    // Enter fullscreen (browser sets fullscreenElement, then fires the event).
    setFullscreenElement(document.documentElement);
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(api.isFullScreen.value).toBe(true);

    // Exit via Esc/F11: fullscreenElement clears and the event fires without
    // toggleFullScreen ever being called.
    setFullscreenElement(null);
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(api.isFullScreen.value).toBe(false);
  });
});
