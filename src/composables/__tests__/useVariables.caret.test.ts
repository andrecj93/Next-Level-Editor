import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useVariables } from "../useVariables";

// Regression for #5 / the "typing corrupts text after a variable exists" bug:
// wrapVariablesInContent runs on every input. It must (a) wrap completed
// tokens even in the text node holding the caret WITHOUT the caret jumping to
// the start of the editor (the selection is restored to the equivalent
// position), and (b) never re-wrap a pill's own "{{ name }}" label, so
// repeated passes are idempotent.
describe("useVariables wrapVariablesInContent caret handling", () => {
  let editor: HTMLDivElement;

  beforeEach(() => {
    editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.appendChild(editor);
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    editor.remove();
  });

  function setCaret(node: Node, offset: number) {
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  it("wraps a completed variable when the caret is not inside its text node", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ userName }}";
    // No selection inside the node.
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("userName");
  });

  it("wraps the caret node's completed token and restores the caret after the pill", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ userName }}";
    const textNode = editor.firstChild as Text;
    // Caret at the very end, right after the user typed the closing "}}".
    setCaret(textNode, textNode.textContent!.length);

    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(editor.textContent).toBe("Hello {{ userName }}");

    // Caret restored immediately after the new pill, NOT at document start.
    const range = window.getSelection()!.getRangeAt(0);
    expect(range.collapsed).toBe(true);
    expect(range.startContainer).toBe(editor);
    expect(range.startOffset).toBe(2); // [text "Hello ", span] -> after span
  });

  it("restores the caret inside trailing text at the same offset", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hi {{ user.name }} world";
    const textNode = editor.firstChild as Text;
    // Caret at the end of " world".
    setCaret(textNode, textNode.textContent!.length);

    wrapVariablesInContent(editor);

    const range = window.getSelection()!.getRangeAt(0);
    expect(range.startContainer.nodeType).toBe(Node.TEXT_NODE);
    expect(range.startContainer.textContent).toBe(" world");
    expect(range.startOffset).toBe(" world".length);
    // Document order preserved: text after the pill stays after the pill.
    expect(editor.textContent).toBe("Hi {{ user.name }} world");
  });

  it("restores the caret in leading text before the token", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ userName }}";
    const textNode = editor.firstChild as Text;
    // Caret inside "Hello " (offset 3).
    setCaret(textNode, 3);

    wrapVariablesInContent(editor);

    const range = window.getSelection()!.getRangeAt(0);
    expect(range.startContainer.textContent).toBe("Hello ");
    expect(range.startOffset).toBe(3);
    expect(editor.querySelector(".editor-variable")).not.toBeNull();
  });

  it("does not re-wrap (nest) an existing pill's own label text", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.innerHTML =
      '<p>Hi <span class="editor-variable" contenteditable="false" data-variable="user.name" data-value="John Doe">{{ user.name }}</span>&nbsp;</p>';

    wrapVariablesInContent(editor);
    wrapVariablesInContent(editor);

    const pills = editor.querySelectorAll(".editor-variable");
    expect(pills).toHaveLength(1);
    expect(pills[0].querySelector(".editor-variable")).toBeNull();
  });

  it("does not touch the DOM while a token is still incomplete", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ user";
    const textNode = editor.firstChild as Text;
    setCaret(textNode, textNode.textContent!.length);

    wrapVariablesInContent(editor);

    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.firstChild).toBe(textNode);
  });
});
