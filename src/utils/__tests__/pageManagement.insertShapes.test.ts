import { describe, it, expect, beforeEach } from "vitest";
import { insertTableOfContents, insertPageBreak } from "../pageManagement";

/**
 * Round-23 cluster in the Insert menu's block inserters:
 *  - R23-38 caret at the END of a heading left an empty DUPLICATE heading,
 *    carrying a duplicate id (the tail is a shallow clone, attributes and all).
 *  - R23-39 a document with no headings got the sentence "No headings found in
 *    the document." written into it as real content, splitting the paragraph.
 *  - R23-40 inserting a TOC twice produced two <nav>s instead of refreshing.
 *  - R23-41 the TOC landed INSIDE a list item, splitting its text around a
 *    nested block.
 *  - R23-61 Page Break left two blank paragraphs, not one.
 */
let root: HTMLElement;

const caretAt = (node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
};

const blankParagraphs = () =>
  Array.from(root.querySelectorAll("p")).filter(
    (p) => !(p.textContent || "").trim()
  ).length;

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe("Insert > Table of Contents (#R23-38/39/40/41)", () => {
  it("does not leave an empty duplicate heading behind", () => {
    root.innerHTML = "<h1>My Report</h1><p>Intro text</p>";
    const heading = root.querySelector("h1")!;
    const selection = caretAt(heading.firstChild!, heading.textContent!.length);

    insertTableOfContents(root, selection);

    expect(root.querySelectorAll("h1")).toHaveLength(1);
    const ids = Array.from(root.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("writes nothing into the document when there are no headings", () => {
    root.innerHTML = "<p>Hello world</p>";
    const text = root.querySelector("p")!.firstChild!;
    const selection = caretAt(text, 5);

    const inserted = insertTableOfContents(root, selection);

    expect(inserted).toBe(false);
    expect(root.textContent).toBe("Hello world");
    expect(root.querySelectorAll("p")).toHaveLength(1);
    expect(root.textContent).not.toContain("No headings found");
  });

  it("refreshes the existing TOC instead of adding a second one", () => {
    root.innerHTML = "<h1>One</h1><p>body</p>";
    const heading = root.querySelector("h1")!;
    insertTableOfContents(root, caretAt(heading.firstChild!, 3));
    expect(root.querySelectorAll(".table-of-contents")).toHaveLength(1);

    // The user adds a heading and asks for the TOC again.
    const added = document.createElement("h1");
    added.textContent = "Two";
    root.appendChild(added);
    insertTableOfContents(root, caretAt(added.firstChild!, 3));

    expect(root.querySelectorAll(".table-of-contents")).toHaveLength(1);
    expect(root.querySelector(".table-of-contents")!.textContent).toContain(
      "Two"
    );
  });

  it("keeps the TOC out of a list item", () => {
    root.innerHTML = "<h1>Title</h1><ul><li>item one</li></ul>";
    const item = root.querySelector("li")!;
    const selection = caretAt(item.firstChild!, 4);

    insertTableOfContents(root, selection);

    expect(root.querySelector("li .table-of-contents")).toBeNull();
    expect(root.querySelector(".table-of-contents")).not.toBeNull();
    expect(root.querySelector("li")!.textContent).toBe("item one");
  });
});

describe("Insert > Page Break (#R23-61)", () => {
  it("leaves exactly one blank paragraph after the break", () => {
    root.innerHTML = "<p>Hello</p>";
    const text = root.querySelector("p")!.firstChild!;
    const selection = caretAt(text, 5);

    insertPageBreak(selection, root);

    expect(root.querySelectorAll(".page-break")).toHaveLength(1);
    expect(blankParagraphs()).toBe(1);
  });

  it("does not leave a blank line when the caret is at a block start", () => {
    root.innerHTML = "<p>Hello</p>";
    const text = root.querySelector("p")!.firstChild!;
    const selection = caretAt(text, 0);

    insertPageBreak(selection, root);

    expect(root.querySelectorAll(".page-break")).toHaveLength(1);
    expect(root.textContent).toContain("Hello");
    expect(blankParagraphs()).toBeLessThanOrEqual(1);
  });
});
