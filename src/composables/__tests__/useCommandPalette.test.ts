import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useCommandPalette } from "../useCommandPalette";

/**
 * The palette's keyboard shortcut is a document listener set up on mount, so it
 * needs a real component mount to exercise. Regression: the Mac binding was a
 * bare Cmd+K, which collided with Cmd+K = Insert Link. It is now Cmd/Ctrl+Shift+K
 * on both platforms.
 */
describe("useCommandPalette keyboard shortcut", () => {
  let wrapper: VueWrapper | null = null;
  const realPlatform = navigator.platform;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    Object.defineProperty(navigator, "platform", {
      value: realPlatform,
      configurable: true,
    });
  });

  const mountPalette = () => {
    let api!: ReturnType<typeof useCommandPalette>;
    const TestComponent = defineComponent({
      setup() {
        api = useCommandPalette();
        return () => h("div");
      },
    });
    wrapper = mount(TestComponent, { attachTo: document.body });
    return api;
  };

  const press = (init: KeyboardEventInit) =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })
    );

  it("Ctrl+Shift+K toggles the palette; Ctrl+K (link) does not", () => {
    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      configurable: true,
    });
    const { showCommandPalette } = mountPalette();
    expect(showCommandPalette.value).toBe(false);

    press({ key: "k", ctrlKey: true });
    expect(showCommandPalette.value).toBe(false); // no collision with Ctrl+K

    press({ key: "K", ctrlKey: true, shiftKey: true });
    expect(showCommandPalette.value).toBe(true);
  });

  it("on macOS, Cmd+K (link) does NOT open the palette; Cmd+Shift+K does", () => {
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    });
    const { showCommandPalette } = mountPalette();

    press({ key: "k", metaKey: true });
    expect(showCommandPalette.value).toBe(false); // the fixed collision

    press({ key: "K", metaKey: true, shiftKey: true });
    expect(showCommandPalette.value).toBe(true);
  });
});

describe("useCommandPalette", () => {
  beforeEach(() => {
    // Suppress Vue lifecycle warnings for these tests
    const warnSpy = vi.spyOn(console, "warn");
    warnSpy.mockImplementation((msg) => {
      if (typeof msg === "string" && msg.includes("Lifecycle injection APIs")) {
        return;
      }
      console.warn(msg);
    });
  });

  describe("State Management", () => {
    it("should initialize with palette closed", () => {
      const { showCommandPalette } = useCommandPalette();
      expect(showCommandPalette.value).toBe(false);
    });

    it("should initialize with empty recent commands", () => {
      const { recentCommands } = useCommandPalette();
      expect(recentCommands.value).toEqual([]);
    });

    it("should open command palette", () => {
      const { showCommandPalette, openCommandPalette } = useCommandPalette();
      openCommandPalette();
      expect(showCommandPalette.value).toBe(true);
    });

    it("should close command palette", () => {
      const { showCommandPalette, openCommandPalette, closeCommandPalette } =
        useCommandPalette();
      openCommandPalette();
      closeCommandPalette();
      expect(showCommandPalette.value).toBe(false);
    });

    it("should toggle command palette", () => {
      const { showCommandPalette, toggleCommandPalette } = useCommandPalette();

      toggleCommandPalette();
      expect(showCommandPalette.value).toBe(true);

      toggleCommandPalette();
      expect(showCommandPalette.value).toBe(false);
    });
  });

  describe("Recent Commands", () => {
    it("should add command to recent history", () => {
      const { recentCommands, addToRecent } = useCommandPalette();

      addToRecent("cmd1");
      expect(recentCommands.value).toEqual(["cmd1"]);
    });

    it("should add multiple commands to recent history", () => {
      const { recentCommands, addToRecent } = useCommandPalette();

      addToRecent("cmd1");
      addToRecent("cmd2");
      addToRecent("cmd3");

      expect(recentCommands.value).toEqual(["cmd3", "cmd2", "cmd1"]);
    });

    it("should move existing command to front when added again", () => {
      const { recentCommands, addToRecent } = useCommandPalette();

      addToRecent("cmd1");
      addToRecent("cmd2");
      addToRecent("cmd1");

      expect(recentCommands.value).toEqual(["cmd1", "cmd2"]);
    });

    it("should limit recent commands to 5", () => {
      const { recentCommands, addToRecent } = useCommandPalette();

      for (let i = 1; i <= 7; i++) {
        addToRecent(`cmd${i}`);
      }

      expect(recentCommands.value.length).toBe(5);
      expect(recentCommands.value).toEqual([
        "cmd7",
        "cmd6",
        "cmd5",
        "cmd4",
        "cmd3",
      ]);
    });
  });

  describe("Keyboard Event Listener", () => {
    it("should set up keyboard event listener on mount", () => {
      // The composable sets up listeners in onMounted which requires a component context
      // This is tested through the CommandPalette component tests instead
      const composable = useCommandPalette();
      expect(composable).toBeDefined();
      expect(composable.showCommandPalette).toBeDefined();
      expect(composable.openCommandPalette).toBeDefined();
    });

    it("should handle adding same command multiple times", () => {
      const { recentCommands, addToRecent } = useCommandPalette();

      addToRecent("cmd1");
      addToRecent("cmd1");
      addToRecent("cmd1");

      expect(recentCommands.value).toEqual(["cmd1"]);
    });
  });
});
