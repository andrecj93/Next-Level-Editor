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

    // Enter fullscreen through the editor's own button — the flag now follows
    // OWNERSHIP as well as the global state, so that a second editor on the
    // page does not light up too (#R23-6). The browser then sets
    // fullscreenElement and fires the event.
    api.toggleFullScreen();
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

describe("useEditorUIState focus mode", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const mountState = () => {
    let api!: ReturnType<typeof useEditorUIState>;
    const TestComponent = defineComponent({
      setup() {
        api = useEditorUIState();
        return () => h("div");
      },
    });
    wrapper = mount(TestComponent, { attachTo: document.body });
    return api;
  };

  it("toggleFocusMode flips the in-page focus state (no fullscreen API)", () => {
    const api = mountState();
    expect(api.isFocusMode.value).toBe(false);
    api.toggleFocusMode();
    expect(api.isFocusMode.value).toBe(true);
    api.toggleFocusMode();
    expect(api.isFocusMode.value).toBe(false);
  });

  it("Escape exits focus mode", async () => {
    const api = mountState();
    api.toggleFocusMode();
    expect(api.isFocusMode.value).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(api.isFocusMode.value).toBe(false);
  });

  it("Escape does NOT exit focus mode when another handler already consumed it (defaultPrevented)", () => {
    const api = mountState();
    api.toggleFocusMode();
    expect(api.isFocusMode.value).toBe(true);

    // Simulate an overlay (modal/palette) that handled Escape first — its
    // capture-phase handler calls preventDefault, so the event reaches the
    // focus-mode listener already defaultPrevented.
    const consumed = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    consumed.preventDefault();
    document.dispatchEvent(consumed);
    expect(api.isFocusMode.value).toBe(true);

    // An unconsumed Escape then leaves focus mode.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(api.isFocusMode.value).toBe(false);
  });

  it("Escape is a no-op when focus mode is off", () => {
    const api = mountState();
    expect(api.isFocusMode.value).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(api.isFocusMode.value).toBe(false);
  });
});
