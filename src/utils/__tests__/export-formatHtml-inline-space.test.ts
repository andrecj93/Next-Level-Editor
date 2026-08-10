import { describe, it, expect } from "vitest";
import { formatHtml } from "../export";

/**
 * R23-3: formatHtml trimmed the children of INLINE elements, so a space that
 * sat inside a <b>/<a>/<span> was deleted outright. Selecting " world"
 * (including the leading space) and pressing Ctrl+B produces
 * `Hello<strong> world</strong>!` — after formatting it read "Helloworld!".
 *
 * Whitespace at a BLOCK edge is collapsed by HTML anyway, so trimming there is
 * what pretty-printing is for; whitespace inside an inline tag is rendered, so
 * trimming it is data loss. The Format HTML button writes its output back into
 * the live document and the model, so this corrupted the document itself, not
 * just an export.
 */
const rendered = (html: string): string => {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || "";
};

describe("formatHtml keeps whitespace inside inline tags (#R23-3)", () => {
  it("keeps a leading space inside <strong>", () => {
    const src = "<p>Hello<strong> world</strong>!</p>";
    const out = formatHtml(src);
    expect(out).toContain("<strong> world</strong>");
    expect(rendered(out)).toBe("Hello world!");
  });

  it("keeps a trailing space inside <i>", () => {
    const out = formatHtml("<p>a<i>b </i>c</p>");
    expect(rendered(out)).toBe("ab c");
  });

  it("keeps a leading space inside a link", () => {
    const out = formatHtml('<p>see<a href="#"> the docs</a>now</p>');
    expect(rendered(out)).toBe("see the docsnow");
  });

  it("keeps the space inside a highlight span", () => {
    const out = formatHtml(
      '<p>Hello<span style="background-color: rgb(255, 255, 0);"> world</span>!</p>'
    );
    expect(rendered(out)).toBe("Hello world!");
  });

  it("still collapses whitespace at a block edge, where HTML collapses it too", () => {
    // The pretty-printer's actual job — this must keep working.
    const out = formatHtml("<p>   Hello   </p>");
    expect(out).toContain("<p>Hello</p>");
  });

  it("leaves a space that was already outside the tag alone", () => {
    const out = formatHtml("<p>Hello <strong>world</strong>!</p>");
    expect(rendered(out)).toBe("Hello world!");
  });

  // R23-51: a self-closing element inside inline content always appended a
  // newline, and HTML collapses that into a rendered SPACE — so an inline
  // <img> (an emoji-style icon) between two words inserted a space that was
  // never there.
  it("does not insert a space around an inline <img> (#R23-51)", () => {
    const out = formatHtml('<p>before<img src="x">after</p>');
    expect(rendered(out)).toBe("beforeafter");
  });

  it("keeps a real <br> line break inside a paragraph (#R23-51 control)", () => {
    // The <br> TAG is the break; stripping the source newline after it must not
    // change what renders.
    const out = formatHtml("<p>a<br>b</p>");
    expect(out).toContain("<br>");
    const d = document.createElement("div");
    d.innerHTML = out;
    // Two text lines separated by the <br>.
    expect((d.querySelector("p")?.childNodes.length ?? 0)).toBeGreaterThanOrEqual(3);
  });

  it("still puts a standalone block-level <hr> on its own line", () => {
    // Control: an <hr> between paragraphs is block-level chrome — its newline
    // is fine and the pretty-printer should keep the structure readable.
    const out = formatHtml("<p>a</p><hr><p>b</p>");
    expect(out).toContain("<hr>");
    expect(out).toContain("<p>a</p>");
    expect(out).toContain("<p>b</p>");
  });
});
