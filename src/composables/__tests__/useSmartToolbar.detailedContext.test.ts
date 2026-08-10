import { describe, it, expect, afterEach } from "vitest";
import { useSmartToolbar } from "../useSmartToolbar";

/**
 * getDetailedContext() hardcoded getCursorContext(null), so cursorContext was
 * always "empty" no matter where the caret sat. It now resolves against the
 * editor retained by the most recent updateContext().
 */
let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
  window.getSelection()?.removeAllRanges();
});

const caretIn = (el: Element) => {
  const range = document.createRange();
  range.selectNodeContents(el.firstChild ?? el);
  range.collapse(false);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

describe("useSmartToolbar getDetailedContext resolves the live caret", () => {
  it("no longer reports cursorContext:'empty' for a caret in a heading", () => {
    host = document.createElement("div");
    host.innerHTML = "<h2>Title</h2>";
    document.body.appendChild(host);

    const st = useSmartToolbar();
    caretIn(host.querySelector("h2")!);
    st.updateContext(host);

    const detailed = st.getDetailedContext();
    // The exact context label is detectMultipleContexts's business; the fix is
    // that it is NOT the hardcoded "empty" any more.
    expect(detailed.cursorContext).not.toBe("empty");
    expect(detailed.primaryContext).toBe("heading");
  });

  it("reports empty when the editor is genuinely empty", () => {
    host = document.createElement("div");
    host.innerHTML = "";
    document.body.appendChild(host);

    const st = useSmartToolbar();
    st.updateContext(host);
    expect(st.getDetailedContext().cursorContext).toBe("empty");
  });
});
