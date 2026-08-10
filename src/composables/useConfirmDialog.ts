import { ref } from "vue";

export interface ConfirmDialogOptions {
  /** Dialog heading, e.g. "Replace document?" */
  title: string;
  /** Body copy explaining the consequence (and the recovery path, if any). */
  message: string;
  /** Label of the confirming button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label of the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Destructive action → the confirm button renders in the danger style. */
  danger?: boolean;
}

type ResolvedOptions = Required<ConfirmDialogOptions>;

const DEFAULTS: ResolvedOptions = {
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  danger: false,
};

/**
 * Promise-based confirmation state for the shared ConfirmDialog component.
 *
 * Destructive flows (template overwrite, history clear, …) call
 * `requestConfirm(opts)` and await the user's decision instead of acting
 * immediately — replacing both the silent-overwrite pattern and the native
 * `confirm()` browser dialogs that clashed with the styled modal system.
 */
export function useConfirmDialog() {
  const isOpen = ref(false);
  const options = ref<ResolvedOptions>({ ...DEFAULTS });

  let resolver: ((confirmed: boolean) => void) | null = null;

  const settle = (confirmed: boolean) => {
    isOpen.value = false;
    const resolve = resolver;
    resolver = null;
    resolve?.(confirmed);
  };

  const requestConfirm = (opts: ConfirmDialogOptions): Promise<boolean> => {
    // A second request while one is pending cancels the first — the caller
    // that stopped waiting must not act.
    if (resolver) settle(false);
    options.value = { ...DEFAULTS, ...opts };
    isOpen.value = true;
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  };

  return {
    isOpen,
    options,
    requestConfirm,
    handleConfirm: () => settle(true),
    handleCancel: () => settle(false),
  };
}
