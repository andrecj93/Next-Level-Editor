import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MERGEABLE_BLOCKS,
  isVisuallyEmptyBlock,
  mergeBlockBackward,
  mergeBlockForward,
  ensureBlockRemains,
} from "../blockMerge";

describe("blockMerge", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.contentEditable = "true";
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  describe("MERGEABLE_BLOCKS", () => {
    it("covers the Enter split model plus blockquote", () => {
      for (const tag of ["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"]) {
        expect(MERGEABLE_BLOCKS.has(tag)).toBe(true);
      }
      expect(MERGEABLE_BLOCKS.has("TABLE")).toBe(false);
      expect(MERGEABLE_BLOCKS.has("UL")).toBe(false);
    });
  });

  describe("mergeBlockBackward", () => {
    it("merges p into previous p with the caret exactly at the join point", () => {
      root.innerHTML = "<p>Hello</p><p>World</p>";
      const second = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(second, root);

      expect(root.innerHTML).toBe("<p>Hello</p>".replace("Hello", "HelloWorld"));
      expect(root.querySelectorAll("p").length).toBe(1);
      expect(root.querySelector("span")).toBeNull();
      // Caret sits in the "Hello" text node, right between Hello|World.
      expect(caret).not.toBeNull();
      expect(caret!.caretNode.nodeType).toBe(Node.TEXT_NODE);
      expect(caret!.caretNode.textContent).toBe("HelloWorld");
      expect(caret!.caretOffset).toBe(5);
    });

    it("merges a paragraph into a heading: h2 wins the block identity, inline marks survive as-is", () => {
      root.innerHTML = "<h2>Head</h2><p><strong>Body</strong> rest</p>";
      const p = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(p, root);

      expect(root.innerHTML).toBe("<h2>Head<strong>Body</strong> rest</h2>");
      expect(root.querySelectorAll("[style]").length).toBe(0);
      expect(root.querySelector("span")).toBeNull();
      expect(caret!.caretNode.textContent).toBe("Head");
      expect(caret!.caretOffset).toBe(4);
    });

    it("merges a heading into a paragraph: p wins the block identity, no style attributes appear", () => {
      root.innerHTML = "<p>Intro</p><h2><strong>Title</strong></h2>";
      const h2 = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(h2, root);

      expect(root.innerHTML).toBe("<p>Intro<strong>Title</strong></p>");
      expect(root.querySelectorAll("[style]").length).toBe(0);
      expect(caret!.caretNode.textContent).toBe("Intro");
      expect(caret!.caretOffset).toBe(5);
    });

    it("merges a paragraph into a preceding blockquote", () => {
      root.innerHTML = "<blockquote>Quote</blockquote><p>After</p>";
      const p = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(p, root);

      expect(root.innerHTML).toBe("<blockquote>QuoteAfter</blockquote>");
      expect(caret!.caretOffset).toBe(5);
    });

    it("drops the previous block's placeholder <br> so no stray line break lands mid-block", () => {
      root.innerHTML = "<p><br></p><p>World</p>";
      const second = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(second, root);

      expect(root.innerHTML).toBe("<p>World</p>");
      expect(root.querySelector("br")).toBeNull();
      expect(caret!.caretNode).toBe(root.querySelector("p"));
      expect(caret!.caretOffset).toBe(0);
    });

    it("drops the merging block's own placeholder <br> (Backspace in an empty trailing paragraph)", () => {
      root.innerHTML = "<p>Hello</p><p><br></p>";
      const second = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(second, root);

      expect(root.innerHTML).toBe("<p>Hello</p>");
      expect(caret!.caretNode.textContent).toBe("Hello");
      expect(caret!.caretOffset).toBe(5);
    });

    it("keeps the merged block visible when BOTH sides are placeholder-only", () => {
      root.innerHTML = "<p><br></p><p><br></p>";
      const second = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(second, root);

      expect(root.innerHTML).toBe("<p><br></p>");
      expect(caret!.caretNode).toBe(root.querySelector("p"));
      expect(caret!.caretOffset).toBe(0);
    });

    it("removes a preceding <hr> and keeps the block intact (first Backspace eats the rule)", () => {
      root.innerHTML = "<p>A</p><hr><p>B</p>";
      const b = root.children[2] as HTMLElement;

      const caret = mergeBlockBackward(b, root);

      expect(root.innerHTML).toBe("<p>A</p><p>B</p>");
      expect(caret!.caretNode.textContent).toBe("B");
      expect(caret!.caretOffset).toBe(0);
    });

    it("returns null for the first block of the root and leaves the DOM untouched", () => {
      root.innerHTML = "<p>Only</p><p>Second</p>";
      const first = root.children[0] as HTMLElement;

      expect(mergeBlockBackward(first, root)).toBeNull();
      expect(root.innerHTML).toBe("<p>Only</p><p>Second</p>");
    });

    it("returns null when the previous sibling is a table (never merge into complex structures)", () => {
      root.innerHTML =
        "<table><tbody><tr><td>x</td></tr></tbody></table><p>B</p>";
      const p = root.children[1] as HTMLElement;

      expect(mergeBlockBackward(p, root)).toBeNull();
      expect(root.querySelector("table")).toBeTruthy();
      expect(root.querySelector("p")!.textContent).toBe("B");
    });

    it("returns null when the previous sibling is an embed container", () => {
      root.innerHTML =
        '<div class="embedded-resizable-container"><iframe></iframe></div><p>B</p>';
      const p = root.children[1] as HTMLElement;

      expect(mergeBlockBackward(p, root)).toBeNull();
      expect(root.querySelector(".embedded-resizable-container")).toBeTruthy();
      expect(root.querySelector("p")!.textContent).toBe("B");
    });

    it("merges into the LAST <li> when the previous sibling is a list", () => {
      root.innerHTML = "<ul><li>One</li><li>Two</li></ul><p>Tail</p>";
      const p = root.children[1] as HTMLElement;

      const caret = mergeBlockBackward(p, root);

      expect(root.innerHTML).toBe("<ul><li>One</li><li>TwoTail</li></ul>");
      // Text nodes are normalized at the join (same contract as p+p merges):
      // one "TwoTail" node with the caret at the join offset.
      expect(caret!.caretNode.textContent).toBe("TwoTail");
      expect(caret!.caretOffset).toBe(3);
    });

    it("returns null when the block is not inside the root", () => {
      const stray = document.createElement("p");
      stray.textContent = "loose";
      expect(mergeBlockBackward(stray, root)).toBeNull();
    });

    it("repeated backward merges walk cleanly up the document", () => {
      root.innerHTML = "<h1>A</h1><p>B</p><p>C</p>";

      const c = root.children[2] as HTMLElement;
      const firstCaret = mergeBlockBackward(c, root);
      expect(root.innerHTML).toBe("<h1>A</h1><p>BC</p>");
      expect(firstCaret!.caretNode.textContent).toBe("BC");
      expect(firstCaret!.caretOffset).toBe(1);

      const bc = root.children[1] as HTMLElement;
      const secondCaret = mergeBlockBackward(bc, root);
      expect(root.innerHTML).toBe("<h1>ABC</h1>");
      expect(secondCaret!.caretNode.textContent).toBe("ABC");
      expect(secondCaret!.caretOffset).toBe(1);
    });
  });

  describe("mergeBlockForward", () => {
    it("pulls the next paragraph's content up, caret stays where it was", () => {
      root.innerHTML = "<p>Hello</p><p>World</p>";
      const first = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(first, root);

      expect(root.innerHTML).toBe("<p>HelloWorld</p>");
      expect(caret!.caretNode.textContent).toBe("HelloWorld");
      expect(caret!.caretOffset).toBe(5);
    });

    it("removes a following <hr> and keeps the block intact", () => {
      root.innerHTML = "<p>A</p><hr><p>B</p>";
      const a = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(a, root);

      expect(root.innerHTML).toBe("<p>A</p><p>B</p>");
      expect(caret!.caretNode.textContent).toBe("A");
      expect(caret!.caretOffset).toBe(1);
    });

    it("returns null for the last block and leaves the DOM untouched", () => {
      root.innerHTML = "<p>First</p><p>Last</p>";
      const last = root.children[1] as HTMLElement;

      expect(mergeBlockForward(last, root)).toBeNull();
      expect(root.innerHTML).toBe("<p>First</p><p>Last</p>");
    });

    it("returns null when the next sibling is a table", () => {
      root.innerHTML =
        "<p>B</p><table><tbody><tr><td>x</td></tr></tbody></table>";
      const p = root.children[0] as HTMLElement;

      expect(mergeBlockForward(p, root)).toBeNull();
      expect(root.querySelector("table")).toBeTruthy();
    });

    it("returns null when the next sibling is an embed container", () => {
      root.innerHTML =
        '<p>B</p><div class="embedded-resizable-container"><iframe></iframe></div>';
      const p = root.children[0] as HTMLElement;

      expect(mergeBlockForward(p, root)).toBeNull();
      expect(root.querySelector(".embedded-resizable-container")).toBeTruthy();
    });

    it("pulls the FIRST <li>'s content up when the next sibling is a list", () => {
      root.innerHTML = "<p>Head</p><ol><li>One</li><li>Two</li></ol>";
      const p = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(p, root);

      expect(root.innerHTML).toBe("<p>HeadOne</p><ol><li>Two</li></ol>");
      expect(caret!.caretNode.textContent).toBe("HeadOne");
      expect(caret!.caretOffset).toBe(4);
    });

    it("drops the list entirely when pulling up its only <li>", () => {
      root.innerHTML = "<p>Head</p><ul><li>Only</li></ul>";
      const p = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(p, root);

      expect(root.innerHTML).toBe("<p>HeadOnly</p>");
      expect(root.querySelector("ul")).toBeNull();
      expect(caret!.caretOffset).toBe(4);
    });

    it("drops placeholder <br>s on a forward merge from an empty block", () => {
      root.innerHTML = "<p><br></p><p>World</p>";
      const first = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(first, root);

      expect(root.innerHTML).toBe("<p>World</p>");
      expect(caret!.caretNode).toBe(root.querySelector("p"));
      expect(caret!.caretOffset).toBe(0);
    });

    it("preserves inline marks when pulling a heading up into a paragraph", () => {
      root.innerHTML = "<p>Intro</p><h3><em>Sub</em>head</h3>";
      const p = root.children[0] as HTMLElement;

      const caret = mergeBlockForward(p, root);

      expect(root.innerHTML).toBe("<p>Intro<em>Sub</em>head</p>");
      expect(root.querySelectorAll("[style]").length).toBe(0);
      expect(caret!.caretNode.textContent).toBe("Intro");
      expect(caret!.caretOffset).toBe(5);
    });
  });

  describe("ensureBlockRemains", () => {
    it("leaves a truly empty root alone (the :empty placeholder depends on it)", () => {
      root.innerHTML = "";

      expect(ensureBlockRemains(root)).toBe(false);
      expect(root.childNodes.length).toBe(0);
      expect(root.innerHTML).toBe("");
    });

    it("wraps stray root-level text into a paragraph", () => {
      root.appendChild(document.createTextNode("loose text"));

      expect(ensureBlockRemains(root)).toBe(true);
      expect(root.innerHTML).toBe("<p>loose text</p>");
    });

    it("wraps stray inline elements together with text into ONE paragraph", () => {
      root.innerHTML = "before <strong>bold</strong> after";

      expect(ensureBlockRemains(root)).toBe(true);
      expect(root.children.length).toBe(1);
      expect(root.innerHTML).toBe("<p>before <strong>bold</strong> after</p>");
    });

    it("does nothing when a block element already exists", () => {
      root.innerHTML = "<p>Fine</p>";

      expect(ensureBlockRemains(root)).toBe(false);
      expect(root.innerHTML).toBe("<p>Fine</p>");
    });

    it("does not materialize a paragraph for whitespace-only text nodes", () => {
      root.appendChild(document.createTextNode("   "));

      expect(ensureBlockRemains(root)).toBe(false);
      expect(root.querySelector("p")).toBeNull();
    });
  });

  describe("isVisuallyEmptyBlock", () => {
    it("treats <br>-only and whitespace-only blocks as empty", () => {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      expect(isVisuallyEmptyBlock(p)).toBe(true);
      p.innerHTML = "  ";
      expect(isVisuallyEmptyBlock(p)).toBe(true);
    });

    it("treats media-only blocks as NOT empty", () => {
      const p = document.createElement("p");
      p.innerHTML = '<img src="x.png">';
      expect(isVisuallyEmptyBlock(p)).toBe(false);
    });
  });
});
