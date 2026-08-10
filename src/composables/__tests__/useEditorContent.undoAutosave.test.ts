import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useEditorContent } from "../useEditorContent";

/**
 * CRITICAL data-corruption race: typing arms the debounced auto-save with the
 * CURRENT content string captured in the timer closure. Undoing within the
 * debounce window never cancelled or re-armed that timer (the htmlContent
 * watcher is skipped while isApplyingHistory is true), so ~2s after a
 * successful undo the stale timer fired and re-emitted the PRE-undo content —
 * visibly reverting the undo, or silently persisting the stale snapshot
 * through the host's saveHandler.
 *
 * The contract under test: restoring a history snapshot (undo/redo/jump) must
 * RE-ARM auto-save with the restored content, replacing any pending stale
 * debounce (triggerAutoSave debounces, so a newer call supersedes the timer).
 */
describe("useEditorContent: undo re-arms auto-save with the restored content", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
    vi.clearAllMocks();
  });

  const setup = () => {
    const editorRef = ref<HTMLDivElement | null>(editor);
    const modelValue = ref("");
    const onUpdate = vi.fn();
    const triggerAutoSave = vi.fn();
    const api = useEditorContent({
      editorContent: editorRef,
      modelValue,
      onUpdate,
      triggerAutoSave,
    });
    return { api, triggerAutoSave };
  };

  it("supersedes the stale debounce on undo (last arm = restored content)", () => {
    const { api, triggerAutoSave } = setup();

    editor.innerHTML = "<p>hello</p>";
    api.captureAndEmit();
    editor.innerHTML = "<p>helloX</p>";
    api.captureAndEmit();
    // The pending debounce now holds the 'helloX' snapshot.
    expect(triggerAutoSave).toHaveBeenLastCalledWith(
      expect.stringContaining("helloX")
    );

    // Undo within the debounce window: the LAST arm must be the restored
    // content, so the stale 'helloX' timer can never fire.
    api.undo();
    const lastArm = triggerAutoSave.mock.calls.at(-1)![0] as string;
    expect(lastArm).toContain("hello");
    expect(lastArm).not.toContain("helloX");
  });

  it("re-arms on redo as well", () => {
    const { api, triggerAutoSave } = setup();

    editor.innerHTML = "<p>one</p>";
    api.captureAndEmit();
    editor.innerHTML = "<p>two</p>";
    api.captureAndEmit();
    api.undo();
    api.redo();

    expect(triggerAutoSave).toHaveBeenLastCalledWith(
      expect.stringContaining("two")
    );
  });
});
