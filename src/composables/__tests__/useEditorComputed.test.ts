import { describe, it, expect, vi } from "vitest";
import { ref, defineComponent, h, nextTick, type Ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { useEditorComputed } from "../useEditorComputed";

// useEditorComputed registers two `watch`es (one `{ immediate: true }`), so it is
// a lifecycle composable: it must run inside a real component's setup or the
// watchers leak / are never scoped for cleanup. We therefore drive it through a
// thin host component (à la SkipLinks.test.ts's A11yProbe) mounted with
// @vue/test-utils, capturing the composable's return so we can read its real
// ComputedRefs and mutate the real reactive inputs it was given. The three
// collaborator callbacks (applySanitizedContent / captureSnapshot /
// triggerAutoSave) are vi.fn() spies — they ARE the composable's injected
// dependencies, so recording that it calls them (with what payload, in what
// order relative to nextTick) is asserting the real contract, not mock theatre.

type EditorComputedOptions = Parameters<typeof useEditorComputed>[0];

// Build a <div> whose innerHTML is `html` — a stand-in for the contenteditable
// element the real orchestrator passes as `editorContent`.
const el = (html: string): HTMLElement => {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d;
};

interface Ctx {
  theme: Ref<"light" | "dark">;
  editorContent: Ref<HTMLElement | null>;
  htmlContent: Ref<string>;
  isApplyingHistory: Ref<boolean>;
  applySanitizedContent: ReturnType<typeof vi.fn>;
  captureSnapshot: ReturnType<typeof vi.fn>;
  triggerAutoSave: ReturnType<typeof vi.fn>;
  options: EditorComputedOptions;
}

// Fresh reactive inputs + spy collaborators for one test. `modelValue`, `width`
// and `height` are PLAIN values (that is how the real caller passes them —
// NextLevelEditor.vue: `modelValue: props.modelValue`), so they are fixed at
// construction; the refs are what tests mutate afterwards.
const makeCtx = (
  plain: { modelValue?: string; width?: string; height?: string } = {}
): Ctx => {
  const theme = ref<"light" | "dark">("light");
  const editorContent = ref<HTMLElement | null>(null);
  const htmlContent = ref("");
  const isApplyingHistory = ref(false);
  const applySanitizedContent = vi.fn();
  const captureSnapshot = vi.fn();
  const triggerAutoSave = vi.fn();
  const options: EditorComputedOptions = {
    theme,
    width: plain.width,
    height: plain.height,
    modelValue: plain.modelValue ?? "",
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
  };
  return {
    theme,
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
    options,
  };
};

// Mount the composable inside a real component and hand back both the wrapper
// (for lifecycle) and the live composable return value (for reading ComputedRefs).
const mountHost = (options: EditorComputedOptions) => {
  let api!: ReturnType<typeof useEditorComputed>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useEditorComputed(options);
        return () => h("div", { class: "host" });
      },
    })
  );
  return { wrapper, api };
};

describe("useEditorComputed", () => {
  it("exposes exactly the four computed properties", () => {
    const ctx = makeCtx();
    const { wrapper, api } = mountHost(ctx.options);
    expect(Object.keys(api).sort()).toEqual([
      "characterCount",
      "editorStyles",
      "themeClass",
      "wordCount",
    ]);
    wrapper.unmount();
  });

  describe("themeClass", () => {
    it("maps light theme to 'theme-light'", () => {
      const ctx = makeCtx();
      ctx.theme.value = "light";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.themeClass.value).toBe("theme-light");
      wrapper.unmount();
    });

    it("maps dark theme to 'theme-dark'", () => {
      const ctx = makeCtx();
      ctx.theme.value = "dark";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.themeClass.value).toBe("theme-dark");
      wrapper.unmount();
    });

    it("recomputes when the theme ref changes", async () => {
      const ctx = makeCtx();
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.themeClass.value).toBe("theme-light");

      ctx.theme.value = "dark";
      await nextTick();
      expect(api.themeClass.value).toBe("theme-dark");

      ctx.theme.value = "light";
      await nextTick();
      expect(api.themeClass.value).toBe("theme-light");
      wrapper.unmount();
    });
  });

  describe("editorStyles", () => {
    it("is an empty object when neither width nor height is provided", () => {
      const ctx = makeCtx();
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.editorStyles.value).toEqual({});
      wrapper.unmount();
    });

    it("includes only width when only width is provided", () => {
      const ctx = makeCtx({ width: "500px" });
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.editorStyles.value).toEqual({ width: "500px" });
      wrapper.unmount();
    });

    it("includes only height when only height is provided", () => {
      const ctx = makeCtx({ height: "80vh" });
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.editorStyles.value).toEqual({ height: "80vh" });
      wrapper.unmount();
    });

    it("includes both width and height when both are provided", () => {
      const ctx = makeCtx({ width: "42rem", height: "600px" });
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.editorStyles.value).toEqual({ width: "42rem", height: "600px" });
      wrapper.unmount();
    });
  });

  describe("wordCount", () => {
    it("counts words in htmlContent, ignoring markup", () => {
      const ctx = makeCtx();
      ctx.htmlContent.value = "<p>Hello world</p>";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.wordCount.value).toBe(2);
      wrapper.unmount();
    });

    it("counts words in plain (untagged) htmlContent", () => {
      const ctx = makeCtx();
      ctx.htmlContent.value = "alpha beta gamma";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.wordCount.value).toBe(3);
      wrapper.unmount();
    });

    it("is 0 when both htmlContent and editorContent are empty", () => {
      const ctx = makeCtx();
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.wordCount.value).toBe(0);
      wrapper.unmount();
    });

    it("falls back to editorContent.innerHTML when htmlContent is empty", () => {
      // modelValue is set to match the editor so the immediate modelValue watch
      // is a no-op and does not overwrite htmlContent.
      const ctx = makeCtx({ modelValue: "<p>one two three</p>" });
      ctx.editorContent.value = el("<p>one two three</p>");
      const { wrapper, api } = mountHost(ctx.options);
      expect(ctx.htmlContent.value).toBe(""); // watch left it empty
      expect(api.wordCount.value).toBe(3);
      wrapper.unmount();
    });

    it("prefers htmlContent over editorContent when both have content", () => {
      const ctx = makeCtx({ modelValue: "<p>one two three four</p>" });
      ctx.editorContent.value = el("<p>one two three four</p>");
      ctx.htmlContent.value = "<p>alpha beta</p>";
      const { wrapper, api } = mountHost(ctx.options);
      // htmlContent (2 words) wins over the 4-word editor innerHTML.
      expect(api.wordCount.value).toBe(2);
      wrapper.unmount();
    });

    it("recomputes when htmlContent changes", async () => {
      const ctx = makeCtx();
      ctx.htmlContent.value = "<p>one two</p>";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.wordCount.value).toBe(2);

      ctx.htmlContent.value = "<p>one two three four five</p>";
      await nextTick();
      expect(api.wordCount.value).toBe(5);
      wrapper.unmount();
    });

    it("recomputes when the editorContent ref is reassigned (fallback path)", async () => {
      const ctx = makeCtx({ modelValue: "<p>a b</p>" });
      ctx.editorContent.value = el("<p>a b</p>");
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.wordCount.value).toBe(2);

      ctx.editorContent.value = el("<p>c d e</p>");
      await nextTick();
      expect(api.wordCount.value).toBe(3);
      wrapper.unmount();
    });
  });

  describe("characterCount", () => {
    it("counts characters (including spaces) in htmlContent, ignoring markup", () => {
      const ctx = makeCtx();
      ctx.htmlContent.value = "<p>abc def</p>";
      const { wrapper, api } = mountHost(ctx.options);
      // "abc def" -> 7 chars.
      expect(api.characterCount.value).toBe(7);
      wrapper.unmount();
    });

    it("is 0 when both htmlContent and editorContent are empty", () => {
      const ctx = makeCtx();
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.characterCount.value).toBe(0);
      wrapper.unmount();
    });

    it("falls back to editorContent.innerHTML when htmlContent is empty", () => {
      const ctx = makeCtx({ modelValue: "<p>hello</p>" });
      ctx.editorContent.value = el("<p>hello</p>");
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.characterCount.value).toBe(5);
      wrapper.unmount();
    });

    it("recomputes when htmlContent changes", async () => {
      const ctx = makeCtx();
      ctx.htmlContent.value = "<p>hi</p>";
      const { wrapper, api } = mountHost(ctx.options);
      expect(api.characterCount.value).toBe(2);

      ctx.htmlContent.value = "<p>hello there</p>";
      await nextTick();
      // "hello there" -> 11 chars.
      expect(api.characterCount.value).toBe(11);
      wrapper.unmount();
    });
  });

  describe("modelValue watcher (immediate, one-shot)", () => {
    it("applies sanitized content synchronously then finalises on the next tick", async () => {
      const ctx = makeCtx({ modelValue: "<p>World</p>" });
      ctx.editorContent.value = el("<p>Hello</p>");
      const { wrapper } = mountHost(ctx.options);

      // Synchronous phase — the immediate watch ran during setup.
      expect(ctx.applySanitizedContent).toHaveBeenCalledTimes(1);
      expect(ctx.applySanitizedContent).toHaveBeenCalledWith("<p>World</p>");
      expect(ctx.htmlContent.value).toBe("<p>World</p>");
      expect(ctx.isApplyingHistory.value).toBe(true);
      // Snapshot is deferred to nextTick — not yet.
      expect(ctx.captureSnapshot).not.toHaveBeenCalled();

      // Deferred phase — nextTick callback resets the flag + snapshots.
      await flushPromises();
      expect(ctx.isApplyingHistory.value).toBe(false);
      expect(ctx.captureSnapshot).toHaveBeenCalledTimes(1);
      expect(ctx.captureSnapshot).toHaveBeenCalledWith(false);
      wrapper.unmount();
    });

    it("is a no-op when editorContent is null", async () => {
      const ctx = makeCtx({ modelValue: "<p>anything</p>" });
      // editorContent stays null.
      const { wrapper } = mountHost(ctx.options);

      await flushPromises();
      expect(ctx.applySanitizedContent).not.toHaveBeenCalled();
      expect(ctx.captureSnapshot).not.toHaveBeenCalled();
      expect(ctx.htmlContent.value).toBe("");
      expect(ctx.isApplyingHistory.value).toBe(false);
      wrapper.unmount();
    });

    it("is a no-op when isApplyingHistory is already true (avoids clobbering an in-flight undo/redo)", async () => {
      const ctx = makeCtx({ modelValue: "<p>World</p>" });
      ctx.editorContent.value = el("<p>Hello</p>");
      ctx.isApplyingHistory.value = true;
      const { wrapper } = mountHost(ctx.options);

      await flushPromises();
      expect(ctx.applySanitizedContent).not.toHaveBeenCalled();
      expect(ctx.captureSnapshot).not.toHaveBeenCalled();
      expect(ctx.htmlContent.value).toBe("");
      // The composable never touched the guard flag.
      expect(ctx.isApplyingHistory.value).toBe(true);
      wrapper.unmount();
    });

    it("does not re-apply when modelValue sanitizes equal to the current editor content (cursor-preserving optimization)", async () => {
      // Textually different (<div> wrapper) but the sanitizer unwraps DIV, so the
      // sanitized forms are identical -> the watch must skip the innerHTML write.
      const ctx = makeCtx({ modelValue: "<div><p>Hi</p></div>" });
      ctx.editorContent.value = el("<p>Hi</p>");
      const { wrapper } = mountHost(ctx.options);

      await flushPromises();
      expect(ctx.applySanitizedContent).not.toHaveBeenCalled();
      expect(ctx.captureSnapshot).not.toHaveBeenCalled();
      expect(ctx.htmlContent.value).toBe("");
      expect(ctx.isApplyingHistory.value).toBe(false);
      wrapper.unmount();
    });
  });

  describe("auto-save watcher", () => {
    it("triggers auto-save when the editorContent ref changes to an element with new innerHTML", async () => {
      const ctx = makeCtx();
      // editorContent starts null (immediate modelValue watch early-returns).
      const { wrapper } = mountHost(ctx.options);
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();

      ctx.editorContent.value = el("<p>autosave me</p>");
      await nextTick();
      expect(ctx.triggerAutoSave).toHaveBeenCalledTimes(1);
      expect(ctx.triggerAutoSave).toHaveBeenCalledWith("<p>autosave me</p>");
      wrapper.unmount();
    });

    it("does NOT auto-save while isApplyingHistory is true", async () => {
      const ctx = makeCtx();
      const { wrapper } = mountHost(ctx.options);

      ctx.isApplyingHistory.value = true;
      ctx.editorContent.value = el("<p>during history apply</p>");
      await nextTick();
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("does NOT auto-save for empty innerHTML (falsy content guard)", async () => {
      const ctx = makeCtx();
      const { wrapper } = mountHost(ctx.options);

      ctx.editorContent.value = el(""); // innerHTML === ""
      await nextTick();
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("does NOT fire on an in-place innerHTML mutation (Vue cannot track raw DOM writes)", async () => {
      // modelValue matches the editor so the immediate watch is a no-op and the
      // guard flag stays false — isolating the reactivity behaviour under test.
      const ctx = makeCtx({ modelValue: "<p>x</p>" });
      ctx.editorContent.value = el("<p>x</p>");
      const { wrapper } = mountHost(ctx.options);
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();

      // Mutate innerHTML WITHOUT reassigning the ref. The watch source
      // `() => editorContent.value?.innerHTML` only re-runs when a tracked dep
      // (the ref itself) changes, so this write is invisible to the watcher.
      ctx.editorContent.value!.innerHTML = "<p>y</p>";
      await nextTick();
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe("watcher cleanup on unmount", () => {
    it("stops the auto-save watcher after unmount (mutating inputs no longer fires it)", async () => {
      const ctx = makeCtx();
      const { wrapper } = mountHost(ctx.options);
      wrapper.unmount();

      ctx.editorContent.value = el("<p>after unmount</p>");
      await nextTick();
      expect(ctx.triggerAutoSave).not.toHaveBeenCalled();
    });
  });
});
