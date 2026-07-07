import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { insertHorizontalRule } from "../commands";
import { splitBlockAtCaret } from "../blockInsertion";

/**
 * Block-level inserts must land BETWEEN paragraphs, never nested inside one:
 * `<p><hr></p>` is invalid HTML that parsers silently restructure on any
 * serialize/re-parse round-trip (v-model, sanitizer, export).
 */
describe("blockInsertion", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  const caretIn = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    return range;
  };

  describe("splitBlockAtCaret", () => {
    it("splits the caret's paragraph into two siblings", () => {
      root.innerHTML = "<p>alpha omega</p>";
      const text = root.querySelector("p")!.firstChild!;
      const range = caretIn(text, 6);

      const tail = splitBlockAtCaret(range, root);

      expect(tail).toBeTruthy();
      const ps = root.querySelectorAll("p");
      expect(ps.length).toBe(2);
      expect(ps[0].textContent).toBe("alpha ");
      expect(ps[1].textContent).toBe("omega");
    });

    it("returns null when the caret is not inside a splittable block", () => {
      root.innerHTML = "text at root level";
      const range = caretIn(root.firstChild!, 4);
      expect(splitBlockAtCaret(range, root)).toBeNull();
    });
  });

  describe("insertHorizontalRule (toolbar path)", () => {
    it("inserts the <hr> BETWEEN split halves, not nested inside the <p>", () => {
      root.innerHTML = "<p>alpha omega</p>";
      const text = root.querySelector("p")!.firstChild!;
      caretIn(text, 6);

      insertHorizontalRule();

      // No <hr> may live inside a paragraph…
      expect(root.querySelector("p hr")).toBeNull();
      // …it must be a block-level sibling between the two halves.
      const children = [...root.children].map((el) => el.tagName);
      expect(children).toEqual(["P", "HR", "P"]);
      expect(root.children[0].textContent).toBe("alpha ");
      expect(root.children[2].textContent).toBe("omega");
    });

    it("keeps the old block-level behavior when the caret is not in a paragraph", () => {
      root.innerHTML = "";
      const range = document.createRange();
      range.setStart(root, 0);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      insertHorizontalRule();

      expect(root.querySelectorAll("hr").length).toBe(1);
      expect(root.querySelector("p hr")).toBeNull();
    });
  });
});
