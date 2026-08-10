import { describe, it, expect, afterEach } from "vitest";
import { insertPageBreak } from "../pageManagement";

/**
 * insertPageBreak walks UP from the caret looking for a UL/OL to insert after,
 * but the walk climbed all the way to the document — so an editor embedded
 * inside a host-page list found the HOST's <ul> and inserted the page break
 * OUTSIDE the editor, mutating the host page. The list search must stop at the
 * editor root.
 */
let hostList: HTMLUListElement | null = null;

afterEach(() => {
  hostList?.remove();
  hostList = null;
  window.getSelection()?.removeAllRanges();
});

describe("insertPageBreak stays within the editor root", () => {
  it("does not escape into a host-page list ancestor", () => {
    // The editor lives inside a host-page <ul><li> — a realistic embed.
    hostList = document.createElement("ul");
    const li = document.createElement("li");
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.className = "editor-content";
    editor.innerHTML = "<p>caret here</p>";
    li.appendChild(editor);
    hostList.appendChild(li);
    document.body.appendChild(hostList);

    const p = editor.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    insertPageBreak(sel, editor);

    // The page break landed INSIDE the editor…
    expect(editor.querySelector(".page-break")).not.toBeNull();
    // …and NOT outside it (no page break is a child of the host list or its
    // parent — it never escaped the editor root).
    const escaped = Array.from(
      document.querySelectorAll(".page-break")
    ).some((pb) => !editor.contains(pb));
    expect(escaped).toBe(false);
    expect(hostList.nextElementSibling?.className ?? "").not.toContain(
      "page-break"
    );
  });
});
