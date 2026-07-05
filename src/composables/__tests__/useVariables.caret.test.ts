import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useVariables } from "../useVariables";

// Regression for #5: wrapVariablesInContent must not rewrite the text node that
// currently holds the caret, otherwise finishing "}}" destroys the node under
// the cursor and the caret jumps to the start of the editor.
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

  it("wraps a completed variable when the caret is not inside its text node", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ userName }}";
    // No selection inside the node.
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("userName");
  });

  it("skips (does not rewrite) the text node holding the caret", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ userName }}";
    const textNode = editor.firstChild as Text;

    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(textNode, textNode.textContent!.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    wrapVariablesInContent(editor);

    // The caret's node is left intact, so no span is created and the caret's
    // container still exists in the DOM.
    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.textContent).toBe("Hello {{ userName }}");
    expect(editor.contains(textNode)).toBe(true);
  });
});
