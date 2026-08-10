import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../export";

/**
 * Markdown export fidelity regressions surfaced by the round-9 adversarial
 * audit. Each is silent data corruption on a public export path
 * (htmlToMarkdown is re-exported from the library entry).
 */
describe("htmlToMarkdown fidelity", () => {
  it("prefixes EVERY line of a multi-paragraph blockquote with '>'", () => {
    // Old bug: a single '> ' was prepended to the whole children blob, so only
    // the first line stayed quoted and every later paragraph escaped the quote.
    const md = htmlToMarkdown(
      "<blockquote><p>Line one</p><p>Line two</p></blockquote>"
    );
    expect(md).toContain("> Line one");
    // The critical assertion: line two must ALSO be quoted, not a bare
    // paragraph outside the block.
    expect(md).toMatch(/^> Line two$/m);
    expect(md).not.toMatch(/^Line two$/m);
  });

  it("angle-brackets link URLs containing spaces or parentheses", () => {
    // Old bug: `[t](http://x/a b(c))` is not a valid Markdown link — the space
    // and the ')' break the destination. CommonMark allows a <...> destination.
    const md = htmlToMarkdown('<a href="http://x.com/a b(c)">t</a>');
    expect(md).toContain("[t](<http://x.com/a b(c)>)");
  });

  it("leaves ordinary link URLs un-bracketed", () => {
    const md = htmlToMarkdown('<a href="http://x.com/page">t</a>');
    expect(md).toContain("[t](http://x.com/page)");
    expect(md).not.toContain("<http://x.com/page>");
  });

  it("sizes the table separator to the WIDEST row, not just the first", () => {
    // Old bug: columnCount came from rows[0] only, so a header narrower than a
    // body row produced too few separator columns and GFM dropped the extra
    // body cells on render.
    const md = htmlToMarkdown(
      "<table><tr><td>a</td></tr><tr><td>b</td><td>c</td></tr></table>"
    );
    // Two columns -> separator must have two --- groups.
    expect(md).toContain("| --- | --- |");
  });
});
