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
});
