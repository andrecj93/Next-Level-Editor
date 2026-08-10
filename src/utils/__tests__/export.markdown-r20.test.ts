import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../export";

/**
 * r20 — four htmlToMarkdown export defects the round-20 hunt confirmed:
 *  - a bare <pre> (no nested <code>) had its content markdown-ESCAPED, injecting
 *    stray backslashes into the fenced code block;
 *  - an <img> src with spaces/parens was not angle-bracketed (the <a> path is),
 *    producing a broken Markdown image destination;
 *  - every <img> forced a "\n\n" after it, tearing an inline image (and the text
 *    after it) out of its paragraph / list item;
 *  - a paragraph starting with a block construct (1. / - / + / # / >) was not
 *    escaped, so plain prose re-rendered as a list / heading / quote.
 */
describe("htmlToMarkdown — bare <pre> content stays literal (#r20 MD-PRE)", () => {
  it("does not escape markdown characters inside a bare pre", () => {
    expect(htmlToMarkdown("<pre>const a_b = c * d; // `x`</pre>").trim()).toBe(
      "```\nconst a_b = c * d; // `x`\n```"
    );
  });

  it("still emits a clean fenced block for pre>code with a language", () => {
    const md = htmlToMarkdown(
      '<pre><code class="language-js">const a_b = 1 * 2;</code></pre>'
    ).trim();
    expect(md).toBe("```js\nconst a_b = 1 * 2;\n```");
  });

  it("keeps <br> line breaks inside a bare pre (#r21-4)", () => {
    // Confluence/Jira/Word paste a <br>-separated snippet inside a bare <pre>.
    // Taking textContent for literalness dropped every newline, exporting the
    // snippet as one unusable line.
    expect(
      htmlToMarkdown(
        "<pre>const a = 1;<br>const b = 2;<br>return a + b;</pre>"
      ).trim()
    ).toBe("```\nconst a = 1;\nconst b = 2;\nreturn a + b;\n```");
  });

  it("keeps block-per-line structure inside a bare pre (#r21-4)", () => {
    expect(
      htmlToMarkdown("<pre><div>line1</div><div>line2</div></pre>").trim()
    ).toBe("```\nline1\nline2\n```");
  });

  it("breaks the line after a block child inside a bare pre (#r22-3)", () => {
    // Typing at the end of a <pre> whose lines are <div>-wrapped (the IDE/VS
    // Code paste shape) leaves a bare text node AFTER the last div. A block
    // child ends its line as well as starting one, so chromium renders this as
    // two lines — but the walker only ever opened lines, never closed them, so
    // the trailing text was glued onto the last div: "line1trailing".
    expect(
      htmlToMarkdown("<pre><div>line1</div>trailing</pre>").trim()
    ).toBe("```\nline1\ntrailing\n```");
  });

  it("does not invent a blank line for a <br> before a block child (#r22-3)", () => {
    // Measured in chromium: <pre>a<br><div>b</div></pre> renders as TWO lines,
    // not three — the block boundary satisfies the <br>'s pending break rather
    // than adding to it. Guards against "fixing" this into a spurious blank
    // line, which would corrupt the Confluence/Jira paste shape above.
    expect(
      htmlToMarkdown("<pre>a<br><div>b</div></pre>").trim()
    ).toBe("```\na\nb\n```");
  });
});

describe("htmlToMarkdown — image destinations and inlining (#r20 MD-IMG)", () => {
  it("angle-brackets an image src with spaces", () => {
    expect(htmlToMarkdown('<img src="my photo.png" alt="Vacation">').trim()).toBe(
      "![Vacation](<my photo.png>)"
    );
  });

  it("angle-brackets an image src with parentheses", () => {
    expect(htmlToMarkdown('<img src="a(b).png" alt="x">').trim()).toBe(
      "![x](<a(b).png>)"
    );
  });

  it("keeps an inline image inside its list item (no blank-line split)", () => {
    const md = htmlToMarkdown(
      "<ul><li>see <img src='i.png' alt='x'> here</li><li>next</li></ul>"
    );
    expect(md).toContain("- see ![x](i.png) here");
    // The image must NOT tear " here" out into a stray paragraph.
    expect(md).not.toMatch(/!\[x\]\(i\.png\)\n\n/);
  });

  it("keeps an inline image inside a paragraph", () => {
    const md = htmlToMarkdown("<p>before <img src='i.png' alt='x'> after</p>");
    expect(md).toContain("before ![x](i.png) after");
  });
});

describe("htmlToMarkdown — leading block constructs are escaped (#r20 MD-LINESTART)", () => {
  it("escapes a paragraph that starts like an ordered list", () => {
    expect(htmlToMarkdown("<p>1. This is not a list</p>").trim()).toBe(
      "1\\. This is not a list"
    );
  });

  it("escapes bullets, headings and quotes at the start of a paragraph", () => {
    expect(htmlToMarkdown("<p>- not a bullet</p>").trim()).toBe(
      "\\- not a bullet"
    );
    expect(htmlToMarkdown("<p># not a heading</p>").trim()).toBe(
      "\\# not a heading"
    );
    expect(htmlToMarkdown("<p>&gt; not a quote</p>").trim()).toBe(
      "\\> not a quote"
    );
  });

  it("does NOT escape a paragraph that merely starts with bold", () => {
    // "**bold**" has no space after the first '*', so it is not a bullet.
    expect(htmlToMarkdown("<p><strong>bold</strong> lead</p>").trim()).toBe(
      "**bold** lead"
    );
  });

  it("leaves a real heading's own text untouched", () => {
    expect(htmlToMarkdown("<h2>1. Introduction</h2>").trim()).toBe(
      "## 1. Introduction"
    );
  });
});
