import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FileManagerService } from "../fileManager";

/**
 * When a save exceeds the localStorage quota, the old fallback blanked EVERY
 * file's data-URL payload and overwrote the stored JSON — files that had
 * persisted perfectly for weeks lost their bytes because one new upload was
 * too big, while the upload itself reported success. The degraded save must
 * be SELECTIVE: drop payloads largest-first, retrying after each drop, so
 * everything that still fits keeps its bytes.
 */
describe("FileManagerService: selective quota degradation", () => {
  const backing = new Map<string, string>();
  // Small files (~dozens of bytes as base64) fit; the "big" one won't.
  const QUOTA = 2000;

  beforeEach(() => {
    backing.clear();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (value.length > QUOTA) {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }
      backing.set(key, value);
    });
    vi.spyOn(window.localStorage, "getItem").mockImplementation(
      (key: string) => backing.get(key) ?? null
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps previously-fitting payloads and degrades only the oversized one", async () => {
    const service = new FileManagerService({ storageKey: "quota-test" });

    // Three small files persist fine.
    await service.uploadFile(
      new File(["aaaa"], "a.txt", { type: "text/plain" })
    );
    await service.uploadFile(
      new File(["bbbb"], "b.txt", { type: "text/plain" })
    );
    await service.uploadFile(
      new File(["cccc"], "c.txt", { type: "text/plain" })
    );

    // A big upload pushes the combined JSON past the quota.
    await service.uploadFile(
      new File(["x".repeat(1800)], "big.txt", { type: "text/plain" })
    );

    // "Reload": a fresh service reads back what actually persisted.
    const reloaded = new FileManagerService({ storageKey: "quota-test" });
    const byName = new Map(
      reloaded.getFiles().map((f) => [f.name, f])
    );

    // The three small files must still carry their payloads…
    expect(byName.get("a.txt")?.url).toMatch(/^data:/);
    expect(byName.get("b.txt")?.url).toMatch(/^data:/);
    expect(byName.get("c.txt")?.url).toMatch(/^data:/);
    // …and only the oversized upload was degraded to metadata.
    expect(byName.get("big.txt")).toBeTruthy();
    expect(byName.get("big.txt")?.url ?? "").not.toMatch(/^data:/);
  });
});
