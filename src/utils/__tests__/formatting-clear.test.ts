import { describe, it, expect, beforeEach } from "vitest";
import { clearFormatting } from "../formatting";

/**
 * Regression: clearFormatting flattened a multi-block selection to a single
 * text node (range.toString + deleteContents + insert), merging separate
 * paragraphs into one line. It must strip inline formatting while preserving
 * block structure.
 */
describe("clearFormatting — preserves block structure", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    document.body.appendChild(root);
  });

  const selectAll = () => {
    const range = document.createRange();
    range.selectNodeContents(root);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  it("keeps separate paragraphs separate when clearing across blocks", () => {
    root.innerHTML =
      "<p>He<strong>ll</strong>o</p><p>Wo<em>rl</em>d</p>";
    selectAll();
    clearFormatting(root);

    // Two paragraphs remain (NOT merged into one line), formatting gone.
    const paras = root.querySelectorAll("p");
    expect(paras.length).toBe(2);
    expect(paras[0].textContent).toBe("Hello");
    expect(paras[1].textContent).toBe("World");
    expect(root.querySelector("strong")).toBeNull();
    expect(root.querySelector("em")).toBeNull();
  });

  it("removes inline formatting within a single block", () => {
    root.innerHTML =
      '<p>a <strong>bold</strong> and <span style="color:red">red</span> word</p>';
    selectAll();
    clearFormatting(root);

    expect(root.querySelector("strong")).toBeNull();
    expect(root.querySelector("span")).toBeNull();
    expect(root.querySelector("p")!.textContent).toBe("a bold and red word");
  });

  it("preserves links and inline code", () => {
    root.innerHTML =
      '<p><a href="https://x.com"><strong>link</strong></a> and <code>x=1</code></p>';
    selectAll();
    clearFormatting(root);

    // The <a> and <code> survive; the <strong> inside the link is stripped.
    const link = root.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("https://x.com");
    expect(link!.textContent).toBe("link");
    expect(link!.querySelector("strong")).toBeNull();
    expect(root.querySelector("code")).not.toBeNull();
  });

  it("does nothing for a collapsed selection", () => {
    root.innerHTML = "<p>Hi <strong>there</strong></p>";
    const range = document.createRange();
    range.setStart(root.querySelector("strong")!.firstChild!, 1);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    clearFormatting(root);
    // Untouched.
    expect(root.querySelector("strong")).not.toBeNull();
  });
});
