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

  it("cancels a stale pending write when the host replaces the document", async () => {
    const handler = vi.fn(() => true);
    const editor = await mountEditor(handler);
    editor.innerHTML = "<p>Old pending edit</p>";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await wrapper!.setProps({ modelValue: "<p>New host document</p>" });
    await nextTick();
    await vi.advanceTimersByTimeAsync(2500);
    expect(handler).not.toHaveBeenCalled();
    expect(editor.innerHTML).toBe("<p>New host document</p>");
    expect(wrapper!.findComponent(ModalsContainer).props("hasPendingChanges")).toBe(false);
    await editAndSettle(editor, "<p>New host document edited</p>");
    expect(handler).toHaveBeenCalledExactlyOnceWith("<p>New host document edited</p>");
  });

  it("retries a failed save with the current document", async () => {
    const handler = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const editor = await mountEditor(handler);
    await editAndSettle(editor, "<p>First draft</p>");
    expect(saveStatus()).toBe("error");
    editor.innerHTML = "<p>Latest draft</p>";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await wrapper!.get(".save-retry").trigger("click");
    await flushPromises();
    expect(handler).toHaveBeenLastCalledWith("<p>Latest draft</p>");
    expect(saveStatus()).toBe("saved");
    await vi.advanceTimersByTimeAsync(2500);
    expect(handler).toHaveBeenCalledTimes(2);
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
