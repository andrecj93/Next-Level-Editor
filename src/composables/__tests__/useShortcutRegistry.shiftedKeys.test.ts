import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useAdvancedKeyboardShortcuts } from "../useAdvancedKeyboardShortcuts";

/**
 * Five advertised shortcuts could NEVER fire: with Shift held the browser
 * reports the SHIFTED character in event.key (Ctrl+Shift+8 → "*"), so
 * eventToKeyString produced "*+ctrl+shift" while the registered binding
 * "ctrl+shift+8" normalizes to "8+ctrl+shift" — no match, ever. The physical
 * base key must be recovered from event.code for digits/punctuation.
 */
describe("shift-shifted shortcut keys match their registered bindings", () => {
  const editor = ref<HTMLDivElement | null>(null);

  const keydown = (init: KeyboardEventInit) =>
    new KeyboardEvent("keydown", { cancelable: true, ...init });

  const CASES: Array<[string, string, string]> = [
    // [action name, event.key (shifted char on US layout), event.code]
    ["bulletList", "*", "Digit8"],
    ["numberedList", "&", "Digit7"],
    ["checkList", "(", "Digit9"],
    ["superscript", ">", "Period"],
    ["subscript", "<", "Comma"],
  ];

  it.each(CASES)(
    "%s fires from its Ctrl+Shift binding",
    (actionName, key, code) => {
      const spy = vi.fn();
      const { handleKeydown } = useAdvancedKeyboardShortcuts(editor, {
        [actionName]: spy,
      } as never);

      const event = keydown({ key, code, ctrlKey: true, shiftKey: true });
      const handled = handleKeydown(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(handled).toBe(true);
    }
  );

  it("still fires letter shortcuts (Ctrl+B) untouched", () => {
    const bold = vi.fn();
    const { handleKeydown } = useAdvancedKeyboardShortcuts(editor, {
      bold,
    } as never);
    handleKeydown(keydown({ key: "b", code: "KeyB", ctrlKey: true }));
    expect(bold).toHaveBeenCalledTimes(1);
  });
});
