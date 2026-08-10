// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import NextLevelEditor from "../components/NextLevelEditor.vue";

/**
 * SSR on Node 20, where `navigator` IS NOT A GLOBAL.
 *
 * Node only added a global `navigator` in v21. The existing SSR test passed on
 * every developer machine running Node 21+ and failed in CI (Node 20 LTS) with
 * `ReferenceError: navigator is not defined`, thrown out of a component setup
 * function — so the library advertised "SSR-friendly" while crashing the
 * server render for anyone on the current LTS.
 *
 * This deletes the global for the duration of the test so the Node 20
 * behaviour is reproducible on any Node version.
 */
describe("SSR without a global navigator (Node 20 LTS)", () => {
  const hadNavigator = "navigator" in globalThis;
  const original = hadNavigator
    ? Object.getOwnPropertyDescriptor(globalThis, "navigator")
    : undefined;

  beforeAll(() => {
    if (hadNavigator) {
      // @ts-expect-error — deliberately removing a global to emulate Node 20.
      delete globalThis.navigator;
    }
  });

  afterAll(() => {
    if (hadNavigator && original) {
      Object.defineProperty(globalThis, "navigator", original);
    }
  });

  it("has no global navigator (guard for this test's own premise)", () => {
    expect(typeof navigator === "undefined").toBe(true);
  });

  it("renders to a string with default props", async () => {
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<p>Hello from the server</p>",
    });
    const html = await renderToString(app);

    expect(html).toContain("editor-content");
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders with the heavy feature flags enabled", async () => {
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<p>brave new world</p>",
      enableComments: true,
      enableVariables: true,
      showWritingStats: true,
    });
    const html = await renderToString(app);

    expect(html).toContain("editor-content");
  });

  it("renders on a touch-capable phone profile without a navigator", async () => {
    // Exercises the mobile-gesture and shortcut-registry paths, which are the
    // two that read navigator during setup.
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<p>mobile</p>",
      enableVariables: true,
    });
    await expect(renderToString(app)).resolves.toBeTypeOf("string");
  });
});
