import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";
import type { AutocompleteResult } from "../useSmartAutocomplete";

const EMDASH = "—"; // —
const LDQUO = "“"; // “
const RDQUO = "”"; // ”

/**
 * Place a collapsed caret at (node, offset).
 */
function setCaret(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Create a contenteditable editor attached to the document with a single
 * text node and the caret placed inside it (default: at the end).
 */
function createEditor(text: string, caretOffset?: number) {
  const div = document.createElement("div");
  div.setAttribute("contenteditable", "true");
  document.body.appendChild(div);
  const textNode = document.createTextNode(text);
  div.appendChild(textNode);
  setCaret(textNode, caretOffset ?? text.length);
  return { div, textNode, editorRef: ref<HTMLElement | null>(div) };
}

/**
 * Return the text between the start of the editor and the current caret.
 */
function textBeforeCaret(div: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";
  const caret = selection.getRangeAt(0);
  const probe = document.createRange();
  probe.setStart(div, 0);
  probe.setEnd(caret.startContainer, caret.startOffset);
  return probe.toString();
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("useSmartAutocomplete - applyAutocomplete / handleInput", () => {
  describe("smart punctuation", () => {
    it('converts "--" to an em dash with no leftover dashes', () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe(EMDASH);
      expect(div.textContent).not.toContain("-");
    });

    it("keeps surrounding text when converting punctuation", () => {
      const { div, editorRef } = createEditor("wait--");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe(`wait${EMDASH}`);
    });

    it("preserves text after the caret", () => {
      const { div, textNode, editorRef } = createEditor("--tail");
      setCaret(textNode, 2); // caret right after "--"
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe(`${EMDASH}tail`);
    });

    it("leaves the caret right after the inserted em dash", () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const selection = window.getSelection();
      expect(selection?.rangeCount).toBe(1);
      expect(selection?.getRangeAt(0).collapsed).toBe(true);
      expect(textBeforeCaret(div)).toBe(EMDASH);
    });
  });

  describe("markdown shortcuts", () => {
    it("replaces the whole matched heading source with an h1", () => {
      const { div, editorRef } = createEditor("# Hello");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const headings = div.querySelectorAll("h1");
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe("Hello");
      // No leftover "# Hello" source text anywhere
      expect(div.textContent).toBe("Hello");
    });

    it("replaces only the matched inline span for **bold**", () => {
      const { div, editorRef } = createEditor("make it **bold**");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const strongs = div.querySelectorAll("strong");
      expect(strongs.length).toBe(1);
      expect(strongs[0].textContent).toBe("bold");
      // Prefix text preserved, markers removed, nothing duplicated
      expect(div.textContent).toBe("make it bold");
    });
  });

  describe("url and email auto-linking", () => {
    it("does NOT convert a URL while it is still being typed (no boundary yet)", () => {
      // Word/Notion behavior: linkify only after a space is typed, otherwise
      // "www.example.c" would convert mid-typing.
      const { div, editorRef } = createEditor("check www.example.com");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelectorAll("a").length).toBe(0);
      expect(div.textContent).toBe("check www.example.com");
    });

    it("converts a URL into exactly one anchor once a space is typed", () => {
      const { div, editorRef } = createEditor("check www.example.com ");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const anchors = div.querySelectorAll("a");
      expect(anchors.length).toBe(1);
      expect(anchors[0].getAttribute("href")).toBe("https://www.example.com");
      expect(anchors[0].textContent).toBe("www.example.com");
      // The raw URL appears exactly once (inside the anchor), space preserved
      expect(div.textContent).toBe("check www.example.com ");
    });

    it("converts an email into one mailto anchor once a space is typed", () => {
      const { div, editorRef } = createEditor("mail me at foo@bar.com ");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const anchors = div.querySelectorAll("a");
      expect(anchors.length).toBe(1);
      expect(anchors[0].getAttribute("href")).toBe("mailto:foo@bar.com");
      expect(div.textContent).toBe("mail me at foo@bar.com ");
    });
  });

  describe("emoji shortcuts", () => {
    it("replaces the emoji shortcode without duplicating text", () => {
      const { div, editorRef } = createEditor("hi :smile:");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe("hi \u{1F60A}");
      expect(div.textContent).not.toContain(":smile:");
    });
  });

  describe("smart quotes (plain-text insertion safety)", () => {
    it("inserts converted quotes as text, never re-parsing < or & as markup", () => {
      const { div, editorRef } = createEditor('x < y "quote"');
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe(`x < y ${LDQUO}quote${RDQUO}`);
      // "<" must not have been interpreted as the start of an element
      expect(div.children.length).toBe(0);
    });
  });

  describe("guards", () => {
    it("does nothing when the caret is not inside a text node", () => {
      const { div, editorRef } = createEditor("--");
      setCaret(div, 0); // caret on the element itself
      const { applyAutocomplete, autocompleteHistory } =
        useSmartAutocomplete(editorRef);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });

      expect(div.textContent).toBe("--");
      expect(autocompleteHistory.value.length).toBe(0);
    });

    it("does nothing when the text before the caret does not match original", () => {
      const { div, textNode, editorRef } = createEditor("abc");
      setCaret(textNode, 3);
      const { applyAutocomplete, autocompleteHistory } =
        useSmartAutocomplete(editorRef);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "xyz",
        replacement: "!",
      });

      expect(div.textContent).toBe("abc");
      expect(autocompleteHistory.value.length).toBe(0);
    });

    it("does nothing when original is longer than the text before the caret", () => {
      const { div, textNode, editorRef } = createEditor("--", 1);
      const { applyAutocomplete } = useSmartAutocomplete(editorRef);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });

      expect(div.textContent).toBe("--");
      expect(textNode.textContent).toBe("--");
    });

    it("does nothing when original is empty", () => {
      const { div, editorRef } = createEditor("abc");
      const { applyAutocomplete, autocompleteHistory } =
        useSmartAutocomplete(editorRef);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "",
        replacement: "!",
      });

      expect(div.textContent).toBe("abc");
      expect(autocompleteHistory.value.length).toBe(0);
    });

    it("does nothing when the caret is outside the editor element", () => {
      const { div, editorRef } = createEditor("--");
      const outside = document.createElement("div");
      const outsideText = document.createTextNode("--");
      outside.appendChild(outsideText);
      document.body.appendChild(outside);
      setCaret(outsideText, 2);
      const { applyAutocomplete } = useSmartAutocomplete(editorRef);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });

      expect(div.textContent).toBe("--");
      expect(outside.textContent).toBe("--");
    });
  });

  describe("cursorOffset and events", () => {
    it("honors an explicit cursorOffset inside the inserted content", () => {
      const { editorRef } = createEditor("--");
      const { applyAutocomplete } = useSmartAutocomplete(editorRef);

      const result: AutocompleteResult = {
        type: "smartPunctuation",
        original: "--",
        replacement: "abc",
        cursorOffset: 1,
      };
      applyAutocomplete(result);

      const range = window.getSelection()!.getRangeAt(0);
      expect(range.collapsed).toBe(true);
      expect(range.startContainer.textContent).toBe("abc");
      expect(range.startOffset).toBe(1);
    });

    it("dispatches an input event on a successful apply, none on a rejected one", () => {
      const { div, textNode, editorRef } = createEditor("--");
      const { applyAutocomplete } = useSmartAutocomplete(editorRef);
      let inputCount = 0;
      div.addEventListener("input", () => inputCount++);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });
      expect(inputCount).toBe(1);

      // Rejected apply (mismatched original) must not dispatch
      setCaret(textNode, 0);
      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });
      expect(inputCount).toBe(1);
    });

    it("records successful conversions in the history", () => {
      const { editorRef } = createEditor("--");
      const { handleInput, autocompleteHistory } =
        useSmartAutocomplete(editorRef);

      handleInput();

      expect(autocompleteHistory.value.length).toBe(1);
      expect(autocompleteHistory.value[0].type).toBe("smartPunctuation");
    });

    it("does not re-enter handleInput from its own input event (wiring simulation)", () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput } = useSmartAutocomplete(editorRef);
      // Simulate the editor wiring calling handleInput on every input event
      div.addEventListener("input", () => handleInput());

      handleInput();

      // Converted exactly once, no infinite loop, no duplication
      expect(div.textContent).toBe(EMDASH);
    });
  });

  describe("no-op inputs", () => {
    it("leaves plain text untouched", () => {
      const { div, editorRef } = createEditor("plain text");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.textContent).toBe("plain text");
    });
  });

  describe("IME composition safety", () => {
    // Our listeners never read CompositionEvent-specific properties, so a
    // plain Event is enough (and avoids depending on happy-dom's
    // CompositionEvent support).
    const startComposition = (div: HTMLElement) =>
      div.dispatchEvent(new Event("compositionstart", { bubbles: true }));
    const endComposition = (div: HTMLElement) =>
      div.dispatchEvent(new Event("compositionend", { bubbles: true }));

    it("handleInput is a no-op while a composition is in progress (content untouched)", () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput, autocompleteHistory } =
        useSmartAutocomplete(editorRef);

      startComposition(div);
      handleInput();

      expect(div.textContent).toBe("--");
      expect(autocompleteHistory.value.length).toBe(0);
    });

    it("applyAutocomplete bails while composing (no deleteContents on a live IME buffer)", () => {
      const { div, editorRef } = createEditor("--");
      const { applyAutocomplete, autocompleteHistory } =
        useSmartAutocomplete(editorRef);
      // Composition listeners are attached eagerly (watch immediate) since
      // the editor element is already set on the ref.
      startComposition(div);

      applyAutocomplete({
        type: "smartPunctuation",
        original: "--",
        replacement: EMDASH,
      });

      expect(div.textContent).toBe("--");
      expect(autocompleteHistory.value.length).toBe(0);
    });

    it("runs the deferred detection pass once the composition commits", () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput } = useSmartAutocomplete(editorRef);

      startComposition(div);
      handleInput(); // mid-composition input: deferred, not applied
      expect(div.textContent).toBe("--");

      endComposition(div);

      // The pending pass ran on compositionend and converted normally
      expect(div.textContent).toBe(EMDASH);
    });

    it("resumes normal behavior on fresh input after compositionend", () => {
      const { div, editorRef } = createEditor("wait--");
      const { handleInput } = useSmartAutocomplete(editorRef);

      startComposition(div);
      endComposition(div); // canceled/committed composition, nothing pending

      handleInput();

      expect(div.textContent).toBe(`wait${EMDASH}`);
    });

    it("does not double-apply when the host also forwards compositionend as input", () => {
      const { div, editorRef } = createEditor("--");
      const { handleInput } = useSmartAutocomplete(editorRef);
      // Simulate the host wiring: EditorPanels re-emits compositionend as
      // 'input', and the host onInput calls handleInput.
      div.addEventListener("compositionend", () => handleInput());

      startComposition(div);
      handleInput(); // deferred
      endComposition(div);

      // Exactly one conversion regardless of listener ordering
      expect(div.textContent).toBe(EMDASH);
    });
  });
});
