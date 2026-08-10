import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ModalsContainer from "../ModalsContainer.vue";

/**
 * r20-2 (HIGH): a saveHandler that throws (or resolves false) makes useAutoSave
 * compute saveStatus='error' + lastError — the documented "surface the failure"
 * contract — but NextLevelEditor destructured only { isSaving, lastSaved,
 * triggerAutoSave }, so the auto-save indicator kept showing "Saved". A silent
 * save failure reads as success and the user loses work believing it persisted.
 */
describe("NextLevelEditor — auto-save surfaces a failing saveHandler", () => {
  let wrapper: VueWrapper | null = null;

  const mountEditor = async (saveHandler: (content: string) => boolean) => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hello</p>", saveHandler },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper.find(".editor-content").element as HTMLElement;
  };

  const editAndSettle = async (editor: HTMLElement, html: string) => {
    editor.innerHTML = html;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    vi.advanceTimersByTime(2500);
    await flushPromises();
  };

  const saveStatus = () =>
    wrapper!.findComponent(ModalsContainer).props("saveStatus");

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("shows an error state (not 'saved') when the saveHandler throws", async () => {
    const saveHandler = vi.fn((): boolean => {
      throw new Error("QuotaExceededError");
    });
    const editor = await mountEditor(saveHandler);

    await editAndSettle(editor, "<p>hello EDITED</p>");

    expect(saveHandler).toHaveBeenCalled();
    expect(saveStatus()).toBe("error");
  });

  it("shows an error state when the saveHandler resolves false", async () => {
    const saveHandler = vi.fn((): boolean => false);
    const editor = await mountEditor(saveHandler);

    await editAndSettle(editor, "<p>hello EDITED</p>");

    expect(saveHandler).toHaveBeenCalled();
    expect(saveStatus()).toBe("error");
  });

  it("reports 'saved' on a successful save", async () => {
    const saveHandler = vi.fn((): boolean => true);
    const editor = await mountEditor(saveHandler);

    await editAndSettle(editor, "<p>hello EDITED</p>");

    expect(saveHandler).toHaveBeenCalled();
    expect(saveStatus()).toBe("saved");
  });

  it("the indicator renders error wording, never 'Saved at', after a failure", async () => {
    const saveHandler = vi.fn((): boolean => {
      throw new Error("nope");
    });
    const editor = await mountEditor(saveHandler);

    await editAndSettle(editor, "<p>hello EDITED</p>");
    await nextTick();

    const indicator = document.querySelector(".auto-save-indicator");
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).not.toContain("Saved at");
    expect(indicator!.classList.contains("is-error")).toBe(true);
  });
});
