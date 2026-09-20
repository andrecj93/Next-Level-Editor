// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import NextLevelEditor from "../components/NextLevelEditor.vue";

/**
 * Server-side render smoke test — the in-repo mirror of installing the package
 * into a Nuxt / Vite-SSR consumer. It runs in the `node` environment (NOT
 * happy-dom), so `window`/`document`/`navigator`/`localStorage` are genuinely
 * absent, exactly as on a real server. Any setup- or render-time access to a
 * browser global without a guard makes renderToString reject with
 * `ReferenceError: <global> is not defined` — an HTTP 500 for the consumer.
 *
 * This guards every SSR fix at once: word/char counts, formatHtml, device
 * detection, accessibility media queries, and the localStorage-backed stores.
 */
describe("NextLevelEditor renders on the server without a browser environment", () => {
  it("has no browser globals in this environment (sanity)", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders to a string with default props", async () => {
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<p>Hello from the server</p>",
    });
    const html = await renderToString(app);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("editor-content");
  });

  it("renders with the heavy feature flags enabled", async () => {
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<p>brave new world</p>",
      enableComments: true,
      enableVariables: true,
      showWritingStats: true,
    });
    const html = await renderToString(app);
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders the writing workspace without scheduling browser-only analysis", async () => {
    const app = createSSRApp(NextLevelEditor, {
      modelValue: "<h1>A manuscript</h1><p>The the story begins.</p>",
      writingMode: true,
    });
    const html = await renderToString(app);
    expect(html).toContain("is-writing-workspace");
    expect(html).toContain("Writing companion");
    expect(html).not.toContain('class="writing-companion"');
  });
});
