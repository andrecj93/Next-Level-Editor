import { watch, nextTick, onBeforeUnmount, type Ref } from "vue";

/**
 * Shared WAI-ARIA dialog behavior for the editor's modals.
 *
 * Extracted from LinkModal so every modal gets the same contract that
 * `role="dialog"` + `aria-modal="true"` promise:
 * - Escape closes the dialog (capture-phase, so it wins over editor shortcuts)
 * - Tab / Shift+Tab are trapped inside the dialog and wrap around
 * - focus moves into the dialog when it opens (a chosen element, or the
 *   first focusable control)
 * - focus returns to the previously focused element when it closes
 *
 * The composable only manages keyboard + focus concerns. Form state (reset
 * on open/close, validation, submit) stays in the component.
 */

export interface ModalDialogOptions {
  /** Reactive getter for the open state, e.g. `() => props.isOpen`. */
  isOpen: () => boolean;
  /** The dialog panel element (the box carrying `role="dialog"`). */
  container: Ref<HTMLElement | null>;
  /** Close the dialog (typically `() => emit("close")`). Invoked on Escape. */
  onClose: () => void;
  /**
   * Element to focus when the dialog opens. Falls back to the first
   * focusable control inside `container` when absent or returning null.
   */
  initialFocus?: () => HTMLElement | null | undefined;
  /**
   * Escape interceptor for dialogs with inner dismissable state (mention
   * dropdowns, key-recording overlays). Return `true` to consume the key
   * press without closing the dialog.
   */
  onEscape?: () => boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export function useModalDialog(options: ModalDialogOptions): void {
  /** Element focused before the dialog opened; focus returns to it on close. */
  let previouslyFocused: HTMLElement | null = null;

  const getFocusables = (): HTMLElement[] => {
    if (!options.container.value) return [];
    return Array.from(
      options.container.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (options.onEscape?.()) return;
      options.onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusables = getFocusables();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && !!options.container.value?.contains(active);

    if (event.shiftKey) {
      if (!inside || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const activate = () => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.addEventListener("keydown", handleKeydown, true);
    nextTick(() => {
      const target = options.initialFocus?.() ?? getFocusables()[0];
      target?.focus();
    });
  };

  const deactivate = () => {
    document.removeEventListener("keydown", handleKeydown, true);
    const target = previouslyFocused;
    previouslyFocused = null;
    if (target && target.isConnected) {
      // Wait for the overlay to leave the DOM before handing focus back.
      nextTick(() => target.focus());
    }
  };

  watch(
    options.isOpen,
    (open) => {
      if (open) {
        activate();
      } else {
        deactivate();
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleKeydown, true);
  });
}
