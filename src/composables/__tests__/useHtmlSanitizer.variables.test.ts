import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

// The template-variable pill (span.editor-variable) is special-cased in the
// sanitizer: validated + rebuilt (like the embedded-resizable container)
// instead of being stripped to a bare <span title>. These tests pin down both
// the survival of legit pills across v-model round-trips and the rejection of
// spoofed ones.
describe("useHtmlSanitizer - variable pills", () => {
  let sanitize: (input: string | null) => string;

  const parse = (html: string): HTMLElement => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host;
  };

  const LEGIT_PILL =
    '<p>Hi <span class="editor-variable" contenteditable="false" data-variable="user.name" data-value="John Doe" title="Current user full name">{{ user.name }}</span> there</p>';

  beforeEach(() => {
    sanitize = useHtmlSanitizer().sanitizeHtml;
  });

  it("keeps a legitimate pill with its full validated attribute set", () => {
    const out = parse(sanitize(LEGIT_PILL));
    const pill = out.querySelector<HTMLElement>("span.editor-variable");
    expect(pill).not.toBeNull();
    expect(pill?.getAttribute("contenteditable")).toBe("false");
    expect(pill?.getAttribute("data-variable")).toBe("user.name");
    expect(pill?.getAttribute("data-value")).toBe("John Doe");
    expect(pill?.getAttribute("title")).toBe("Current user full name");
    expect(pill?.textContent).toBe("{{ user.name }}");
  });

  it("is idempotent (round-trip stable), so the editor DOM is never rewritten mid-typing", () => {
    const once = sanitize(LEGIT_PILL);
    expect(sanitize(once)).toBe(once);
  });

  it("strips a spoofed pill down to the validated attribute set", () => {
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="user.name" onclick="alert(1)" style="position:fixed;inset:0" data-evil="x" id="boom">{{ user.name }}</span></p>'
      )
    );
    const pill = out.querySelector<HTMLElement>("span.editor-variable");
    expect(pill).not.toBeNull();
    expect(pill?.getAttribute("onclick")).toBeNull();
    expect(pill?.getAttribute("style")).toBeNull();
    expect(pill?.getAttribute("data-evil")).toBeNull();
    expect(pill?.getAttribute("id")).toBeNull();
    expect(pill?.getAttribute("data-variable")).toBe("user.name");
    expect(pill?.getAttribute("contenteditable")).toBe("false");
  });

  it("regenerates the pill text from the validated name, discarding smuggled markup", () => {
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="a"><img src="x" onerror="alert(1)">evil</span></p>'
      )
    );
    const pill = out.querySelector<HTMLElement>("span.editor-variable");
    expect(pill?.innerHTML).toBe("{{ a }}");
    expect(out.querySelector("img")).toBeNull();
  });

  it("rejects a pill whose data-variable does not match the name pattern", () => {
    const bad = [
      '<span class="editor-variable" data-variable="has space">x</span>',
      '<span class="editor-variable" data-variable="a&lt;b&gt;">x</span>',
      `<span class="editor-variable" data-variable="${"a".repeat(65)}">x</span>`,
      '<span class="editor-variable">no name at all</span>',
    ];
    for (const input of bad) {
      const out = parse(sanitize(`<p>${input}</p>`));
      // Not a pill anymore: class + data-* are stripped by the generic span
      // path, but the text content survives.
      expect(out.querySelector(".editor-variable")).toBeNull();
      expect(out.querySelector("[data-variable]")).toBeNull();
      expect(out.textContent).toContain(input.includes("no name") ? "no name" : "x");
    }
  });

  it("does not treat spans with extra classes as pills", () => {
    const out = parse(
      sanitize(
        '<p><span class="editor-variable evil" data-variable="user.name" onclick="alert(1)">x</span></p>'
      )
    );
    // Class is not exactly "editor-variable" -> generic span path.
    expect(out.querySelector(".editor-variable")).toBeNull();
    expect(out.querySelector("[onclick]")).toBeNull();
    expect(out.textContent).toContain("x");
  });

  it("accepts names with dots, hyphens and underscores at the 64-char limit", () => {
    const name = `a.b-c_${"d".repeat(58)}`;
    expect(name).toHaveLength(64);
    const out = parse(
      sanitize(
        `<p><span class="editor-variable" data-variable="${name}">{{ ${name} }}</span></p>`
      )
    );
    expect(
      out.querySelector<HTMLElement>(".editor-variable")?.getAttribute(
        "data-variable"
      )
    ).toBe(name);
  });

  it("keeps an optional data-value but tolerates its absence", () => {
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="date.year">{{ date.year }}</span></p>'
      )
    );
    const pill = out.querySelector<HTMLElement>(".editor-variable");
    expect(pill).not.toBeNull();
    expect(pill?.hasAttribute("data-value")).toBe(false);
    expect(pill?.hasAttribute("title")).toBe(false);
  });
});
