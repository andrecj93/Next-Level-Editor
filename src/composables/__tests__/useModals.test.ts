import { describe, it, expect, beforeEach, vi } from "vitest";
import { useModals } from "../useModals";

type Modals = ReturnType<typeof useModals>;

/**
 * The 11 boolean state refs exposed by useModals, all defaulting to false.
 */
const STATE_KEYS = [
  "showImageUploadModal",
  "showEmbedModal",
  "showFileManagerModal",
  "showEmojiPicker",
  "showTemplateModal",
  "showHtmlCodeModal",
  "showFindReplaceModal",
  "showCodeBlockModal",
  "showTableModal",
  "showTableDesigner",
  "showTablePropertiesModal",
] as const;

/**
 * Open/close pairs where the open function runs beforeOpenModal (and so
 * should call rememberSelection when provided). Emoji picker (toggle) and
 * table designer are handled separately because they behave differently.
 */
const OPEN_CLOSE_PAIRS: Array<{
  state: (typeof STATE_KEYS)[number];
  open: keyof Modals;
  close: keyof Modals;
}> = [
  {
    state: "showImageUploadModal",
    open: "openImageUploadModal",
    close: "closeImageUploadModal",
  },
  { state: "showEmbedModal", open: "openEmbedModal", close: "closeEmbedModal" },
  {
    state: "showFileManagerModal",
    open: "openFileManagerModal",
    close: "closeFileManagerModal",
  },
  {
    state: "showTemplateModal",
    open: "openTemplateModal",
    close: "closeTemplateModal",
  },
  {
    state: "showHtmlCodeModal",
    open: "openHtmlCodeModal",
    close: "closeHtmlCodeModal",
  },
  { state: "showTableModal", open: "openTableModal", close: "closeTableModal" },
  {
    state: "showTablePropertiesModal",
    open: "openTablePropertiesModal",
    close: "closeTablePropertiesModal",
  },
  {
    state: "showFindReplaceModal",
    open: "openFindReplaceModal",
    close: "closeFindReplaceModal",
  },
  {
    state: "showCodeBlockModal",
    open: "openCodeBlockModal",
    close: "closeCodeBlockModal",
  },
];

describe("useModals", () => {
  describe("initial state", () => {
    let modals: Modals;

    beforeEach(() => {
      modals = useModals();
    });

    it.each(STATE_KEYS)("initializes %s to false", (key) => {
      expect(modals[key].value).toBe(false);
    });

    it("exposes all 11 state refs plus the expected functions", () => {
      // Sanity check that nothing was dropped from the public surface.
      for (const key of STATE_KEYS) {
        expect(modals[key]).toBeDefined();
        expect(typeof modals[key].value).toBe("boolean");
      }
      const fnNames: Array<keyof Modals> = [
        "openImageUploadModal",
        "closeImageUploadModal",
        "openEmbedModal",
        "closeEmbedModal",
        "openFileManagerModal",
        "closeFileManagerModal",
        "openTemplateModal",
        "closeTemplateModal",
        "openHtmlCodeModal",
        "closeHtmlCodeModal",
        "openTableModal",
        "closeTableModal",
        "openTablePropertiesModal",
        "closeTablePropertiesModal",
        "openFindReplaceModal",
        "closeFindReplaceModal",
        "openCodeBlockModal",
        "closeCodeBlockModal",
        "toggleEmojiPicker",
        "closeEmojiPicker",
        "openTableDesigner",
        "closeTableDesigner",
      ];
      for (const name of fnNames) {
        expect(typeof modals[name]).toBe("function");
      }
    });
  });

  describe("open/close functions", () => {
    let modals: Modals;

    beforeEach(() => {
      modals = useModals();
    });

    it.each(OPEN_CLOSE_PAIRS)(
      "$open sets $state to true",
      ({ state, open }) => {
        expect(modals[state].value).toBe(false);
        (modals[open] as () => void)();
        expect(modals[state].value).toBe(true);
      }
    );

    it.each(OPEN_CLOSE_PAIRS)(
      "$close sets $state to false",
      ({ state, open, close }) => {
        (modals[open] as () => void)();
        expect(modals[state].value).toBe(true);
        (modals[close] as () => void)();
        expect(modals[state].value).toBe(false);
      }
    );

    it.each(OPEN_CLOSE_PAIRS)(
      "$open is idempotent (stays true when opened twice)",
      ({ state, open }) => {
        (modals[open] as () => void)();
        (modals[open] as () => void)();
        expect(modals[state].value).toBe(true);
      }
    );

    it.each(OPEN_CLOSE_PAIRS)(
      "$close is idempotent (stays false when closed while already closed)",
      ({ state, close }) => {
        expect(modals[state].value).toBe(false);
        (modals[close] as () => void)();
        expect(modals[state].value).toBe(false);
      }
    );

    it("open functions do not affect other modal states", () => {
      modals.openImageUploadModal();

      expect(modals.showImageUploadModal.value).toBe(true);
      // Every other state must remain false.
      for (const key of STATE_KEYS) {
        if (key === "showImageUploadModal") continue;
        expect(modals[key].value).toBe(false);
      }
    });

    it("allows multiple modals to be open simultaneously (no mutual exclusion)", () => {
      modals.openEmbedModal();
      modals.openTemplateModal();
      modals.openTableModal();

      expect(modals.showEmbedModal.value).toBe(true);
      expect(modals.showTemplateModal.value).toBe(true);
      expect(modals.showTableModal.value).toBe(true);
    });

    it("closing one modal leaves the others untouched", () => {
      modals.openEmbedModal();
      modals.openTemplateModal();

      modals.closeEmbedModal();

      expect(modals.showEmbedModal.value).toBe(false);
      expect(modals.showTemplateModal.value).toBe(true);
    });
  });

  describe("toggleEmojiPicker", () => {
    let modals: Modals;

    beforeEach(() => {
      modals = useModals();
    });

    it("toggles the picker from false to true", () => {
      expect(modals.showEmojiPicker.value).toBe(false);
      modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(true);
    });

    it("toggles the picker from true back to false", () => {
      modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(true);
      modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(false);
    });

    it("toggles repeatedly, ending on the expected value", () => {
      // 4 toggles -> back to false.
      for (let i = 0; i < 4; i++) modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(false);

      // One more -> true.
      modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(true);
    });

    it("closeEmojiPicker forces the picker to false regardless of prior state", () => {
      modals.toggleEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(true);

      modals.closeEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(false);
    });

    it("closeEmojiPicker is a no-op when already closed", () => {
      expect(modals.showEmojiPicker.value).toBe(false);
      modals.closeEmojiPicker();
      expect(modals.showEmojiPicker.value).toBe(false);
    });

    it("toggling the picker does not affect other modals", () => {
      modals.toggleEmojiPicker();
      for (const key of STATE_KEYS) {
        if (key === "showEmojiPicker") continue;
        expect(modals[key].value).toBe(false);
      }
    });
  });

  describe("table designer", () => {
    let modals: Modals;

    beforeEach(() => {
      modals = useModals();
    });

    it("openTableDesigner sets showTableDesigner to true", () => {
      expect(modals.showTableDesigner.value).toBe(false);
      modals.openTableDesigner();
      expect(modals.showTableDesigner.value).toBe(true);
    });

    it("closeTableDesigner sets showTableDesigner to false", () => {
      modals.openTableDesigner();
      modals.closeTableDesigner();
      expect(modals.showTableDesigner.value).toBe(false);
    });

    it("closeTableDesigner is a no-op when already closed", () => {
      expect(modals.showTableDesigner.value).toBe(false);
      modals.closeTableDesigner();
      expect(modals.showTableDesigner.value).toBe(false);
    });

    it("does NOT call rememberSelection when opened (contextual open)", () => {
      const rememberSelection = vi.fn();
      const scoped = useModals({ rememberSelection });

      scoped.openTableDesigner();

      expect(scoped.showTableDesigner.value).toBe(true);
      // openTableDesigner intentionally skips beforeOpenModal.
      expect(rememberSelection).not.toHaveBeenCalled();
    });
  });

  describe("rememberSelection callback (beforeOpenModal)", () => {
    it("calls rememberSelection exactly once when an open function runs", () => {
      const rememberSelection = vi.fn();
      const modals = useModals({ rememberSelection });

      modals.openImageUploadModal();

      expect(rememberSelection).toHaveBeenCalledTimes(1);
      expect(modals.showImageUploadModal.value).toBe(true);
    });

    it.each(OPEN_CLOSE_PAIRS)(
      "$open invokes rememberSelection",
      ({ open }) => {
        const rememberSelection = vi.fn();
        const modals = useModals({ rememberSelection });

        (modals[open] as () => void)();

        expect(rememberSelection).toHaveBeenCalledTimes(1);
      }
    );

    it("toggleEmojiPicker invokes rememberSelection each time it runs", () => {
      const rememberSelection = vi.fn();
      const modals = useModals({ rememberSelection });

      modals.toggleEmojiPicker(); // open
      modals.toggleEmojiPicker(); // close — beforeOpenModal still runs

      // beforeOpenModal runs on every toggle call, regardless of direction.
      expect(rememberSelection).toHaveBeenCalledTimes(2);
    });

    it("close functions do NOT invoke rememberSelection", () => {
      const rememberSelection = vi.fn();
      const modals = useModals({ rememberSelection });

      modals.openEmbedModal();
      rememberSelection.mockClear();

      modals.closeEmbedModal();
      modals.closeEmojiPicker();
      modals.closeTableDesigner();

      expect(rememberSelection).not.toHaveBeenCalled();
    });

    it("accumulates calls across multiple opens", () => {
      const rememberSelection = vi.fn();
      const modals = useModals({ rememberSelection });

      modals.openImageUploadModal();
      modals.openEmbedModal();
      modals.openTemplateModal();

      expect(rememberSelection).toHaveBeenCalledTimes(3);
    });

    it("does not throw when rememberSelection is omitted", () => {
      const modals = useModals();

      expect(() => {
        modals.openImageUploadModal();
        modals.toggleEmojiPicker();
        modals.openTableDesigner();
      }).not.toThrow();

      expect(modals.showImageUploadModal.value).toBe(true);
      expect(modals.showEmojiPicker.value).toBe(true);
      expect(modals.showTableDesigner.value).toBe(true);
    });

    it("does not throw when called with an empty options object", () => {
      const modals = useModals({});

      expect(() => modals.openEmbedModal()).not.toThrow();
      expect(modals.showEmbedModal.value).toBe(true);
    });
  });

  describe("independent instances", () => {
    it("state is not shared between two useModals() instances", () => {
      const a = useModals();
      const b = useModals();

      a.openImageUploadModal();

      expect(a.showImageUploadModal.value).toBe(true);
      expect(b.showImageUploadModal.value).toBe(false);
    });

    it("each instance carries its own rememberSelection callback", () => {
      const rememberA = vi.fn();
      const rememberB = vi.fn();
      const a = useModals({ rememberSelection: rememberA });
      const b = useModals({ rememberSelection: rememberB });

      a.openEmbedModal();
      expect(rememberA).toHaveBeenCalledTimes(1);
      expect(rememberB).not.toHaveBeenCalled();

      b.openTemplateModal();
      expect(rememberB).toHaveBeenCalledTimes(1);
      expect(rememberA).toHaveBeenCalledTimes(1);
    });
  });
});
