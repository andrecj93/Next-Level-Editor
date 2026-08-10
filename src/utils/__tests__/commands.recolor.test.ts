import { describe, it, expect, afterEach } from "vitest";
import { applyTextColor } from "../commands";

/**
 * #9: recoloring a selection that already contains colored spans wrapped the
 * whole selection in a new color span, but the INNER spans kept their old color
 * (they win by nesting) — so the result was a mix of the new color and the old
 * inner colors instead of a uniform recolor. Nested inline colors are now
 * cleared so the new color applies to everything.
 */
const roots: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.appendChild(el);
  roots.push(el);
  return el;
};

const selectContents = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

afterEach(() => {
  for (const el of roots.splice(0)) el.remove();
  window.getSelection()?.removeAllRanges();
});

describe("applyTextColor overrides nested colors (#9)", () => {
  it("recolors uniformly even over already-colored inner spans", () => {
    const root = mount(
      '<p>foo <span style="color: rgb(255, 0, 0)">bar</span> baz</p>'
    );
    selectContents(root.querySelector("p")!);

    applyTextColor(root, "rgb(0, 0, 255)");

    // Nothing still carries the old red color.
    const stillRed = Array.from(root.querySelectorAll("*")).filter(
      (el) => (el as HTMLElement).style.color === "rgb(255, 0, 0)"
    );
    expect(stillRed).toHaveLength(0);
    // The blue color span wraps everything, including the formerly-red "bar".
    const blue = Array.from(root.querySelectorAll("span")).find(
      (s) => s.style.color === "rgb(0, 0, 255)"
    );
    expect(blue?.textContent).toContain("bar");
    expect(root.textContent).toBe("foo bar baz");
  });
});
