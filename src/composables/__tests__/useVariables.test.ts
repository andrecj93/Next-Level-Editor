import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useVariables, type Variable } from "../useVariables";

describe("useVariables - live date/time values", () => {
  afterEach(() => vi.useRealTimers());

  it("resolves date.year live, not frozen at composable init", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-06-15T10:00:00"));
    const { replaceVariables } = useVariables();
    expect(replaceVariables("{{ date.year }}")).toBe("2020");

    // Same instance, a year later — must reflect the new time, not the init.
    vi.setSystemTime(new Date("2021-06-15T10:00:00"));
    expect(replaceVariables("{{ date.year }}")).toBe("2021");
  });

  it("resolves date.now live across time changes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-06-15T10:00:00"));
    const { replaceVariables } = useVariables();
    const at10 = replaceVariables("{{ date.now }}");

    vi.setSystemTime(new Date("2020-06-15T14:30:00"));
    const at1430 = replaceVariables("{{ date.now }}");
    expect(at1430).not.toBe(at10);
  });
});

// Helper to build a custom variable with sensible defaults.
function makeVariable(overrides: Partial<Variable> = {}): Variable {
  return {
    id: "custom.one",
    name: "custom.one",
    label: "Custom One",
    value: "custom-value",
    category: "custom",
    description: "A custom variable",
    ...overrides,
  };
}

describe("useVariables - initial state", () => {
  it("exposes the built-in variables through the computed ref", () => {
    const { variables } = useVariables();
    // 4 user + 4 date + 3 document + 3 company = 14 built-ins.
    expect(variables.value).toHaveLength(14);
    expect(variables.value.map((v) => v.name)).toContain("user.name");
    expect(variables.value.map((v) => v.name)).toContain("company.phone");
  });

  it("exposes the built-in categories through the computed ref", () => {
    const { categories } = useVariables();
    expect(categories.value.map((c) => c.id)).toEqual([
      "user",
      "date",
      "document",
      "company",
    ]);
    // Icons are stroke SVGs keyed by category id in the UI — the data layer
    // carries no emoji.
    expect(categories.value[0]).toMatchObject({ name: "User" });
    expect(categories.value[0].icon).toBeUndefined();
  });

  it("gives each composable instance an independent variable list", () => {
    const a = useVariables();
    const b = useVariables();
    a.addVariable(makeVariable({ id: "only.a", name: "only.a" }));
    expect(a.getVariable("only.a")).toBeDefined();
    expect(b.getVariable("only.a")).toBeUndefined();
  });
});

describe("useVariables - getVariablesByCategory", () => {
  it("returns all variables in an existing category", () => {
    const { getVariablesByCategory } = useVariables();
    const userVars = getVariablesByCategory("user");
    expect(userVars).toHaveLength(4);
    expect(userVars.every((v) => v.category === "user")).toBe(true);
  });

  it("returns an empty array for a category with no variables", () => {
    const { getVariablesByCategory } = useVariables();
    expect(getVariablesByCategory("nonexistent")).toEqual([]);
  });
});

describe("useVariables - getVariable", () => {
  it("finds a variable by exact name", () => {
    const { getVariable } = useVariables();
    const v = getVariable("user.email");
    expect(v).toBeDefined();
    expect(v?.value).toBe("john.doe@example.com");
  });

  it("returns undefined for an unknown name", () => {
    const { getVariable } = useVariables();
    expect(getVariable("does.not.exist")).toBeUndefined();
  });
});

describe("useVariables - addVariable", () => {
  it("adds a variable with a new id", () => {
    const { addVariable, getVariable, variables } = useVariables();
    const before = variables.value.length;
    addVariable(makeVariable());
    expect(variables.value.length).toBe(before + 1);
    expect(getVariable("custom.one")?.value).toBe("custom-value");
  });

  it("does not add a variable whose id already exists", () => {
    const { addVariable, variables } = useVariables();
    const before = variables.value.length;
    // user.name already exists as a built-in id.
    addVariable(makeVariable({ id: "user.name", name: "user.name.dup" }));
    expect(variables.value.length).toBe(before);
    // The original is untouched (no duplicate created for that id).
    expect(variables.value.filter((v) => v.id === "user.name")).toHaveLength(1);
  });

  it("allows two variables that share a name but differ by id", () => {
    const { addVariable, variables } = useVariables();
    const before = variables.value.length;
    addVariable(makeVariable({ id: "dup.a", name: "shared" }));
    addVariable(makeVariable({ id: "dup.b", name: "shared" }));
    expect(variables.value.length).toBe(before + 2);
  });
});

describe("useVariables - updateVariableValue", () => {
  it("updates the value of an existing variable and reflects it in getVariable", () => {
    const { updateVariableValue, getVariable } = useVariables();
    updateVariableValue("doc.title", "My New Title");
    expect(getVariable("doc.title")?.value).toBe("My New Title");
  });

  it("is a no-op for an unknown variable name", () => {
    const { updateVariableValue, variables } = useVariables();
    const snapshot = variables.value.map((v) => v.value);
    updateVariableValue("ghost", "should not appear");
    expect(variables.value.map((v) => v.value)).toEqual(snapshot);
    expect(variables.value.some((v) => v.value === "should not appear")).toBe(
      false
    );
  });
});

describe("useVariables - removeVariable", () => {
  it("removes an existing variable by name", () => {
    const { removeVariable, getVariable, variables } = useVariables();
    const before = variables.value.length;
    removeVariable("company.phone");
    expect(variables.value.length).toBe(before - 1);
    expect(getVariable("company.phone")).toBeUndefined();
  });

  it("is a no-op when the name is not found", () => {
    const { removeVariable, variables } = useVariables();
    const before = variables.value.length;
    removeVariable("not.there");
    expect(variables.value.length).toBe(before);
  });

  it("only removes the first matching variable when names collide", () => {
    const { addVariable, removeVariable, variables } = useVariables();
    addVariable(makeVariable({ id: "collide.a", name: "collide" }));
    addVariable(makeVariable({ id: "collide.b", name: "collide" }));
    const before = variables.value.length;
    removeVariable("collide");
    expect(variables.value.length).toBe(before - 1);
    // One "collide" remains.
    expect(variables.value.filter((v) => v.name === "collide")).toHaveLength(1);
  });
});

describe("useVariables - searchVariables", () => {
  it("matches by variable name (case-insensitive)", () => {
    const { searchVariables } = useVariables();
    const results = searchVariables("USER.");
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.every((v) => v.name.includes("user."))).toBe(true);
  });

  it("matches by label", () => {
    const { searchVariables } = useVariables();
    const results = searchVariables("Company Address");
    expect(results.map((v) => v.name)).toContain("company.address");
  });

  it("matches by description", () => {
    const { searchVariables } = useVariables();
    const results = searchVariables("email address");
    expect(results.map((v) => v.name)).toContain("user.email");
  });

  it("returns an empty array when nothing matches", () => {
    const { searchVariables } = useVariables();
    expect(searchVariables("zzz-no-such-thing")).toEqual([]);
  });

  it("does not throw for variables without a description", () => {
    const { addVariable, searchVariables } = useVariables();
    addVariable(
      makeVariable({
        id: "no.desc",
        name: "no.desc",
        label: "No Desc",
        description: undefined,
      })
    );
    // Query only matches the label; the description is undefined and the
    // optional-chaining branch must be exercised without throwing.
    const results = searchVariables("no desc");
    expect(results.map((v) => v.name)).toContain("no.desc");
  });

  it("matches everything with an empty query", () => {
    const { searchVariables, variables } = useVariables();
    expect(searchVariables("")).toHaveLength(variables.value.length);
  });
});

describe("useVariables - parseVariables", () => {
  it("returns an empty array when there are no tokens", () => {
    const { parseVariables } = useVariables();
    expect(parseVariables("no variables here")).toEqual([]);
  });

  it("captures a single token with surrounding whitespace trimmed in the group", () => {
    const { parseVariables } = useVariables();
    const matches = parseVariables("Hi {{ user.name }} there");
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe("user.name");
    expect(matches[0][0]).toBe("{{ user.name }}");
    expect(matches[0].index).toBe(3);
  });

  it("captures multiple tokens in one string", () => {
    const { parseVariables } = useVariables();
    const matches = parseVariables("{{a}} and {{b}} and {{c}}");
    expect(matches.map((m) => m[1])).toEqual(["a", "b", "c"]);
  });

  it("accepts names with dots, underscores and hyphens", () => {
    const { parseVariables } = useVariables();
    const matches = parseVariables("{{ my_var-name.2 }}");
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe("my_var-name.2");
  });

  it("ignores tokens containing illegal characters", () => {
    const { parseVariables } = useVariables();
    // Space and '!' inside are not part of [a-zA-Z0-9._-].
    expect(parseVariables("{{ has space }}")).toEqual([]);
    expect(parseVariables("{{ bad! }}")).toEqual([]);
  });

  it("handles tokens with no inner whitespace", () => {
    const { parseVariables } = useVariables();
    const matches = parseVariables("{{user.email}}");
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe("user.email");
  });
});

describe("useVariables - replaceVariables", () => {
  it("replaces a known variable with its value", () => {
    const { replaceVariables } = useVariables();
    expect(replaceVariables("Hello {{ user.firstName }}!")).toBe("Hello John!");
  });

  it("leaves an unknown variable token untouched", () => {
    const { replaceVariables } = useVariables();
    expect(replaceVariables("Hi {{ unknown.var }}")).toBe(
      "Hi {{ unknown.var }}"
    );
  });

  it("replaces multiple tokens, mixing known and unknown", () => {
    const { replaceVariables } = useVariables();
    const out = replaceVariables(
      "{{ user.firstName }} {{ user.lastName }} <{{ nope }}>"
    );
    expect(out).toBe("John Doe <{{ nope }}>");
  });

  it("reflects an updated variable value in the replacement", () => {
    const { replaceVariables, updateVariableValue } = useVariables();
    updateVariableValue("company.name", "Globex");
    expect(replaceVariables("At {{ company.name }}")).toBe("At Globex");
  });

  it("returns text unchanged when there are no tokens", () => {
    const { replaceVariables } = useVariables();
    expect(replaceVariables("plain text")).toBe("plain text");
  });
});

describe("useVariables - wrapVariablesInContent", () => {
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

  it("does nothing when the editor is null", () => {
    const { wrapVariablesInContent } = useVariables();
    expect(() => wrapVariablesInContent(null)).not.toThrow();
  });

  it("leaves content untouched when there are no variable tokens", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "just some plain text";
    wrapVariablesInContent(editor);
    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.textContent).toBe("just some plain text");
  });

  it("wraps a known variable, keeping the surrounding text and setting data/title", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Before {{ user.name }} after";
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("user.name");
    expect(span?.dataset.value).toBe("John Doe");
    expect(span?.getAttribute("contenteditable")).toBe("false");
    expect(span?.textContent).toBe("{{ user.name }}");
    // Description is present -> title tooltip is set.
    expect(span?.title).toBe("Current user full name");
    // Surrounding text is preserved.
    expect(editor.textContent).toBe("Before {{ user.name }} after");
  });

  it("wraps an unknown variable with an empty data-value and no title", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "X {{ mystery }} Y";
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("mystery");
    expect(span?.dataset.value).toBe("");
    expect(span?.title).toBe("");
  });

  it("wraps multiple variables in a single text node", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "{{ user.firstName }} {{ user.lastName }}";
    wrapVariablesInContent(editor);

    const spans = editor.querySelectorAll<HTMLElement>(".editor-variable");
    expect(spans).toHaveLength(2);
    expect(spans[0].dataset.variable).toBe("user.firstName");
    expect(spans[1].dataset.variable).toBe("user.lastName");
  });

  it("wraps a variable at the very start of the node (no leading text)", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "{{ user.name }} trailing";
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    // First child should be the span (no empty leading text node).
    expect((editor.firstChild as HTMLElement).classList?.contains(
      "editor-variable"
    )).toBe(true);
  });

  it("wraps a variable at the very end of the node (no trailing text)", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "leading {{ user.name }}";
    wrapVariablesInContent(editor);

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect((editor.lastChild as HTMLElement).classList?.contains(
      "editor-variable"
    )).toBe(true);
  });

  it("wraps the caret node's completed token and keeps the caret in place", () => {
    const { wrapVariablesInContent } = useVariables();
    editor.textContent = "Hello {{ user.name }}";
    const textNode = editor.firstChild as Text;

    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(textNode, textNode.textContent!.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    wrapVariablesInContent(editor);

    // The completed token is wrapped even under the caret...
    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span?.dataset.variable).toBe("user.name");
    expect(editor.textContent).toBe("Hello {{ user.name }}");
    // ...and the caret is restored right after the pill, not at doc start.
    const restored = window.getSelection()!.getRangeAt(0);
    expect(restored.collapsed).toBe(true);
    expect(restored.startContainer).toBe(editor);
    expect(restored.startOffset).toBe(2);
  });

  it("wraps tokens in both the caret node and other nodes in one pass", () => {
    const { wrapVariablesInContent } = useVariables();
    const caretPara = document.createElement("p");
    caretPara.textContent = "typing {{ user.name }}";
    const otherPara = document.createElement("p");
    otherPara.textContent = "done {{ user.email }}";
    editor.appendChild(caretPara);
    editor.appendChild(otherPara);

    const caretTextNode = caretPara.firstChild as Text;
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(caretTextNode, caretTextNode.textContent!.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    wrapVariablesInContent(editor);

    const caretSpan = caretPara.querySelector<HTMLElement>(".editor-variable");
    expect(caretSpan?.dataset.variable).toBe("user.name");
    const otherSpan = otherPara.querySelector<HTMLElement>(".editor-variable");
    expect(otherSpan?.dataset.variable).toBe("user.email");
    // The caret stays inside its paragraph (after the new pill).
    const restored = window.getSelection()!.getRangeAt(0);
    expect(caretPara.contains(restored.startContainer)).toBe(true);
  });
});

describe("useVariables - insertVariable", () => {
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

  function placeCaretInEditor() {
    // Ensure there is a text node and place a collapsed caret at its end.
    if (!editor.firstChild) {
      editor.appendChild(document.createTextNode(""));
    }
    const textNode = editor.firstChild as Text;
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(textNode, textNode.textContent!.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  it("does nothing when the editor is null", () => {
    const { insertVariable } = useVariables();
    expect(() => insertVariable(null, "user.name")).not.toThrow();
  });

  it("does nothing when there is no active selection", () => {
    const { insertVariable } = useVariables();
    window.getSelection()?.removeAllRanges();
    insertVariable(editor, "user.name");
    expect(editor.querySelector(".editor-variable")).toBeNull();
  });

  it("inserts a styled span for a known variable and fires an input event", () => {
    const { insertVariable } = useVariables();
    editor.textContent = "Start ";
    placeCaretInEditor();

    let inputFired = false;
    editor.addEventListener("input", () => {
      inputFired = true;
    });

    insertVariable(editor, "user.name");

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("user.name");
    expect(span?.dataset.value).toBe("John Doe");
    expect(span?.getAttribute("contenteditable")).toBe("false");
    expect(span?.textContent).toBe("{{ user.name }}");
    expect(span?.title).toBe("Current user full name");
    // A non-breaking space is inserted after the span.
    expect(editor.textContent).toContain(" ");
    expect(inputFired).toBe(true);
  });

  it("inserts a span for an unknown variable with an empty data-value and no title", () => {
    const { insertVariable } = useVariables();
    editor.textContent = "Start ";
    placeCaretInEditor();

    insertVariable(editor, "totally.unknown");

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span).not.toBeNull();
    expect(span?.dataset.variable).toBe("totally.unknown");
    expect(span?.dataset.value).toBe("");
    expect(span?.title).toBe("");
  });

  it("replaces the selected contents when inserting over a selection", () => {
    const { insertVariable } = useVariables();
    editor.textContent = "REPLACE_ME";
    const textNode = editor.firstChild as Text;
    const sel = window.getSelection()!;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, textNode.textContent!.length);
    sel.removeAllRanges();
    sel.addRange(range);

    insertVariable(editor, "user.email");

    const span = editor.querySelector<HTMLElement>(".editor-variable");
    expect(span?.dataset.variable).toBe("user.email");
    // The originally selected text is gone.
    expect(editor.textContent).not.toContain("REPLACE_ME");
  });
});

describe("useVariables - detectVariableAtCursor", () => {
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

  it("returns null when the editor is null", () => {
    const { detectVariableAtCursor } = useVariables();
    expect(detectVariableAtCursor(null)).toBeNull();
  });

  it("returns null when there is no selection", () => {
    const { detectVariableAtCursor } = useVariables();
    window.getSelection()?.removeAllRanges();
    expect(detectVariableAtCursor(editor)).toBeNull();
  });

  it("returns null when the caret is in a non-text node", () => {
    const { detectVariableAtCursor } = useVariables();
    // A caret positioned on the element (start container is the element node).
    editor.appendChild(document.createElement("br"));
    setCaret(editor, 0);
    expect(detectVariableAtCursor(editor)).toBeNull();
  });

  it("returns null when there is no open brace before the caret", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.textContent = "no braces here";
    const textNode = editor.firstChild as Text;
    setCaret(textNode, textNode.textContent!.length);
    expect(detectVariableAtCursor(editor)).toBeNull();
  });

  it("detects an open, unfinished variable and extracts the query", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.textContent = "Hi {{ user.na";
    const textNode = editor.firstChild as Text;
    setCaret(textNode, textNode.textContent!.length);

    const result = detectVariableAtCursor(editor);
    expect(result).toEqual({
      isInVariable: true,
      variableName: "user.na",
      query: "user.na",
    });
  });

  it("detects an empty query right after the opening braces", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.textContent = "Hi {{ ";
    const textNode = editor.firstChild as Text;
    setCaret(textNode, textNode.textContent!.length);

    const result = detectVariableAtCursor(editor);
    expect(result).toEqual({
      isInVariable: true,
      variableName: "",
      query: "",
    });
  });

  it("returns null when a closing brace already came after the last opening brace", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.textContent = "Done {{ user.name }} and more";
    const textNode = editor.firstChild as Text;
    setCaret(textNode, textNode.textContent!.length);

    // The last "}}" appears after the last "{{", so the caret is outside a token.
    expect(detectVariableAtCursor(editor)).toBeNull();
  });

  it("uses text only up to the caret position, ignoring characters after it", () => {
    const { detectVariableAtCursor } = useVariables();
    editor.textContent = "Hi {{ user.name }} tail";
    const textNode = editor.firstChild as Text;
    // Place caret right after "{{ user" (inside the token, before "}}").
    const caretPos = "Hi {{ user".length;
    setCaret(textNode, caretPos);

    const result = detectVariableAtCursor(editor);
    expect(result).toEqual({
      isInVariable: true,
      variableName: "user",
      query: "user",
    });
  });
});
