import { describe, it, expect, afterEach, vi } from "vitest";
import { FileManagerService } from "../fileManager";

/**
 * The fileManager singleton is created at module import and persists to
 * localStorage. On a server (or an import in Node / a sandboxed iframe where
 * localStorage is unavailable) that used to log a scary
 * "Failed to load files from storage: ReferenceError: localStorage is not
 * defined" on every render/import. Storage access must degrade to a silent
 * no-op when localStorage isn't there.
 */
describe("fileManager tolerates a missing localStorage (SSR / sandboxed)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("constructing without localStorage neither throws nor logs (the import-time path)", () => {
    vi.stubGlobal("localStorage", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // The constructor calls loadFromStorage() — this is what ran at module
    // import and logged "Failed to load files from storage: ReferenceError".
    let svc!: FileManagerService;
    expect(() => {
      svc = new FileManagerService();
    }).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();

    // Persisting is also a quiet no-op without storage.
    expect(() => svc.clearAll()).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("survives localStorage that throws on access (SecurityError / disabled cookies)", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => new FileManagerService()).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
