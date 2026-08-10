import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";

/**
 * #15: whole-word used ASCII `\b`, for which accented letters are NON-word
 * characters. So in Portuguese (or any accented language) whole-word was doubly
 * broken: it could NEVER match a word ending/starting with an accent ("olá",
 * "ação"), and it FALSELY matched a prefix inside an accented word ("ola"
 * whole-word matched inside "olá", because a→á read as a word boundary).
 * Whole-word is now a Unicode-aware per-side boundary check over the text map.
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

const WHOLE = { caseSensitive: false, wholeWord: true };

describe("whole-word with accented letters (#15)", () => {
  it("finds a word ENDING in an accent", () => {
    const el = mount("<p>diga olá agora</p>");
    const r = build(el).handleFind({
      findText: "olá",
      direction: "next",
      options: WHOLE,
    });
    expect(r).toEqual({ current: 1, total: 1 });
  });

  it("does NOT match a prefix cut off by an accent (ASCII \\b false positive)", () => {
    // "ma" sits inside "maçã", but ASCII \b saw a→ç as a word boundary and
    // whole-word matched it. Unicode-aware boundaries treat ç as a letter.
    const el = mount("<p>maçã</p>");
    const r = build(el).handleFind({
      findText: "ma",
      direction: "next",
      options: WHOLE,
    });
    expect(r.total).toBe(0);
  });

  it("Replace All whole-word replaces an accent-edged word", () => {
    const el = mount("<p>uma ação aqui e a ação ali</p>");
    build(el).handleReplaceAll({
      findText: "ação",
      replaceText: "tarefa",
      options: WHOLE,
    });
    expect(el.textContent).toBe("uma tarefa aqui e a tarefa ali");
  });

  it("does not bleed into a longer accented word", () => {
    const el = mount("<p>ação e açãozinha</p>");
    build(el).handleReplaceAll({
      findText: "ação",
      replaceText: "X",
      options: WHOLE,
    });
    expect(el.textContent).toBe("X e açãozinha");
  });

  it("a symbol-edged term no longer needs a word char before it (old \\b asymmetry)", () => {
    const el = mount("<p>hi @handle bye</p>");
    const r = build(el).handleFind({
      findText: "@handle",
      direction: "next",
      options: WHOLE,
    });
    expect(r.total).toBe(1);
  });

  it("ASCII whole-word still rejects substrings (guard)", () => {
    const el = mount("<p>cat cats catalog</p>");
    const r = build(el).handleFind({
      findText: "cat",
      direction: "next",
      options: WHOLE,
    });
    expect(r.total).toBe(1);
  });

  it("an astral-plane neighbour does not break the boundary check (#r15-30)", () => {
    // "𝐀" (MATHEMATICAL BOLD CAPITAL A) is a LETTER encoded as a surrogate
    // pair — indexing single code units saw only half of it, mis-judging the
    // boundary. "word" adjacent to it is NOT whole-word.
    const el = mount("<p>𝐀word and word</p>");
    const r = build(el).handleFind({
      findText: "word",
      direction: "next",
      options: WHOLE,
    });
    expect(r.total).toBe(1);
  });
});
