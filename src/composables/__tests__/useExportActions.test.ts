import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useExportActions } from "../useExportActions";
import * as exportUtils from "../../utils/export";

vi.mock("../../utils/export", () => ({
  exportAsHtml: vi.fn(),
  exportAsMarkdown: vi.fn(),
  exportAsPdf: vi.fn(() => Promise.resolve()),
  exportAsWord: vi.fn(() => Promise.resolve()),
  formatHtml: vi.fn((content: string) => content.trim()),
}));

describe("useExportActions", () => {
  let editorElement: HTMLElement;
  let mockShowToast: () => void;
  let mockUpdateCodeContent: () => void;
  let mockCaptureSnapshot: () => void;

  beforeEach(() => {
    editorElement = document.createElement("div");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    mockShowToast = vi.fn();
    mockUpdateCodeContent = vi.fn();
    mockCaptureSnapshot = vi.fn();

    vi.clearAllMocks();
  });

  describe("exportHtml", () => {
    it("should export content as HTML", () => {
      const { exportHtml } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportHtml();

      expect(exportUtils.exportAsHtml).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as HTML! Check your Downloads folder",
        "success"
      );
    });

    it("should not export when editorContent is null", () => {
      const { exportHtml } = useExportActions({
        editorContent: ref(null),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportHtml();

      expect(exportUtils.exportAsHtml).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should handle export errors", () => {
      vi.mocked(exportUtils.exportAsHtml).mockImplementation(() => {
        throw new Error("Export failed");
      });

      const { exportHtml } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportHtml();

      expect(mockShowToast).toHaveBeenCalledWith(
        "✗ Failed to export as HTML",
        "error"
      );
    });

    it("should be accessible via handleExportHtml alias", () => {
      vi.mocked(exportUtils.exportAsHtml)
        .mockClear()
        .mockImplementation(() => {});

      const { handleExportHtml } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      handleExportHtml();

      expect(exportUtils.exportAsHtml).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as HTML! Check your Downloads folder",
        "success"
      );
    });
  });

  describe("exportMarkdown", () => {
    it("should export content as Markdown", () => {
      const { exportMarkdown } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportMarkdown();

      expect(exportUtils.exportAsMarkdown).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as Markdown! Check your Downloads folder",
        "success"
      );
    });

    it("should not export when editorContent is null", () => {
      const { exportMarkdown } = useExportActions({
        editorContent: ref(null),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportMarkdown();

      expect(exportUtils.exportAsMarkdown).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should handle export errors", () => {
      vi.mocked(exportUtils.exportAsMarkdown).mockImplementation(() => {
        throw new Error("Export failed");
      });

      const { exportMarkdown } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportMarkdown();

      expect(mockShowToast).toHaveBeenCalledWith(
        "✗ Failed to export as Markdown",
        "error"
      );
    });

    it("should be accessible via handleExportMarkdown alias", () => {
      vi.mocked(exportUtils.exportAsMarkdown)
        .mockClear()
        .mockImplementation(() => {});

      const { handleExportMarkdown } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      handleExportMarkdown();

      expect(exportUtils.exportAsMarkdown).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as Markdown! Check your Downloads folder",
        "success"
      );
    });
  });

  describe("exportPdf", () => {
    it("should export content as PDF", async () => {
      const { exportPdf } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportPdf();

      expect(exportUtils.exportAsPdf).toHaveBeenCalledWith(editorElement);
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as PDF! Check your Downloads folder",
        "success"
      );
    });

    it("should not export when editorContent is null", async () => {
      const { exportPdf } = useExportActions({
        editorContent: ref(null),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportPdf();

      expect(exportUtils.exportAsPdf).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should handle export errors", async () => {
      vi.mocked(exportUtils.exportAsPdf).mockRejectedValue(
        new Error("PDF generation failed")
      );

      const { exportPdf } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportPdf();

      expect(mockShowToast).toHaveBeenCalledWith(
        "✗ Failed to export as PDF",
        "error"
      );
    });

    it("should be accessible via handleExportPdf alias", async () => {
      vi.mocked(exportUtils.exportAsPdf)
        .mockClear()
        .mockResolvedValue(undefined);

      const { handleExportPdf } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await handleExportPdf();

      expect(exportUtils.exportAsPdf).toHaveBeenCalledWith(editorElement);
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as PDF! Check your Downloads folder",
        "success"
      );
    });
  });

  describe("exportWord", () => {
    it("should export content as Word document", async () => {
      const { exportWord } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportWord();

      expect(exportUtils.exportAsWord).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as Word! Check your Downloads folder",
        "success"
      );
    });

    it("should not export when editorContent is null", async () => {
      const { exportWord } = useExportActions({
        editorContent: ref(null),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportWord();

      expect(exportUtils.exportAsWord).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("should handle export errors", async () => {
      vi.mocked(exportUtils.exportAsWord).mockRejectedValue(
        new Error("Word generation failed")
      );

      const { exportWord } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await exportWord();

      expect(mockShowToast).toHaveBeenCalledWith(
        "✗ Failed to export as Word",
        "error"
      );
    });

    it("should be accessible via handleExportWord alias", async () => {
      vi.mocked(exportUtils.exportAsWord)
        .mockClear()
        .mockResolvedValue(undefined);

      const { handleExportWord } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      await handleExportWord();

      expect(exportUtils.exportAsWord).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ Document downloaded as Word! Check your Downloads folder",
        "success"
      );
    });
  });

  describe("formatHtmlCode", () => {
    it("should format HTML code in code editor", () => {
      const codeContent = ref("  <div>   <p>Test</p>   </div>  ");
      vi.mocked(exportUtils.formatHtml).mockReturnValue(
        "<div>\n  <p>Test</p>\n</div>"
      );

      const { formatHtmlCode } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent,
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      formatHtmlCode();

      expect(exportUtils.formatHtml).toHaveBeenCalledWith(
        "  <div>   <p>Test</p>   </div>  "
      );
      expect(mockUpdateCodeContent).toHaveBeenCalledWith(
        "<div>\n  <p>Test</p>\n</div>"
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ HTML formatted successfully!"
      );
    });

    it("should handle empty code content", () => {
      const codeContent = ref("");
      vi.mocked(exportUtils.formatHtml).mockReturnValue("");

      const { formatHtmlCode } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent,
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      formatHtmlCode();

      expect(exportUtils.formatHtml).toHaveBeenCalledWith("");
      expect(mockUpdateCodeContent).toHaveBeenCalledWith("");
      expect(mockShowToast).toHaveBeenCalledWith(
        "✓ HTML formatted successfully!"
      );
    });
  });

  describe("handleFormatHtml", () => {
    it("should format HTML content in editor", () => {
      const htmlContent = ref("<p>Test content</p>");
      vi.mocked(exportUtils.formatHtml).mockReturnValue(
        "<p>\n  Test content\n</p>"
      );

      const { handleFormatHtml } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent,
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFormatHtml();

      expect(exportUtils.formatHtml).toHaveBeenCalledWith(
        "<p>Test content</p>"
      );
      expect(editorElement.innerHTML).toBe("<p>\n  Test content\n</p>");
      expect(htmlContent.value).toBe("<p>\n  Test content\n</p>");
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });

    it("should not format when editorContent is null", () => {
      const htmlContent = ref("<p>Test content</p>");

      const { handleFormatHtml } = useExportActions({
        editorContent: ref(null),
        htmlContent,
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFormatHtml();

      expect(exportUtils.formatHtml).not.toHaveBeenCalled();
      expect(htmlContent.value).toBe("<p>Test content</p>");
      expect(mockCaptureSnapshot).not.toHaveBeenCalled();
    });

    it("should handle complex HTML structures", () => {
      editorElement.innerHTML =
        "<div><ul><li>Item 1</li><li>Item 2</li></ul></div>";
      const htmlContent = ref(editorElement.innerHTML);
      vi.mocked(exportUtils.formatHtml).mockReturnValue(
        "<div>\n  <ul>\n    <li>Item 1</li>\n    <li>Item 2</li>\n  </ul>\n</div>"
      );

      const { handleFormatHtml } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent,
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      handleFormatHtml();

      expect(editorElement.innerHTML).toBe(
        "<div>\n  <ul>\n    <li>Item 1</li>\n    <li>Item 2</li>\n  </ul>\n</div>"
      );
      expect(htmlContent.value).toBe(
        "<div>\n  <ul>\n    <li>Item 1</li>\n    <li>Item 2</li>\n  </ul>\n</div>"
      );
      expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive exports", async () => {
      const { exportHtml, exportMarkdown, exportPdf } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportHtml();
      exportMarkdown();
      await exportPdf();

      expect(exportUtils.exportAsHtml).toHaveBeenCalledTimes(1);
      expect(exportUtils.exportAsMarkdown).toHaveBeenCalledTimes(1);
      expect(exportUtils.exportAsPdf).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledTimes(3);
    });

    it("should handle empty editor content", () => {
      editorElement.innerHTML = "";

      const { exportHtml, exportMarkdown } = useExportActions({
        editorContent: ref(editorElement),
        htmlContent: ref(""),
        codeContent: ref(""),
        showToast: mockShowToast,
        updateCodeContent: mockUpdateCodeContent,
        captureSnapshot: mockCaptureSnapshot,
      });

      exportHtml();
      exportMarkdown();

      expect(exportUtils.exportAsHtml).toHaveBeenCalledWith("");
      expect(exportUtils.exportAsMarkdown).toHaveBeenCalledWith("");
    });

    it("should handle all exports sequentially", async () => {
      vi.mocked(exportUtils.exportAsHtml)
        .mockClear()
        .mockImplementation(() => {});
      vi.mocked(exportUtils.exportAsMarkdown)
        .mockClear()
        .mockImplementation(() => {});
      vi.mocked(exportUtils.exportAsPdf)
        .mockClear()
        .mockResolvedValue(undefined);
      vi.mocked(exportUtils.exportAsWord)
        .mockClear()
        .mockResolvedValue(undefined);

      const { exportHtml, exportMarkdown, exportPdf, exportWord } =
        useExportActions({
          editorContent: ref(editorElement),
          htmlContent: ref(""),
          codeContent: ref(""),
          showToast: mockShowToast,
          updateCodeContent: mockUpdateCodeContent,
          captureSnapshot: mockCaptureSnapshot,
        });

      exportHtml();
      exportMarkdown();
      await exportPdf();
      await exportWord();

      expect(mockShowToast).toHaveBeenCalledTimes(4);
      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        "✓ Document downloaded as HTML! Check your Downloads folder",
        "success"
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        2,
        "✓ Document downloaded as Markdown! Check your Downloads folder",
        "success"
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        3,
        "✓ Document downloaded as PDF! Check your Downloads folder",
        "success"
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        4,
        "✓ Document downloaded as Word! Check your Downloads folder",
        "success"
      );
    });
  });
});
