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
  /**
   * The document as HTML. Preview view renders NEITHER editable surface, so
   * `editorContent` is null there — this is where the document still lives.
   */
  htmlContent?: Ref<string>;
  codeContent: Ref<string>;
  showToast: (message: string, type?: "success" | "error") => void;
  updateCodeContent: (content: string) => void;
  /** Kept for call-site compatibility; no current action snapshots. */
  captureSnapshot?: () => void;
  /**
   * Refresh pass applied to the document HTML before every string-based
   * export (HTML / Markdown / Word). The host wires the variables system's
   * re-resolver here so exports ship CURRENT variable values — the same pass
   * the beforeprint hook runs — instead of the data-value stamped at
   * insertion time. String-based, so it also works in Preview view mode,
   * where no editable surface is mounted. #R24-3
   */
  prepareHtml?: (html: string) => string;
  /**
   * Same refresh for the one format that rasterizes the live ELEMENT (PDF):
   * called with the editor root right before html2canvas reads it. #R24-3
   */
  prepareRoot?: (root: HTMLElement) => void;
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
    prepareHtml,
    prepareRoot,
  } = options;

  /**
   * The document to export. In Preview view mode there is no editable surface
   * (EditorPanels renders neither), so `editorContent` is null — and every
   * export used to bail on that with no file, no toast and no console message:
   * four menu items that simply did nothing. The document itself was never
   * missing. #R23-15
   */
  const exportableHtml = (): string | null => {
    const raw = ((): string | null => {
      if (editorContent.value) return editorContent.value.innerHTML;
      // Only fall back to a document that actually HAS content: an empty
      // htmlContent means there is nothing to export, not that we should write
      // an empty file.
      const html = htmlContent?.value ?? "";
      return html.length > 0 ? html : null;
    })();
    if (raw === null) return null;
    return prepareHtml ? prepareHtml(raw) : raw;
  };

  /**
   * Export content as HTML file
   */
  const exportHtml = () => {
    const html = exportableHtml();
    if (html === null) return;

    try {
      exportAsHtml(html);
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
    const html = exportableHtml();
    if (html === null) return;

    try {
      exportAsMarkdown(html);
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
    // PDF is the one format that needs a laid-out ELEMENT, not a string:
    // html2canvas rasterizes the live DOM. In preview mode there is nothing to
    // rasterize, so say that rather than fail silently. #R23-15
    if (!editorContent.value) {
      // …but only complain when there IS a document to export. With nothing to
      // export at all, staying quiet is right.
      if (exportableHtml() !== null) {
        showToast("✗ Switch to Editor view to export as PDF", "error");
      }
      return;
    }

    try {
      // PDF reads the live DOM, so the refresh happens on the element. #R24-3
      prepareRoot?.(editorContent.value);
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
    const html = exportableHtml();
    if (html === null) return;

    try {
      await exportAsWord(html);
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
