import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";

/**
 * #14 (r14/r14b): the match core only searched WITHIN single text nodes, so a
 * term split by any inline element — he<b>llo</b>, a comment highlight cutting
 * a phrase, a smart-punctuation span — was invisible to Find and silently
 * skipped by Replace/Replace All. Matching now runs over a flattened text map
 * of the prose (inline boundaries contribute nothing; block boundaries, <br>
 * and skipped containers contribute a separator so matches never span them).
 */
const editors: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.appendChild(el);
  editors.push(el);
  return el;
};

afterEach(() => {
  for (const el of editors.splice(0)) el.remove();
  window.getSelection()?.removeAllRanges();
});

const build = (el: HTMLElement) =>
  useFindReplace({ editorContent: ref(el), captureSnapshot: vi.fn() });

const OPTS = { caseSensitive: false, wholeWord: false };

describe("cross-node matching (#14)", () => {
  it("finds a match split by inline bold", () => {
    const el = mount("<p>say he<b>llo</b> now</p>");
    const r = build(el).handleFind({
      findText: "hello",
      direction: "next",
      options: OPTS,
    });
    expect(r).toEqual({ current: 1, total: 1 });
  });

  it("finds a phrase spanning a comment-highlight boundary", () => {
    const el = mount(
      '<p><span class="comment-highlight" data-thread-id="t1">Hello</span> world</p>'
    );
    const r = build(el).handleFind({
      findText: "Hello world",
      direction: "next",
      options: OPTS,
    });
    expect(r.total).toBe(1);
  });

  it("never matches across block boundaries", () => {
    const el = mount("<p>foo</p><p>bar</p>");
    const r = build(el).handleFind({
      findText: "foobar",
      direction: "next",
      options: OPTS,
    });
    expect(r.total).toBe(0);
  });

  it("never matches across a <br>", () => {
    const el = mount("<p>foo<br>bar</p>");
    const r = build(el).handleFind({
      findText: "foobar",
      direction: "next",
      options: OPTS,
    });
    expect(r.total).toBe(0);
  });

  it("Replace All replaces a spanning match without leaving hollow tags", () => {
    const el = mount("<p>say he<b>llo</b> now</p>");
    build(el).handleReplaceAll({
      findText: "hello",
      replaceText: "goodbye",
      options: OPTS,
    });
    expect(el.textContent).toBe("say goodbye now");
    expect(el.innerHTML).not.toContain("<b></b>");
  });

  it("single Replace replaces the spanning match only", () => {
    const el = mount("<p>he<b>llo</b> and hello</p>");
    const fr = build(el);
    fr.handleFind({ findText: "hello", direction: "next", options: OPTS });
    fr.handleReplace({ findText: "hello", replaceText: "X", options: OPTS });
    expect(el.textContent).toBe("X and hello");
  });

  it("whole-word respects the RENDERED word, not node boundaries", () => {
    // "he" ends its text node but the rendered word is "hello" — no match.
    const el = mount("<p>he<b>llo</b></p>");
    const r = build(el).handleFind({
      findText: "he",
      direction: "next",
      options: { caseSensitive: false, wholeWord: true },
    });
    expect(r.total).toBe(0);
  });

  it("same-node matching still counts identically (guard)", () => {
    const el = mount("<p>cat cat cat</p>");
    const r = build(el).handleFind({
      findText: "cat",
      direction: "next",
      options: OPTS,
    });
    expect(r).toEqual({ current: 1, total: 3 });
  });
});
