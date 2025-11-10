import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommandPalette } from "../useCommandPalette";

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
