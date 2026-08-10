import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-34 / R23-43 / R23-44: applying a template replaced the document by
 * assigning innerHTML and capturing a snapshot — and nothing else. Every other
 * wholesale-replacement path (undo/redo, model load, Replace All) runs a
 * content-replaced contract; this one skipped it, so:
 *
 *  - the Writing Statistics panel kept reporting the REPLACED document until
 *    the user typed a character, while the footer counter beside it updated
 *    immediately;
 *  - in Code/Split view the template only reached the hidden WYSIWYG div, so
 *    the textarea still showed the old document — and the next keystroke there
 *    wrote that stale value back over the template and emitted it as the model,
 *    silently discarding the template the toast had just confirmed.
 */
describe("applying a template runs the content-replaced contract", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  const TEMPLATE = {
    id: "t1",
    name: "Short",
    content: "<p>alpha beta</p>",
  };

  const applyTemplate = async () => {
    (
      wrapper!.vm as unknown as {
        applyTemplateDirect: (t: typeof TEMPLATE) => void;
      }
    ).applyTemplateDirect(TEMPLATE);
    await nextTick();
  };

  it("refreshes the writing-stats panel (#R23-34, #R23-44)", async () => {
    vi.useFakeTimers();
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: "<p>one two three four five six seven</p>",
        showWritingStats: true,
      },
      attachTo: document.body,
    });
    await nextTick();

    const vm = wrapper.vm as unknown as {
      writingAssistant: { stats: { value: { words: number } } } | null;
    };
    const editor = wrapper.find(".editor-content").element as HTMLElement;

    // Settle the initial analysis so the panel has a value to go stale from.
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(vm.writingAssistant?.stats.value.words).toBe(7);

    await applyTemplate();
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(editor.textContent?.trim()).toBe("alpha beta");
    expect(vm.writingAssistant?.stats.value.words).toBe(2);
  });

  it("updates the code pane so the next keystroke cannot discard it (#R23-43)", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>original document</p>" },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.find('button[aria-label="Code view"]').trigger("click");
    await nextTick();
    await nextTick();

    const textarea = wrapper.find("textarea.code-editor")
      .element as HTMLTextAreaElement;
    expect(textarea.value).toContain("original document");

    await applyTemplate();

    expect(textarea.value).toContain("alpha beta");
    expect(textarea.value).not.toContain("original document");
  });
});
