import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R22-STATS-2: the Writing Statistics panel froze after Undo/Redo. Stats were
 * only refreshed from onInput, but undo/redo REPLACES innerHTML without firing
 * an input event — so the panel kept the pre-undo counts while the footer
 * counter on the same screen showed the correct ones. Two visible counters
 * disagreeing, and the panel never recovered.
 */
describe("writing stats follow a content replacement (#R22-STATS-2)", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("refreshes the panel's word count after undo", async () => {
    vi.useFakeTimers();
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: "<p>one two three four five</p>",
        showWritingStats: true,
      },
      attachTo: document.body,
    });
    await nextTick();

    const editor = wrapper.find(".editor-content").element as HTMLElement;
    const vm = wrapper.vm as unknown as {
      writingAssistant: { stats: { value: { words: number } } } | null;
      undo: () => void;
    };
    const panelWords = () => vm.writingAssistant?.stats.value.words ?? -1;

    // Type more words, letting the 300ms stats debounce settle.
    editor.innerHTML = "<p>one two three four five six seven eight</p>";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(panelWords()).toBe(8);

    // Undo replaces innerHTML WITHOUT an input event.
    vm.undo();
    await nextTick();
    vi.advanceTimersByTime(500);
    await nextTick();

    // The panel must track the restored document, not the pre-undo one — and
    // must agree with the footer counter shown on the same screen.
    expect(editor.textContent?.trim()).toBe("one two three four five");
    expect(panelWords()).toBe(5);
  });
});
