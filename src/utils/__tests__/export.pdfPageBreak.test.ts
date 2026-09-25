import { describe, it, expect } from "vitest";
import { stripPageBreakChrome } from "../export";

/**
 * #4 (part): the PDF exporter rasterizes the off-screen clone with html2canvas,
 * which does NOT honor @media print — so the on-screen page-break WIDGET (its
 * "PAGE BREAK" label and dashed band) printed into the PDF as literal chrome.
 * stripPageBreakChrome removes that widget's chrome from an export clone;
 * the PDF page planner uses the remaining zero-height break markers.
 */
describe("stripPageBreakChrome", () => {
  it("removes the page-break label and neutralises the band", () => {
    const div = document.createElement("div");
    div.innerHTML =
      "<p>above</p>" +
      '<div class="page-break"><span class="page-break-label">PAGE BREAK</span><hr class="page-break-line"></div>' +
      "<p>below</p>";

    stripPageBreakChrome(div);

    // The label chrome is gone…
    expect(div.querySelector(".page-break-label")).toBeNull();
    expect(div.querySelector('.page-break-line')).toBeNull();
    // …the band no longer draws a visible rule/background…
    const band = div.querySelector<HTMLElement>(".page-break")!;
    expect(band.style.border).toContain("none");
    expect(band.style.background).toContain("none");
    // …and the surrounding content is untouched.
    expect(div.textContent).toBe("abovebelow");
  });

  it("is a no-op when there is no page break", () => {
    const div = document.createElement("div");
    div.innerHTML = "<p>plain</p>";
    stripPageBreakChrome(div);
    expect(div.innerHTML).toBe("<p>plain</p>");
  });
});
