import { describe, it, expect } from "vitest";
import { substituteVariableValues, htmlToMarkdown, formatHtml } from "../export";

/**
 * R23-64: the variables feature exists to template a document, and README.md
 * promises "Print-ready — Variables automatically replaced with values when
 * printing". Ctrl+P honours that (the print CSS swaps in attr(data-value)), but
 * every EXPORT did not: Export PDF rasterized the live screen DOM, so the PDF
 * showed a blue pill reading `{{ user.name }}`, and Word/HTML/Markdown
 * serialized the pill's text node verbatim.
 *
 * An export produces a FINAL document, exactly like printing does, so the same
 * substitution applies. Anything else means one user intent with two different
 * results depending on which button was pressed.
 */
const PILL =
  '<span class="editor-variable" contenteditable="false" ' +
  'data-variable="user.name" data-value="Jane Smith" title="User name">' +
  "{{ user.name }}</span>";

const DOC = `<p>Hello ${PILL}, welcome.</p>`;

describe("exports substitute variable values (#R23-64)", () => {
  it("replaces a pill with its resolved value", () => {
    const out = substituteVariableValues(DOC);

    expect(out).toContain("Jane Smith");
    expect(out).not.toContain("{{ user.name }}");
    // The pill chrome goes with it — it is meaningless outside the editor.
    expect(out).not.toContain("editor-variable");
  });

  it("keeps the surrounding prose intact", () => {
    const out = substituteVariableValues(DOC);

    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.textContent).toBe("Hello Jane Smith, welcome.");
  });

  it("flows through the Markdown export", () => {
    const md = htmlToMarkdown(substituteVariableValues(DOC));

    expect(md).toContain("Jane Smith");
    expect(md).not.toContain("{{");
  });

  it("flows through the pretty-printed HTML export", () => {
    const html = formatHtml(substituteVariableValues(DOC));

    expect(html).toContain("Jane Smith");
    expect(html).not.toContain("editor-variable");
  });

  it("leaves a pill with no resolved value as its literal token", () => {
    // Defensive: an unresolved variable must not silently become an empty gap —
    // the token is more useful than nothing.
    const unresolved =
      '<p><span class="editor-variable" data-variable="x.y">{{ x.y }}</span></p>';
    const out = substituteVariableValues(unresolved);

    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.textContent).toBe("{{ x.y }}");
  });

  it("does not disturb a document with no variables", () => {
    const plain = "<p>Just <strong>prose</strong> here.</p>";
    const out = substituteVariableValues(plain);

    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.textContent).toBe("Just prose here.");
    expect(out).toContain("<strong>");
  });
});
