import { describe, it, expect } from "vitest";
import { useVariables } from "../useVariables";

/**
 * R23-63: once a {{ token }} became a pill there was no way to EDIT it — the
 * pill is contenteditable=false, and any re-materialized token text was
 * instantly re-frozen by wrapVariablesInContent (it runs on every input),
 * ejecting the caret past the pill mid-edit.
 *
 * The model: Backspace immediately after a pill UNWRAPS it back to its
 * literal token text with the caret at the end (Notion-style), and the wrap
 * pass never swallows a token the caret is still INSIDE — so the user can
 * edit freely, and the token re-wraps once the caret leaves.
 */
const makeEditor = (html: string): HTMLElement => {
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  editor.innerHTML = html;
  document.body.appendChild(editor);
  return editor;
};

const setCaret = (node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

const backspace = (): KeyboardEvent =>
  new KeyboardEvent("keydown", {
    key: "Backspace",
    bubbles: true,
    cancelable: true,
  });

describe("editing an existing token (#R23-63)", () => {
  it("the wrap pass skips a token the caret is INSIDE", () => {
    const { wrapVariablesInContent } = useVariables();
    const editor = makeEditor("<p>Hi {{ user.name }} there</p>");
    const text = editor.querySelector("p")!.firstChild as Text;
    // Caret inside the token (between "user" and ".name").
    setCaret(text, 10);

    wrapVariablesInContent(editor);

    expect(
      editor.querySelector(".editor-variable"),
      "a token being edited must stay text"
    ).toBeNull();
    expect(editor.textContent).toContain("{{ user.name }}");
    editor.remove();
  });

  it("the wrap pass still wraps with the caret AT the token's end (control)", () => {
    // That is exactly the state right after typing the closing "}}" — the
    // main flow must keep working.
    const { wrapVariablesInContent } = useVariables();
    const editor = makeEditor("<p>Hi {{ user.name }}</p>");
    const text = editor.querySelector("p")!.firstChild as Text;
    setCaret(text, text.textContent!.length);

    wrapVariablesInContent(editor);

    expect(editor.querySelector(".editor-variable")).not.toBeNull();
    editor.remove();
  });

  it("other complete tokens in the same node still wrap while one is edited", () => {
    const { wrapVariablesInContent } = useVariables();
    const editor = makeEditor("<p>{{ user.name }} and {{ date.year }}</p>");
    const text = editor.querySelector("p")!.firstChild as Text;
    // Caret inside the FIRST token only.
    setCaret(text, 5);

    wrapVariablesInContent(editor);

    const pills = editor.querySelectorAll(".editor-variable");
    expect(pills).toHaveLength(1);
    expect(pills[0].getAttribute("data-variable")).toBe("date.year");
    expect(editor.textContent).toContain("{{ user.name }}");
    editor.remove();
  });

  it("Backspace right after a pill unwraps it to editable token text", () => {
    const { unwrapPillBeforeCaret } = useVariables();
    const editor = makeEditor(
      '<p>Hi <span class="editor-variable" contenteditable="false" ' +
        'data-variable="user.name" data-value="John Doe">' +
        '<span class="variable-token">{{ user.name }}</span></span> tail</p>'
    );
    const after = editor.querySelector(".editor-variable")!
      .nextSibling as Text;
    setCaret(after, 0);
    const event = backspace();

    const handled = unwrapPillBeforeCaret(editor, event);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.textContent).toContain("{{ user.name }}");
    // Caret parked at the END of the token text, ready to edit.
    const selection = window.getSelection()!;
    const caretNode = selection.getRangeAt(0).startContainer as Text;
    expect(caretNode.textContent).toBe("{{ user.name }}");
    expect(selection.getRangeAt(0).startOffset).toBe(
      caretNode.textContent!.length
    );
    editor.remove();
  });

  it("Backspace anywhere else is left to the browser (control)", () => {
    const { unwrapPillBeforeCaret } = useVariables();
    const editor = makeEditor(
      '<p>plain text <span class="editor-variable" data-variable="x">' +
        '<span class="variable-token">{{ x }}</span></span></p>'
    );
    const text = editor.querySelector("p")!.firstChild as Text;
    setCaret(text, 5);
    const event = backspace();

    expect(unwrapPillBeforeCaret(editor, event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(editor.querySelector(".editor-variable")).not.toBeNull();
    editor.remove();
  });

  it("unwrap keeps the duplicate-name pin through the text round-trip (#R27-1)", () => {
    // The pill's identity pin (data-variable-id) cannot ride on plain text —
    // so unwrapping the SECOND of two same-name variables and re-wrapping
    // used to rebind first-by-name, reopening R24-20 with a single keypress.
    // When name-resolution would diverge from the pin, the unwrap emits the
    // ID as the token, and the wrap/substitute paths resolve ids too.
    const api = useVariables({
      variables: [
        {
          id: "user.email",
          name: "email",
          label: "User email",
          value: "a@x",
          category: "user",
        },
        {
          id: "company.email",
          name: "email",
          label: "Company email",
          value: "b@x",
          category: "company",
        },
      ],
    });
    const editor = makeEditor(
      '<p>Hi <span class="editor-variable" contenteditable="false" ' +
        'data-variable="email" data-variable-id="company.email" ' +
        'data-value="b@x"><span class="variable-token">{{ email }}</span></span>x</p>'
    );
    const after = editor.querySelector(".editor-variable")!.nextSibling as Text;
    setCaret(after, 0);

    expect(api.unwrapPillBeforeCaret(editor, backspace())).toBe(true);
    expect(
      editor.textContent,
      "an ambiguous name unwraps to its ID token"
    ).toContain("{{ company.email }}");

    // Caret moves elsewhere; the re-wrap restores the SAME identity.
    setCaret(editor.querySelector("p")!.lastChild as Text, 1);
    api.wrapVariablesInContent(editor);

    const pill = editor.querySelector<HTMLElement>(".editor-variable")!;
    expect(pill).not.toBeNull();
    expect(pill.dataset.variableId).toBe("company.email");
    expect(pill.dataset.value).toBe("b@x");
    editor.remove();
  });

  it("a name the wrap pass cannot re-freeze keeps the atomic delete (#R27-2)", () => {
    // Host variable names are unconstrained ("nome completo"), but the wrap
    // regex only matches [a-zA-Z0-9._-]+ — unwrapping such a pill produced
    // dead text that LOOKS like a live token but can never re-wrap or
    // substitute. Better the old behavior: Backspace deletes the pill whole.
    const api = useVariables();
    api.addVariable({
      id: "nome completo",
      name: "nome completo",
      label: "Nome completo",
      value: "Maria",
      category: "user",
    });
    const editor = makeEditor(
      '<p><span class="editor-variable" contenteditable="false" ' +
        'data-variable="nome completo" data-value="Maria">' +
        '<span class="variable-token">{{ nome completo }}</span></span>x</p>'
    );
    const after = editor.querySelector(".editor-variable")!.nextSibling as Text;
    setCaret(after, 0);
    const event = backspace();

    expect(
      api.unwrapPillBeforeCaret(editor, event),
      "an un-rewrappable token must not be produced"
    ).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    editor.remove();
  });

  it("unwrap steps over an empty text node between caret and pill (#R27-3)", () => {
    const api = useVariables();
    const editor = makeEditor(
      '<p><span class="editor-variable" contenteditable="false" ' +
        'data-variable="user.name" data-value="J">' +
        '<span class="variable-token">{{ user.name }}</span></span></p>'
    );
    const p = editor.querySelector("p")!;
    p.appendChild(document.createTextNode(""));
    const tail = document.createTextNode("x");
    p.appendChild(tail);
    setCaret(tail, 0);

    expect(api.unwrapPillBeforeCaret(editor, backspace())).toBe(true);
    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.textContent).toContain("{{ user.name }}");
    editor.remove();
  });

  it("an unwrapped token re-wraps once the caret has moved elsewhere", () => {
    const { wrapVariablesInContent } = useVariables();
    const editor = makeEditor(
      "<p>{{ user.name }}</p><p>elsewhere</p>"
    );
    const other = editor.querySelectorAll("p")[1].firstChild as Text;
    setCaret(other, 3);

    wrapVariablesInContent(editor);

    const pill = editor.querySelector<HTMLElement>(".editor-variable");
    expect(pill).not.toBeNull();
    // Identity is pinned on the way back in, so refreshes stay stable. #R25-1
    expect(pill!.dataset.variableId).toBe("user.name");
    editor.remove();
  });
});
