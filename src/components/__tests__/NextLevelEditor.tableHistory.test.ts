import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ModalsContainer from "../ModalsContainer.vue";

/**
 * Table-designer structural edits (add/remove row/column, delete table, cell &
 * table properties) mutate the editor DOM from outside Vue. Like every other
 * such mutation in this codebase they must go through the snapshot path
 * (captureAndEmit = snapshot + sanitize + emit + auto-save) — a bare
 * `emit("update:modelValue", innerHTML)` is invisible to history and auto-save:
 * the row silently never reaches the host, and Ctrl+Z eats an UNRELATED earlier
 * edit because no snapshot was taken for the row.
 */
describe("NextLevelEditor — table edits reach history and auto-save", () => {
  let wrapper: VueWrapper | null = null;

  // happy-dom doesn't implement HTMLTableSectionElement.rows, which the real
  // table code depends on. Provide it so the genuine mutation path runs.
  const polyfillRows = (root: HTMLElement) => {
    root.querySelectorAll("thead, tbody, tfoot").forEach((section) => {
      Object.defineProperty(section, "rows", {
        get: () => section.querySelectorAll("tr"),
        configurable: true,
      });
    });
  };

  const TABLE_DOC =
    "<p>intro</p><table><tbody>" +
    "<tr><td>a1</td><td>a2</td></tr>" +
    "<tr><td>b1</td><td>b2</td></tr>" +
    "</tbody></table>";

  const selectCell = (editor: HTMLElement, index: number) => {
    const cell = editor.querySelectorAll("td")[index];
    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
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

  it("fires auto-save when a row is added from the table designer", async () => {
    const saveHandler = vi.fn(() => true);
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: TABLE_DOC, saveHandler },
      attachTo: document.body,
    });
    await nextTick();

    const editor = wrapper.find(".editor-content").element as HTMLElement;
    polyfillRows(editor);

    // Baseline: an ordinary edit DOES reach auto-save, so the harness is sound.
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(saveHandler).toHaveBeenCalled();
    saveHandler.mockClear();

    // Now the same content change made by the table designer.
    selectCell(editor, 0);
    await nextTick();
    wrapper.findComponent(ModalsContainer).vm.$emit("add-row-below");
    await nextTick();
    vi.advanceTimersByTime(2500);
    await flushPromises();

    // The row is really in the DOM...
    expect(editor.querySelectorAll("tr").length).toBe(3);
    // ...so the host must have been told about it.
    expect(saveHandler).toHaveBeenCalled();
  });

  it("captures a history snapshot so undo removes only the row", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: TABLE_DOC },
      attachTo: document.body,
    });
    await nextTick();

    const editor = wrapper.find(".editor-content").element as HTMLElement;
    polyfillRows(editor);

    // An earlier, unrelated edit that must survive a single undo.
    editor.querySelector("p")!.textContent = "intro edited";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    selectCell(editor, 0);
    await nextTick();
    wrapper.findComponent(ModalsContainer).vm.$emit("add-row-below");
    await nextTick();
    expect(editor.querySelectorAll("tr").length).toBe(3);

    // One Ctrl+Z should undo the ROW, leaving the earlier text edit intact.
    // `cancelable` matters: the shortcut handler calls preventDefault, and
    // onEditorKeydown uses defaultPrevented to stop the advanced-shortcut
    // handler from processing the same key again. A non-cancelable event (which
    // the browser never produces for keydown) would undo twice.
    editor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await nextTick();

    expect(editor.querySelectorAll("tr").length).toBe(2);
    expect(editor.querySelector("p")!.textContent).toBe("intro edited");
  });
});
