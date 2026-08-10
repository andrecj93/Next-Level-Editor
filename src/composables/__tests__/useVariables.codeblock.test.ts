import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useVariables } from "../useVariables";

/**
 * wrapVariablesInContent runs on every input and turns any "{{ name }}" text
 * into a contenteditable=false pill. Its only skip guard was `.editor-variable`
 * (so pills don't re-wrap). Text inside <pre>/<code> was NOT skipped, so a user
 * documenting a template language — const t = "Hello {{ user.name }}" inside a
 * code block — had the literal braces silently eaten and replaced by a
 * non-editable pill the moment they typed the closing "}}". Code samples must
 * be left verbatim.
 */
describe("useVariables leaves code blocks untouched", () => {
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

  it("does not pill-wrap a mustache literal inside <pre><code>", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.innerHTML =
      '<pre><code>const t = "Hello {{ user.name }}";</code></pre>';

    wrapVariablesInContent(editor);

    // No pill was created…
    expect(editor.querySelector(".editor-variable")).toBeNull();
    // …and the source characters survive verbatim.
    expect(editor.querySelector("code")!.textContent).toBe(
      'const t = "Hello {{ user.name }}";'
    );
  });

  it("does not pill-wrap a mustache literal inside an inline <code>", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.innerHTML = "<p>Use <code>{{ count }}</code> in the template</p>";

    wrapVariablesInContent(editor);

    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.querySelector("code")!.textContent).toBe("{{ count }}");
  });

  it("still wraps variables in normal prose next to a code block", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.innerHTML =
      '<p>Hi {{ name }}</p><pre><code>{{ literal }}</code></pre>';

    wrapVariablesInContent(editor);

    // The prose variable is wrapped…
    const pills = editor.querySelectorAll(".editor-variable");
    expect(pills.length).toBe(1);
    // …but the code literal is left alone.
    expect(editor.querySelector("code")!.textContent).toBe("{{ literal }}");
  });

  const putCaret = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  it("does NOT trigger the variable autocomplete when typing {{ inside code", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.innerHTML = "<pre><code>const x = {{ user</code></pre>";
    const codeText = editor.querySelector("code")!.firstChild!;
    putCaret(codeText, codeText.textContent!.length);

    // The autocomplete detection must bail — no menu for a code sample.
    expect(detectVariableAtCursor(editor)).toBeNull();
  });

  it("still triggers the autocomplete for {{ in normal prose", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.innerHTML = "<p>Hello {{ user</p>";
    const text = editor.querySelector("p")!.firstChild!;
    putCaret(text, text.textContent!.length);

    const r = detectVariableAtCursor(editor);
    expect(r?.isInVariable).toBe(true);
    expect(r?.query).toBe("user");
  });
});
