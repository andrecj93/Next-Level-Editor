import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useEditorUIState } from "../useEditorUIState";

/**
 * R23-6: fullscreen is requested on document.documentElement (deliberately —
 * fullscreening only the editor root would hide every teleported modal and
 * menu, which live in <body>). But that means `document.fullscreenElement`
 * cannot say WHICH editor asked for it, and every mounted instance listened to
 * the one document-level `fullscreenchange` and set its own flag from that
 * global. With two editors on a page, clicking Fullscreen on the first put BOTH
 * editor roots into `position:fixed; inset:0; z-index:9999` — same rect, same
 * z-index, same stacking context — so the one later in DOM order painted over
 * the other and the user was dropped into the wrong document.
 */
describe("fullscreen belongs to the editor that asked for it (#R23-6)", () => {
  const wrappers: VueWrapper[] = [];

  afterEach(() => {
    while (wrappers.length) wrappers.pop()?.unmount();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
  });

  const setFullscreenElement = (el: Element | null) => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: el,
    });
  };

  const mountEditorState = () => {
    let api!: ReturnType<typeof useEditorUIState>;
    const TestComponent = defineComponent({
      setup() {
        api = useEditorUIState();
        return () => h("div");
      },
    });
    wrappers.push(mount(TestComponent));
    return api;
  };

  /** What the browser does after a successful requestFullscreen. */
  const browserEntersFullscreen = () => {
    setFullscreenElement(document.documentElement);
    document.dispatchEvent(new Event("fullscreenchange"));
  };

  it("only the requesting editor goes fullscreen", () => {
    const first = mountEditorState();
    const second = mountEditorState();

    first.toggleFullScreen();
    browserEntersFullscreen();

    expect(first.isFullScreen.value).toBe(true);
    expect(second.isFullScreen.value).toBe(false);
  });

  it("the second editor can own fullscreen just as well as the first", () => {
    const first = mountEditorState();
    const second = mountEditorState();

    second.toggleFullScreen();
    browserEntersFullscreen();

    expect(first.isFullScreen.value).toBe(false);
    expect(second.isFullScreen.value).toBe(true);
  });

  it("Esc clears the owner so a later request is honoured", () => {
    const first = mountEditorState();
    const second = mountEditorState();

    first.toggleFullScreen();
    browserEntersFullscreen();
    expect(first.isFullScreen.value).toBe(true);

    // User presses Esc — the browser exits and fires the event itself.
    setFullscreenElement(null);
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(first.isFullScreen.value).toBe(false);
    expect(second.isFullScreen.value).toBe(false);

    // Now the OTHER editor asks.
    second.toggleFullScreen();
    browserEntersFullscreen();
    expect(first.isFullScreen.value).toBe(false);
    expect(second.isFullScreen.value).toBe(true);
  });

  it("a host page fullscreening itself does not restyle any editor", () => {
    const only = mountEditorState();

    // Nobody called toggleFullScreen — this is the host's own request.
    browserEntersFullscreen();

    expect(only.isFullScreen.value).toBe(false);
  });
});
