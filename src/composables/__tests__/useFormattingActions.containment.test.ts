import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, type Ref } from "vue";
import { useFormattingActions } from "../useFormattingActions";
import { pasteFormat } from "../../utils/formatPainter";

vi.mock("../../utils/formatPainter", () => ({
  copyFormat: vi.fn(),
  pasteFormat: vi.fn(),
}));

type FontSize = "small" | "normal" | "large" | "huge";
type TextAlignment = "left" | "center" | "right" | "justify";

/**
 * Alignment and Font Size read the LIVE selection with no containment check.
 * With the user's selection sitting OUTSIDE the editor (host-page text, a
 * modal input, the toolbar itself), clicking Align/Size mutated the host
 * page's DOM — applyFontSize wrapped arbitrary out-of-editor nodes in styled
 * spans. When a selection restorer (performWithSelection) is wired, these
 * handlers must route through it like the color handlers already do; without
 * one they must NO-OP rather than touch foreign DOM.
 */
describe("useFormattingActions: out-of-editor selection containment", () => {
  let editorContent: Ref<HTMLElement | null>;
  let editorElement: HTMLElement;
  let outside: HTMLParagraphElement;
  let fontSize: Ref<FontSize>;
  const captureSnapshot = vi.fn();
  const applyTextAlignment = vi.fn();
  const applyTextColor = vi.fn();
  const applyBackgroundColor = vi.fn();
  const applyFontSize = vi.fn();

  const build = (performWithSelection?: (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => void) =>
    useFormattingActions(
      editorContent,
      fontSize,
      captureSnapshot,
      applyTextAlignment as (root: HTMLElement, a: TextAlignment) => void,
      applyTextColor,
      applyBackgroundColor,
      applyFontSize as (root: HTMLElement, s: FontSize) => void,
      performWithSelection
    );

  const selectOutside = () => {
    const range = document.createRange();
    range.selectNodeContents(outside.firstChild!);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const selectInside = () => {
    const range = document.createRange();
    range.selectNodeContents(editorElement.querySelector("p")!.firstChild!);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>inside text</p>";
    document.body.appendChild(editorElement);
    outside = document.createElement("p");
    outside.textContent = "host page text";
    document.body.appendChild(outside);
    editorContent = ref<HTMLElement | null>(editorElement);
    fontSize = ref<FontSize>("normal");
  });

  afterEach(() => {
    editorElement.remove();
    outside.remove();
    window.getSelection()?.removeAllRanges();
    vi.clearAllMocks();
  });

  it("routes Font Size through the selection restorer when the live selection is foreign", () => {
    const performWithSelection = vi.fn(
      (action: (root: HTMLElement) => void, after?: () => void) => {
        action(editorElement);
        after?.();
      }
    );
    const { handleFontSize } = build(performWithSelection);

    selectOutside();
    handleFontSize("large");

    expect(performWithSelection).toHaveBeenCalled();
    expect(applyFontSize).toHaveBeenCalledWith(editorElement, "large");
    expect(captureSnapshot).toHaveBeenCalled();
  });

  it("no-ops Font Size on a foreign selection without a restorer", () => {
    const { handleFontSize } = build(undefined);
    selectOutside();
    handleFontSize("huge");
    expect(applyFontSize).not.toHaveBeenCalled();
  });

  it("routes Alignment through the restorer on a foreign selection", () => {
    const performWithSelection = vi.fn(
      (action: (root: HTMLElement) => void, after?: () => void) => {
        action(editorElement);
        after?.();
      }
    );
    const { handleTextAlignment } = build(performWithSelection);

    selectOutside();
    handleTextAlignment("center");

    expect(performWithSelection).toHaveBeenCalled();
    expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "center");
  });

  it("no-ops Alignment on a foreign selection without a restorer", () => {
    const { handleTextAlignment } = build(undefined);
    selectOutside();
    handleTextAlignment("right");
    expect(applyTextAlignment).not.toHaveBeenCalled();
  });

  it("no-ops Paste Format when the selection is OUTSIDE the editor (#8)", () => {
    const { handlePasteFormat } = build(undefined);
    selectOutside();
    handlePasteFormat();
    // Must never paint styled spans into the host page's DOM.
    expect(pasteFormat).not.toHaveBeenCalled();
  });

  it("applies Paste Format when the selection is inside the editor", () => {
    const { handlePasteFormat } = build(undefined);
    selectInside();
    handlePasteFormat();
    expect(pasteFormat).toHaveBeenCalled();
  });

  it("still applies directly when the selection IS inside the editor", () => {
    const { handleFontSize, handleTextAlignment } = build(undefined);
    selectInside();
    handleFontSize("small");
    handleTextAlignment("justify");
    expect(applyFontSize).toHaveBeenCalledWith(editorElement, "small");
    expect(applyTextAlignment).toHaveBeenCalledWith(editorElement, "justify");
  });
});
