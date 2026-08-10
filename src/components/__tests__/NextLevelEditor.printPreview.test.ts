import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R25-3 (the historical R23-47): printing from PREVIEW view mode never
 * refreshed variable values — the beforeprint hook passed `editorContent`,
 * which is null in preview (no editable surface is mounted), so it no-op'd
 * and the v-html preview pane printed insertion-time data-values: stale
 * dates, or the pre-batch-134 empty stamps. Batch 128 built the exact tool
 * for this (the string-based refresh) and wired it to exports only.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const STALE_DOC =
  '<p>Dear <span class="editor-variable" contenteditable="false" ' +
  'data-variable="user.name" data-value="STALE-VALUE">{{ user.name }}</span>,</p>';

describe("printing from Preview refreshes variable values (#R25-3)", () => {
  it("beforeprint re-stamps the document string when no surface is mounted", async () => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: STALE_DOC,
        enableVariables: true,
        defaultViewMode: "preview",
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const vm = wrapper.vm as unknown as {
      editorContent: HTMLElement | null;
      htmlContent: string;
    };
    // Preview premise: there is no editable surface to refresh.
    expect(vm.editorContent).toBeNull();

    window.dispatchEvent(new Event("beforeprint"));
    await nextTick();

    expect(
      vm.htmlContent,
      "the printed pane must carry CURRENT values"
    ).not.toContain("STALE-VALUE");
    expect(vm.htmlContent).toContain('data-value="John Doe"');
  });

  it("the print refresh does not fire the auto-save (#R26-2)", async () => {
    // The refresh WRITES htmlContent, and the autosave watcher treats any
    // write as a document change: printing flashed the save chip and called
    // the host's saveHandler with zero user edits. Editor-mode print never
    // did (it mutates DOM attributes only) — parity demands the shield.
    vi.useFakeTimers();
    try {
      const saveHandler = vi.fn(() => true);
      wrapper = mount(NextLevelEditor, {
        props: {
          modelValue: STALE_DOC,
          enableVariables: true,
          defaultViewMode: "preview",
          saveHandler,
        },
        attachTo: document.body,
      });
      await nextTick();
      await nextTick();
      saveHandler.mockClear();

      window.dispatchEvent(new Event("beforeprint"));
      await nextTick();
      vi.advanceTimersByTime(4000);
      await nextTick();

      expect(
        saveHandler,
        "printing is not an edit"
      ).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("the pane DOM is refreshed SYNCHRONOUSLY for script-initiated print (#R26-3)", async () => {
    // window.print() called from a host's own button snapshots before Vue's
    // async flush re-renders the v-html pane — the string refresh alone
    // printed stale values on that path. The live pane is re-stamped
    // synchronously inside the beforeprint handler as well.
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: STALE_DOC,
        enableVariables: true,
        defaultViewMode: "preview",
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    window.dispatchEvent(new Event("beforeprint"));
    // NO await: this is what a synchronous print snapshot would see.
    const pill = wrapper
      .find(".preview-content-wrapper")
      .element.querySelector<HTMLElement>(".editor-variable");
    expect(pill, "the pane renders the document").not.toBeNull();
    expect(pill!.dataset.value).toBe("John Doe");
  });

  it("SPLIT view's preview pane is refreshed too (#R27-4)", async () => {
    // In split view the editable surface EXISTS, so the string-refresh branch
    // never ran — and refreshing only the surface left the v-html pane
    // printing insertion-time values. The pane restamp runs in every mode.
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: STALE_DOC,
        enableVariables: true,
        defaultViewMode: "split",
      },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const pane = wrapper.find(".preview-content-wrapper");
    expect(pane.exists(), "split view renders a preview pane").toBe(true);

    window.dispatchEvent(new Event("beforeprint"));
    const pill = pane.element.querySelector<HTMLElement>(".editor-variable");
    expect(pill).not.toBeNull();
    expect(pill!.dataset.value).toBe("John Doe");
  });

  it("editor mode still refreshes the live DOM (control)", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: STALE_DOC, enableVariables: true },
      attachTo: document.body,
    });
    await nextTick();

    window.dispatchEvent(new Event("beforeprint"));
    await nextTick();

    const pill = wrapper
      .find(".editor-content")
      .element.querySelector<HTMLElement>(".editor-variable");
    expect(pill?.dataset.value).toBe("John Doe");
  });
});
