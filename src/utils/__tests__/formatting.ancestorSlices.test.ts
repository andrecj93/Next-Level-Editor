import { describe, it, expect, afterEach } from "vitest";
import { applyInlineStyle, insertLink } from "../formatting";
import { applyFontSize } from "../commands";
import { copyFormat, pasteFormat, clearCopiedFormat } from "../formatPainter";

/**
 * r17-1 / r17-2 / r17-3 — the batch-77 leaf-only getBlocksInRange dropped
 * ancestor blocks entirely, so a parent block's own DIRECT inline content
 * (the "text" in <li>text<ul><li>sub</li></ul></li>, the "direct" in
 * <td>direct<p>para</p></td>) belonged to NO returned block and every
 * per-block consumer silently skipped it (#r17-1). The toggle-OFF branch for
 * genuinely multi-block selections still ran on the raw range, cloning the
 * partially-contained <p>s and leaving permanent empty-<p> husks (#r17-2),
 * and the husk cleanup deleted the author's own empty same-tag elements
 * outside the selection (#r17-3). Per-block SLICES (leaf blocks plus each
 * dropped ancestor's direct inline runs) fix all three.
 */
const roots: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.appendChild(el);
  roots.push(el);
  return el;
};

afterEach(() => {
  for (const el of roots.splice(0)) el.remove();
  window.getSelection()?.removeAllRanges();
  clearCopiedFormat();
});

const selectFromTo = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number
) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
};

const textOf = (root: ParentNode, selector: string, nth = 0): Text => {
  const el = root.querySelectorAll(selector)[nth]!;
  return el.firstChild as Text;
};

describe("ancestor direct content is formatted too (#r17-1)", () => {
  it("bold across a nested list styles the parent item's own text AND the sub-item", () => {
    const r = mount("<ul><li>text<ul><li>sub</li></ul></li></ul>");
    const outerText = r.querySelector("li")!.firstChild!; // "text"
    const subText = textOf(r, "ul ul li");
    selectFromTo(outerText, 0, subText, 3);

    applyInlineStyle(r, "strong");

    // Both runs bolded; no <strong> ever wraps a block element.
    expect(r.querySelector("strong ul, strong li")).toBeNull();
    const bolded = Array.from(r.querySelectorAll("strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("text");
    expect(bolded).toContain("sub");
  });

  it("bold across the whole list does not skip the first item's direct text", () => {
    const r = mount(
      "<ul><li>one<ul><li>sub</li></ul></li><li>two</li></ul>"
    );
    const oneText = r.querySelector("li")!.firstChild!;
    const topItems = r.querySelector("ul")!.children;
    const twoText = topItems[1]!.firstChild!;
    selectFromTo(oneText, 0, twoText, 3);

    applyInlineStyle(r, "strong");

    const bolded = Array.from(r.querySelectorAll("strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("one");
    expect(bolded).toContain("sub");
    expect(bolded).toContain("two");
  });

  it("a trailing inline run AFTER the nested list is styled as well", () => {
    const r = mount("<ul><li>head<ul><li>sub</li></ul>tail</li></ul>");
    const li = r.querySelector("li")!;
    const headText = li.firstChild!;
    const tailText = li.lastChild!;
    selectFromTo(headText, 0, tailText, 4);

    applyInlineStyle(r, "strong");

    const bolded = Array.from(r.querySelectorAll("strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("head");
    expect(bolded).toContain("sub");
    expect(bolded).toContain("tail");
  });

  it("insertLink links the parent's text and the sub-item per block", () => {
    const r = mount("<ul><li>text<ul><li>sub</li></ul></li></ul>");
    const outerText = r.querySelector("li")!.firstChild!;
    const subText = textOf(r, "ul ul li");
    selectFromTo(outerText, 0, subText, 3);

    expect(() => insertLink(r, "https://x.test")).not.toThrow();

    expect(r.querySelector("a ul, a li")).toBeNull();
    const anchors = Array.from(r.querySelectorAll("a")).map(
      (a) => a.textContent
    );
    expect(anchors).toContain("text");
    expect(anchors).toContain("sub");
  });

  it("a table cell's direct text is styled alongside its inner paragraph", () => {
    const r = mount(
      "<table><tbody><tr><td>direct<p>para</p></td></tr></tbody></table>"
    );
    const td = r.querySelector("td")!;
    const directText = td.firstChild!;
    const paraText = r.querySelector("td p")!.firstChild!;
    selectFromTo(directText, 0, paraText, 4);

    applyInlineStyle(r, "strong");

    expect(r.querySelector("strong p, strong td")).toBeNull();
    const bolded = Array.from(r.querySelectorAll("strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("direct");
    expect(bolded).toContain("para");
  });

  it("font size (wrapRangeSlicesPerBlock) covers the parent's direct text", () => {
    const r = mount("<ul><li>text<ul><li>sub</li></ul></li></ul>");
    const outerText = r.querySelector("li")!.firstChild!;
    const subText = textOf(r, "ul ul li");
    selectFromTo(outerText, 0, subText, 3);

    applyFontSize(r, "large");

    const sized = Array.from(
      r.querySelectorAll('span[style*="font-size"]')
    ).map((s) => s.textContent);
    expect(sized).toContain("text");
    expect(sized).toContain("sub");
    expect(r.querySelector("span ul, span li")).toBeNull();
  });

  it("format painter paints the parent's direct text too", () => {
    const r = mount(
      "<p><strong>source</strong></p><ul><li>text<ul><li>sub</li></ul></li></ul>"
    );
    const srcText = r.querySelector("strong")!.firstChild!;
    const sel = window.getSelection()!;
    const srcRange = document.createRange();
    srcRange.selectNodeContents(srcText);
    sel.removeAllRanges();
    sel.addRange(srcRange);
    copyFormat(sel, r);

    const outerText = r.querySelector("li")!.firstChild!;
    const subText = textOf(r, "ul ul li");
    selectFromTo(outerText, 0, subText, 3);

    expect(pasteFormat(window.getSelection(), r)).toBe(true);

    const bolded = Array.from(r.querySelectorAll("li strong")).map(
      (b) => b.textContent
    );
    expect(bolded).toContain("text");
    expect(bolded).toContain("sub");
  });

  it("toggle-OFF un-bolds the parent's text and the sub-item in ONE press", () => {
    const r = mount(
      "<ul><li><strong>text</strong><ul><li><strong>sub</strong></li></ul></li></ul>"
    );
    const outerBold = r.querySelector("li > strong")!.firstChild!;
    const subBold = r.querySelector("ul ul strong")!.firstChild!;
    selectFromTo(outerBold, 0, subBold, 3);

    applyInlineStyle(r, "strong");

    expect(r.querySelectorAll("strong")).toHaveLength(0);
    expect(r.textContent).toBe("textsub");
  });
});

describe("multi-block toggle-OFF leaves no husks (#r17-2)", () => {
  it("un-bolding two fully-bold paragraphs leaves exactly two clean <p>s", () => {
    const r = mount("<p><strong>One</strong></p><p><strong>Two</strong></p>");
    const one = r.querySelector("strong")!.firstChild!;
    const two = r.querySelectorAll("strong")[1]!.firstChild!;
    selectFromTo(one, 0, two, 3);

    applyInlineStyle(r, "strong");

    expect(r.querySelectorAll("strong")).toHaveLength(0);
    expect(r.querySelectorAll("p")).toHaveLength(2);
    const texts = Array.from(r.querySelectorAll("p")).map(
      (p) => p.textContent
    );
    expect(texts).toEqual(["One", "Two"]);
  });

  it("three fully-bold paragraphs un-bold with no empty paragraphs injected", () => {
    const r = mount(
      "<p><strong>One</strong></p><p><strong>Two</strong></p><p><strong>Three</strong></p>"
    );
    const one = r.querySelector("strong")!.firstChild!;
    const three = r.querySelectorAll("strong")[2]!.firstChild!;
    selectFromTo(one, 0, three, 5);

    applyInlineStyle(r, "strong");

    expect(r.querySelectorAll("strong")).toHaveLength(0);
    expect(Array.from(r.querySelectorAll("p")).map((p) => p.textContent)).toEqual(
      ["One", "Two", "Three"]
    );
  });
});

describe("husk cleanup spares the author's own empty elements (#r17-3)", () => {
  it("an untouched paragraph's empty <strong> survives an unrelated un-bold", () => {
    const r = mount(
      "<p><strong>One</strong></p><p><strong>Two</strong></p><p><strong></strong>x</p>"
    );
    const one = r.querySelector("strong")!.firstChild!;
    const two = r.querySelectorAll("strong")[1]!.firstChild!;
    selectFromTo(one, 0, two, 3);

    applyInlineStyle(r, "strong");

    // The selection's bold is gone…
    const thirdP = r.querySelectorAll("p")[2]!;
    expect(r.querySelectorAll("p")[0]!.querySelector("strong")).toBeNull();
    expect(r.querySelectorAll("p")[1]!.querySelector("strong")).toBeNull();
    // …but the author's empty <strong> in the untouched paragraph remains.
    expect(thirdP.querySelector("strong")).not.toBeNull();
    expect(thirdP.textContent).toBe("x");
  });
});
