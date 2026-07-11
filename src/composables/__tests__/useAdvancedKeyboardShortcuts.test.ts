import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useAdvancedKeyboardShortcuts } from "../useAdvancedKeyboardShortcuts";

/**
 * The registry ships ~80 shortcuts, but only the ones wired to a real editor
 * action may be active — the rest must be disabled so they neither fire nor
 * appear in the help modal, and native keys (Ctrl+C/X/V) are never hijacked.
 */
describe("useAdvancedKeyboardShortcuts", () => {
  const editor = ref<HTMLDivElement | null>(null);

  const keydown = (init: KeyboardEventInit) =>
    new KeyboardEvent("keydown", { cancelable: true, ...init });

  it("enables and fires a shortcut that is wired to an action", () => {
    const bold = vi.fn();
    const { handleKeydown, registry } = useAdvancedKeyboardShortcuts(editor, {
      bold,
    });

    expect(registry.getShortcut("bold")?.enabled).toBe(true);

    const event = keydown({ key: "b", ctrlKey: true });
    const handled = handleKeydown(event);

    expect(bold).toHaveBeenCalledTimes(1);
    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("disables shortcuts with no backing action so they never fire", () => {
    const { handleKeydown, registry } = useAdvancedKeyboardShortcuts(editor, {
      bold: vi.fn(),
    });

    // 'cut' is part of the registry but was not wired.
    expect(registry.getShortcut("cut")?.enabled).toBe(false);

    // Native Ctrl+X must pass through untouched (not prevented, not handled).
    const event = keydown({ key: "x", ctrlKey: true });
    const handled = handleKeydown(event);
    expect(handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("only exposes wired shortcuts as enabled (help modal reads this)", () => {
    const { registry } = useAdvancedKeyboardShortcuts(editor, {
      bold: vi.fn(),
      strikethrough: vi.fn(),
    });

    const enabledIds = registry
      .getAllShortcuts()
      .filter((s) => s.enabled)
      .map((s) => s.id);

    expect(enabledIds).toContain("bold");
    expect(enabledIds).toContain("strikethrough");
    // Unwired ones stay out.
    expect(enabledIds).not.toContain("italic");
    expect(enabledIds).not.toContain("copy");
    expect(enabledIds).not.toContain("zoomIn");
  });

  it("returns false for a key that matches no enabled shortcut", () => {
    const { handleKeydown } = useAdvancedKeyboardShortcuts(editor, {
      bold: vi.fn(),
    });
    const event = keydown({ key: "j", ctrlKey: true, altKey: true });
    expect(handleKeydown(event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});
