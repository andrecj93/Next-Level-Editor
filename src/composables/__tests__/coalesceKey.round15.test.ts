import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { coalesceKeyForInputEvent } from "../useEditorEvents";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

/**
 * Round-15 coalescing follow-ups:
 *  - #14: insertReplacementText (accepting an autocorrection) must NOT fold
 *    into the typing burst — platform convention makes a correction its own
 *    undo step so one Ctrl+Z rejects just the correction.
 *  - #24: the split-view pane shares coalesceKeyForInputEvent, so its typing
 *    coalesces exactly like the main surface.
 *  - #29: smart-quote/punctuation conversions re-dispatch a synthetic input —
 *    it must carry inputType "insertText" so the burst CONTINUES through an
 *    apostrophe, while structural conversions (markdown) stay keyless (their
 *    own undo boundary).
 */
describe("coalesceKeyForInputEvent (#14/#24)", () => {
  it("maps typing and deleting inputTypes", () => {
    expect(
      coalesceKeyForInputEvent(
        new InputEvent("input", { inputType: "insertText" })
      )
    ).toBe("typing");
    expect(
      coalesceKeyForInputEvent(
        new InputEvent("input", { inputType: "deleteContentBackward" })
      )
    ).toBe("deleting");
    expect(
      coalesceKeyForInputEvent(
        new InputEvent("input", { inputType: "deleteContentForward" })
      )
    ).toBe("deleting");
  });

  it("an autocorrection is its OWN undo step (#14)", () => {
    expect(
      coalesceKeyForInputEvent(
        new InputEvent("input", { inputType: "insertReplacementText" })
      )
    ).toBeUndefined();
  });

  it("keyless / missing events give no key", () => {
    expect(coalesceKeyForInputEvent(new Event("input"))).toBeUndefined();
    expect(coalesceKeyForInputEvent(undefined)).toBeUndefined();
  });
});

describe("smart-autocomplete synthetic input keeps the typing burst (#29)", () => {
  function setCaret(node: Node, offset: number) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  const mountEditor = (text: string) => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    const textNode = document.createTextNode(text);
    div.appendChild(textNode);
    setCaret(textNode, text.length);
    return { div, textNode, editorRef: ref<HTMLElement | null>(div) };
  };

  it("a smart-punctuation apply dispatches inputType insertText", () => {
    const { div, editorRef } = mountEditor("wait--");
    const { applyAutocomplete } = useSmartAutocomplete(editorRef);

    const types: Array<string | undefined> = [];
    div.addEventListener("input", (e) =>
      types.push((e as InputEvent).inputType)
    );

    applyAutocomplete({
      type: "smartPunctuation",
      original: "--",
      replacement: "—",
    });

    expect(types).toEqual(["insertText"]);
  });

  it("a markdown apply stays keyless (its own undo boundary)", () => {
    const { div, editorRef } = mountEditor("# ");
    const { applyAutocomplete } = useSmartAutocomplete(editorRef);

    const types: Array<string | undefined> = [];
    div.addEventListener("input", (e) =>
      types.push((e as InputEvent).inputType)
    );

    applyAutocomplete({
      type: "markdown",
      original: "# ",
      replacement: "",
      action: "h1",
    } as never);

    expect(types.length).toBeGreaterThan(0);
    expect(types[0]).toBeFalsy();
  });
});
