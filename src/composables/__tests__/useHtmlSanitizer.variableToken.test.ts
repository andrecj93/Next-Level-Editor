import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * R24-1 (round-24 audit): printed documents lost every variable value.
 *
 * The print CSS hid the "{{ token }}" text with `font-size: 0` on the pill and
 * injected attr(data-value) via ::after — but a pseudo-element inherits from
 * its ORIGINATING element, so `::after { font-size: inherit }` computed to 0px
 * and the value vanished too. Measured with the real print pipeline
 * (page.pdf()): "Contract for " with a hole where the name should be.
 *
 * The fix needs the token text inside a real child (`.variable-token`) that
 * print CSS can `display: none`, leaving the pill — and therefore ::after — at
 * the ambient font size. The sanitizer REBUILDS pill content from the
 * validated name on every round-trip, so IT must build that canonical
 * structure; anything else would flatten the wrapper on the next v-model pass
 * (the round-trip landmine).
 */
let sanitize: (html: string) => string;

const parse = (html: string): HTMLElement => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
};

beforeEach(() => {
  sanitize = useHtmlSanitizer().sanitizeHtml;
});

const LEGACY_PILL =
  '<p>Hi <span class="editor-variable" contenteditable="false" ' +
  'data-variable="user.name" data-value="John Doe">{{ user.name }}</span></p>';

describe("sanitizer builds the print-safe pill structure (#R24-1)", () => {
  it("wraps the token text of a legacy bare-text pill", () => {
    const out = parse(sanitize(LEGACY_PILL));

    const token = out.querySelector(".editor-variable .variable-token");
    expect(token, "token text must live in a .variable-token child").not.toBeNull();
    expect(token?.textContent).toBe("{{ user.name }}");
    // The visible text is unchanged — the wrapper is invisible on screen.
    expect(out.querySelector(".editor-variable")?.textContent).toBe(
      "{{ user.name }}"
    );
  });

  it("is idempotent: an already-wrapped pill round-trips byte-stable", () => {
    const once = sanitize(LEGACY_PILL);
    expect(once).toContain("variable-token");
    expect(sanitize(once)).toBe(once);
  });

  it("rebuilds a spoofed wrapper from the validated name", () => {
    // The wrapper is GENERATED, never preserved: hostile content inside the
    // pill cannot ride through in a fake .variable-token child.
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="user.name" data-value="x">' +
          '<span class="variable-token" onclick="alert(1)"><b>evil</b></span></span></p>'
      )
    );

    const pill = out.querySelector(".editor-variable")!;
    expect(pill.textContent).toBe("{{ user.name }}");
    expect(pill.querySelector("[onclick]")).toBeNull();
    expect(pill.querySelector("b")).toBeNull();
    const token = pill.querySelector(".variable-token");
    expect(token?.textContent).toBe("{{ user.name }}");
  });

  it("preserves a validated data-variable-id through the round-trip (#R25-1)", () => {
    // The id pins WHICH variable a pill means when display names collide;
    // print/export refreshes resolve by it. Losing it on the v-model
    // round-trip would resurrect the first-by-name clobber.
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="email" ' +
          'data-variable-id="company.email" data-value="b@x">{{ email }}</span></p>'
      )
    );

    const pill = out.querySelector<HTMLElement>(".editor-variable");
    expect(pill?.getAttribute("data-variable-id")).toBe("company.email");
  });

  it("drops a spoofed data-variable-id that fails the name pattern", () => {
    const out = parse(
      sanitize(
        '<p><span class="editor-variable" data-variable="email" ' +
          'data-variable-id="x&quot;&gt;&lt;img onerror=1&gt;" data-value="v">{{ email }}</span></p>'
      )
    );

    const pill = out.querySelector<HTMLElement>(".editor-variable");
    expect(pill).not.toBeNull();
    expect(pill?.getAttribute("data-variable-id")).toBeNull();
  });

  it("a stray .variable-token OUTSIDE a pill is stripped like any other span", () => {
    const out = parse(
      sanitize('<p><span class="variable-token">not a pill</span></p>')
    );

    expect(out.querySelector(".variable-token")).toBeNull();
    expect(out.textContent).toContain("not a pill");
  });
});
