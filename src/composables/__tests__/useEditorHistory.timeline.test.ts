import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import { useEditorHistory } from "../useEditorHistory";

// Coverage for the history-timeline additions [#14]: direct index jumps,
// clear-keeping-current, and capture timestamps.
describe("useEditorHistory timeline navigation", () => {
  const seed = (h: ReturnType<typeof useEditorHistory>) => {
    h.captureSnapshot("<p>one</p>");
    h.captureSnapshot("<p>two</p>");
    h.captureSnapshot("<p>three</p>");
  };

  it("stamps entries with a capture timestamp", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p>one</p>");
    expect(typeof h.history.value[0].timestamp).toBe("number");
    expect(h.history.value[0].timestamp).toBeGreaterThan(0);
  });

  it("caps retained snapshots so memory stays bounded", () => {
    const h = useEditorHistory();
    for (let i = 0; i < 500; i++) {
      h.captureSnapshot(`<p>edit ${i}</p>`);
    }
    // Bounded to the cap, index pinned to the newest, newest content retained.
    expect(h.history.value.length).toBe(200);
    expect(h.historyIndex.value).toBe(199);
    expect(h.history.value.at(-1)!.html).toBe("<p>edit 499</p>");
    // The oldest snapshots were dropped from the front.
    expect(h.history.value[0].html).toBe("<p>edit 300</p>");
  });

  it("goToIndex jumps directly to an entry and applies its html", async () => {
    const h = useEditorHistory();
    seed(h);
    expect(h.historyIndex.value).toBe(2);

    const apply = vi.fn();
    h.goToIndex(0, apply);
    await nextTick();

    expect(h.historyIndex.value).toBe(0);
    // The apply callback now also receives the entry's captured selection
    // (null here — seed() captures no caret).
    expect(apply).toHaveBeenCalledWith("<p>one</p>", null);
  });

  it("goToIndex ignores out-of-range and same-index jumps", () => {
    const h = useEditorHistory();
    seed(h);
    const apply = vi.fn();

    h.goToIndex(-1, apply);
    h.goToIndex(99, apply);
    h.goToIndex(2, apply); // already current

    expect(apply).not.toHaveBeenCalled();
    expect(h.historyIndex.value).toBe(2);
  });

  it("redo works after jumping back via goToIndex", async () => {
    const h = useEditorHistory();
    seed(h);
    const apply = vi.fn();

    h.goToIndex(0, apply);
    await nextTick();
    expect(h.canRedo()).toBe(true);

    h.redo(apply);
    await nextTick();
    expect(apply).toHaveBeenLastCalledWith("<p>two</p>", null);
  });

  it("clearHistory keeps only the current entry (document untouched)", () => {
    const h = useEditorHistory();
    seed(h);

    h.clearHistory();

    expect(h.history.value).toHaveLength(1);
    expect(h.history.value[0].html).toBe("<p>three</p>");
    expect(h.historyIndex.value).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
