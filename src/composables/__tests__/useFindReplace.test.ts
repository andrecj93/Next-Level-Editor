import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";

describe("useFindReplace", () => {
  let editorElement: HTMLElement;
  let mockCaptureSnapshot: () => void;

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.contentEditable = "true";
    document.body.appendChild(editorElement);
    mockCaptureSnapshot = vi.fn();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("searchAndReplace", () => {
    it("should replace text case-insensitively", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>Hello world, HELLO universe</p>",
        "hello",
        "hi",
        { caseSensitive: false, wholeWord: false }
      );

      expect(result).toBe("<p>hi world, hi universe</p>");
    });

    it("should replace text case-sensitively", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>Hello world, HELLO universe</p>",
        "Hello",
        "Hi",
        { caseSensitive: true, wholeWord: false }
      );

      expect(result).toBe("<p>Hi world, HELLO universe</p>");
    });

    it("should replace only whole words when wholeWord is true", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>cat category scattered</p>",
        "cat",
        "dog",
        { caseSensitive: false, wholeWord: true }
      );

      // Only the standalone word "cat" is replaced; "category"/"scattered" are
      // left untouched.
      expect(result).toBe("<p>dog category scattered</p>");
    });

    it("should replace partial matches when wholeWord is false", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>cat category scattered</p>",
        "cat",
        "dog",
        { caseSensitive: false, wholeWord: false }
      );

      expect(result).toBe("<p>dog dogegory sdogtered</p>");
    });

    it("should escape special regex characters", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>Cost: $100 (special)</p>",
        "$100",
        "$200",
        { caseSensitive: false, wholeWord: false }
      );

      expect(result).toBe("<p>Cost: $200 (special)</p>");
    });

    it("should handle regex special characters in pattern", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>Test [brackets] and {braces}</p>",
        "[brackets]",
        "(parentheses)",
        { caseSensitive: false, wholeWord: false }
      );

      expect(result).toBe("<p>Test (parentheses) and {braces}</p>");
    });

    it("should replace all occurrences globally", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>foo bar foo baz foo</p>",
        "foo",
        "qux",
        { caseSensitive: false, wholeWord: false }
      );

      expect(result).toBe("<p>qux bar qux baz qux</p>");
    });

    it("should handle empty find text", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace("<p>Hello world</p>", "", "X", {
        caseSensitive: false,
        wholeWord: false,
      });

      // Empty string regex doesn't replace anything (or inserts between each char)
      expect(result).toBeDefined();
    });

    it("should handle empty replace text", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace("<p>Hello world</p>", "world", "", {
        caseSensitive: false,
        wholeWord: false,
      });

      expect(result).toBe("<p>Hello </p>");
    });

    it("should combine case-sensitive and whole word options", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>Test test Testing tested</p>",
        "test",
        "exam",
        { caseSensitive: true, wholeWord: true }
      );

      // Only the standalone lowercase "test" matches: "Test" differs by case,
      // "Testing"/"tested" are not whole words.
      expect(result).toBe("<p>Test exam Testing tested</p>");
    });

    it("should treat $-sequences in the replacement literally", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace("<p>foo</p>", "foo", "$&$1bar", {
        caseSensitive: false,
        wholeWord: false,
      });

      // "$&"/"$1" stay literal (not the match / a capture group). The "&" is
      // HTML-escaped because the replacement is inserted as literal text — it
      // re-parses back to "$&$1bar" in the DOM, and markup can't be injected.
      expect(result).toBe("<p>$&amp;$1bar</p>");
    });

    it("should replace only the first match when replaceAll is false", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      const result = searchAndReplace(
        "<p>foo foo foo</p>",
        "foo",
        "bar",
        { caseSensitive: false, wholeWord: false },
        false
      );

      expect(result).toBe("<p>bar foo foo</p>");
    });

    it("replaces only visible text, never tag names / attributes / URLs", () => {
      const { searchAndReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      // "a" appears in the <a> tag name, the href attribute and the class.
      // A raw innerHTML replace would corrupt all of them; the text-node walk
      // only touches the visible link text.
      const result = searchAndReplace(
        '<p>See <a href="https://a.example/path" class="lnk">a link</a> now</p>',
        "a",
        "X",
        { caseSensitive: false, wholeWord: false },
        true
      );

      expect(result).toBe(
        '<p>See <a href="https://a.example/path" class="lnk">X link</a> now</p>'
      );
    });
  });

  describe("handleFind", () => {
    it("should call window.find with correct parameters for next direction", () => {
      const mockFind = vi.fn();
      // @ts-expect-error - mocking window.find
      globalThis.find = mockFind;

      const { handleFind } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFind({ findText: "test", direction: "next" });

      expect(mockFind).toHaveBeenCalledWith(
        "test",
        false,
        false,
        false,
        false,
        true,
        false
      );
    });

    it("should call window.find with correct parameters for previous direction", () => {
      const mockFind = vi.fn();
      // @ts-expect-error - mocking window.find
      globalThis.find = mockFind;

      const { handleFind } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFind({ findText: "test", direction: "previous" });

      expect(mockFind).toHaveBeenCalledWith(
        "test",
        false,
        true,
        false,
        false,
        true,
        false
      );
    });

    it("should not call window.find when editor content is null", () => {
      const mockFind = vi.fn();
      // @ts-expect-error - mocking window.find
      globalThis.find = mockFind;

      const { handleFind } = useFindReplace({
        editorContent: ref(null),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFind({ findText: "test", direction: "next" });

      expect(mockFind).not.toHaveBeenCalled();
    });

    it("should handle window.find errors gracefully", () => {
      // @ts-expect-error - mocking window.find
      globalThis.find = () => {
        throw new Error("Find not supported");
      };
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { handleFind } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      expect(() => {
        handleFind({ findText: "test", direction: "next" });
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Find operation not supported in this browser:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it("should not call window.find when selection is not available", () => {
      const mockFind = vi.fn();
      // @ts-expect-error - mocking window.find
      globalThis.find = mockFind;

      const originalGetSelection = globalThis.getSelection;
      globalThis.getSelection = vi.fn(() => null);

      const { handleFind } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFind({ findText: "test", direction: "next" });

      expect(mockFind).not.toHaveBeenCalled();

      globalThis.getSelection = originalGetSelection;
    });
  });

  describe("handleReplace", () => {
    it("should replace text and capture snapshot", () => {
      editorElement.innerHTML = "<p>Hello world</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "world",
        replaceText: "universe",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>Hello universe</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should replace with case sensitivity", () => {
      editorElement.innerHTML = "<p>Hello HELLO hello</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "Hello",
        replaceText: "Hi",
        options: { caseSensitive: true, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>Hi HELLO hello</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should replace the first whole word only", () => {
      editorElement.innerHTML = "<p>cat category cats</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "cat",
        replaceText: "dog",
        options: { caseSensitive: false, wholeWord: true },
      });

      // Whole-word now works, and single Replace only touches the first match.
      expect(editorElement.innerHTML).toBe("<p>dog category cats</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should not replace when editor content is null", () => {
      const { handleReplace } = useFindReplace({
        editorContent: ref(null),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "test",
        replaceText: "result",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(mockCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("should handle complex HTML with attributes", () => {
      editorElement.innerHTML =
        '<p class="test">Hello <strong>world</strong></p>';

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "world",
        replaceText: "universe",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe(
        '<p class="test">Hello <strong>universe</strong></p>'
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should replace only the first occurrence (single Replace)", () => {
      editorElement.innerHTML = "<p>test test test</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "test",
        replaceText: "result",
        options: { caseSensitive: false, wholeWord: false },
      });

      // Single "Replace" must not behave like "Replace All".
      expect(editorElement.innerHTML).toBe("<p>result test test</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleReplaceAll", () => {
    it("should replace all occurrences and capture snapshot", () => {
      editorElement.innerHTML = "<p>foo bar foo baz foo</p>";

      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplaceAll({
        findText: "foo",
        replaceText: "qux",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>qux bar qux baz qux</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should respect case sensitivity for replace all", () => {
      editorElement.innerHTML = "<p>Test test TEST</p>";

      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplaceAll({
        findText: "test",
        replaceText: "exam",
        options: { caseSensitive: true, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>Test exam TEST</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should respect whole word option for replace all", () => {
      editorElement.innerHTML = "<p>cat cats category</p>";

      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplaceAll({
        findText: "cat",
        replaceText: "dog",
        options: { caseSensitive: false, wholeWord: true },
      });

      // Only the standalone whole word "cat" is replaced.
      expect(editorElement.innerHTML).toBe("<p>dog cats category</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should not corrupt text when the replacement contains the search term", () => {
      editorElement.innerHTML = "<p>cat cat cat</p>";

      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      // Regression: a looped global replace used to runaway-expand this.
      handleReplaceAll({
        findText: "cat",
        replaceText: "cats",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>cats cats cats</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should not replace when editor content is null", () => {
      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(null),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplaceAll({
        findText: "test",
        replaceText: "result",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(mockCaptureSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid sequential replace operations", () => {
      editorElement.innerHTML = "<p>a b c</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "a",
        replaceText: "x",
        options: { caseSensitive: false, wholeWord: false },
      });
      handleReplace({
        findText: "b",
        replaceText: "y",
        options: { caseSensitive: false, wholeWord: false },
      });
      handleReplace({
        findText: "c",
        replaceText: "z",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>x y z</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(3);
    });

    it("should handle replacing text that contains HTML tags", () => {
      editorElement.innerHTML =
        "<p>Text with <strong>bold</strong> content</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "bold",
        replaceText: "italic",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe(
        "<p>Text with <strong>italic</strong> content</p>"
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle empty editor content", () => {
      editorElement.innerHTML = "";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "test",
        replaceText: "result",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in both find and replace text", () => {
      editorElement.innerHTML = "<p>Price: $50.00</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "$50.00",
        replaceText: "$75.99",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>Price: $75.99</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle Unicode characters", () => {
      editorElement.innerHTML = "<p>Hello 世界</p>";

      const { handleReplace } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplace({
        findText: "世界",
        replaceText: "world",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe("<p>Hello world</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should handle very long text content", () => {
      const longText = "a".repeat(10000);
      editorElement.innerHTML = `<p>${longText}</p>`;

      const { handleReplaceAll } = useFindReplace({
        editorContent: ref(editorElement),
        captureSnapshot: mockCaptureSnapshot,
      });

      handleReplaceAll({
        findText: "a",
        replaceText: "b",
        options: { caseSensitive: false, wholeWord: false },
      });

      expect(editorElement.innerHTML).toBe(`<p>${"b".repeat(10000)}</p>`);
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });
  });
});
