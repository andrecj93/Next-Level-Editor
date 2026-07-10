import { type Ref } from "vue";
import {
  exportAsHtml,
  exportAsMarkdown,
  exportAsPdf,
  exportAsWord,
  formatHtml,
} from "../utils/export";

interface ExportActionsOptions {
  editorContent: Ref<HTMLElement | null>;
  /** Kept for call-site compatibility; no current action writes it. */
  htmlContent?: Ref<string>;
  codeContent: Ref<string>;
  showToast: (message: string, type?: "success" | "error") => void;
  updateCodeContent: (content: string) => void;
  /** Kept for call-site compatibility; no current action snapshots. */
  captureSnapshot?: () => void;
}

/**
 * Composable for handling export operations
 * Provides export to various formats: HTML, Markdown, PDF, Word
 */
export function useExportActions(options: ExportActionsOptions) {
  const { editorContent, codeContent, showToast, updateCodeContent } = options;

  /**
   * Export content as HTML file
   */
  const exportHtml = () => {
    if (!editorContent.value) return;

    try {
      exportAsHtml(editorContent.value.innerHTML);
      showToast(
        "✓ Document downloaded as HTML! Check your Downloads folder",
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      showToast("✗ Failed to export as HTML", "error");
    }
  };

  /**
   * Export content as Markdown file
   */
  const exportMarkdown = () => {
    if (!editorContent.value) return;

    try {
      exportAsMarkdown(editorContent.value.innerHTML);
      showToast(
        "✓ Document downloaded as Markdown! Check your Downloads folder",
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      showToast("✗ Failed to export as Markdown", "error");
    }
  };

  /**
   * Export content as PDF file
   */
  const exportPdf = async () => {
    if (!editorContent.value) return;

    try {
      await exportAsPdf(editorContent.value);
      showToast(
        "✓ Document downloaded as PDF! Check your Downloads folder",
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      showToast("✗ Failed to export as PDF", "error");
    }
  };

  /**
   * Export content as Word document
   */
  const exportWord = async () => {
    if (!editorContent.value) return;

    try {
      await exportAsWord(editorContent.value.innerHTML);
      showToast(
        "✓ Document downloaded as Word! Check your Downloads folder",
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      showToast("✗ Failed to export as Word", "error");
    }
  };

  /**
   * Format HTML code in the code editor
   */
  const formatHtmlCode = () => {
    const formatted = formatHtml(codeContent.value);
    updateCodeContent(formatted);
    showToast("✓ HTML formatted successfully!");
  };

  // (The old handleFormatHtml — which rewrote the hidden WYSIWYG div instead
  // of the code textarea — was removed when the Format HTML button was wired
  // to formatHtmlCode above; it had no remaining callers.)

  return {
    exportHtml,
    exportMarkdown,
    exportPdf,
    exportWord,
    formatHtmlCode,
    // Aliases for backwards compatibility
    handleExportHtml: exportHtml,
    handleExportMarkdown: exportMarkdown,
    handleExportPdf: exportPdf,
    handleExportWord: exportWord,
  };
}
