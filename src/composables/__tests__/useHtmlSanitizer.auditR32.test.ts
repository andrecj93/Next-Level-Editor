import { describe, it, expect, beforeEach } from "vitest";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * Findings from the independent adversarial security audit (2026-08-05), which
 * drove the sanitizer with real Chromium and live execution hooks. It could
 * NOT produce script execution — the classic and modern XSS/mXSS corpus is
 * held. What it found instead were the two axes the allowlists never modelled.
 */
describe("sanitizer — adversarial audit findings (R32)", () => {
  let sanitize: (html: string) => string;

  beforeEach(() => {
    sanitize = useHtmlSanitizer().sanitizeHtml;
  });

  describe("R32-4 — a surviving iframe must not carry raw fallback text", () => {
    const SAFE_SRC = "https://www.youtube.com/embed/aaaaaaaaaaa";

    it("drops RAWTEXT children instead of round-tripping them verbatim", () => {
      const out = sanitize(
        `<div class="embedded-resizable-container" data-type="embed" ` +
          `data-width="640" data-height="360">` +
          `<iframe src="${SAFE_SRC}">` +
          `<img src=x onerror=alert(1)><script>alert(2)</script>` +
          `</iframe></div>`
      );

      // Browsers never execute iframe fallback content, but a sanitizer whose
      // OUTPUT still contains these substrings is unsafe for any downstream
      // consumer that is not a spec-compliant HTML parser.
      expect(out).not.toContain("<script");
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("<img");
      // The player itself survives.
      expect(out).toContain(SAFE_SRC);
    });

    it("still removes an iframe whose src is not allowlisted (control)", () => {
      const out = sanitize(
        '<div class="embedded-resizable-container" data-type="embed" ' +
          'data-width="640" data-height="360">' +
          '<iframe src="https://evil.example/x"><script>alert(1)</script></iframe></div>'
      );
      expect(out).not.toContain("evil.example");
      expect(out).not.toContain("<script");
    });
  });

  describe("R32-5 — style values cannot build a clickjacking overlay", () => {
    it("refuses the measured padding-overlay payload", () => {
      // Measured in real Chromium: this painted a 659x1238px hit-testable
      // rectangle starting 532px ABOVE its own container, covering 39% of the
      // viewport, and elementFromPoint over a host button returned this span.
      const out = sanitize(
        '<p><a href="https://evil.example/phish">' +
          '<span style="padding: 600px; background-color: rgb(0,128,255)">Sign in</span>' +
          "</a></p>"
      );

      expect(out).not.toContain("600px");
      expect(out).toContain("Sign in");
    });

    it("refuses negative margins, the horizontal half of the same trick", () => {
      const out = sanitize(
        '<p><span style="margin-left: -400px">pull</span></p>'
      );
      expect(out).not.toContain("-400px");
    });

    it("refuses oversized values in any unit", () => {
      for (const value of ["9999px", "500em", "300rem", "50in", "400vw"]) {
        const out = sanitize(`<p><span style="padding: ${value}">x</span></p>`);
        expect(out, `${value} survived`).not.toContain(value);
      }
    });

    it("keeps the sizes real content actually uses (controls)", () => {
      const keeps = [
        ['<p style="text-align: center">c</p>', "center"],
        ['<img src="/a.png" style="width: 100%; height: 100%" />', "100%"],
        ['<li style="margin-left: 20px">indent</li>', "20px"],
        ['<span style="font-size: 24px">big</span>', "24px"],
        ['<span style="padding: 2px 6px; border-radius: 4px">pill</span>', "2px 6px"],
      ] as const;
      for (const [html, expected] of keeps) {
        expect(sanitize(html), `${expected} was dropped`).toContain(expected);
      }
    });

    it("leaves keyword and colour values alone", () => {
      const out = sanitize(
        '<p><span style="color: rgb(10, 20, 30); background-color: #ff0000">t</span></p>'
      );
      expect(out).toContain("rgb(10, 20, 30)");
      expect(out).toContain("#ff0000");
    });
  });

  describe("R32-6 — checklist normalization is idempotent", () => {
    it("stamps a loose-text item the same way on the first pass as the second", () => {
      const once = sanitize(
        '<ul class="checklist">loose text<li>x</li></ul>'
      );
      const twice = sanitize(once);

      // An unstable normalization makes the editor's
      // sanitizeHtml(current) === sanitizeHtml(next) guard misfire, which
      // rewrites innerHTML and destroys the caret mid-typing.
      expect(twice).toBe(once);
      // And the rescued item must be announced like every other one.
      expect(once).toContain('role="checkbox"');
    });
  });

  describe("R32-7 — data: attachment types", () => {
    it("closes the text/htmlx lookahead gap", () => {
      const out = sanitize(
        '<div class="embedded-resizable-container" data-type="file" ' +
          'data-src="data:text/htmlx;base64,PHNjcmlwdD4=" ' +
          'data-width="300" data-height="200"></div>'
      );
      expect(out).not.toContain("text/htmlx");
    });

    it("refuses scriptable markup types that are not images or plain text", () => {
      for (const type of ["text/xml", "text/xsl", "image/svg+xml"]) {
        const out = sanitize(
          '<div class="embedded-resizable-container" data-type="file" ' +
            `data-src="data:${type};base64,PHN2Zz4=" ` +
            'data-width="300" data-height="200"></div>'
        );
        expect(out, `${type} survived`).not.toContain(type);
      }
    });

    it("still keeps the attachment types the File Manager uploads (control)", () => {
      for (const type of ["application/pdf", "text/plain", "text/csv"]) {
        const out = sanitize(
          '<div class="embedded-resizable-container" data-type="file" ' +
            `data-src="data:${type};base64,QQ==" ` +
            'data-width="300" data-height="200"></div>'
        );
        expect(out, `${type} was dropped`).toContain(type);
      }
    });
  });
});
