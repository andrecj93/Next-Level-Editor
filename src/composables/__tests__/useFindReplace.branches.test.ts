import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";

/**
 * Branch / edge coverage for useFindReplace, complementing useFindReplace.test.ts.
 *
 * Focus areas (the adversarial, previously-buggy ones):
 *  - buildPattern: escape-THEN-wrap ordering with regex metacharacters + word
 *    boundary semantics (\b adjacency to punctuation).
 *  - flag matrix: g / i present/absent across case-sensitivity × replaceAll.
 *  - $-sequence replacement literalness ($$, $`, $', $&).
 *  - no-match / empty-query paths (and that handle* still snapshots).
 *  - handleFind highlight path (lines otherwise unexercised): element vs text
 *    node startContainer, rangeCount===0, found===false, timer restore,
 *    re-entrancy (a 2nd find must not capture the highlight colour as original),
 *    and clearPendingHighlight restore + no-op.
 *
 * happy-dom limits honoured here: window.find and Selection/Range are unreliable,
 * so for the highlight path we install a controllable stub for those TWO APIs and
 * exercise the REAL highlight/restore logic through them (not the stub itself).
 * No layout engine, so we assert the DOM-level effect (the temporary
 * `nle-find-flash` class), not computed geometry.
 */

const opts = (caseSensitive: boolean, wholeWord: boolean) => ({
  caseSensitive,
  wholeWord,
});

describe("useFindReplace — branch/edge coverage", () => {
  let editorElement: HTMLElement;
  let captureSnapshot: () => void;

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.contentEditable = "true";
    document.body.appendChild(editorElement);
    captureSnapshot = vi.fn();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  const make = (el: HTMLElement | null = editorElement) =>
    useFindReplace({ editorContent: ref(el), captureSnapshot });

  // ---------------------------------------------------------------------------
  // searchAndReplace — regex construction (buildPattern) branches
  // ---------------------------------------------------------------------------
  describe("searchAndReplace: metacharacter escaping under whole-word", () => {
    it("escapes metachars FIRST then wraps in \\b (a dot stays literal, not any-char)", () => {
      const { searchAndReplace } = make();
      // find "a.c" whole word. If escaping ran AFTER wrapping, the \b would be
      // escaped and NOTHING would match. If "." were left unescaped, "aXc" would
      // wrongly match. Correct behaviour: only the literal, standalone "a.c".
      const result = searchAndReplace(
        "<p>a.c aXc a.cd</p>",
        "a.c",
        "Z",
        opts(false, true)
      );
      expect(result).toBe("<p>Z aXc a.cd</p>");
    });

    it("whole-word treats punctuation as a boundary (matches inside parens / before a period)", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>(cat) cat. cats catalog</p>",
        "cat",
        "dog",
        opts(false, true)
      );
      // "(cat)" and "cat." are whole words (punctuation = non-word boundary);
      // "cats"/"catalog" are not.
      expect(result).toBe("<p>(dog) dog. cats catalog</p>");
    });

    it("whole-word with a query starting with a non-word char matches after whitespace (old \\b asymmetry fixed)", () => {
      const { searchAndReplace } = make();
      // Whole-word is now a per-side boundary check: a boundary is required
      // only on sides whose needle EDGE char is a word character. '@' is not,
      // so a space-preceded "@handle" matches — the old \b version could never
      // match it (space→@ is non-word→non-word, no \b), a documented limit
      // that the Unicode-aware post-filter removed. #15
      const spacePreceded = searchAndReplace(
        "<p>hi @handle bye</p>",
        "@handle",
        "X",
        opts(false, true)
      );
      expect(spacePreceded).toBe("<p>hi X bye</p>");

      // Word-char-preceded still matches too (no start requirement for '@').
      const wordPreceded = searchAndReplace(
        "<p>x@handle</p>",
        "@handle",
        "X",
        opts(false, true)
      );
      expect(wordPreceded).toBe("<p>xX</p>");

      // The trailing edge ('e') IS a word char, so the end boundary still
      // applies: "@handles" is not a whole-word match for "@handle".
      const suffixed = searchAndReplace(
        "<p>hi @handles bye</p>",
        "@handle",
        "X",
        opts(false, true)
      );
      expect(suffixed).toBe("<p>hi @handles bye</p>");
    });

    it("escapes backslashes in the query (a literal backslash is not treated as an escape)", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        String.raw`<p>path\to and pathXto</p>`,
        String.raw`path\to`,
        "P",
        opts(false, false)
      );
      // Only the literal "path\to" is replaced; "pathXto" is untouched.
      expect(result).toBe("<p>P and pathXto</p>");
    });
  });

  // ---------------------------------------------------------------------------
  // searchAndReplace — flag matrix (g / i) branches
  // ---------------------------------------------------------------------------
  describe("searchAndReplace: flag matrix (case × replaceAll)", () => {
    it("case-insensitive + replaceAll=false replaces the FIRST match regardless of its case", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>HELLO hello</p>",
        "hello",
        "hi",
        opts(false, false),
        false
      );
      // flags = "i" (no "g"): first occurrence only, matched case-insensitively.
      expect(result).toBe("<p>hi hello</p>");
    });

    it("case-sensitive + replaceAll=true replaces every EXACT-case match only", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>cat Cat cat CAT</p>",
        "cat",
        "dog",
        opts(true, false),
        true
      );
      // flags = "g" (no "i"): both lowercase "cat" go, "Cat"/"CAT" stay.
      expect(result).toBe("<p>dog Cat dog CAT</p>");
    });

    it("case-insensitive + whole-word + replaceAll matches mixed case whole words only", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>CAT Category cat concatenate</p>",
        "cat",
        "dog",
        opts(false, true),
        true
      );
      // "CAT" and "cat" are whole words (any case); "Category"/"concatenate" not.
      expect(result).toBe("<p>dog Category dog concatenate</p>");
    });

    it("case-sensitive + replaceAll=false replaces only the first exact-case match", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>Cat cat Cat</p>",
        "Cat",
        "Dog",
        opts(true, false),
        false
      );
      // flags = "" (neither g nor i): first exact "Cat" only.
      expect(result).toBe("<p>Dog cat Cat</p>");
    });
  });

  // ---------------------------------------------------------------------------
  // searchAndReplace — $-sequence literalness (function replacement)
  // ---------------------------------------------------------------------------
  describe("searchAndReplace: $-sequences in replacement are literal", () => {
    it("keeps $$ as two dollars (string-replace would collapse it to one)", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace("<p>x</p>", "x", "$$", opts(false, false));
      expect(result).toBe("<p>$$</p>");
    });

    it("keeps $` and $' (before/after-match specials) literal", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>foo</p>",
        "foo",
        "a$`b$'c",
        opts(false, false)
      );
      expect(result).toBe("<p>a$`b$'c</p>");
    });

    it("keeps a bare $ literal and HTML-escapes markup in the replacement", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>foo</p>",
        "foo",
        "$ price $<n>",
        opts(false, false)
      );
      // The replacement is inserted as literal TEXT (via a text node), so the
      // "$" stays literal AND the angle brackets are HTML-escaped — a
      // replacement can no longer inject markup into the document (the whole
      // point of walking text nodes instead of string-replacing innerHTML).
      expect(result).toBe("<p>$ price $&lt;n&gt;</p>");
    });
  });

  // ---------------------------------------------------------------------------
  // searchAndReplace — no-match / empty query
  // ---------------------------------------------------------------------------
  describe("searchAndReplace: no-match & empty query", () => {
    it("returns the input unchanged when there is no match", () => {
      const { searchAndReplace } = make();
      const input = "<p>abc def</p>";
      expect(searchAndReplace(input, "zzz", "Q", opts(false, false))).toBe(
        input
      );
    });

    it("returns the input unchanged (identity) for an empty find, whatever the replace", () => {
      const { searchAndReplace } = make();
      const input = "<p>Hello world</p>";
      expect(searchAndReplace(input, "", "X", opts(false, false))).toBe(input);
      expect(searchAndReplace(input, "", "X", opts(true, true), false)).toBe(
        input
      );
    });

    it("whole-word does NOT match a substring occurrence (partial is skipped)", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>scatter category</p>",
        "cat",
        "dog",
        opts(false, true)
      );
      expect(result).toBe("<p>scatter category</p>");
    });
  });

  // ---------------------------------------------------------------------------
  // handleReplace / handleReplaceAll — snapshot-on-noop branches
  // ---------------------------------------------------------------------------
  describe("handle* still snapshots on a no-op replace", () => {
    it("handleReplace snapshots even when the find text is empty (identity write)", () => {
      editorElement.innerHTML = "<p>unchanged</p>";
      const { handleReplace } = make();

      handleReplace({
        findText: "",
        replaceText: "X",
        options: opts(false, false),
      });

      expect(editorElement.innerHTML).toBe("<p>unchanged</p>");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("handleReplace snapshots even when nothing matches", () => {
      editorElement.innerHTML = "<p>abc</p>";
      const { handleReplace } = make();

      handleReplace({
        findText: "zzz",
        replaceText: "Q",
        options: opts(false, false),
      });

      expect(editorElement.innerHTML).toBe("<p>abc</p>");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("handleReplaceAll snapshots even when nothing matches", () => {
      editorElement.innerHTML = "<p>abc</p>";
      const { handleReplaceAll } = make();

      handleReplaceAll({
        findText: "zzz",
        replaceText: "Q",
        options: opts(false, false),
      });

      expect(editorElement.innerHTML).toBe("<p>abc</p>");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("handleReplaceAll with whole-word replaces every standalone occurrence but not substrings", () => {
      editorElement.innerHTML = "<p>cat scatter cat category cat</p>";
      const { handleReplaceAll } = make();

      handleReplaceAll({
        findText: "cat",
        replaceText: "dog",
        options: opts(false, true),
      });

      expect(editorElement.innerHTML).toBe(
        "<p>dog scatter dog category dog</p>"
      );
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // handleFind — the highlight path (found === true + real Selection range)
  // ---------------------------------------------------------------------------
  describe("handleFind: highlight-on-match path", () => {
    let originalFind: unknown;
    let originalGetSelection: typeof globalThis.getSelection;

    beforeEach(() => {
      originalFind = (globalThis as Record<string, unknown>).find;
      originalGetSelection = globalThis.getSelection;
    });

    afterEach(() => {
      (globalThis as Record<string, unknown>).find = originalFind;
      globalThis.getSelection = originalGetSelection;
      vi.useRealTimers();
    });

    // Stub the TWO happy-dom-unreliable APIs (window.find + Selection). The real
    // highlight/restore logic runs through them.
    const stubMatch = (startContainer: Node | null, rangeCount = 1) => {
      (globalThis as Record<string, unknown>).find = vi.fn(() => true);
      const selection = {
        rangeCount,
        getRangeAt: () => ({ startContainer }),
      } as unknown as Selection;
      globalThis.getSelection = vi.fn(() => selection);
      return selection;
    };

    it("flashes the parent element (via a CLASS) when the match starts in a TEXT node", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);
      const textNode = span.firstChild as Text;
      expect(textNode.nodeType).toBe(Node.TEXT_NODE);
      expect(span.classList.contains("nle-find-flash")).toBe(false);

      stubMatch(textNode);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });

      // Flashed via a CLASS the sanitizer strips — never an inline background.
      expect(span.classList.contains("nle-find-flash")).toBe(true);
      expect(span.style.backgroundColor).toBe("");
    });

    it("flashes the element itself when the match starts in an ELEMENT node", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);
      expect(span.nodeType).toBe(Node.ELEMENT_NODE);

      stubMatch(span);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });

      expect(span.classList.contains("nle-find-flash")).toBe(true);
    });

    it("does not highlight when window.find returns false", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);

      (globalThis as Record<string, unknown>).find = vi.fn(() => false);
      globalThis.getSelection = vi.fn(
        () =>
          ({
            rangeCount: 1,
            getRangeAt: () => ({ startContainer: span }),
          }) as unknown as Selection
      );

      const { handleFind } = make();
      handleFind({ findText: "nope", direction: "next" });

      expect(span.style.backgroundColor).toBe("");
    });

    it("does not highlight when the match's start node is a detached text node (no parentElement)", () => {
      const orphan = document.createTextNode("floating");
      expect(orphan.nodeType).toBe(Node.TEXT_NODE);
      expect(orphan.parentElement).toBeNull();

      stubMatch(orphan);
      const { handleFind } = make();
      // element resolves to null -> no highlight, no throw.
      expect(() =>
        handleFind({ findText: "floating", direction: "next" })
      ).not.toThrow();
    });

    it("removes the flash class after the 1s timer fires, leaving a real bg intact", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target";
      span.style.backgroundColor = "green";
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });
      expect(span.classList.contains("nle-find-flash")).toBe(true);

      vi.advanceTimersByTime(1000);

      // Flash gone; the element's own background was never touched.
      expect(span.classList.contains("nle-find-flash")).toBe(false);
      expect(span.style.backgroundColor).toBe("green");
    });

    it("a second find moves the flash and leaves no residue after teardown", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind, clearPendingHighlight } = make();

      handleFind({ findText: "target", direction: "next" }); // flash #1
      handleFind({ findText: "target", direction: "next" }); // flash #2 (same el)
      expect(span.classList.contains("nle-find-flash")).toBe(true);

      clearPendingHighlight();
      expect(span.classList.contains("nle-find-flash")).toBe(false);
    });

    it("clearPendingHighlight removes the flash immediately and cancels its timer", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind, clearPendingHighlight } = make();
      handleFind({ findText: "target", direction: "next" });
      expect(span.classList.contains("nle-find-flash")).toBe(true);

      clearPendingHighlight();
      expect(span.classList.contains("nle-find-flash")).toBe(false);

      // Timer cleared: a re-added class is NOT removed by a late timer.
      span.classList.add("nle-find-flash");
      vi.advanceTimersByTime(1000);
      expect(span.classList.contains("nle-find-flash")).toBe(true);
    });

    it("clearPendingHighlight is a safe no-op when nothing is pending", () => {
      const { clearPendingHighlight } = make();
      expect(() => clearPendingHighlight()).not.toThrow();
    });

    it("handleReplace clears the flash so no highlight class bakes into content", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target word";
      editorElement.appendChild(span);

      stubMatch(span.firstChild); // text node → flashes the span
      const { handleFind, handleReplace } = make();

      handleFind({ findText: "target", direction: "next" });
      expect(span.classList.contains("nle-find-flash")).toBe(true);

      handleReplace({
        findText: "target",
        replaceText: "replaced",
        options: opts(false, false),
      });

      expect(editorElement.innerHTML).toContain("replaced");
      expect(editorElement.innerHTML).not.toContain("nle-find-flash");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
      // The pending restore timer was cancelled too — nothing left to fire.
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
      expect(editorElement.innerHTML).not.toContain("nle-find-flash");
    });

    it("handleReplaceAll clears the flash so no highlight class bakes into content", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target target";
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind, handleReplaceAll } = make();

      handleFind({ findText: "target", direction: "next" });
      expect(span.classList.contains("nle-find-flash")).toBe(true);

      handleReplaceAll({
        findText: "target",
        replaceText: "done",
        options: opts(false, false),
      });

      expect(editorElement.innerHTML).toContain("done done");
      expect(editorElement.innerHTML).not.toContain("nle-find-flash");
      expect(captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("the flash never touches a real pre-existing inline background", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      span.style.backgroundColor = "green";
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind, handleReplaceAll } = make();

      handleFind({ findText: "target", direction: "next" });
      // The flash is a class; the user's own green background is untouched.
      expect(span.style.backgroundColor).toBe("green");

      handleReplaceAll({
        findText: "target",
        replaceText: "kept",
        options: opts(false, false),
      });

      // The user's own green background survives; no flash class bakes in.
      expect(editorElement.innerHTML).toContain("green");
      expect(editorElement.innerHTML).not.toContain("nle-find-flash");
    });

    it("selects the last vs first match for previous vs next on a fresh query", () => {
      // Editor-scoped navigation replaced window.find: a fresh "previous"
      // starts at the LAST match, a fresh "next" at the FIRST.
      editorElement.innerHTML = "<p>target a target b target</p>";
      const { handleFind } = make();

      expect(handleFind({ findText: "target", direction: "previous" })).toEqual({
        current: 3,
        total: 3,
      });
      // A brand-new query the other way starts at the first.
      editorElement.innerHTML = "<p>target a target</p>";
      const fresh = make().handleFind({ findText: "target", direction: "next" });
      expect(fresh).toEqual({ current: 1, total: 2 });
    });
  });
});
