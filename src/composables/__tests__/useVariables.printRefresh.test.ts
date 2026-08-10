import { describe, it, expect, afterEach } from "vitest";
import { useVariables } from "../useVariables";

/**
 * #17: a variable pill's data-value is stamped once at insertion, but the print
 * CSS shows `content: attr(data-value)`. So a variable changed since it was
 * inserted (or a time-based one) printed a STALE value, and a pill with an empty
 * data-value printed BLANK. refreshVariablePills re-resolves every pill's
 * data-value to the current value — call it before printing.
 */
const editors: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  editors.push(el);
  return el;
};

afterEach(() => {
  for (const el of editors.splice(0)) el.remove();
});

describe("refreshVariablePills (#17)", () => {
  it("refreshes a stale pill data-value to the current variable value", () => {
    const vars = useVariables();
    vars.addVariable({
      id: "custom.x",
      name: "custom.x",
      label: "X",
      value: "old",
      category: "document",
    });
    const editor = mount(
      '<p><span class="editor-variable" data-variable="custom.x" ' +
        'data-value="old">{{ custom.x }}</span></p>'
    );

    vars.updateVariableValue("custom.x", "new");
    vars.refreshVariablePills(editor);

    expect(
      editor.querySelector(".editor-variable")!.getAttribute("data-value")
    ).toBe("new");
  });

  it("fills an empty data-value so the variable does not print blank", () => {
    const vars = useVariables();
    vars.addVariable({
      id: "custom.y",
      name: "custom.y",
      label: "Y",
      value: "Acme Inc",
      category: "company",
    });
    const editor = mount(
      '<p><span class="editor-variable" data-variable="custom.y" ' +
        'data-value="">{{ custom.y }}</span></p>'
    );

    vars.refreshVariablePills(editor);

    expect(
      editor.querySelector(".editor-variable")!.getAttribute("data-value")
    ).toBe("Acme Inc");
  });

  it("falls back to the visible token when the variable no longer resolves (#r15-36)", () => {
    const vars = useVariables();
    const editor = mount(
      '<p><span class="editor-variable" data-variable="ghost.var" ' +
        'data-value="">{{ ghost.var }}</span></p>'
    );

    vars.refreshVariablePills(editor);

    // Never prints blank — the reader sees the token that was there.
    expect(
      editor.querySelector(".editor-variable")!.getAttribute("data-value")
    ).toBe("{{ ghost.var }}");
  });

  it("re-resolves a time-based variable to a current, non-empty value", () => {
    const vars = useVariables();
    const editor = mount(
      '<p><span class="editor-variable" data-variable="date.now" ' +
        'data-value="00:00:00">{{ date.now }}</span></p>'
    );

    vars.refreshVariablePills(editor);

    const value = editor
      .querySelector(".editor-variable")!
      .getAttribute("data-value");
    expect(value).toBeTruthy();
    expect(value).not.toBe(""); // never prints blank
  });
});
