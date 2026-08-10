import { describe, it, expect, afterEach } from "vitest";
import { toggleBlock } from "../formatting";

/**
 * Converting the FIRST item of a multi-item list to a heading unnests the item
 * and moves the following items into a fresh list — but the original list,
 * which is now empty, was never removed. The document was left with a stray
 * empty <ul>/<ol> (an invisible collapsed gap and invalid markup that survives
 * the sanitizer round-trip).
 */
describe("toggleBlock: unnesting the first list item leaves no empty list", () => {
  let root: HTMLDivElement | null = null;

  afterEach(() => {
    root?.remove();
    root = null;
  });

  const setup = (html: string) => {
    root = document.createElement("div");
    root.contentEditable = "true";
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };

  const caretInto = (el: Element) => {
    const range = document.createRange();
    range.selectNodeContents(el.firstChild ?? el);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  it("removes the emptied original list when the first item becomes a heading", () => {
    const r = setup("<ul><li>First</li><li>Second</li><li>Third</li></ul>");
    caretInto(r.querySelector("li")!);

    toggleBlock(r, "h1");

    const emptyLists = Array.from(r.querySelectorAll("ul, ol")).filter(
      (l) => l.children.length === 0
    );
    expect(emptyLists).toHaveLength(0);

    // The first item is now a heading with its text preserved…
    expect(r.querySelector("h1")?.textContent).toBe("First");
    // …and the remaining items are still a list.
    expect(
      Array.from(r.querySelectorAll("li")).map((li) => li.textContent)
    ).toEqual(["Second", "Third"]);
  });

  it("still works for the only item in a single-item list", () => {
    const r = setup("<ul><li>Only</li></ul>");
    caretInto(r.querySelector("li")!);

    toggleBlock(r, "h2");

    expect(r.querySelector("ul")).toBeNull();
    expect(r.querySelector("h2")?.textContent).toBe("Only");
  });
});
