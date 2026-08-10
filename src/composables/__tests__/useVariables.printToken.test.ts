import { describe, it, expect } from "vitest";
import { useVariables } from "../useVariables";

/**
 * R24-1: the printed value is injected via `::after`, which inherits font-size
 * from the PILL — so hiding the token with `font-size: 0` on the pill also
 * erased the value (measured with page.pdf(): variables printed as nothing).
 * Print CSS now hides a real `.variable-token` child instead, which means every
 * pill must HAVE that child: new pills get it at creation, and pills from
 * older documents are normalized by refreshVariablePills — the hook that
 * already runs on beforeprint, i.e. guaranteed to have passed before the
 * print engine reads the DOM.
 */
const makeEditor = (html: string): HTMLElement => {
  const editor = document.createElement("div");
  editor.innerHTML = html;
  document.body.appendChild(editor);
  return editor;
};

describe("variable pills carry a .variable-token child (#R24-1)", () => {
  it("a pill created by wrapping typed text has the token wrapper", () => {
    const { wrapVariablesInContent } = useVariables();
    const editor = makeEditor("<p>Hello {{ user.name }} there</p>");

    wrapVariablesInContent(editor);

    const pill = editor.querySelector(".editor-variable")!;
    expect(pill).not.toBeNull();
    const token = pill.querySelector(".variable-token");
    expect(token, "token text must be wrapped at creation").not.toBeNull();
    expect(token?.textContent).toBe("{{ user.name }}");
  });

  it("a pill inserted from the panel has the token wrapper", () => {
    const { insertVariable } = useVariables();
    const editor = makeEditor("<p>Hi</p>");
    // Place the caret inside the paragraph so insertion has a target.
    const range = document.createRange();
    range.selectNodeContents(editor.querySelector("p")!);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    insertVariable(editor, "user.name");

    const token = editor.querySelector(".editor-variable .variable-token");
    expect(token).not.toBeNull();
    expect(token?.textContent).toBe("{{ user.name }}");
  });

  it("refreshVariablePills normalizes a legacy bare-text pill", () => {
    const { refreshVariablePills } = useVariables();
    const editor = makeEditor(
      '<p><span class="editor-variable" data-variable="user.name" ' +
        'data-value="OLD">{{ user.name }}</span></p>'
    );

    refreshVariablePills(editor);

    const pill = editor.querySelector<HTMLElement>(".editor-variable")!;
    const token = pill.querySelector(".variable-token");
    expect(token, "beforeprint pass must add the wrapper").not.toBeNull();
    expect(token?.textContent).toBe("{{ user.name }}");
    // And its existing job still happens: the value is re-stamped.
    expect(pill.dataset.value).not.toBe("OLD");
  });

  it("refreshVariablePills does not nest wrappers on repeated runs", () => {
    const { refreshVariablePills } = useVariables();
    const editor = makeEditor(
      '<p><span class="editor-variable" data-variable="user.name" ' +
        'data-value="x">{{ user.name }}</span></p>'
    );

    refreshVariablePills(editor);
    refreshVariablePills(editor);

    expect(editor.querySelectorAll(".variable-token")).toHaveLength(1);
    expect(editor.querySelector(".variable-token .variable-token")).toBeNull();
  });
});
