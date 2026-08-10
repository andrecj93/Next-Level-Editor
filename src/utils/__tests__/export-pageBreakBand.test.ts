import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripPageBreakChrome } from "../export";

/**
 * R23-50: stripPageBreakChrome exists because html2canvas rasterizes the live
 * DOM and cannot honour @media print, so the PDF path has to collapse the
 * on-screen page-break widget by hand. It set inline height/margin/padding/
 * border/background — but NOT min-height, and the stylesheet pins
 * `.editor-content .page-break { min-height: 60px }`. Inline styles only win for
 * the properties they actually set, so a 60px blank band survived into the PDF.
 *
 * Measured in chromium against the shipped stylesheet:
 *   as rendered 96px -> after the old strip 60px -> with min-height:0 0px.
 *
 * The @media print block is the authoritative statement of intent here, and it
 * lists exactly height/min-height/margin/padding/border/background plus hiding
 * the label. The two paths must agree, so this asserts that parity rather than
 * inventing a second opinion.
 */
afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * Assert SEMANTICS, not serialization: happy-dom keeps "0" where a browser
 * normalises to "0px", and expands `border`/`background` shorthands to
 * "none none". The claim under test is "this is zeroed", not how the engine
 * spells it.
 */
const isZero = (value: string): boolean =>
  value !== "" && Number.parseFloat(value) === 0;

const buildBand = (): HTMLElement => {
  const container = document.createElement("div");
  container.className = "editor-content";
  container.innerHTML =
    '<p>before</p><div class="page-break" contenteditable="false">' +
    '<span class="page-break-label">Page Break</span>' +
    '<hr class="page-break-line"></div><p>after</p>';
  document.body.appendChild(container);
  return container;
};

describe("stripPageBreakChrome collapses the band completely (#R23-50)", () => {
  it("zeroes min-height, not just height", () => {
    const container = buildBand();

    stripPageBreakChrome(container);

    const band = container.querySelector<HTMLElement>(".page-break")!;
    expect(isZero(band.style.height)).toBe(true);
    // The one the stylesheet would otherwise win: 60px of blank paper.
    expect(isZero(band.style.minHeight), "min-height must be zeroed too").toBe(
      true
    );
  });

  it("mirrors every property the print rule neutralises", () => {
    const container = buildBand();

    stripPageBreakChrome(container);

    const band = container.querySelector<HTMLElement>(".page-break")!;
    expect(isZero(band.style.margin)).toBe(true);
    expect(isZero(band.style.padding)).toBe(true);
    expect(band.style.border).toContain("none");
    expect(band.style.background).toContain("none");
    // The label is what the print rule hides; here it is removed outright.
    expect(container.querySelector(".page-break-label")).toBeNull();
  });

  it("the print rule it mirrors really does zero min-height", () => {
    // Guard the parity from the other side: if the print rule ever changes, the
    // PDF path should be revisited with it.
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/NextLevelEditor.css"),
      "utf-8"
    );
    const printBlock = css.slice(css.indexOf("@media print"));
    const rule = printBlock.match(
      /\.editor-content \.page-break\s*\{([^}]*)\}/
    );
    expect(rule, "print rule for .page-break should exist").toBeTruthy();
    expect(rule![1]).toMatch(/min-height:\s*0\s*!important/);
  });
});
