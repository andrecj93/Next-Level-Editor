import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useAdvancedKeyboardShortcuts } from "../useAdvancedKeyboardShortcuts";

/**
 * loadCustomBindings only caught JSON.parse errors, not SHAPE errors. A stored
 * binding that is valid JSON but the wrong shape (e.g. keys is a string, not an
 * array — schema drift across versions) was .set() into the registry, then
 * handleKeyboardEvent's `activeKeys.some(...)` threw TypeError on EVERY keydown,
 * bricking the whole editor's keyboard. Malformed entries must be skipped.
 */
const STORAGE_KEY = "nle-custom-shortcuts";

describe("useShortcutRegistry tolerates schema-drifted custom bindings", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const keydown = (init: KeyboardEventInit) =>
    new KeyboardEvent("keydown", { cancelable: true, ...init });

  it("does not throw on keydown when a stored binding has a non-array keys", () => {
    // Valid JSON, wrong shape: keys should be string[].
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ shortcutId: "bold", keys: "ctrl+b" }])
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const bold = vi.fn();
    const { handleKeydown } = useAdvancedKeyboardShortcuts(
      ref<HTMLDivElement | null>(null),
      { bold } as never
    );

    // Before the fix this throws "activeKeys.some is not a function".
    expect(() => handleKeydown(keydown({ key: "b", ctrlKey: true }))).not.toThrow();
  });

  it("ignores the malformed binding and keeps the DEFAULT shortcut working", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { shortcutId: "bold", keys: 42 }, // garbage
        { keys: ["ctrl+i"] }, // missing shortcutId
      ])
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const bold = vi.fn();
    const { handleKeydown } = useAdvancedKeyboardShortcuts(
      ref<HTMLDivElement | null>(null),
      { bold } as never
    );

    // The default Ctrl+B still fires (the bad custom entry was dropped).
    handleKeydown(keydown({ key: "b", ctrlKey: true }));
    expect(bold).toHaveBeenCalledTimes(1);
  });
});
