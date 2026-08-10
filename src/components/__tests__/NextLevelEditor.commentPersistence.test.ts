import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import CommentsSidebar from "../CommentsSidebar.vue";
import CommentModal from "../CommentModal.vue";

/**
 * Commenting inserts <span class="comment-highlight" data-thread-id="…"> into
 * the document, and resolve/delete restyle or unwrap it. That markup is MEANT to
 * persist — useHtmlSanitizer special-cases it and restoreThreads documents it as
 * "preserved through the sanitizer round-trip" — but the mutation happens outside
 * Vue, so it must go through the snapshot path or the host never receives the
 * anchor: the reviewer comments, sees "Saved", reloads, and the highlight is gone
 * (the thread then falls back to serialized offsets that drift as the doc is
 * edited).
 */
describe("NextLevelEditor — comment highlights reach the model", () => {
  let wrapper: VueWrapper | null = null;

  const DOC = "<p>Hello brave new world</p>";

  const mountEditor = async (saveHandler?: (content: string) => boolean) => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: DOC,
        enableComments: true,
        ...(saveHandler ? { saveHandler } : {}),
      },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper.find(".editor-content").element as HTMLElement;
  };

  /** Select the word "brave" so addThread has a range to anchor to. */
  const selectBrave = (editor: HTMLElement) => {
    const textNode = editor.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    document.dispatchEvent(new Event("selectionchange"));
  };

  /**
   * Drive the real flow: the sidebar's "create comment" captures the live
   * selection (startAddComment), then the modal submits against it.
   */
  const submitComment = async (text: string) => {
    wrapper!.findComponent(CommentsSidebar).vm.$emit("create-comment");
    await nextTick();
    wrapper!.findComponent(CommentModal).vm.$emit("submit", text, []);
    await nextTick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("emits the highlight anchor when a comment is added", async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await nextTick();

    await submitComment("Nice word");

    // The anchor really is in the document...
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();

    // ...so the host must have been told, or the comment is lost on reload.
    const emitted = (wrapper!.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1]).toContain("comment-highlight");
  });

  it("persists the highlight through auto-save", async () => {
    // Signature declared on the mock (so mock.calls[n][0] stays typed) rather
    // than as an unused parameter the linter has to be told to ignore.
    const saveHandler = vi.fn<(content: string) => boolean>(() => true);
    const editor = await mountEditor(saveHandler);
    selectBrave(editor);
    await nextTick();

    await submitComment("Nice word");
    vi.advanceTimersByTime(2500);
    await flushPromises();

    expect(saveHandler).toHaveBeenCalled();
    const saved = String(saveHandler.mock.calls[saveHandler.mock.calls.length - 1][0]);
    expect(saved).toContain("comment-highlight");
  });

  it("emits when a thread is deleted (highlight unwrapped)", async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await nextTick();
    await submitComment("Nice word");
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();

    const threadId = editor
      .querySelector<HTMLElement>(".comment-highlight")!
      .dataset.threadId!;
    wrapper!.findComponent(CommentsSidebar).vm.$emit("delete-thread", threadId);
    await nextTick();

    // Deleting unwraps the span — the host must hear about that too.
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    const emitted = (wrapper!.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1]).not.toContain("comment-highlight");
  });
});
