import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * R23-1: pressing Enter over a selection that SPANS two blocks shredded the
 * document. handleEnterKey deletes the selection first, and per the DOM spec a
 * cross-block `deleteContents()` leaves the collapsed range on the COMMON
 * ANCESTOR (the root, the <ul>, the <tr>) — never inside a block. So
 * findCurrentBlock returned null and control fell through to
 * handleEnterWithoutBlock, which exists only for bare text with no block
 * wrapper: it re-wrapped everything before and after the caret in brand-new
 * <p>s, giving <p><p>He</p></p><p><p>rld</p></p>, three <ol>s restarting at 1,
 * or a table split into three tables.
 *
 * The delete has ALREADY produced the split Enter is supposed to make — the two
 * partial blocks are siblings. The only thing left to do is put the caret at
 * the join.
 */
describe("Enter over a cross-block selection (#R23-1)", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
  });

  afterEach(() => {
    editor.remove();
    window.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  const build = () =>
    useKeyboardShortcuts({
      editorContent: ref(editor),
      onInput: vi.fn(),
      onCaptureSnapshot: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      openCommandMenu: vi.fn(),
      insertLink: vi.fn(),
      openFindReplaceModal: vi.fn(),
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
    });

  const selectAcross = (
    from: Node,
    fromOffset: number,
    to: Node,
    toOffset: number
  ) => {
    const range = document.createRange();
    range.setStart(from, fromOffset);
    range.setEnd(to, toOffset);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const pressEnter = () =>
    build().handleKeydown(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
    );

  it("leaves exactly two paragraphs, not nested ones", () => {
    editor.innerHTML = "<p>Hello</p><p>World</p>";
    const [p1, p2] = Array.from(editor.querySelectorAll("p"));
    selectAcross(p1.firstChild!, 2, p2.firstChild!, 2);

    pressEnter();

    expect(editor.innerHTML).toBe("<p>He</p><p>rld</p>");
    expect(editor.querySelector("p p")).toBeNull();
  });

  it("keeps one list when the selection spans two of its items", () => {
    editor.innerHTML = "<ol><li>Alpha</li><li>Beta</li></ol>";
    const [li1, li2] = Array.from(editor.querySelectorAll("li"));
    selectAcross(li1.firstChild!, 2, li2.firstChild!, 2);

    pressEnter();

    expect(editor.querySelectorAll("ol")).toHaveLength(1);
    expect(
      Array.from(editor.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["Al", "ta"]);
    expect(editor.querySelector("li p")).toBeNull();
  });

  it("keeps the table when the selection spans two cells", () => {
    editor.innerHTML =
      "<table><tbody><tr><td>Alpha</td><td>Beta</td></tr></tbody></table>";
    const [c1, c2] = Array.from(editor.querySelectorAll("td"));
    selectAcross(c1.firstChild!, 2, c2.firstChild!, 2);

    pressEnter();

    expect(editor.querySelectorAll("table")).toHaveLength(1);
    expect(
      Array.from(editor.querySelectorAll("td")).map((c) => c.textContent)
    ).toEqual(["Al", "ta"]);
  });

  it("joins a heading and the paragraph below it without nesting", () => {
    editor.innerHTML = "<h2>Title</h2><p>Body text</p>";
    const h = editor.querySelector("h2")!;
    const p = editor.querySelector("p")!;
    selectAcross(h.firstChild!, 2, p.firstChild!, 4);

    pressEnter();

    expect(editor.innerHTML).toBe("<h2>Ti</h2><p> text</p>");
    expect(editor.querySelector("h2 p")).toBeNull();
  });

  it("puts the caret at the start of the second block", () => {
    editor.innerHTML = "<p>Hello</p><p>World</p>";
    const [p1, p2] = Array.from(editor.querySelectorAll("p"));
    selectAcross(p1.firstChild!, 2, p2.firstChild!, 2);

    pressEnter();

    const sel = window.getSelection()!;
    expect(sel.isCollapsed).toBe(true);
    const blocks = Array.from(editor.querySelectorAll("p"));
    expect(blocks[1].contains(sel.anchorNode)).toBe(true);
  });

  it("still splits a selection WITHIN one block normally", () => {
    // Control: a same-block selection must keep the ordinary split behaviour.
    editor.innerHTML = "<p>HelloWorld</p>";
    const p = editor.querySelector("p")!;
    selectAcross(p.firstChild!, 2, p.firstChild!, 7);

    pressEnter();

    expect(editor.querySelectorAll("p")).toHaveLength(2);
    expect(
      Array.from(editor.querySelectorAll("p")).map((b) => b.textContent)
    ).toEqual(["He", "rld"]);
  });
});
