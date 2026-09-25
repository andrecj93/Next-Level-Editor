import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getWordCount,
  getCharacterCount,
  getCharacterCountWithoutSpaces,
} from "../commands";

/**
 * The word/character counts are exposed through computeds that a template reads
 * during render. Their helpers built a `document.createElement("div")` to strip
 * HTML, so on a server render the editor's footer counts threw
 * `ReferenceError: document is not defined` — crashing the whole page. They must
 * fall back to a document-free strip on the server (the client re-computes the
 * exact value on hydration).
 */
describe("word/char counts are SSR-safe (no document)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("counts words without document", () => {
    vi.stubGlobal("document", undefined);
    expect(() => getWordCount("<p>hello world</p>")).not.toThrow();
    expect(getWordCount("<p>hello world</p>")).toBe(2);
  });

  it("separates words across block boundaries without document", () => {
    vi.stubGlobal("document", undefined);
    // Adjacent blocks must not fuse into one word ("ab" would be wrong).
    expect(getWordCount("<p>one</p><p>two</p>")).toBe(2);
  });

  it("counts characters without document", () => {
    vi.stubGlobal("document", undefined);
    expect(() => getCharacterCount("<p>hello</p>")).not.toThrow();
    expect(getCharacterCount("<p>hello</p>")).toBe(5);
  });

  it("counts characters without spaces without document", () => {
    vi.stubGlobal("document", undefined);
    expect(getCharacterCountWithoutSpaces("<p>a b c</p>")).toBe(3);
  });

  it('ignores empty inline caret markers without document', () => {
    vi.stubGlobal('document', undefined);
    const html = '<p>Keep this <strong>\u200b</strong></p>';
    expect(getWordCount(html)).toBe(2);
    expect(getCharacterCount(html)).toBe(9);
    expect(getCharacterCountWithoutSpaces(html)).toBe(8);
  });
});
