import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";

vi.mock("../../utils/scroll", () => ({ smoothScrollIntoView: vi.fn() }));

/**
 * Regressions: handleFind used window.find, which searched the WHOLE page,
 * hardcoded case-sensitivity/whole-word/wrap to false, and reported nothing
 * back for a "X of N" counter.
 */
describe("useFindReplace.handleFind — editor-scoped navigation", () => {
  let editor: HTMLDivElement;
  let handleFind: ReturnType<typeof useFindReplace>["handleFind"];

  const build = (html: string) => {
    editor = document.createElement("div");
    editor.innerHTML = html;
    document.body.appendChild(editor);
    handleFind = useFindReplace({
      editorContent: ref(editor),
      captureSnapshot: vi.fn(),
    }).handleFind;
  };

  const find = (
    findText: string,
    direction: "next" | "previous",
    options = { caseSensitive: false, wholeWord: false }
  ) => handleFind({ findText, direction, options });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("counts matches inside the editor and reports total + current", () => {
    build("<p>cat CAT cat</p><p>dog</p>");
    const r = find("cat", "next");
    expect(r.total).toBe(3); // case-insensitive: cat, CAT, cat
    expect(r.current).toBe(1);
  });

  it("respects case sensitivity", () => {
    build("<p>cat CAT cat</p>");
    expect(find("cat", "next", { caseSensitive: true, wholeWord: false }).total).toBe(2);
  });

  it("respects whole-word matching", () => {
    build("<p>cat category cat</p>");
    expect(find("cat", "next", { caseSensitive: false, wholeWord: true }).total).toBe(2);
  });

  it("wraps forward and backward", () => {
    build("<p>cat cat cat</p>");
    expect(find("cat", "next").current).toBe(1);
    expect(find("cat", "next").current).toBe(2);
    expect(find("cat", "next").current).toBe(3);
    expect(find("cat", "next").current).toBe(1); // wrapped forward
    expect(find("cat", "previous").current).toBe(3); // wrapped backward
  });

  it("does NOT match text outside the editor (page chrome)", () => {
    build("<p>cat cat</p>");
    const outside = document.createElement("div");
    outside.innerHTML = "<p>cat cat cat</p>";
    document.body.appendChild(outside);

    // Only the 2 in-editor matches count — the 3 outside are ignored.
    expect(find("cat", "next").total).toBe(2);
    outside.remove();
  });

  it("returns 0/0 when there is no match", () => {
    build("<p>hello world</p>");
    expect(find("xyz", "next")).toEqual({ current: 0, total: 0 });
  });

  it("moves the selection onto the matched range", () => {
    build("<p>alpha beta gamma</p>");
    find("beta", "next");
    const sel = window.getSelection()!;
    expect(sel.toString()).toBe("beta");
  });
});
