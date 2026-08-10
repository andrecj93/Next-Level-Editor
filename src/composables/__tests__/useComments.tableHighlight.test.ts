import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useComments } from "../useComments";

/**
 * Commenting a selection that spans two TABLE CELLS used to corrupt the table:
 * surroundContents throws, collectHighlightBlocks found 0 blocks (TD/TH were
 * not in HIGHLIGHT_BLOCK_TAGS), and the single-block fallback then did
 * extractContents + insertNode — ripping the <td> elements out of the row and
 * re-inserting them inside a <span> sibling of the emptied cells. The
 * per-block path must treat table cells as blocks: one highlight span INSIDE
 * each cell, grid intact.
 */
describe("useComments: highlight across table cells", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    editor.remove();
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
  });

  it("wraps each cell's slice in its own span and keeps the grid intact", () => {
    editor.innerHTML =
      "<table><tbody><tr><td>foo</td><td>bar</td></tr></tbody></table>";
    const editorElement = ref<HTMLElement | undefined>(editor);
    const comments = useComments({ editorElement });

    const cells = editor.querySelectorAll("td");
    const range = document.createRange();
    range.setStart(cells[0].firstChild!, 0);
    range.setEnd(cells[1].firstChild!, 3);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    expect(comments.captureSelection()).toBe(true);
    const thread = comments.addThread("table comment")!;
    expect(thread).not.toBeNull();

    // The table structure survives: still one row with exactly two cells,
    // texts intact.
    const tds = editor.querySelectorAll("td");
    expect(tds).toHaveLength(2);
    expect(Array.from(tds).map((c) => c.textContent)).toEqual(["foo", "bar"]);

    // Each cell got its own highlight span INSIDE the cell.
    const highlights = editor.querySelectorAll(".comment-highlight");
    expect(highlights).toHaveLength(2);
    highlights.forEach((h) => {
      expect(h.closest("td")).not.toBeNull();
    });
    // Never a span as a direct child of tr/tbody/table.
    expect(
      editor.querySelector("tr > span, tbody > span, table > span")
    ).toBeNull();
  });
});
