import { describe, it, expect, afterEach, vi } from "vitest";
import { useDeviceDetection } from "../useDeviceDetection";

/**
 * NextLevelEditor calls useDeviceDetection() unconditionally in setup(), and the
 * composable read window/navigator/matchMedia/CSS synchronously in its body and
 * in lazily-read computeds. On a Nuxt / Vite-SSR / @vue/server-renderer host
 * that meant `ReferenceError: window is not defined` (HTTP 500) on any page
 * containing the editor. The composable must produce sane server defaults
 * instead and only measure the real device on the client.
 */
describe("useDeviceDetection is SSR-safe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const simulateServer = () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("matchMedia", undefined);
    vi.stubGlobal("CSS", undefined);
  };

  it("does not throw at setup when window is absent", () => {
    simulateServer();
    expect(() => useDeviceDetection()).not.toThrow();
  });

  it("reading the derived state during server render is safe and returns desktop defaults", () => {
    simulateServer();
    const d = useDeviceDetection();

    expect(() => {
      // These are exactly what NextLevelEditor's setup/template read.
      void d.deviceType.value;
      void d.showMobileToolbar.value;
      void d.useMobileUI.value;
      void d.platform.value;
      void d.supportsHover.value;
      void d.supportsSafeArea.value;
      void d.isMobile.value;
      void d.breakpoints.value;
    }).not.toThrow();

    expect(d.deviceType.value).toBe("desktop");
    expect(d.isMobile.value).toBe(false);
    expect(d.showMobileToolbar.value).toBe(false);
    expect(d.platform.value).toBe("unknown");
    expect(d.supportsHover.value).toBe(false);
    expect(d.supportsSafeArea.value).toBe(false);
  });
});
