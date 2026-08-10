import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useEditorComputed } from "../useEditorComputed";

/**
 * width/height/modelValue must be reactive: they used to be destructured as
 * primitives so editorStyles never recomputed (the Height field in the
 * playground did nothing). They are now refs.
 */
describe("useEditorComputed reactivity", () => {
  const make = (over: Record<string, unknown> = {}) =>
    useEditorComputed({
      theme: ref<"light" | "dark">("light"),
      width: ref<string | undefined>(undefined),
      height: ref<string | undefined>(undefined),
      modelValue: ref(""),
      editorContent: ref<HTMLElement | null>(null),
      htmlContent: ref(""),
      isApplyingHistory: ref(false),
      applySanitizedContent: vi.fn(),
      captureSnapshot: vi.fn(),
      triggerAutoSave: vi.fn(),
      ...over,
    });

  it("recomputes editorStyles when the height ref changes", () => {
    const height = ref<string | undefined>("620px");
    const { editorStyles } = make({ height });
    expect(editorStyles.value.height).toBe("620px");

    height.value = "900px";
    expect(editorStyles.value.height).toBe("900px");
  });

  it("recomputes editorStyles when the width ref changes", () => {
    const width = ref<string | undefined>(undefined);
    const { editorStyles } = make({ width });
    expect(editorStyles.value.width).toBeUndefined();

    width.value = "50rem";
    expect(editorStyles.value.width).toBe("50rem");
  });

  it("applies new modelValue into the editor when the ref changes", async () => {
    const editorEl = document.createElement("div");
    const applySanitizedContent = vi.fn((html: string) => {
      editorEl.innerHTML = html;
    });
    const modelValue = ref("<p>one</p>");
    make({
      modelValue,
      editorContent: ref(editorEl),
      applySanitizedContent,
    });
    // immediate watcher applied the initial value
    expect(applySanitizedContent).toHaveBeenCalledWith("<p>one</p>");

    modelValue.value = "<p>two</p>";
    await Promise.resolve();
    expect(applySanitizedContent).toHaveBeenCalledWith("<p>two</p>");
  });
});
