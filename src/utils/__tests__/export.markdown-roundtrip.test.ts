import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../export";

/**
 * Round-13 Markdown export fidelity (export.ts htmlToMarkdown):
 *  - #8  code-block language dropped from the fence
 *  - #9  checklist checked state destroyed (no GFM task-list syntax)
 *  - #10 Markdown special characters in text nodes never escaped (prose mangles)
 *  - #16 colspan cells shift later cells into the wrong columns
 *  - #23 a nested image's trailing blank lines break the emitted Markdown link
 */

describe("htmlToMarkdown code-block language (#8)", () => {
  it("keeps the language on the fence", () => {
    const md = htmlToMarkdown(
      '<pre><code class="language-python">print("hi")</code></pre>'
    );
    expect(md).toContain("```python\n");
    expect(md).toContain('print("hi")');
  });

  it("emits a bare fence when no language class is present", () => {
    const md = htmlToMarkdown("<pre><code>plain</code></pre>");
    expect(md).toContain("```\nplain\n```");
  });
});

describe("htmlToMarkdown checklist task-list (#9)", () => {
  it("emits GFM - [x] / - [ ] from data-checked", () => {
    const md = htmlToMarkdown(
      '<ul class="checklist">' +
        '<li data-checked="true">ship it</li>' +
        '<li data-checked="false">write tests</li>' +
        "</ul>"
    );
    expect(md).toContain("- [x] ship it");
    expect(md).toContain("- [ ] write tests");
  });

  it("leaves a plain bulleted list unchanged", () => {
    const md = htmlToMarkdown("<ul><li>one</li><li>two</li></ul>");
    expect(md).toContain("- one");
    expect(md).toContain("- two");
    expect(md).not.toContain("[ ]");
  });
});

describe("htmlToMarkdown escapes special characters in prose (#10)", () => {
  it("escapes underscores and backticks in text so prose does not re-render", () => {
    const md = htmlToMarkdown("<p>Open file_name_here and press `key`</p>");
    expect(md).toContain("file\\_name\\_here");
    expect(md).toContain("\\`key\\`");
  });

  it("does NOT escape inside inline code", () => {
    // Code spans are literal; escaping their content would corrupt the code.
    expect(htmlToMarkdown("<code>a_b</code>")).toBe("`a_b`");
  });

  it("leaves ordinary prose untouched", () => {
    expect(htmlToMarkdown("<p>Hello world</p>")).toBe("Hello world");
  });
});

describe("htmlToMarkdown colspan alignment (#16)", () => {
  it("expands a colspan cell so later cells keep their column", () => {
    const md = htmlToMarkdown(
      "<table>" +
        "<tr><th>A</th><th>B</th><th>C</th></tr>" +
        '<tr><td colspan="2">X</td><td>Y</td></tr>' +
        "</table>"
    );
    const dataRow = md.split("\n").find((l) => l.includes("X"));
    // Y must land under column C (3 cells), not column B (the old 2-cell bug).
    expect(dataRow).toBe("| X |  | Y |");
  });
});

describe("htmlToMarkdown link with nested image (#23)", () => {
  it("does not let the image's blank lines break the link", () => {
    const md = htmlToMarkdown(
      '<a href="https://x.com"><img src="logo.png" alt="logo"></a>'
    );
    expect(md).toBe("[![logo](logo.png)](https://x.com)");
  });
});
