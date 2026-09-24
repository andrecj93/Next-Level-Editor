/**
 * Cross-browser clipboard utilities
 * Provides fallbacks for Safari iOS and Firefox compatibility
 */
import { captureSelectionBookmark } from './selectionBookmark';

/**
 * Copy text to clipboard with fallback
 * Works in all browsers including Safari iOS and Firefox
 *
 * @param text - Text to copy
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string, canContinue: () => boolean = () => true): Promise<boolean> {
  if (!canContinue()) return false;
  // Try modern Clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return canContinue();
    } catch (error) {
      if (!canContinue()) return false;
      console.warn("Clipboard API failed, trying fallback:", error);
    }
  }

  // Fallback: Create temporary textarea (works in all browsers)
  return canContinue() && copyWithTextarea(text);
}

/**
 * Copy HTML content to clipboard
 * Uses the ClipboardItem API when available, with a text-only fallback
 *
 * @param html - HTML string to copy
 * @param plainText - Plain text fallback
 * @returns Promise<boolean> - Success status
 */
export async function copyHtmlToClipboard(
  html: string,
  plainText: string,
  canContinue: () => boolean = () => true
): Promise<boolean> {
  if (!canContinue()) return false;
  // Prefer rich copy when the browser exposes the API.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });

      const item = new ClipboardItem({
        "text/html": blob,
        "text/plain": textBlob,
      });

      await navigator.clipboard.write([item]);
      return canContinue();
    } catch (error) {
      if (!canContinue()) return false;
      console.warn("HTML clipboard failed, trying text fallback:", error);
    }
  }

  // Fallback: Copy as plain text
  return copyToClipboard(plainText, canContinue);
}

/**
 * Paste text from clipboard (event-based - RECOMMENDED)
 *
 * Usage:
 * element.addEventListener('paste', async (e) => {
 *   e.preventDefault();
 *   const text = await pasteFromClipboard(e);
 *   if (text) insertTextAtCursor(text);
 * });
 *
 * @param event - Paste event
 * @returns string | null - Pasted text or null
 */
export async function pasteFromClipboard(
  event: ClipboardEvent
): Promise<string | null> {
  // Best method: Use event.clipboardData (works everywhere)
  if (event.clipboardData) {
    const text = event.clipboardData.getData("text/plain");
    if (text) return text;
  }

  // This should never happen, but handle gracefully
  console.warn("No clipboard data in paste event");
  return null;
}

/**
 * Request clipboard read permission (required for programmatic paste)
 * Availability and permission prompts depend on the browser.
 *
 * @returns Promise<string | null> - Clipboard text or null
 */
export async function readClipboard(): Promise<string | null> {
  // Programmatic reads require browser permission or a user gesture.
  if (navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (error) {
      console.warn("Clipboard read denied or not supported:", error);
    }
  }

  // Not supported or denied
  return null;
}

/** Read the first supported clipboard item without silently flattening HTML.
 * The insertion owner must still sanitize HTML. A denied rich read is terminal:
 * trying readText next can cause a second permission prompt for the same click.
 */
export async function readClipboardData(): Promise<DataTransfer | null> {
  if (typeof navigator === "undefined" || typeof DataTransfer === "undefined") return null;
  try {
    const clipboard = navigator.clipboard;
    const data = new DataTransfer();
    if (clipboard?.read) {
      const items = await clipboard.read();
      for (const item of items) {
        const types = item.types.filter(type => type === 'text/html' || type === 'text/plain' || type.startsWith('image/'));
        if (!types.length) continue;
        const entries = await Promise.all(types.map(async type => ({ type, blob: await item.getType(type) })));
        for (const { type, blob } of entries) {
          if (type.startsWith('image/')) data.items.add(new File([blob], 'clipboard-image', { type }));
          else data.setData(type, await blob.text());
        }
        return data;
      }
      return data;
    }
    if (clipboard?.readText) {
      data.setData('text/plain', await clipboard.readText());
      return data;
    }
  } catch (error) {
    console.warn('[NextLevelEditor] Clipboard read unavailable', {
      reason: error instanceof Error ? error.name : 'ClipboardError',
    });
  }
  return null;
}

/**
 * Check if clipboard API is available
 * @returns boolean - True if Clipboard API is supported
 */
export function isClipboardApiSupported(): boolean {
  return Boolean(navigator.clipboard?.writeText);
}

/**
 * Check if programmatic clipboard text reads are available
 * @returns boolean - True if readText is supported
 */
export function isClipboardReadSupported(): boolean {
  return Boolean(navigator.clipboard?.readText);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Copy text using textarea fallback (works in all browsers)
 * Supports even old Safari iOS and Firefox
 *
 * @param text - Text to copy
 * @returns boolean - Success status
 */
function copyWithTextarea(text: string): boolean {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const bookmark = captureSelectionBookmark(document.body);
  const input = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
  const fieldSelection = input && input.selectionStart !== null && input.selectionEnd !== null
    ? { start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection ?? 'none' } : null;
  const textarea = document.createElement("textarea");

  // Styling to make it invisible but still focusable
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.setAttribute("readonly", "");

  document.body.appendChild(textarea);

  // iOS requires contentEditable
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    textarea.contentEditable = "true";
    textarea.readOnly = false;

    const range = document.createRange();
    range.selectNodeContents(textarea);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    textarea.setSelectionRange(0, text.length);
  } else {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
  }

  let success = false;
  try {
    // The legacy copy command reads the temporary field's selection.
    success = document.execCommand("copy");
  } catch (error) {
    console.error("Copy fallback failed:", error);
  } finally {
    textarea.remove();
    if (active?.isConnected) active.focus({ preventScroll: true });
    bookmark?.restore();
    if (input?.isConnected && fieldSelection) input.setSelectionRange(fieldSelection.start, fieldSelection.end, fieldSelection.direction);
  }

  return success;
}

/**
 * Check if we're in a secure context (required for Clipboard API)
 * @returns boolean - True if HTTPS or localhost
 */
export function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
}

/**
 * Get clipboard support status for debugging
 * @returns Object with support details
 */
export function getClipboardSupport() {
  return {
    writeText: Boolean(navigator.clipboard?.writeText),
    readText: Boolean(navigator.clipboard?.readText),
    write: Boolean(navigator.clipboard?.write),
    read: Boolean(navigator.clipboard?.read),
    secureContext: isSecureContext(),
    userAgent: navigator.userAgent,
  };
}
