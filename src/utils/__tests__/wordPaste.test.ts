import { describe, it, expect } from "vitest";
import { reconstructWordLists } from "../wordPaste";

/**
 * #11: pasting a Word/Google-Docs bulleted or numbered list dropped in as a run
 * of styled <p mso-list> paragraphs whose bullet/number lived in a
 * <span mso-list:Ignore>. The sanitizer stripped the styles, so the user got
 * flat paragraphs with literal bullet glyphs. reconstructWordLists rebuilds a
 * real <ul>/<ol> BEFORE sanitization.
 */
const text = (html: string) => {
  const d = document.createElement("div");
  d.innerHTML = html;
  return Array.from(d.querySelectorAll("li")).map((li) =>
    (li.textContent || "").trim()
  );
};

describe("reconstructWordLists", () => {
  it("rebuilds a Word bulleted list into a <ul>", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;</span></span>First</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;</span></span>Second</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.querySelector("ul")).not.toBeNull();
    expect(d.querySelector("ol")).toBeNull();
    expect(d.querySelectorAll("li")).toHaveLength(2);
    expect(text(out)).toEqual(["First", "Second"]);
    // No Word list paragraphs remain.
    expect(out).not.toMatch(/mso-list\s*:\s*l\d/i);
  });

  it("rebuilds a Word numbered list into an <ol>", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>1.<span>&nbsp;</span></span>One</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>2.<span>&nbsp;</span></span>Two</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.querySelector("ol")).not.toBeNull();
    expect(d.querySelector("ul")).toBeNull();
    expect(text(out)).toEqual(["One", "Two"]);
  });

  it("tolerates whitespace text nodes between the list paragraphs", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>A</p>\n" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>B</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    // A single list, not two.
    expect(d.querySelectorAll("ul")).toHaveLength(1);
    expect(text(out)).toEqual(["A", "B"]);
  });

  it("leaves ordinary content untouched", () => {
    const html = "<p>Just a paragraph</p><ul><li>real</li></ul>";
    expect(reconstructWordLists(html)).toBe(html);
  });

  // Round-15 follow-ups:
  it("reconstructs NESTING from Word levelN styles (#r15-10)", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>A</p>" +
      "<p style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>·</span>B</p>" +
      "<p style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>·</span>C</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>D</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    // One root list, A and D at the top, B/C nested under A.
    const roots = d.querySelectorAll(":scope > ul");
    expect(roots).toHaveLength(1);
    const top = Array.from(roots[0].querySelectorAll(":scope > li")).map(
      (li) => (li.firstChild?.textContent ?? "").trim()
    );
    expect(top).toEqual(["A", "D"]);
    const nested = roots[0].querySelector(":scope > li > ul");
    expect(nested).not.toBeNull();
    expect(text(nested!.outerHTML)).toEqual(["B", "C"]);
  });

  it("splits a mixed run when the marker kind changes (#r15-26)", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>A</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>B</p>" +
      "<p style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>1.</span>One</p>" +
      "<p style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>2.</span>Two</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    expect(
      Array.from(d.querySelector("ul")!.querySelectorAll("li")).map(
        (li) => li.textContent
      )
    ).toEqual(["A", "B"]);
    expect(
      Array.from(d.querySelector("ol")!.querySelectorAll("li")).map(
        (li) => li.textContent
      )
    ).toEqual(["One", "Two"]);
  });

  it("classifies roman/alpha markers as ordered (#r15-27)", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>iv.</span>Four</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>v.</span>Five</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.querySelector("ol")).not.toBeNull();
    expect(d.querySelector("ul")).toBeNull();
  });

  it("converts lists nested inside a table cell (#r15-11)", () => {
    const html =
      "<table><tbody><tr><td>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>In cell 1</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>In cell 2</p>" +
      "</td></tr></tbody></table>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    const cellList = d.querySelector("td ul");
    expect(cellList).not.toBeNull();
    expect(text(out)).toEqual(["In cell 1", "In cell 2"]);
    expect(out).not.toMatch(/mso-list\s*:\s*l\d/i);
  });

  it("does not merge separate lists across a non-list paragraph", () => {
    const html =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>A</p>" +
      "<p>divider</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>B</p>";
    const out = reconstructWordLists(html);
    const d = document.createElement("div");
    d.innerHTML = out;
    expect(d.querySelectorAll("ul")).toHaveLength(2);
  });
});
