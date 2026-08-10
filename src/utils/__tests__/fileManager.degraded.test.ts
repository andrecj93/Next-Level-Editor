import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { fileManager } from "../fileManager";
import { useInsertActions } from "../../composables/useInsertActions";

/**
 * R23-16: a thumbnail the browser cannot decode (a .heic in Chrome, a corrupt
 * .png) made createThumbnail reject, and uploadFile awaited it unguarded — so
 * the WHOLE upload failed and the file was never stored, with a generic
 * "Upload failed" (createThumbnail hands back a DOM Event, not an Error). The
 * file itself is fine; only the thumbnail should be skipped.
 *
 * R23-19: when a quota-degraded save drops a file's inline content it sets
 * `url = ""`, but the card still looked normal and inserting it emitted
 * `<img src="">` / `<a href="">`. A file with no content must be recognisable
 * as such.
 */
afterEach(() => {
  fileManager.clearAll();
  vi.restoreAllMocks();
});

const imageFile = () =>
  new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });

describe("uploadFile survives an undecodable thumbnail (#R23-16)", () => {
  it("stores the file even when the thumbnail cannot be generated", async () => {
    // A browser that cannot decode the image rejects here.
    vi.spyOn(
      fileManager as unknown as { createThumbnail: () => Promise<string> },
      "createThumbnail"
    ).mockRejectedValue(new Event("error"));

    const stored = await fileManager.uploadFile(imageFile());

    expect(stored).toBeTruthy();
    expect(stored.name).toBe("photo.png");
    expect(stored.thumbnail).toBeUndefined();
    // It is really in the store, not just returned.
    expect(fileManager.getFiles().map((f) => f.id)).toContain(stored.id);
    // Its content is intact — only the thumbnail was skipped.
    expect(stored.url.length).toBeGreaterThan(0);
  });
});

describe("a content-dropped file is recognisable (#R23-19)", () => {
  it("reports contentAvailable=false when the url was dropped", async () => {
    vi.spyOn(
      fileManager as unknown as { createThumbnail: () => Promise<string> },
      "createThumbnail"
    ).mockResolvedValue("data:image/jpeg;base64,x");

    const stored = await fileManager.uploadFile(imageFile());
    expect(fileManager.isContentAvailable(stored)).toBe(true);

    // Simulate what a quota-degraded reload leaves behind: metadata intact,
    // inline content gone.
    stored.url = "";
    expect(fileManager.isContentAvailable(stored)).toBe(false);
  });

  it("refuses to insert a content-dropped file, with a toast", () => {
    const showToast = vi.fn();
    const editorContent = ref(document.createElement("div"));
    const { handleInsertFile } = useInsertActions({
      editorContent,
      performWithSelection: (cb) => cb(editorContent.value),
      captureSnapshot: vi.fn(),
      showToast,
      openLinkModal: vi.fn(),
      openImageUploadModal: vi.fn(),
      closeImageUploadModal: vi.fn(),
      closeEmbedModal: vi.fn(),
      closeFileManagerModal: vi.fn(),
      closeEmojiPicker: vi.fn(),
    });

    handleInsertFile({ name: "photo.png", type: "image/png", url: "" });

    // Nothing was inserted — no <img src=""> — and the user was told why.
    expect(editorContent.value.querySelector("img")).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("photo.png"),
      "error"
    );
  });
});
