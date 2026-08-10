import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

const exportAsHtml = vi.fn();
const exportAsMarkdown = vi.fn();
const exportAsWord = vi.fn();
const exportAsPdf = vi.fn();

vi.mock("../../utils/export", () => ({
  exportAsHtml: (...args: unknown[]) => exportAsHtml(...args),
  exportAsMarkdown: (...args: unknown[]) => exportAsMarkdown(...args),
  exportAsWord: (...args: unknown[]) => exportAsWord(...args),
  exportAsPdf: (...args: unknown[]) => exportAsPdf(...args),
  formatHtml: (html: string) => html,
}));

const { useExportActions } = await import("../useExportActions");

/**
 * R23-15: in Preview view mode EditorPanels renders neither editable surface,
 * so `editorContent` is null and every export handler bailed at
 * `if (!editorContent.value) return;` — no file, no toast, no console message.
 * The Export dropdown is not gated by view mode and the same commands sit in
 * the Ctrl+K palette, so four menu items simply did nothing.
 *
 * The document is not missing: `htmlContent` holds it. HTML/Markdown/Word only
 * need that string. PDF genuinely needs a laid-out ELEMENT (html2canvas
 * rasterizes the live DOM), so it cannot silently succeed — but it must say so
 * instead of doing nothing.
 */
const HTML = "<p>preview mode document</p>";

let showToast: ReturnType<typeof vi.fn<(message: string, type?: "success" | "error") => void>>;

const build = () => {
  showToast = vi.fn<(message: string, type?: "success" | "error") => void>();
  return useExportActions({
    // Preview mode: no editable surface is rendered.
    editorContent: ref(null),
    htmlContent: ref(HTML),
    codeContent: ref(""),
    showToast,
    updateCodeContent: vi.fn(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exports still work in preview mode (#R23-15)", () => {
  it("exports HTML from the document string", () => {
    build().exportHtml();

    expect(exportAsHtml).toHaveBeenCalledWith(HTML);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("HTML"),
      "success"
    );
  });

  it("exports Markdown from the document string", () => {
    build().exportMarkdown();

    expect(exportAsMarkdown).toHaveBeenCalledWith(HTML);
  });

  it("exports Word from the document string", async () => {
    await build().exportWord();

    expect(exportAsWord).toHaveBeenCalledWith(HTML);
  });

  it("tells the user why PDF cannot run instead of doing nothing", async () => {
    await build().exportPdf();

    expect(exportAsPdf).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("still prefers the live surface when there is one", () => {
    const surface = document.createElement("div");
    surface.innerHTML = "<p>live surface</p>";
    const api = useExportActions({
      editorContent: ref(surface),
      htmlContent: ref(HTML),
      codeContent: ref(""),
      showToast: vi.fn(),
      updateCodeContent: vi.fn(),
    });

    api.exportHtml();

    expect(exportAsHtml).toHaveBeenCalledWith("<p>live surface</p>");
  });
});
