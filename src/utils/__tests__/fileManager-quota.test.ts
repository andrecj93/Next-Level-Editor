/**
 * Tests for quota-safe localStorage persistence in FileManagerService.
 *
 * Covers issue #7: uploaded files must not vanish (nor throw) when the
 * localStorage quota is exceeded by large data-URL blobs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FileManagerService } from "../fileManager";

function makeQuotaError(): DOMException {
  return new DOMException("Quota exceeded", "QuotaExceededError");
}

/**
 * A minimal, fully-controllable localStorage stub.
 *
 * When `rejectDataUrls` is true, any write whose value contains a
 * `"data:"` blob is rejected with a QuotaExceededError (mirroring how a
 * real browser rejects oversized data-URL payloads), while the lighter
 * metadata-only write is accepted. This lets us exercise the degraded
 * save path deterministically under happy-dom.
 */
function createQuotaStub(rejectDataUrls: boolean) {
  const store = new Map<string, string>();
  return {
    store,
    storage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        if (rejectDataUrls && value.includes('"data:')) {
          throw makeQuotaError();
        }
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as unknown as Storage,
  };
}

describe("FileManagerService quota-safe persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not throw when localStorage rejects the write (quota exceeded)", async () => {
    const manager = new FileManagerService();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw makeQuotaError();
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const file = new File(["hello"], "photo.txt", { type: "text/plain" });

    // The upload persists internally; it must not surface a quota exception.
    await expect(manager.uploadFile(file)).resolves.toBeDefined();

    // In-memory files remain intact so nothing "vanishes" from the list.
    expect(manager.getFiles()).toHaveLength(1);
  });

  it("warns (not errors) and degrades gracefully on a quota failure", async () => {
    const { storage } = createQuotaStub(true);
    vi.stubGlobal("localStorage", storage);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hello"], "note.txt", { type: "text/plain" })
    );

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("persists metadata without heavy data-URL blobs when quota is exceeded", async () => {
    const { storage } = createQuotaStub(true);
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hello"], "big.txt", { type: "text/plain" })
    );

    const stored = localStorage.getItem("next-level-editor-files");
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!) as Array<{
      name: string;
      url: string;
    }>;

    // Metadata is preserved...
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("big.txt");

    // ...but the heavy data-URL blob was stripped to fit the quota.
    expect(parsed[0].url.startsWith("data:")).toBe(false);
  });

  it("reloads persisted file metadata after a degraded save so files don't vanish", async () => {
    const { storage } = createQuotaStub(true);
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hello"], "kept.txt", { type: "text/plain" })
    );

    // A brand-new instance (simulating a page reload) still finds the file
    // because the metadata survived even though the blob didn't.
    const reloaded = new FileManagerService();
    const names = reloaded.getFiles().map((f) => f.name);
    expect(names).toEqual(["kept.txt"]);
  });

  it("keeps the full data-URL when the write fits within quota", async () => {
    const { storage } = createQuotaStub(false);
    vi.stubGlobal("localStorage", storage);

    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hello"], "normal.txt", { type: "text/plain" })
    );

    const stored = localStorage.getItem("next-level-editor-files");
    const parsed = JSON.parse(stored!) as Array<{ url: string }>;

    // No degradation happened, so the data-URL is retained intact.
    expect(parsed[0].url.startsWith("data:")).toBe(true);
  });

  it("preserves non-data URLs and strips only data-URL thumbnails during a degraded save", async () => {
    // Seed a previously-persisted file that has an *external* (non-data) URL
    // but a heavy data-URL *thumbnail*. This drives the otherwise-uncovered
    // branch sides in the degraded metadata mapping:
    //   - url is NOT a data URL  -> kept as-is (the `: file.url` side)
    //   - thumbnail IS a data URL -> dropped to undefined (the `? undefined` side)
    const { store, storage } = createQuotaStub(true);
    store.set(
      "next-level-editor-files",
      JSON.stringify([
        {
          id: "seed_1",
          name: "remote.png",
          type: "image/png",
          size: 1234,
          url: "https://cdn.example.com/remote.png",
          uploadedAt: new Date(1000).toISOString(),
          thumbnail: "data:image/jpeg;base64,AAAA",
        },
      ])
    );
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Constructing loads the seeded file; uploading a second (data-URL heavy)
    // file forces the primary save to fail and the degraded save to run over
    // BOTH files.
    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hello"], "local.txt", { type: "text/plain" })
    );

    const persisted = JSON.parse(
      localStorage.getItem("next-level-editor-files")!
    ) as Array<{ name: string; url: string; thumbnail?: string }>;

    const remote = persisted.find((f) => f.name === "remote.png")!;
    // External URL survives untouched (false side of the isDataUrl(url) check).
    expect(remote.url).toBe("https://cdn.example.com/remote.png");
    // Its data-URL thumbnail is stripped (true side of the thumbnail check).
    expect(remote.thumbnail).toBeUndefined();

    const local = persisted.find((f) => f.name === "local.txt")!;
    // The uploaded file's inline data URL is dropped in the degraded save.
    expect(local.url).toBe("");
  });

  it("leaves a non-data-URL thumbnail intact during a degraded save", async () => {
    // Covers the false side of `isDataUrl(thumbnail)`: a thumbnail that is a
    // regular URL must be preserved, not stripped.
    const { store, storage } = createQuotaStub(true);
    store.set(
      "next-level-editor-files",
      JSON.stringify([
        {
          id: "seed_2",
          name: "hosted.png",
          type: "image/png",
          size: 42,
          url: "https://cdn.example.com/hosted.png",
          uploadedAt: new Date(2000).toISOString(),
          thumbnail: "https://cdn.example.com/hosted-thumb.png",
        },
      ])
    );
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new FileManagerService();
    await manager.uploadFile(
      new File(["hi"], "trigger.txt", { type: "text/plain" })
    );

    const persisted = JSON.parse(
      localStorage.getItem("next-level-editor-files")!
    ) as Array<{ name: string; thumbnail?: string }>;

    const hosted = persisted.find((f) => f.name === "hosted.png")!;
    expect(hosted.thumbnail).toBe("https://cdn.example.com/hosted-thumb.png");
  });

  it("does not throw when even the degraded metadata write fails", async () => {
    // Reject *every* write, including the metadata-only fallback, so the final
    // inner catch runs. The upload must still resolve and keep in-memory files.
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as unknown as Storage;
    vi.stubGlobal("localStorage", storage);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const manager = new FileManagerService();
    await expect(
      manager.uploadFile(new File(["x"], "x.txt", { type: "text/plain" }))
    ).resolves.toBeDefined();

    // Both the primary and the degraded save warned, but nothing threw.
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(manager.getFiles()).toHaveLength(1);
  });
});
