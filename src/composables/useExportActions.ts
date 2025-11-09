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
  htmlContent: Ref<string>;
  codeContent: Ref<string>;
  showToast: (message: string, type?: "success" | "error") => void;
  updateCodeContent: (content: string) => void;
  captureSnapshot: () => void;
}

/**
 * Composable for handling export operations
 * Provides export to various formats: HTML, Markdown, PDF, Word
 */
export function useExportActions(options: ExportActionsOptions) {
  const {
    editorContent,
    htmlContent,
    codeContent,
    showToast,
    updateCodeContent,
    captureSnapshot,
  } = options;

  /**
   * Export content as HTML file
   */
  const exportHtml = () => {
    if (!editorContent.value) return;

    try {
      exportAsHtml(editorContent.value.innerHTML);
      showToast("✓ Exported as HTML successfully!");
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
      showToast("✓ Exported as Markdown successfully!");
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
      showToast("✓ Exported as PDF successfully!");
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
      showToast("✓ Exported as Word document successfully!");
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

  /**
   * Format HTML content in the editor (prettify)
   */
  const handleFormatHtml = () => {
    if (!editorContent.value) return;
    const formatted = formatHtml(editorContent.value.innerHTML);
    editorContent.value.innerHTML = formatted;
    htmlContent.value = formatted;
    captureSnapshot();
  };

  return {
    exportHtml,
    exportMarkdown,
    exportPdf,
    exportWord,
    formatHtmlCode,
    handleFormatHtml,
    // Aliases for backwards compatibility
    handleExportHtml: exportHtml,
    handleExportMarkdown: exportMarkdown,
    handleExportPdf: exportPdf,
    handleExportWord: exportWord,
  };
}
