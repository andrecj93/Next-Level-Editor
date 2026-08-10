import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

/**
 * #3 (HIGH): findCurrentBlock only recognises p/h1-h6/li/blockquote, so inside a
 * code block or a table cell it returned block:null → blockText "" → isEmptyBlock
 * true → the slash menu opened on EVERY '/', mid-word and all. Code must never
 * open the menu (a literal slash), and a table cell must behave like a normal
 * block (mid-word '/' inserts a slash).
 * #22 (LOW): textBefore was read from the caret's own text node only, so a caret
 * at offset 0 of <strong> after "hello" looked like the start of the block.
 */
describe("handleSlashCommand context (code blocks, table cells, inline edges)", () => {
  let editor: HTMLDivElement;
  let openCommandMenu: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
    openCommandMenu = vi.fn();
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
      openCommandMenu: openCommandMenu as () => void,
      insertLink: vi.fn(),
      openFindReplaceModal: vi.fn(),
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
    });

  const setCaret = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const pressSlash = () => {
    build().handleKeydown(
      new KeyboardEvent("keydown", { key: "/", cancelable: true })
    );
  };

  it("does NOT open the menu inside a code block (#3)", () => {
    editor.innerHTML = "<pre><code>const x = 1;</code></pre>";
    const codeText = editor.querySelector("code")!.firstChild!;
    setCaret(codeText, 5); // mid code
    pressSlash();
    expect(openCommandMenu).not.toHaveBeenCalled();
  });

  it("does NOT open the menu at the START of a code block (#3)", () => {
    editor.innerHTML = "<pre><code>x</code></pre>";
    const codeText = editor.querySelector("code")!.firstChild!;
    setCaret(codeText, 0);
    pressSlash();
    expect(openCommandMenu).not.toHaveBeenCalled();
  });

  it("does NOT open the menu mid-word in a table cell (#3)", () => {
    editor.innerHTML =
      "<table><tbody><tr><td>abc</td></tr></tbody></table>";
    const cellText = editor.querySelector("td")!.firstChild!;
    setCaret(cellText, 1); // after "a"
    pressSlash();
    expect(openCommandMenu).not.toHaveBeenCalled();
  });

  it("does NOT open the menu at an inline-element boundary after text (#22)", () => {
    editor.innerHTML = "<p>hello<strong>world</strong></p>";
    const boldText = editor.querySelector("strong")!.firstChild!;
    setCaret(boldText, 0); // caret between 'hello' and 'world'
    pressSlash();
    expect(openCommandMenu).not.toHaveBeenCalled();
  });

  it("STILL opens the menu at the start of an empty paragraph", () => {
    editor.innerHTML = "<p>x</p>";
    const p = editor.querySelector("p")!;
    setCaret(p.firstChild!, 0);
    pressSlash();
    expect(openCommandMenu).toHaveBeenCalled();
  });

  it("STILL opens the menu after a trailing space", () => {
    editor.innerHTML = "<p>hello </p>";
    const text = editor.querySelector("p")!.firstChild!;
    setCaret(text, 6); // right after the space
    pressSlash();
    expect(openCommandMenu).toHaveBeenCalled();
  });

  it("does NOT open the menu mid-word in a normal paragraph", () => {
    editor.innerHTML = "<p>hello</p>";
    const text = editor.querySelector("p")!.firstChild!;
    setCaret(text, 5); // after 'hello', mid-line
    pressSlash();
    expect(openCommandMenu).not.toHaveBeenCalled();
  });
});
