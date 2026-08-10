import { describe, it, expect } from "vitest";
import { useWritingAssistant } from "../useWritingAssistant";

/**
 * Round-14b: the writing-assistant analyzer walked ALL DOM with no filter, so
 * the inserted Table-of-Contents nav (its "Table of Contents" heading + every
 * heading duplicated as a link) and each page-break's "Page Break" label were
 * counted as authored prose — inflating word/char/reading-time/readability and
 * SEO heading structure for text the user never wrote.
 *  - #2: extractPlainText must skip .table-of-contents and .page-break.
 *  - #3: SEO heading counts must exclude headings inside the TOC.
 */
describe("writing stats ignore decorative TOC / page-break DOM", () => {
  const DECOR =
    "<h1>Intro</h1><p>Hello world.</p>" +
    '<nav class="table-of-contents"><h2>Table of Contents</h2>' +
    '<ul><li><a href="#intro">Intro</a></li></ul></nav>' +
    '<div class="page-break"><span class="page-break-label">Page Break</span>' +
    "<hr/></div>" +
    "<p>Body.</p>";
  const PLAIN = "<h1>Intro</h1><p>Hello world.</p><p>Body.</p>";

  it("word count matches the same document without the widgets (#2)", async () => {
    const wa = useWritingAssistant();
    const withDecor = await wa.analyze(DECOR);
    const withoutDecor = await wa.analyze(PLAIN);
    expect(withDecor.stats.words).toBe(withoutDecor.stats.words);
  });

  it("SEO heading structure ignores the TOC's own h2 (#3)", async () => {
    const wa = useWritingAssistant();
    const seo = wa.analyzeSEO(
      "<h1>Intro</h1><p>body text here</p>" +
        '<nav class="table-of-contents"><h2>Table of Contents</h2></nav>'
    );
    // Only the (absent) author h2s count — the TOC's own heading does not.
    expect(seo.headingStructure.h2Count).toBe(0);
    expect(seo.headingStructure.h1Count).toBe(1);
  });
});
