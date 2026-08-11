import { describe, it, expect } from "vitest";
import { ref, defineComponent, h, nextTick, type Ref } from "vue";
import { mount } from "@vue/test-utils";
import { useEditorComputed } from "../useEditorComputed";

// useEditorComputed is now watcher-free: it only derives computed state
// (themeClass / editorStyles / wordCount / characterCount) from the reactive
// inputs. Content synchronization (the modelValue watcher) and autosave live
// exclusively in useEditorContent — the duplicates that used to live here made
// every keystroke sanitize the whole document twice more for no benefit. These
// tests pin the derived-state contract and that no hidden watchers remain.

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
  options: EditorComputedOptions;
}

// Fresh reactive inputs for one test. `width` and `height` are REFS on this
// branch — the real caller passes `toRef(props, "width")` etc. so that
// editorStyles recomputes when the host changes them (the old plain-value
// signature froze them at construction, which was the "Height field does
// nothing" bug).
const makeCtx = (plain: { width?: string; height?: string } = {}): Ctx => {
  const theme = ref<"light" | "dark">("light");
  const editorContent = ref<HTMLElement | null>(null);
  const htmlContent = ref("");
  const options: EditorComputedOptions = {
    theme,
    width: ref(plain.width),
    height: ref(plain.height),
    editorContent,
    htmlContent,
  };
  return { theme, editorContent, htmlContent, options };
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
      const ctx = makeCtx();
      ctx.editorContent.value = el("<p>one two three</p>");
      const { wrapper, api } = mountHost(ctx.options);
      expect(ctx.htmlContent.value).toBe("");
      expect(api.wordCount.value).toBe(3);
      wrapper.unmount();
    });

    it("prefers htmlContent over editorContent when both have content", () => {
      const ctx = makeCtx();
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
      const ctx = makeCtx();
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
      const ctx = makeCtx();
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
});
