import { describe, it, expect, afterEach } from "vitest";
import { applyInlineStyle, insertLink } from "../formatting";
import { applyFontSize } from "../commands";

/**
 * r18 — two independent gaps the round-18 hunt confirmed in the block-slice
 * machinery (batches 77-80):
 *
 *  - blockquote/pre were missing from the collector's block set, so a
 *    blockquote's (or pre's) DIRECT text was orphaned whenever another real
 *    block was also selected — bold/link/font-size all silently skipped it,
 *    and font-size even injected ghost empty <p>/<blockquote> husks.
 *
 *  - the WRAP paths (bold/link/font-size) left empty inline husks behind:
 *    a slice boundary at (textNode, 0) inside an <em>/<a> makes extractContents
 *    clone the inline element, and the emptied ORIGINAL stayed in the DOM (the
 *    batch-80 cleanup only guarded the un-style path). A stale-href <a></a> is
 *    the worst — the sanitizer keeps it, so it round-trips into v-model.
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
};

const bolded = (r: ParentNode) =>
  Array.from(r.querySelectorAll("strong")).map((b) => b.textContent);

describe("blockquote/pre direct text is sliced like any block (#r18)", () => {
  it("bold across a <p> and a direct-text <blockquote> styles BOTH", () => {
    const r = mount("<p>para</p><blockquote>quote</blockquote>");
    const pText = r.querySelector("p")!.firstChild!;
    const qText = r.querySelector("blockquote")!.firstChild!;
    selectFromTo(pText, 0, qText, 5);

    applyInlineStyle(r, "strong");

    expect(bolded(r)).toContain("para");
    expect(bolded(r)).toContain("quote");
    expect(r.querySelector("strong blockquote, strong p")).toBeNull();
  });

  it("a <blockquote> with direct text PLUS an inner <p> styles the intro too", () => {
    const r = mount("<blockquote>intro<p>body</p></blockquote>");
    const introText = r.querySelector("blockquote")!.firstChild!;
    const bodyText = r.querySelector("p")!.firstChild!;
    selectFromTo(introText, 0, bodyText, 4);

    applyInlineStyle(r, "strong");

    expect(bolded(r)).toContain("intro");
    expect(bolded(r)).toContain("body");
  });

  it("font size across a <p> and a <blockquote> sizes both with no ghost husks", () => {
    const r = mount("<p>para</p><blockquote>quote</blockquote>");
    const pText = r.querySelector("p")!.firstChild!;
    const qText = r.querySelector("blockquote")!.firstChild!;
    selectFromTo(pText, 0, qText, 5);

    applyFontSize(r, "large");

    const sized = Array.from(
      r.querySelectorAll<HTMLElement>('span[style*="font-size"]')
    ).map((s) => s.textContent);
    expect(sized).toContain("para");
    expect(sized).toContain("quote");
    // No emptied block husks injected.
    expect(r.querySelectorAll("p").length).toBe(1);
    expect(r.querySelectorAll("blockquote").length).toBe(1);
    expect(
      Array.from(r.querySelectorAll("p, blockquote")).every(
        (b) => (b.textContent ?? "").length > 0
      )
    ).toBe(true);
  });

  it("bold across a <pre> and a <p> styles the pre's text", () => {
    const r = mount("<pre>code line</pre><p>after</p>");
    const preText = r.querySelector("pre")!.firstChild!;
    const pText = r.querySelector("p")!.firstChild!;
    selectFromTo(preText, 0, pText, 5);

    applyInlineStyle(r, "strong");

    expect(bolded(r)).toContain("code line");
    expect(bolded(r)).toContain("after");
  });
});

describe("wrap paths leave no empty inline husks (#r18)", () => {
  it("bolding a selection that starts inside an <em> leaves no empty <em>", () => {
    const r = mount("<p><em>ab</em>cd</p>");
    const emText = r.querySelector("em")!.firstChild!;
    const cdText = r.querySelector("p")!.lastChild!;
    selectFromTo(emText, 0, cdText, 2);

    applyInlineStyle(r, "strong");

    expect(bolded(r).join("")).toContain("ab");
    expect(
      Array.from(r.querySelectorAll("em")).filter((e) => !(e.textContent ?? ""))
    ).toHaveLength(0);
  });

  it("re-linking a selection that starts inside an <a> leaves no stale empty <a>", () => {
    const r = mount('<p><a href="https://old.test">text</a>more</p>');
    const aText = r.querySelector("a")!.firstChild!;
    const moreText = r.querySelector("p")!.lastChild!;
    selectFromTo(aText, 0, moreText, 4);

    insertLink(r, "https://new.test");

    const stale = Array.from(r.querySelectorAll("a")).filter(
      (a) =>
        a.getAttribute("href") === "https://old.test" && !(a.textContent ?? "")
    );
    expect(stale).toHaveLength(0);
    // The visible text is re-linked.
    expect(
      Array.from(r.querySelectorAll('a[href="https://new.test"]')).some((a) =>
        (a.textContent ?? "").includes("text")
      )
    ).toBe(true);
  });

  it("font size on a selection starting inside an <em> leaves no empty <em>", () => {
    const r = mount("<p><em>ab</em>cd</p>");
    const emText = r.querySelector("em")!.firstChild!;
    const cdText = r.querySelector("p")!.lastChild!;
    selectFromTo(emText, 0, cdText, 2);

    applyFontSize(r, "large");

    expect(
      Array.from(r.querySelectorAll("em")).filter((e) => !(e.textContent ?? ""))
    ).toHaveLength(0);
  });

  it("the AUTHOR's own pre-existing empty inline is preserved", () => {
    const r = mount("<p><em>ab</em>cd</p><p><em></em>keep</p>");
    const emText = r.querySelector("em")!.firstChild!;
    const cdText = r.querySelectorAll("p")[0].lastChild!;
    selectFromTo(emText, 0, cdText, 2);

    applyInlineStyle(r, "strong");

    // The untouched second paragraph's empty <em> survives.
    const secondP = r.querySelectorAll("p")[1];
    expect(secondP.querySelector("em")).not.toBeNull();
  });
});
