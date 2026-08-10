import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useSmartAutocomplete } from "../useSmartAutocomplete";

/**
 * r22 smart-autocomplete findings, both of which corrupt the PERSISTED model:
 *  - R22-AUTO-1: typing a URL/email while the caret sits inside an existing
 *    <a> auto-linked it, producing <a> inside <a>. That is not parseable HTML,
 *    so the parser/sanitizer round-trip permanently loses the rest of the
 *    original link's text.
 *  - R22-AUTO-4: typing "- " (a common markdown reflex) inside an existing
 *    list item nested a whole new <ul> inside that <li>, leaving an empty
 *    parent bullet. It is valid HTML, so it survives the round-trip and the
 *    user must clean it up by hand.
 *
 * Driven through live typing + handleInput, like the sibling suites.
 */
function setCaret(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

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

function typeText(text: string, handleInput: () => void) {
  for (const ch of text) {
    typeChar(ch);
    handleInput();
  }
}

const mountEditor = (html: string) => {
  const div = document.createElement("div");
  div.setAttribute("contenteditable", "true");
  div.innerHTML = html;
  document.body.appendChild(div);
  return { div, editorRef: ref<HTMLElement | null>(div) };
};

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("auto-link never nests an anchor (#R22-AUTO-1)", () => {
  it("does not auto-link a URL typed inside an existing link", () => {
    const { div, editorRef } = mountEditor(
      '<p><a href="https://old.com">click here to go</a></p>'
    );
    const { handleInput } = useSmartAutocomplete(editorRef);

    // Caret inside the anchor text, right after "click ".
    const anchorText = div.querySelector("a")!.firstChild!;
    setCaret(anchorText, "click ".length);
    typeText("www.new.com ", handleInput);

    expect(div.querySelectorAll("a a")).toHaveLength(0);
    expect(div.querySelectorAll("a")).toHaveLength(1);
    // The original link text survives intact around the typed URL.
    expect(div.textContent).toContain("here to go");
    expect(div.textContent).toContain("www.new.com");
  });

  it("still auto-links a URL typed OUTSIDE any link (control)", () => {
    const { div, editorRef } = mountEditor("<p>see </p>");
    const { handleInput } = useSmartAutocomplete(editorRef);

    const text = div.querySelector("p")!.firstChild!;
    setCaret(text, text.textContent!.length);
    typeText("www.new.com ", handleInput);

    const anchors = div.querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    expect(anchors[0].textContent).toContain("www.new.com");
  });
});

describe("block markdown does not nest inside a list item (#R22-AUTO-4)", () => {
  it('typing "- " inside an existing <li> does not nest a new list', () => {
    const { div, editorRef } = mountEditor("<ul><li>one</li><li></li></ul>");
    const { handleInput } = useSmartAutocomplete(editorRef);

    const second = div.querySelectorAll("li")[1]!;
    setCaret(second, 0);
    typeText("- two", handleInput);

    // No list nested inside a list item, and no empty parent bullet.
    expect(div.querySelectorAll("li ul, li ol")).toHaveLength(0);
    expect(div.querySelectorAll("li")).toHaveLength(2);
    expect(div.textContent).toContain("two");
  });

  it("block markdown still converts outside a list (control)", () => {
    const { div, editorRef } = mountEditor("<p></p>");
    const { handleInput } = useSmartAutocomplete(editorRef);

    const p = div.querySelector("p")!;
    setCaret(p, 0);
    typeText("- item", handleInput);

    // Outside a list, "- " genuinely starts one.
    expect(div.querySelector("ul li")).not.toBeNull();
    expect(div.textContent).toContain("item");
  });
});
