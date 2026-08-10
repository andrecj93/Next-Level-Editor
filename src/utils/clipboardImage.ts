/**
 * Helpers for rescuing an image out of a paste/drop payload.
 *
 * Screenshots (Snipping Tool, Cmd+Shift+4) and "Copy image" put a bitmap on the
 * clipboard with NO `text/html` flavor. The editor's paste/drop handlers key off
 * `text/html`, so without this the handler bails and the browser inserts a
 * `blob:`/unsanitized `<img>` that is stripped to a broken image the moment the
 * document round-trips through the sanitizer or is reloaded.
 */

/** Max bytes for an inline pasted/dropped image (a data-URL inflates it ~33%). */
export const MAX_PASTED_IMAGE_BYTES = 10 * 1024 * 1024;

/** The subset of DataTransfer/ClipboardData we read for image extraction. */
export interface ImageTransferSource {
  items?: Iterable<DataTransferItem> | ArrayLike<DataTransferItem> | null;
  files?: ArrayLike<File> | null;
}

const toArray = <T>(
  collection: Iterable<T> | ArrayLike<T> | null | undefined
): T[] => {
  if (!collection) return [];
  return Array.from(collection as ArrayLike<T>);
};

/**
 * Pull the first image File out of a paste/drop payload, or null when there is
 * none. Prefers the `files` list (OS drops) and falls back to the `items` list
 * (clipboard bitmaps), whose entries must be materialised via getAsFile().
 */
export function pickImageFile(source: ImageTransferSource | null): File | null {
  if (!source) return null;

  for (const file of toArray(source.files)) {
    if (file && typeof file.type === "string" && file.type.startsWith("image/")) {
      return file;
    }
  }

  for (const item of toArray(source.items)) {
    if (
      item &&
      item.kind === "file" &&
      typeof item.type === "string" &&
      item.type.startsWith("image/")
    ) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }

  return null;
}

/**
 * Whether the payload carries ANY file (image or not). A file drop whose
 * default action isn't cancelled makes the browser NAVIGATE the tab to the
 * file, destroying the editing session — so drop handlers must know a file is
 * present even when pickImageFile finds no usable image. #r16-5
 */
export function hasFileTransfer(source: ImageTransferSource | null): boolean {
  if (!source) return false;
  if (toArray(source.files).some((file) => Boolean(file))) return true;
  return toArray(source.items).some((item) => item?.kind === "file");
}

/**
 * Whether an html clipboard flavor still carries anything worth inserting
 * after sanitization. Office's "Copy image" ships text/html whose ONLY payload
 * is `<img src="file:///...">` — the sanitizer strips the local-file src,
 * leaving a husk that renders as nothing. The paste handler uses this to fall
 * back to the bitmap (or the plain-text flavor) instead of inserting it. #r16-1
 */
export function htmlHasVisibleContent(html: string): boolean {
  if (!html || !html.trim()) return false;
  const probe = document.createElement("div");
  probe.innerHTML = html;
  if ((probe.textContent ?? "").trim().length > 0) return true;
  // Genuine visible MEDIA only — NOT a bare <li>. An image-only list item
  // (<li><img src=file://></li>) sanitizes to an empty <li>; counting that as
  // "visible" made the paste keep an empty bullet instead of rescuing the
  // clipboard bitmap. Bare list structure is decided by htmlHasStructure,
  // which the paste handler consults only AFTER the bitmap fallback. #r18
  return (
    probe.querySelector("img[src], table, iframe, video, hr") !== null
  );
}

/**
 * Whether the html carries text-less STRUCTURE worth pasting as a last resort —
 * a list (an empty checklist the user genuinely copied). The paste handler
 * consults this only after the bitmap fallback, so a stripped-image list item
 * prefers the clipboard bitmap while a real empty checklist still pastes. #r18
 */
export function htmlHasStructure(html: string): boolean {
  if (!html || !html.trim()) return false;
  const probe = document.createElement("div");
  probe.innerHTML = html;
  return probe.querySelector("li, input[type=checkbox]") !== null;
}

/**
 * Whether a file is an image small enough to inline as a data-URL. Rejects
 * empty files and anything over the cap so a huge paste can't bloat the model.
 */
export function isInsertableImage(
  file: File,
  maxBytes: number = MAX_PASTED_IMAGE_BYTES
): boolean {
  return (
    typeof file.type === "string" &&
    file.type.startsWith("image/") &&
    file.size > 0 &&
    file.size <= maxBytes
  );
}

/** Read a Blob/File as a data-URL string (rejects on read error). */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
