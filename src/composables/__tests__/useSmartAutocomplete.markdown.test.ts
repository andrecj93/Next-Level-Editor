import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

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
 * Create a contenteditable editor root attached to the document.
 */
function createEditor() {
  const div = document.createElement("div");
  div.setAttribute("contenteditable", "true");
  document.body.appendChild(div);
  return { div, editorRef: ref<HTMLElement | null>(div) };
}

/**
 * Create an editor whose content is a single <p> containing `text`, with the
 * caret placed inside the paragraph's text node (default: at the end). This
 * mirrors the real editor, where content is paragraph-wrapped.
 */
function createParagraphEditor(text: string, caretOffset?: number) {
  const { div, editorRef } = createEditor();
  const p = document.createElement("p");
  const textNode = document.createTextNode(text);
  p.appendChild(textNode);
  div.appendChild(p);
  setCaret(textNode, caretOffset ?? text.length);
  return { div, p, textNode, editorRef };
}

/**
 * Insert one character at the current caret (as the browser would on a
 * keypress) and move the caret after it.
 */
function typeChar(ch: string) {
  const selection = window.getSelection()!;
  const range = selection.getRangeAt(0);
  let node = range.startContainer;
  let offset = range.startOffset;
  if (node.nodeType !== Node.TEXT_NODE) {
    const textNode = document.createTextNode("");
    const child = node.childNodes[offset];
    if (child) {
      node.insertBefore(textNode, child);
    } else {
      node.appendChild(textNode);
    }
    node = textNode;
    offset = 0;
  }
  (node as Text).insertData(offset, ch);
  setCaret(node, offset + ch.length);
}

/**
 * Simulate typing text character by character, running the autocomplete
 * input handler after every keystroke — exactly like live typing, so
 * partial-marker states (e.g. "**bo*") are exercised.
 */
function typeText(text: string, handleInput: () => void) {
  for (const ch of text) {
    typeChar(ch);
    handleInput();
  }
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("useSmartAutocomplete - markdown shortcuts (live typing)", () => {
  describe("bold vs italic marker precedence", () => {
    it("typing **bold** character by character produces <strong>, never <em>", () => {
      const { div, editorRef } = createParagraphEditor("");
      const { handleInput } = useSmartAutocomplete(editorRef);

      typeText("**bold**", handleInput);

      const strongs = div.querySelectorAll("strong");
      expect(strongs.length).toBe(1);
      expect(strongs[0].textContent).toBe("bold");
      expect(div.querySelectorAll("em").length).toBe(0);
      expect(div.textContent).toBe("bold");
      expect(div.textContent).not.toContain("*");
    });

    it("does not convert the partial '**bo*' state to italic", () => {
      const { div, editorRef } = createParagraphEditor("");
      const { handleInput } = useSmartAutocomplete(editorRef);

      typeText("**bo*", handleInput);

      // Nothing may fire yet — the bold closer is still being typed
      expect(div.querySelectorAll("em").length).toBe(0);
      expect(div.querySelectorAll("strong").length).toBe(0);
      expect(div.textContent).toBe("**bo*");
    });

    it("still converts plain *italic* typed character by character", () => {
      const { div, editorRef } = createParagraphEditor("");
      const { handleInput } = useSmartAutocomplete(editorRef);

      typeText("mostly *it*", handleInput);

      const ems = div.querySelectorAll("em");
      expect(ems.length).toBe(1);
      expect(ems[0].textContent).toBe("it");
      expect(div.textContent).toBe("mostly it");
    });

    it("detectMarkdown vetoes an italic match inside a pending bold marker", () => {
      const { editorRef } = createEditor();
      const { detectMarkdown } = useSmartAutocomplete(editorRef);

      expect(detectMarkdown("**bo*")).toBeNull();

      const bold = detectMarkdown("**bold**");
      expect(bold?.replacement).toBe("<strong>bold</strong>");
      expect(bold?.original).toBe("**bold**");

      const italic = detectMarkdown("a *b*");
      expect(italic?.replacement).toBe("<em>b</em>");
      expect(italic?.original).toBe("*b*");
    });
  });

  describe("block-level shortcuts inside a <p>", () => {
    it("converts '# ' heading by replacing the paragraph, not nesting inside it", () => {
      const { div, editorRef } = createParagraphEditor("# Hi");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelector("p h1")).toBeNull();
      const h1 = div.querySelector("h1");
      expect(h1).not.toBeNull();
      expect(h1!.textContent).toBe("Hi");
      // The now-empty source paragraph is removed entirely
      expect(div.querySelectorAll("p").length).toBe(0);
      expect(div.innerHTML).toBe("<h1>Hi</h1>");
    });

    it("places the caret inside the new heading so typing continues in it", () => {
      const { div, editorRef } = createParagraphEditor("# Hi");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();
      typeChar("!");

      expect(div.querySelector("h1")!.textContent).toBe("Hi!");
    });

    it("converts '- ' bullet lists as paragraph siblings", () => {
      const { div, editorRef } = createParagraphEditor("- item");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelector("p ul")).toBeNull();
      const li = div.querySelector("ul > li");
      expect(li).not.toBeNull();
      expect(li!.textContent).toBe("item");
      expect(div.querySelectorAll("p").length).toBe(0);
    });

    it("converts '1. ' numbered lists as paragraph siblings", () => {
      const { div, editorRef } = createParagraphEditor("1. item");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelector("p ol")).toBeNull();
      expect(div.querySelector("ol > li")!.textContent).toBe("item");
    });

    it("converts '> ' blockquotes as paragraph siblings", () => {
      const { div, editorRef } = createParagraphEditor("> quoted");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelector("p blockquote")).toBeNull();
      expect(div.querySelector("blockquote")!.textContent).toBe("quoted");
    });

    it("converts '[] ' into an unchecked, sanitizer-safe checklist item", () => {
      const { detectMarkdown } = useSmartAutocomplete(
        createParagraphEditor("").editorRef
      );
      const result = detectMarkdown("[] Buy milk");
      expect(result).not.toBeNull();
      // No live <input>: a data-checked <li> the sanitizer preserves. The
      // checkbox ARIA matches what the toolbar's insertChecklist stamps, so both
      // creation paths are announced identically.
      expect(result!.replacement).toBe(
        '<ul class="checklist"><li data-checked="false" role="checkbox" aria-checked="false">Buy milk</li></ul>'
      );
    });

    it("converts '[x] ' (any case) into a checked checklist item", () => {
      const { detectMarkdown } = useSmartAutocomplete(
        createParagraphEditor("").editorRef
      );
      expect(detectMarkdown("[x] Done")!.replacement).toBe(
        '<ul class="checklist"><li data-checked="true" role="checkbox" aria-checked="true">Done</li></ul>'
      );
      expect(detectMarkdown("[X] Done")!.replacement).toBe(
        '<ul class="checklist"><li data-checked="true" role="checkbox" aria-checked="true">Done</li></ul>'
      );
    });

    it("inserts a checklist as a paragraph sibling, not nested in the <p>", () => {
      const { div, editorRef } = createParagraphEditor("[] task");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelector("p ul")).toBeNull();
      const li = div.querySelector("ul.checklist > li");
      expect(li).not.toBeNull();
      expect(li!.getAttribute("data-checked")).toBe("false");
      expect(li!.textContent).toBe("task");
    });

    it("round-trips through innerHTML without the browser splitting paragraphs", () => {
      const { div, editorRef } = createParagraphEditor("> quoted");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const serialized = div.innerHTML;
      const reparsed = document.createElement("div");
      reparsed.innerHTML = serialized;
      expect(reparsed.innerHTML).toBe(serialized);
    });

    it("moves content after the caret into a trailing paragraph", () => {
      // Caret right after "# Hi", with " tail" following it
      const { div, editorRef } = createParagraphEditor("# Hi tail", 4);
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const h1 = div.querySelector("h1");
      expect(h1).not.toBeNull();
      expect(h1!.textContent).toBe("Hi");
      const p = div.querySelector("p");
      expect(p).not.toBeNull();
      expect(p!.textContent).toBe(" tail");
      // Heading comes first, remainder paragraph after it
      expect(h1!.nextElementSibling).toBe(p);
    });

    it("keeps a paragraph that still has leading content before the match", () => {
      const { div, p, editorRef } = createParagraphEditor("");
      const em = document.createElement("em");
      em.textContent = "x";
      p.insertBefore(em, p.firstChild);
      const textNode = document.createTextNode("# Hi");
      p.appendChild(textNode);
      setCaret(textNode, 4);
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      // The leading <em> stays in its paragraph; the heading follows it
      expect(div.querySelector("p em")!.textContent).toBe("x");
      expect(div.querySelector("p h1")).toBeNull();
      expect(p.nextElementSibling?.tagName).toBe("H1");
      expect(p.nextElementSibling?.textContent).toBe("Hi");
    });

    it("keeps inline conversions inside the paragraph", () => {
      const { div, editorRef } = createParagraphEditor("make it **bold**");
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      const strong = div.querySelector("p strong");
      expect(strong).not.toBeNull();
      expect(strong!.textContent).toBe("bold");
      expect(div.querySelectorAll("p").length).toBe(1);
      expect(div.textContent).toBe("make it bold");
    });

    it("still inserts blocks in place when there is no wrapping paragraph", () => {
      // Bare text node directly under the editor root (legacy content)
      const { div, editorRef } = createEditor();
      const textNode = document.createTextNode("# Hello");
      div.appendChild(textNode);
      setCaret(textNode, 7);
      const { handleInput } = useSmartAutocomplete(editorRef);

      handleInput();

      expect(div.querySelectorAll("h1").length).toBe(1);
      expect(div.textContent).toBe("Hello");
    });
  });
});
