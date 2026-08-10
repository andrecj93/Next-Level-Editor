import { describe, it, expect } from "vitest";
import { formatHtml } from "../export";

/**
 * Regression: formatHtml pretty-printer trimmed/reindented every element,
 * including <pre>, so code-block indentation and blank lines were flattened
 * when opening Code view or exporting HTML. <pre> content is whitespace-
 * significant and must survive verbatim.
 */
describe("formatHtml — preformatted whitespace", () => {
  it("preserves leading indentation and newlines inside <pre>", () => {
    const src =
      "<pre><code>function f() {\n    return 42;\n}</code></pre>";
    const out = formatHtml(src);
    expect(out).toContain("function f() {\n    return 42;\n}");
    // The 4-space indent of the return line must still be there.
    expect(out).toContain("    return 42;");
  });

  it("does not collapse blank lines within <pre>", () => {
    const src = "<pre>line1\n\n\nline2</pre>";
    const out = formatHtml(src);
    expect(out).toContain("line1\n\n\nline2");
  });

  it("still pretty-prints normal block elements around a <pre>", () => {
    const src = "<div><p>Intro</p><pre>  kept</pre></div>";
    const out = formatHtml(src);
    expect(out).toContain("<p>Intro</p>");
    expect(out).toContain("<pre>  kept</pre>");
  });
});
