import { describe, it, expect, afterEach } from "vitest";
import {
  generateTableOfContents,
  updateTableOfContents,
} from "../pageManagement";

/**
 * generateTableOfContents grabs every h1-h6 in the editor — including the TOC
 * nav's OWN "<h2>Table of Contents</h2>" heading. So once a TOC exists,
 * regenerating or updating it listed "Table of Contents" as its first entry
 * (a link to itself), and each update re-added it. Headings inside the TOC nav
 * must be excluded.
 */
let host: HTMLDivElement | null = null;

const mount = (html: string): HTMLDivElement => {
  host = document.createElement("div");
  host.className = "next-level-editor";
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
};

afterEach(() => {
  host?.remove();
  host = null;
});

describe("TOC never lists itself", () => {
  it("excludes the TOC nav's own heading from the entries", () => {
    const editor = mount(
      '<nav class="table-of-contents"><h2>Table of Contents</h2>' +
        '<ul><li><a href="#heading-0-intro">Intro</a></li></ul></nav>' +
        "<h2>Intro</h2><h2>Details</h2>"
    );

    const items = generateTableOfContents(editor);
    expect(items.map((i) => i.text)).toEqual(["Intro", "Details"]);
    expect(items.some((i) => i.text === "Table of Contents")).toBe(false);
  });

  it("updateTableOfContents does not accumulate a self-entry", () => {
    const editor = mount(
      '<nav class="table-of-contents"><h2>Table of Contents</h2>' +
        '<ul><li><a href="#heading-0-a">A</a></li></ul></nav>' +
        "<h2>A</h2><h2>B</h2>"
    );

    updateTableOfContents(editor);
    updateTableOfContents(editor);

    const links = editor.querySelectorAll(".table-of-contents li");
    expect(Array.from(links).map((l) => l.textContent)).toEqual(["A", "B"]);
  });
});
