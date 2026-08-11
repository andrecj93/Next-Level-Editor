import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useEditorComputed } from "../useEditorComputed";

/**
 * width/height must be reactive: they used to be destructured as primitives so
 * editorStyles never recomputed (the Height field in the playground did
 * nothing). They are now refs. (modelValue application is useEditorContent's
 * job — the duplicate watcher that used to live here is gone.)
 */
describe("useEditorComputed reactivity", () => {
  const make = (over: Record<string, unknown> = {}) =>
    useEditorComputed({
      theme: ref<"light" | "dark">("light"),
      width: ref<string | undefined>(undefined),
      height: ref<string | undefined>(undefined),
      editorContent: ref<HTMLElement | null>(null),
      htmlContent: ref(""),
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
});
