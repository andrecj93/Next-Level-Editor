import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace, countMatchesInHtml } from "../useFindReplace";

/**
 * Round-15 find/replace cluster:
 *  - #7: the modal kept its own per-text-node + ASCII-\b counter, disagreeing
 *    with the text-map core — cross-node matches showed "No matches" and the
 *    Replace buttons were disabled. countMatchesInHtml is the single source of
 *    truth both the modal and the composable share.
 *  - #17: two consecutive Replaces crashed (ranges[-1]) when the resume left
 *    the cursor at -1 (wrap-to-first encoding).
 *  - #18: the block separator was only emitted AFTER a block, so bare root
 *    text joined the following block's text; <hr> contributed nothing.
 *  - #19: the find flash climbed to the EDITOR ROOT for bare-root matches,
 *    flashing the entire document.
 *  - #31: Replace re-anchored a stale cursor belonging to a DIFFERENT query.
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
const WHOLE = { caseSensitive: false, wholeWord: true };

describe("countMatchesInHtml — shared counter (#7)", () => {
  it("counts a match split by inline formatting", () => {
    expect(countMatchesInHtml("<p>say he<b>llo</b> now</p>", "hello", OPTS)).toBe(
      1
    );
  });

  it("counts accented whole-words", () => {
    expect(countMatchesInHtml("<p>diga olá agora</p>", "olá", WHOLE)).toBe(1);
  });

  it("never counts across block boundaries", () => {
    expect(countMatchesInHtml("<p>foo</p><p>bar</p>", "foobar", OPTS)).toBe(0);
  });

  it("skips variable pills", () => {
    expect(
      countMatchesInHtml(
        '<p><span class="editor-variable" data-variable="name">{{name}}</span> name</p>',
        "name",
        OPTS
      )
    ).toBe(1);
  });
});

describe("consecutive Replace does not crash at the wrap point (#17)", () => {
  it("two Replaces in a row consume both matches", () => {
    const el = mount("<p>a b a</p>");
    const fr = build(el);
    fr.handleFind({ findText: "a", direction: "next", options: OPTS });
    fr.handleReplace({ findText: "a", replaceText: "x", options: OPTS });
    // Cursor is now parked at -1 (wrap encoding); the next Replace must clamp,
    // not read ranges[-1] and throw.
    expect(() =>
      fr.handleReplace({ findText: "a", replaceText: "x", options: OPTS })
    ).not.toThrow();
    expect(el.textContent).toBe("x b x");
  });
});

describe("block separators on BOTH sides (#18)", () => {
  it("bare root text does not join the following block", () => {
    const el = mount("foo<p>bar</p>");
    const r = build(el).handleFind({
      findText: "foobar",
      direction: "next",
      options: OPTS,
    });
    expect(r.total).toBe(0);
  });

  it("an <hr> separates its neighbours", () => {
    const el = mount("<p>foo</p><hr><p>bar</p>");
    const r = build(el).handleFind({
      findText: "foobar",
      direction: "next",
      options: OPTS,
    });
    expect(r.total).toBe(0);
  });
});

describe("find flash never floods the editor root (#19)", () => {
  it("a bare-root match does not flash the whole editor", () => {
    const el = mount("find me here");
    build(el).handleFind({ findText: "me", direction: "next", options: OPTS });
    expect(el.classList.contains("nle-find-flash")).toBe(false);
  });
});

describe("Replace with a different query resets the stale cursor (#31)", () => {
  it("replaces the new query's first match and navigation stays coherent", () => {
    const el = mount("<p>cat dog cat</p>");
    const fr = build(el);
    fr.handleFind({ findText: "cat", direction: "next", options: OPTS });
    // Replace a DIFFERENT term without a prior Find for it.
    fr.handleReplace({ findText: "dog", replaceText: "X", options: OPTS });
    expect(el.textContent).toBe("cat X cat");
    // A follow-up Find for the old term starts cleanly at 1 of 2.
    const r = fr.handleFind({ findText: "cat", direction: "next", options: OPTS });
    expect(r).toEqual({ current: 1, total: 2 });
  });
});

describe("a match can never span an <img> (#r16-7)", () => {
  it("countMatchesInHtml refuses matches crossing an image", () => {
    const opts = { caseSensitive: false, wholeWord: false };
    // Before: the image contributed NOTHING to the text map, so "ABCD" matched
    // across it — and Replace silently swallowed the image.
    expect(
      countMatchesInHtml('<p>AB<img src="https://x.test/i.png">CD</p>', "ABCD", opts)
    ).toBe(0);
    // Sanity: each side still matches on its own.
    expect(
      countMatchesInHtml('<p>AB<img src="https://x.test/i.png">CD</p>', "AB", opts)
    ).toBe(1);
    expect(
      countMatchesInHtml('<p>AB<img src="https://x.test/i.png">CD</p>', "CD", opts)
    ).toBe(1);
  });
});
