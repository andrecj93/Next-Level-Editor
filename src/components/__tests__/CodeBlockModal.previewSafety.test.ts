import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CodeBlockModal from "../CodeBlockModal.vue";

/**
 * R31-1 — the code-block preview renders `highlightedCode` through `v-html`,
 * so every path that is not Prism's own (already-escaped) output has to
 * escape the user's text itself. The fallback returned `code.value` RAW.
 *
 * That was unreachable while Prism was imported statically: a valid grammar
 * plus an unknown language name does not throw (measured). Making the
 * highlighter lazy — which is what stops every consumer of the library paying
 * for 21 syntax grammars they never open — creates two brand-new paths
 * straight through the fallback: the window before the chunk resolves, and a
 * chunk that never resolves (offline, blocked asset host, hash skew after a
 * deploy). The escape is the precondition for the optimization, not polish.
 */
const XSS = '<img src=x onerror="alert(1)">';
const PREVIEW = ".code-preview";

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(CodeBlockModal, {
    props: { show: true, ...props },
    global: { stubs: { teleport: true } },
  });

/** The preview must never contain a live element built from typed text. */
const expectInert = (html: string, element: Element) => {
  expect(element.querySelector("img")).toBeNull();
  expect(element.querySelector("script")).toBeNull();
  expect(html).not.toContain('<img src=x');
};

/**
 * Wait for the lazily-imported highlighter to actually be in effect. A single
 * flushPromises is not enough after vi.resetModules(): the dynamic import has
 * to re-resolve the module graph, which spans several microtask turns. Poll
 * the rendered output instead of guessing a tick count.
 */
const waitForHighlighter = async (w: ReturnType<typeof mountModal>) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    await flushPromises();
    await w.vm.$nextTick();
    if (w.get(PREVIEW).html().includes("token")) return true;
    // Yield a real MACROTASK, not just microtasks: resolving the dynamic
    // import involves work the microtask queue alone does not drain, so a
    // pure flushPromises loop is load-dependent and flakes under a busy
    // worker pool (it did).
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return false;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("CodeBlockModal preview never injects raw HTML (R31-1)", () => {
  it("escapes a payload BEFORE the lazy highlighter resolves", async () => {
    const w = mountModal();
    // Deliberately do NOT flush the dynamic import: this is the first-paint
    // window the lazy load introduces.
    await w.get("#code-input").setValue(XSS);
    await w.vm.$nextTick();

    const preview = w.get(PREVIEW);
    expectInert(preview.html(), preview.element);
    expect(preview.html()).toContain("&lt;img");
  });

  it("escapes a payload once the highlighter has loaded", async () => {
    const w = mountModal();
    await w.get("#language-select").setValue("javascript");
    await w.get("#code-input").setValue(XSS);
    // The payload contains no token-producing syntax on its own, so wait on
    // the load rather than on "token" appearing, then assert inertness.
    await waitForHighlighter(w);

    const preview = w.get(PREVIEW);
    expectInert(preview.html(), preview.element);
  });

  it("escapes when the highlighter module fails to load entirely", async () => {
    // The deterministic version of the old "make it throw" test: the dynamic
    // import itself rejects, so `highlighter` stays null for good.
    vi.doMock("../../utils/prismHighlighter", () => {
      throw new Error("chunk load failed");
    });
    vi.resetModules();
    const Fresh = (await import("../CodeBlockModal.vue")).default;

    const w = mount(Fresh, {
      props: { show: true },
      global: { stubs: { teleport: true } },
    });
    await w.get("#code-input").setValue(XSS);
    await flushPromises();
    await w.vm.$nextTick();

    const preview = w.get(PREVIEW);
    expectInert(preview.html(), preview.element);
    expect(preview.html()).toContain("&lt;img");
    vi.doUnmock("../../utils/prismHighlighter");
  });

  it("escapes ampersands and quotes too, not just angle brackets", async () => {
    const w = mountModal();
    await w.get("#code-input").setValue('a & b "c"');
    await w.vm.$nextTick();

    const html = w.get(PREVIEW).html();
    expect(html).toContain("&amp;");
    expect(html).not.toMatch(/[^&;]& /);
  });

  it("still highlights normally once loaded (control)", async () => {
    const w = mountModal();
    await w.get("#language-select").setValue("javascript");
    await w.get("#code-input").setValue("const x = 1");

    // This control is what proves the escaping tests are not passing merely
    // because highlighting is broken.
    expect(await waitForHighlighter(w)).toBe(true);
    expect(w.get(PREVIEW).html()).toContain("token");
  });

  it("inserts the RAW code, not the escaped preview markup (control)", async () => {
    const w = mountModal();
    await w.get("#language-select").setValue("javascript");
    await w.get("#code-input").setValue("if (1 < 2 && 3 > 2) {}");
    await waitForHighlighter(w);

    const insert = w
      .findAll("button")
      .find((b) => /insert/i.test(b.text()));
    expect(insert).toBeDefined();
    await insert!.trigger("click");

    const payload = w.emitted("insert")?.[0]?.[0];
    const code =
      typeof payload === "string"
        ? payload
        : ((payload as { code?: string } | undefined)?.code ?? "");
    expect(code).toContain("1 < 2 && 3 > 2");
    expect(code).not.toContain("&lt;");
    expect(code).not.toContain("&amp;");
  });
});
