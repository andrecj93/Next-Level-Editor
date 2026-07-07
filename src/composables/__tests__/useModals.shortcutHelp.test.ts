import { describe, it, expect, vi } from "vitest";
import { useModals } from "../useModals";

describe("useModals - shortcut help modal", () => {
  it("starts hidden and toggles via open/close", () => {
    const modals = useModals();

    expect(modals.showShortcutHelpModal.value).toBe(false);

    modals.openShortcutHelpModal();
    expect(modals.showShortcutHelpModal.value).toBe(true);

    modals.closeShortcutHelpModal();
    expect(modals.showShortcutHelpModal.value).toBe(false);
  });

  it("does not disturb the editor selection when opening (reference-only modal)", () => {
    const rememberSelection = vi.fn();
    const modals = useModals({ rememberSelection });

    modals.openShortcutHelpModal();
    expect(rememberSelection).not.toHaveBeenCalled();
  });
});
