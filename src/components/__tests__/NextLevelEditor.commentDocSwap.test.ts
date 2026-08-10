import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import CommentsSidebar from "../CommentsSidebar.vue";
import CommentModal from "../CommentModal.vue";

/**
 * r21-3 (HIGH): a comment thread's anchor is a SERIALIZED POSITIONAL range
 * (node path + offsets). When the host swapped the document via v-model,
 * restoreThreads ran against the NEW content with the OLD threads still in the
 * model, so the fallback re-anchored them by position — stamping the previous
 * document's highlight onto unrelated text (observed mid-word:
 * "Boar<span class=comment-highlight>d minutes</span>"). That span survives the
 * sanitizer and is written back to the host on the next capture.
 */
describe("NextLevelEditor — comments do not leak across a document swap", () => {
  let wrapper: VueWrapper | null = null;

  const DOC_A = "<p>The quarterly report is late</p>";
  const DOC_B = "<p>Board minutes: nothing to do with the report</p>";

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
  });

  const mountEditor = async (modelValue: string) => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue, enableComments: true },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper.find(".editor-content").element as HTMLElement;
  };

  /** Select "quarterly" in doc A so addThread has a range to anchor to. */
  const selectQuarterly = (editor: HTMLElement) => {
    const textNode = editor.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 4);
    range.setEnd(textNode, 13); // "quarterly"
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    document.dispatchEvent(new Event("selectionchange"));
  };

  const submitComment = async (text: string) => {
    wrapper!.findComponent(CommentsSidebar).vm.$emit("create-comment");
    await nextTick();
    wrapper!.findComponent(CommentModal).vm.$emit("submit", text, []);
    await nextTick();
  };

  it("does not stamp the previous document's highlight onto a new document", async () => {
    const editor = await mountEditor(DOC_A);
    selectQuarterly(editor);
    await nextTick();
    await submitComment("Which quarter?");
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();

    // Host swaps to an unrelated document.
    await wrapper!.setProps({ modelValue: DOC_B });
    await nextTick();
    await nextTick();

    // No highlight is stamped onto the new content, and its text is intact.
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    expect(editor.textContent).toBe(
      "Board minutes: nothing to do with the report"
    );
  });

  it("does not emit a highlight-bearing model for the swapped document", async () => {
    const editor = await mountEditor(DOC_A);
    selectQuarterly(editor);
    await nextTick();
    await submitComment("Which quarter?");

    await wrapper!.setProps({ modelValue: DOC_B });
    await nextTick();
    await nextTick();

    const emitted = (wrapper!.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    const afterSwap = emitted.filter((html) => html.includes("Board minutes"));
    for (const html of afterSwap) {
      expect(html).not.toContain("comment-highlight");
    }
  });
});
