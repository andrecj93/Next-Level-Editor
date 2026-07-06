/**
 * Tests for the cross-browser clipboard utilities in ../clipboard.
 *
 * These utilities wrap the async Clipboard API and provide execCommand /
 * textarea fallbacks for browsers (Safari iOS, Firefox) that don't expose the
 * full API. happy-dom exposes navigator.clipboard.{writeText,readText,write,
 * read} and ClipboardItem, but does NOT implement document.execCommand, so the
 * textarea fallback and the various "not supported" branches are driven by
 * temporarily overriding the relevant globals.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  copyToClipboard,
  copyHtmlToClipboard,
  pasteFromClipboard,
  readClipboard,
  isClipboardApiSupported,
  isClipboardReadSupported,
  isSecureContext,
  getClipboardSupport,
} from "../clipboard";

// ---------------------------------------------------------------------------
// Helpers for overriding read-only-ish globals in happy-dom.
//
// navigator.clipboard / navigator.userAgent are exposed as configurable
// getters on the navigator prototype, so we override them with an own
// data-property and delete the override to restore the original getter.
// ---------------------------------------------------------------------------

/** Replace navigator.clipboard with an arbitrary value (or absent). */
function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

/** Restore the real navigator.clipboard getter. */
function restoreClipboard(): void {
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
}

/** Force a specific navigator.userAgent string. */
function setUserAgent(value: string): void {
  Object.defineProperty(navigator, "userAgent", {
    value,
    configurable: true,
    writable: true,
  });
}

function restoreUserAgent(): void {
  delete (navigator as unknown as { userAgent?: unknown }).userAgent;
}

describe("clipboard utilities", () => {
  // happy-dom does not implement document.execCommand, so tests that exercise
  // the textarea fallback assign a stub directly. Capture the original
  // descriptor so we can fully restore it and avoid leaking into other files.
  let execCommandDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    execCommandDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "execCommand"
    );
    // Silence the intentional console.warn/error diagnostics the module emits
    // on its fallback paths so the test output stays clean.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    restoreClipboard();
    restoreUserAgent();
    if (execCommandDescriptor) {
      Object.defineProperty(document, "execCommand", execCommandDescriptor);
    } else {
      delete (document as unknown as { execCommand?: unknown }).execCommand;
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // copyToClipboard
  // -------------------------------------------------------------------------
  describe("copyToClipboard", () => {
    it("writes via the Clipboard API and returns true on success", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      const result = await copyToClipboard("hello world");

      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith("hello world");
    });

    it("falls back to the textarea path when the Clipboard API rejects", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      setClipboard({ writeText });
      // execCommand fallback succeeds.
      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand as unknown as typeof document.execCommand;

      const result = await copyToClipboard("fallback text");

      expect(writeText).toHaveBeenCalled();
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(result).toBe(true);
    });

    it("uses the textarea fallback directly when the Clipboard API is absent", async () => {
      setClipboard(undefined);
      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand as unknown as typeof document.execCommand;

      const result = await copyToClipboard("no api");

      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(result).toBe(true);
    });

    it("uses the textarea fallback when writeText is missing on clipboard object", async () => {
      // clipboard exists but has no writeText -> optional chaining short-circuits.
      setClipboard({ readText: vi.fn() });
      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand as unknown as typeof document.execCommand;

      const result = await copyToClipboard("partial api");

      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(result).toBe(true);
    });

    it("returns false when the textarea fallback's execCommand returns false", async () => {
      setClipboard(undefined);
      document.execCommand = vi
        .fn()
        .mockReturnValue(false) as unknown as typeof document.execCommand;

      const result = await copyToClipboard("cannot copy");

      expect(result).toBe(false);
    });

    it("returns false and logs when execCommand throws in the fallback", async () => {
      setClipboard(undefined);
      const errorSpy = vi.spyOn(console, "error");
      document.execCommand = vi.fn(() => {
        throw new Error("execCommand blew up");
      }) as unknown as typeof document.execCommand;

      const result = await copyToClipboard("boom");

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("cleans up the temporary textarea after copying", async () => {
      setClipboard(undefined);
      document.execCommand = vi
        .fn()
        .mockReturnValue(true) as unknown as typeof document.execCommand;

      await copyToClipboard("cleanup check");

      // No stray textareas should remain in the DOM.
      expect(document.querySelectorAll("textarea").length).toBe(0);
    });

    it("selects the full text in the fallback textarea on non-iOS", async () => {
      setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );
      setClipboard(undefined);
      let selectedValue = "";
      document.execCommand = vi.fn(() => {
        const ta = document.querySelector("textarea");
        selectedValue = ta ? ta.value : "";
        return true;
      }) as unknown as typeof document.execCommand;

      await copyToClipboard("select-me");

      expect(selectedValue).toBe("select-me");
    });

    it("takes the iOS contentEditable branch when the userAgent is an iPhone", async () => {
      setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
      );
      setClipboard(undefined);
      let wasContentEditable = false;
      document.execCommand = vi.fn(() => {
        const ta = document.querySelector("textarea");
        // On the iOS branch the textarea is made contentEditable & not readonly.
        wasContentEditable = ta?.contentEditable === "true";
        return true;
      }) as unknown as typeof document.execCommand;

      const result = await copyToClipboard("ios text");

      expect(wasContentEditable).toBe(true);
      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // copyHtmlToClipboard
  // -------------------------------------------------------------------------
  describe("copyHtmlToClipboard", () => {
    it("writes an HTML+text ClipboardItem when ClipboardItem and write exist", async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      setClipboard({ write });

      const result = await copyHtmlToClipboard("<b>hi</b>", "hi");

      expect(result).toBe(true);
      expect(write).toHaveBeenCalledTimes(1);
      const items = write.mock.calls[0][0];
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(1);
      expect(items[0]).toBeInstanceOf(ClipboardItem);
    });

    it("puts both text/html and text/plain into the ClipboardItem", async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      setClipboard({ write });

      // Capture what ClipboardItem is constructed with.
      const RealClipboardItem = ClipboardItem;
      const ctorArgs: Record<string, Blob>[] = [];
      vi.stubGlobal(
        "ClipboardItem",
        class extends RealClipboardItem {
          constructor(data: Record<string, Blob>) {
            super(data);
            ctorArgs.push(data);
          }
        }
      );

      const result = await copyHtmlToClipboard("<i>x</i>", "x");

      expect(result).toBe(true);
      expect(ctorArgs).toHaveLength(1);
      expect(ctorArgs[0]["text/html"]).toBeInstanceOf(Blob);
      expect(ctorArgs[0]["text/plain"]).toBeInstanceOf(Blob);
      expect(ctorArgs[0]["text/html"].type).toBe("text/html");
      expect(ctorArgs[0]["text/plain"].type).toBe("text/plain");
    });

    it("falls back to plain-text copy when ClipboardItem is undefined", async () => {
      vi.stubGlobal("ClipboardItem", undefined);
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      const result = await copyHtmlToClipboard("<b>ignored</b>", "plain only");

      expect(result).toBe(true);
      // Fallback path routes through copyToClipboard -> writeText with plainText.
      expect(writeText).toHaveBeenCalledWith("plain only");
    });

    it("falls back to plain-text copy when clipboard.write is missing", async () => {
      // ClipboardItem exists but no write method on clipboard.
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      const result = await copyHtmlToClipboard("<b>x</b>", "text fallback");

      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith("text fallback");
    });

    it("falls back to plain-text copy when the HTML write rejects", async () => {
      const write = vi.fn().mockRejectedValue(new Error("html not allowed"));
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ write, writeText });

      const result = await copyHtmlToClipboard("<b>x</b>", "recovered text");

      expect(write).toHaveBeenCalled();
      // After write() rejects, it retries as plain text via writeText.
      expect(writeText).toHaveBeenCalledWith("recovered text");
      expect(result).toBe(true);
    });

    it("returns the textarea-fallback result when both HTML and text API fail", async () => {
      const write = vi.fn().mockRejectedValue(new Error("no html"));
      const writeText = vi.fn().mockRejectedValue(new Error("no text"));
      setClipboard({ write, writeText });
      document.execCommand = vi
        .fn()
        .mockReturnValue(true) as unknown as typeof document.execCommand;

      const result = await copyHtmlToClipboard("<b>x</b>", "deep fallback");

      // Bubbles down to the textarea fallback which succeeds here.
      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // pasteFromClipboard
  // -------------------------------------------------------------------------
  describe("pasteFromClipboard", () => {
    it("returns the plain-text payload from a paste event", async () => {
      const getData = vi.fn().mockReturnValue("pasted content");
      const event = {
        clipboardData: { getData },
      } as unknown as ClipboardEvent;

      const result = await pasteFromClipboard(event);

      expect(result).toBe("pasted content");
      expect(getData).toHaveBeenCalledWith("text/plain");
    });

    it("returns null and warns when clipboardData is absent", async () => {
      const warnSpy = vi.spyOn(console, "warn");
      const event = { clipboardData: null } as unknown as ClipboardEvent;

      const result = await pasteFromClipboard(event);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it("returns null when clipboardData exists but the text is empty", async () => {
      // Empty string is falsy, so the function skips it and warns/returns null.
      const getData = vi.fn().mockReturnValue("");
      const warnSpy = vi.spyOn(console, "warn");
      const event = {
        clipboardData: { getData },
      } as unknown as ClipboardEvent;

      const result = await pasteFromClipboard(event);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // readClipboard
  // -------------------------------------------------------------------------
  describe("readClipboard", () => {
    it("returns the text from clipboard.readText on success", async () => {
      const readText = vi.fn().mockResolvedValue("read value");
      setClipboard({ readText });

      const result = await readClipboard();

      expect(result).toBe("read value");
      expect(readText).toHaveBeenCalled();
    });

    it("returns an empty string when readText resolves empty", async () => {
      // readText resolving "" is a legitimate read; the function returns it verbatim.
      const readText = vi.fn().mockResolvedValue("");
      setClipboard({ readText });

      const result = await readClipboard();

      expect(result).toBe("");
    });

    it("returns null and warns when readText rejects (permission denied)", async () => {
      const readText = vi.fn().mockRejectedValue(new Error("permission denied"));
      const warnSpy = vi.spyOn(console, "warn");
      setClipboard({ readText });

      const result = await readClipboard();

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it("returns null when readText is not supported", async () => {
      setClipboard({ writeText: vi.fn() }); // no readText
      const result = await readClipboard();
      expect(result).toBeNull();
    });

    it("returns null when navigator.clipboard is entirely absent", async () => {
      setClipboard(undefined);
      const result = await readClipboard();
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // isClipboardApiSupported
  // -------------------------------------------------------------------------
  describe("isClipboardApiSupported", () => {
    it("returns true when writeText exists", () => {
      setClipboard({ writeText: vi.fn() });
      expect(isClipboardApiSupported()).toBe(true);
    });

    it("returns false when writeText is missing", () => {
      setClipboard({ readText: vi.fn() });
      expect(isClipboardApiSupported()).toBe(false);
    });

    it("returns false when navigator.clipboard is absent", () => {
      setClipboard(undefined);
      expect(isClipboardApiSupported()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // isClipboardReadSupported
  // -------------------------------------------------------------------------
  describe("isClipboardReadSupported", () => {
    it("returns true when readText exists", () => {
      setClipboard({ readText: vi.fn() });
      expect(isClipboardReadSupported()).toBe(true);
    });

    it("returns false when readText is missing", () => {
      setClipboard({ writeText: vi.fn() });
      expect(isClipboardReadSupported()).toBe(false);
    });

    it("returns false when navigator.clipboard is absent", () => {
      setClipboard(undefined);
      expect(isClipboardReadSupported()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // isSecureContext
  // -------------------------------------------------------------------------
  describe("isSecureContext", () => {
    // These tests drive location by assigning window.location.href (happy-dom
    // reflects it into location.protocol/hostname). Restore localhost after.
    afterEach(() => {
      window.location.href = "http://localhost/";
    });

    it("returns true on localhost (the happy-dom default host)", () => {
      // Default happy-dom URL is http://localhost/, so the hostname check passes
      // even though window.isSecureContext is undefined and protocol is http:.
      expect(isSecureContext()).toBe(true);
    });

    it("returns true when window.isSecureContext is truthy", () => {
      const original = Object.getOwnPropertyDescriptor(
        window,
        "isSecureContext"
      );
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        configurable: true,
      });
      try {
        expect(isSecureContext()).toBe(true);
      } finally {
        if (original) {
          Object.defineProperty(window, "isSecureContext", original);
        } else {
          delete (window as unknown as { isSecureContext?: unknown })
            .isSecureContext;
        }
      }
    });

    it("returns true for an https origin even when the host isn't local", () => {
      window.location.href = "https://example.com/app";
      expect(isSecureContext()).toBe(true);
    });

    it("returns true for the 127.0.0.1 loopback host over http", () => {
      window.location.href = "http://127.0.0.1:3000/";
      expect(isSecureContext()).toBe(true);
    });

    it("returns false for a plain http non-local origin", () => {
      // Every branch of the OR is false here: not a secure context, http:,
      // and the host is neither localhost nor 127.0.0.1.
      const original = Object.getOwnPropertyDescriptor(
        window,
        "isSecureContext"
      );
      Object.defineProperty(window, "isSecureContext", {
        value: false,
        configurable: true,
      });
      window.location.href = "http://example.com/page";
      try {
        expect(isSecureContext()).toBe(false);
      } finally {
        if (original) {
          Object.defineProperty(window, "isSecureContext", original);
        } else {
          delete (window as unknown as { isSecureContext?: unknown })
            .isSecureContext;
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // getClipboardSupport
  // -------------------------------------------------------------------------
  describe("getClipboardSupport", () => {
    it("reports every capability as true when the full API is present", () => {
      setClipboard({
        writeText: vi.fn(),
        readText: vi.fn(),
        write: vi.fn(),
        read: vi.fn(),
      });
      setUserAgent("Custom UA String");

      const support = getClipboardSupport();

      expect(support).toEqual({
        writeText: true,
        readText: true,
        write: true,
        read: true,
        secureContext: true, // localhost default
        userAgent: "Custom UA String",
      });
    });

    it("reports capabilities as false when navigator.clipboard is absent", () => {
      setClipboard(undefined);

      const support = getClipboardSupport();

      expect(support.writeText).toBe(false);
      expect(support.readText).toBe(false);
      expect(support.write).toBe(false);
      expect(support.read).toBe(false);
      // secureContext still reflects the (localhost) environment.
      expect(support.secureContext).toBe(true);
      expect(typeof support.userAgent).toBe("string");
    });

    it("reports a partial capability set accurately", () => {
      setClipboard({ writeText: vi.fn(), read: vi.fn() });

      const support = getClipboardSupport();

      expect(support.writeText).toBe(true);
      expect(support.readText).toBe(false);
      expect(support.write).toBe(false);
      expect(support.read).toBe(true);
    });
  });
});
