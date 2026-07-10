import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, ref, nextTick, type Ref } from "vue";
import { mount } from "@vue/test-utils";
import { useEditorSetup } from "../useEditorSetup";

/**
 * Regression tests for the keydown listener lifecycle.
 *
 * The editable element is rendered with v-if per view mode by the host, so it
 * is destroyed and recreated when switching Editor -> Code -> Editor. The
 * keydown handler (all app shortcuts, Tab list indent, slash menu, Enter
 * handling) must follow the element, not the initial mount.
 */
function makeHarness(initialEl: HTMLDivElement | null) {
  const editorContent: Ref<HTMLDivElement | null> = ref(initialEl);
  const handleKeydown = vi.fn();

  const Host = defineComponent({
    setup() {
      useEditorSetup({
        editorContent,
        codeContent: ref(""),
        floatingToolbarTimer: ref(null),
        modelValue: "",
        applySanitizedContent: () => {},
        captureSnapshot: () => {},
        handleKeydown,
        enableSpellCheck: () => {},
        handleDocumentClick: () => {},
        handleEscape: () => {},
        onSelectionChange: () => {},
      });
      return () => h("div");
    },
  });

  const wrapper = mount(Host);
  return { editorContent, handleKeydown, wrapper };
}

const keydown = () =>
  new KeyboardEvent("keydown", { key: "b", ctrlKey: true });

describe("useEditorSetup keydown rebinding", () => {
  it("attaches the keydown handler to the initial element exactly once", () => {
    const el = document.createElement("div");
    const { handleKeydown } = makeHarness(el);

    el.dispatchEvent(keydown());
    expect(handleKeydown).toHaveBeenCalledTimes(1);
  });

  it("re-attaches the handler when the editable element is recreated (code view round trip)", async () => {
    const original = document.createElement("div");
    const { editorContent, handleKeydown } = makeHarness(original);

    // Switch to code view: the editor element is destroyed.
    editorContent.value = null;
    await nextTick();
    original.dispatchEvent(keydown());
    expect(handleKeydown).not.toHaveBeenCalled();

    // Switch back to editor view: a brand-new element is created.
    const recreated = document.createElement("div");
    editorContent.value = recreated;
    await nextTick();

    recreated.dispatchEvent(keydown());
    expect(handleKeydown).toHaveBeenCalledTimes(1);
  });

  it("moves the handler when the active editable swaps to another element (split view)", async () => {
    const main = document.createElement("div");
    const { editorContent, handleKeydown } = makeHarness(main);

    const splitEditor = document.createElement("div");
    editorContent.value = splitEditor;
    await nextTick();

    splitEditor.dispatchEvent(keydown());
    expect(handleKeydown).toHaveBeenCalledTimes(1);

    // The previous element no longer routes keys into the app handler.
    main.dispatchEvent(keydown());
    expect(handleKeydown).toHaveBeenCalledTimes(1);
  });

  it("stops listening after unmount", async () => {
    const el = document.createElement("div");
    const { editorContent, handleKeydown, wrapper } = makeHarness(el);

    wrapper.unmount();
    el.dispatchEvent(keydown());
    expect(handleKeydown).not.toHaveBeenCalled();

    // Post-unmount ref churn must not re-attach anything.
    const late = document.createElement("div");
    editorContent.value = late;
    await nextTick();
    late.dispatchEvent(keydown());
    expect(handleKeydown).not.toHaveBeenCalled();
  });
});
