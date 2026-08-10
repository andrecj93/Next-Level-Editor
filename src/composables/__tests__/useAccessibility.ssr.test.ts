import { describe, it, expect, afterEach, vi } from "vitest";
import { useAccessibility } from "../useAccessibility";

/**
 * NextLevelEditor calls useAccessibility() in setup(). The composable read
 * window.matchMedia synchronously in its ref initializers (prefers-reduced-
 * motion / -contrast / color-scheme), so on a server render it threw
 * `ReferenceError: window is not defined` and took the whole page down (HTTP
 * 500). It must fall back to sane defaults on the server and read the real OS
 * preferences on the client.
 */
describe("useAccessibility is SSR-safe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw at setup when window is absent, and uses safe defaults", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("matchMedia", undefined);

    let a!: ReturnType<typeof useAccessibility>;
    expect(() => {
      a = useAccessibility();
    }).not.toThrow();

    // Server defaults: no motion/contrast preference asserted, light scheme.
    expect(a.prefersReducedMotion.value).toBe(false);
  });
});
