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
 * No layout engine, so we assert the DOM-level effect (inline backgroundColor),
 * not computed geometry.
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

    it("whole-word with a query starting with a non-word char cannot match after whitespace (\\b asymmetry — documented limit)", () => {
      const { searchAndReplace } = make();
      // "\b@handle\b": the leading \b needs a word|non-word transition immediately
      // before '@'. After a space (non-word→non-word) there is NO boundary, so a
      // space-preceded "@handle" does not match. This is real \b behaviour, not a
      // bug we can fix here — assert the actual current contract.
      const spacePreceded = searchAndReplace(
        "<p>hi @handle bye</p>",
        "@handle",
        "X",
        opts(false, true)
      );
      expect(spacePreceded).toBe("<p>hi @handle bye</p>"); // unchanged

      // But when preceded by a word char, x|@ IS a boundary, so it matches.
      const wordPreceded = searchAndReplace(
        "<p>x@handle</p>",
        "@handle",
        "X",
        opts(false, true)
      );
      expect(wordPreceded).toBe("<p>xX</p>");
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

    it("keeps a bare $ and $<name> literal", () => {
      const { searchAndReplace } = make();
      const result = searchAndReplace(
        "<p>foo</p>",
        "foo",
        "$ price $<n>",
        opts(false, false)
      );
      expect(result).toBe("<p>$ price $<n></p>");
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

    it("highlights the parent element when the match starts in a TEXT node", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);
      const textNode = span.firstChild as Text;
      expect(textNode.nodeType).toBe(Node.TEXT_NODE);
      expect(span.style.backgroundColor).toBe(""); // no inline bg to start

      stubMatch(textNode);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });

      // Real logic set the temporary highlight on the parent element.
      expect(span.style.backgroundColor).not.toBe("");
      expect(span.style.backgroundColor).toContain("255");
    });

    it("highlights the element itself when the match starts in an ELEMENT node", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);
      expect(span.nodeType).toBe(Node.ELEMENT_NODE);

      stubMatch(span);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });

      expect(span.style.backgroundColor).not.toBe("");
    });

    it("does nothing (no throw) when window.find reports found but rangeCount is 0", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);

      stubMatch(span, 0); // found true, but no range
      const { handleFind } = make();
      expect(() =>
        handleFind({ findText: "target", direction: "next" })
      ).not.toThrow();

      expect(span.style.backgroundColor).toBe(""); // never highlighted
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

    it("restores the element's ORIGINAL background after the 1s timer fires", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target";
      span.style.backgroundColor = "green";
      const originalBg = span.style.backgroundColor; // whatever happy-dom stored
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind } = make();
      handleFind({ findText: "target", direction: "next" });

      // Highlighted now (differs from original).
      expect(span.style.backgroundColor).not.toBe(originalBg);

      vi.advanceTimersByTime(1000);

      // Restored to the true original background.
      expect(span.style.backgroundColor).toBe(originalBg);
    });

    it("a second find on the same element captures the TRUE original, not the still-pending highlight colour", () => {
      // Security-relevant regression: without clearPendingHighlight() running
      // before capturing originalBg, the 2nd find would snapshot the yellow
      // highlight as the "original" and leak it permanently.
      const span = document.createElement("span");
      span.textContent = "target";
      span.style.backgroundColor = "green";
      const originalBg = span.style.backgroundColor;
      editorElement.appendChild(span);

      stubMatch(span);
      const { handleFind, clearPendingHighlight } = make();

      handleFind({ findText: "target", direction: "next" }); // highlight #1
      const afterFirst = span.style.backgroundColor;
      expect(afterFirst).not.toBe(originalBg);

      handleFind({ findText: "target", direction: "next" }); // highlight #2
      // Still showing a highlight (not the original) while pending...
      expect(span.style.backgroundColor).not.toBe(originalBg);

      // ...but tearing down the pending highlight restores the TRUE original,
      // proving the 2nd capture did not record the yellow highlight.
      clearPendingHighlight();
      expect(span.style.backgroundColor).toBe(originalBg);
    });

    it("clearPendingHighlight restores an active highlight and cancels its timer (no late revert)", () => {
      vi.useFakeTimers();
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span); // original bg = ""

      stubMatch(span);
      const { handleFind, clearPendingHighlight } = make();
      handleFind({ findText: "target", direction: "next" });
      expect(span.style.backgroundColor).not.toBe("");

      clearPendingHighlight();
      expect(span.style.backgroundColor).toBe(""); // restored immediately

      // Timer was cleared: advancing does not touch the (now cleared) style.
      span.style.backgroundColor = "blue";
      vi.advanceTimersByTime(1000);
      expect(span.style.backgroundColor).toBe("blue");
    });

    it("clearPendingHighlight is a safe no-op when nothing is pending", () => {
      const { clearPendingHighlight } = make();
      expect(() => clearPendingHighlight()).not.toThrow();
    });

    it("passes the backwards flag through window.find for previous vs next", () => {
      const span = document.createElement("span");
      span.textContent = "target";
      editorElement.appendChild(span);

      const findSpy = vi.fn((..._args: unknown[]) => true);
      (globalThis as Record<string, unknown>).find = findSpy;
      globalThis.getSelection = vi.fn(
        () =>
          ({
            rangeCount: 1,
            getRangeAt: () => ({ startContainer: span }),
          }) as unknown as Selection
      );

      const { handleFind } = make();
      handleFind({ findText: "target", direction: "previous" });
      // 3rd positional arg (aBackwards) is true for "previous".
      expect(findSpy.mock.calls[0][2]).toBe(true);

      handleFind({ findText: "target", direction: "next" });
      expect(findSpy.mock.calls[1][2]).toBe(false);
    });
  });
});
