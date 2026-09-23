import type { PageSettings, DiagnosticSink } from "../types/document";
import { defaultPageSettings } from "../types/document";
import { diagnostic } from "./documentDiagnostics";
import { documentRoot } from "./documentOperations";
export interface SemanticPdfResult {
  blob: Blob;
  pages: number;
  warnings: string[];
  capabilities: { selectableText: true; tagged: true; pdfUaCertified: false };
}
export function validatePageSettings(settings: PageSettings): void {
  if (
    !["A4", "Letter"].includes(settings.size) ||
    !["portrait", "landscape"].includes(settings.orientation)
  )
    throw new Error("Unsupported page format.");
  if (
    !Number.isFinite(settings.margin) ||
    settings.margin < 18 ||
    settings.margin > 144
  )
    throw new Error("Margins must be between 18 and 144 points.");
  if (settings.header.length > 300 || settings.footer.length > 300)
    throw new Error("Headers and footers must be under 300 characters.");
  if (!/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(settings.language))
    throw new Error("Use a valid document language, such as en or pt-PT.");
}
export async function createSemanticPdf(
  html: string,
  options: {
    settings?: PageSettings;
    signal?: AbortSignal;
    onProgress?: (completed: number, total: number) => void;
    sink?: DiagnosticSink;
  } = {},
): Promise<SemanticPdfResult> {
  const settings = options.settings ?? defaultPageSettings();
  validatePageSettings(settings);
  const check = () => {
    if (options.signal?.aborted)
      throw new DOMException("Cancelled", "AbortError");
  };
  check();
  diagnostic(options.sink, "pdf.started", undefined, { renderer: "pdfkit" });
  const [
    { default: PDFDocument },
    { default: regular },
    { default: bold },
    { default: italic },
    { default: boldItalic },
  ] = await Promise.all([
    import("pdfkit"),
    import(
      "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?inline"
    ),
    import(
      "@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?inline"
    ),
    import(
      "@fontsource/noto-sans/files/noto-sans-latin-400-italic.woff?inline"
    ),
    import(
      "@fontsource/noto-sans/files/noto-sans-latin-700-italic.woff?inline"
    ),
  ]);
  check();
  const font = (uri: string) =>
    Uint8Array.from(atob(uri.split(",")[1]), (c) => c.charCodeAt(0));
  const doc = new PDFDocument({
    font: font(regular) as unknown as string,
    autoFirstPage: true,
    bufferPages: true,
    tagged: true,
    pdfVersion: "1.7",
    displayTitle: true,
    info: { Title: settings.title || "Document" },
    lang: settings.language,
    size: settings.size === "Letter" ? "LETTER" : "A4",
    layout: settings.orientation,
    margins: {
      top: settings.margin + (settings.header ? 24 : 0),
      bottom:
        settings.margin + (settings.footer || settings.numbering ? 24 : 0),
      left: settings.margin,
      right: settings.margin,
    },
  });
  doc.registerFont("Noto", font(regular));
  doc.registerFont("NotoBold", font(bold));
  doc.font("Noto").fontSize(11);
  doc.registerFont("NotoItalic", font(italic));
  doc.registerFont("NotoBoldItalic", font(boldItalic));
  const chunks: Uint8Array[] = [];
  const completion = new Promise<Blob>((resolve, reject) => {
    doc.on("data", (chunk: Uint8Array) => chunks.push(new Uint8Array(chunk)));
    doc.on("end", () =>
      resolve(
        new Blob(
          chunks.map((chunk) => chunk.buffer as ArrayBuffer),
          { type: "application/pdf" },
        ),
      ),
    );
    doc.on("error", () => reject(new Error("PDF rendering failed.")));
  });
  const warnings = new Set<string>();
  const root = documentRoot(html);
  if (
    Array.from(root.textContent ?? "").some((char) => {
      const point = char.codePointAt(0)!;
      return !(
        point <= 0x024f ||
        (point >= 0x0300 && point <= 0x036f) ||
        (point >= 0x2000 && point <= 0x206f) ||
        (point >= 0x20a0 && point <= 0x20cf)
      );
    })
  )
    warnings.add(
      "The bundled PDF fonts cover Latin text. Other scripts and symbols need visual review; use HTML or Word export when their glyphs are unavailable.",
    );
  const documentStructure = doc.struct("Document");
  doc.addStructure(documentStructure);
  const contentWidth = () => doc.page.width - settings.margin * 2;
  function textBlock(
    el: HTMLElement,
    tag: string,
    prefix = "",
    parent = documentStructure,
  ) {
    const title = el.textContent?.trim() ?? "";
    const size = /^H[1-6]$/.test(tag)
      ? [22, 18, 16, 14, 12, 11][Number(tag[1]) - 1]
      : 11;
    if (
      /^H[1-6]$/.test(tag) &&
      doc.y + size * 3 > doc.page.height - doc.page.margins.bottom
    )
      doc.addPage();
    if (/^H[1-6]$/.test(tag)) doc.outline.addItem(title);
    const structure = doc.struct(tag);
    parent.add(structure);
    const runs: {
      text: string;
      bold: boolean;
      italic?: boolean;
      underline?: boolean;
      link?: string;
    }[] = [];
    function walk(
      node: Node,
      bold = /^H/.test(tag),
      link?: string,
      italic = false,
      underline = false,
    ) {
      if (node.nodeType === Node.TEXT_NODE) {
        runs.push({
          text: node.textContent ?? "",
          bold,
          link,
          italic,
          underline,
        });
        return;
      }
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName === "BR") {
        runs.push({ text: "\n", bold, link });
        return;
      }
      if (node.tagName === "IMG") {
        warnings.add(
          "Inline images are represented by their alternative text.",
        );
        runs.push({ text: node.getAttribute("alt") || "[Image]", bold, link });
        return;
      }
      const href = node.getAttribute("href");
      node.childNodes.forEach((child) =>
        walk(
          child,
          bold || /^(B|STRONG)$/.test(node.tagName),
          node.tagName === "A" && href && /^(https?:|mailto:|#)/i.test(href)
            ? href
            : link,
          italic || /^(I|EM)$/.test(node.tagName),
          underline || node.tagName === "U",
        ),
      );
    }
    if (prefix) runs.push({ text: prefix, bold: false });
    el.childNodes.forEach((node) => walk(node));
    if (!runs.length) runs.push({ text: " ", bold: false });
    runs[runs.length - 1].text += " ";
    const marked = doc.markStructureContent(tag);
    structure.add(marked);
    runs.forEach((run, index) => {
      doc
        .font(
          run.bold
            ? run.italic
              ? "NotoBoldItalic"
              : "NotoBold"
            : run.italic
              ? "NotoItalic"
              : "Noto",
        )
        .fontSize(size);
      const align = el.style.textAlign;
      doc.text(run.text, {
        width: contentWidth(),
        underline: run.underline,
        continued: index < runs.length - 1,
        link: run.link?.startsWith("#") ? undefined : run.link,
        align: ["left", "right", "center", "justify"].includes(align)
          ? (align as "left" | "right" | "center" | "justify")
          : "left",
      });
    });
    doc.endMarkedContent();
    structure.end();
    doc.moveDown(0.5);
  }
  async function render(el: HTMLElement, parent = documentStructure) {
    check();
    if (el.classList.contains("page-break")) {
      doc.addPage();
      return;
    }
    if (el.hasAttribute("data-nle-deletion")) return;
    if (
      el.tagName === "IMG" ||
      (el.classList.contains("embedded-resizable-container") &&
        el.getAttribute("data-type") === "image")
    ) {
      const img = el.tagName === "IMG" ? el : el.querySelector("img");
      const src = img?.getAttribute("src") ?? "";
      if (/^data:image\/(png|jpeg);base64,/i.test(src)) {
        try {
          const maxHeight = Math.min(
            250,
            doc.page.height - doc.page.margins.top - doc.page.margins.bottom,
          );
          if (doc.y + maxHeight > doc.page.height - doc.page.margins.bottom)
            doc.addPage();
          const structure = doc.struct("Figure", {
            alt: img?.getAttribute("alt") || "Image",
          });
          documentStructure.add(structure);
          structure.add(doc.markStructureContent("Figure"));
          doc.x = settings.margin;
          doc.image(src, { fit: [contentWidth(), maxHeight] });
          doc.y += 12;
          doc.endMarkedContent();
          structure.end();
        } catch {
          warnings.add("An image could not be rendered.");
          textBlock(el, "P", "[Image] ");
        }
      } else {
        warnings.add(
          "Remote or unsupported images were not fetched; alternative text is included.",
        );
        const p = document.createElement("p");
        p.textContent = img?.getAttribute("alt") || "[Image]";
        textBlock(p, "P");
      }
      return;
    }
    if (el.tagName === "TABLE") {
      const data = Array.from(el.querySelectorAll("tr"))
        .filter((row) => row.closest("table") === el)
        .map((row) =>
          Array.from(row.children).map((cell) => ({
            text: cell.textContent ?? "",
            type: cell.tagName === "TH" ? ("TH" as const) : ("TD" as const),
            colSpan: Math.max(
              1,
              Math.min(100, Number(cell.getAttribute("colspan")) || 1),
            ),
            rowSpan: Math.max(
              1,
              Math.min(100, Number(cell.getAttribute("rowspan")) || 1),
            ),
            font: {
              src: cell.tagName === "TH" ? "NotoBold" : "Noto",
              size: 10,
            },
          })),
        );
      const tableOptions: PDFKit.Mixins.TableOptionsWithData & {
        structParent: PDFKit.PDFStructureElement;
      } = {
        data,
        structParent: documentStructure,
        maxWidth: contentWidth(),
        position: { x: settings.margin },
        defaultStyle: { padding: 5, border: 0.5, borderColor: "#a3acbb" },
      };
      doc.table(tableOptions);
      doc.moveDown(0.5);
      if (el.querySelector("table,img"))
        warnings.add(
          "Nested tables and images inside cells are represented as text.",
        );
      return;
    }
    if (el.tagName === "UL" || el.tagName === "OL") {
      const list = doc.struct("L");
      parent.add(list);
      for (const [index, li] of Array.from(el.children).entries()) {
        const item = doc.struct("LI");
        list.add(item);
        const label = doc.struct("Lbl");
        item.add(label);
        label.add(doc.markStructureContent("Lbl"));
        doc
          .font("Noto")
          .fontSize(11)
          .text(
            el.tagName === "OL"
              ? index + Number(el.getAttribute("start") || 1) + ". "
              : "- ",
            { continued: true, width: contentWidth() },
          );
        doc.endMarkedContent();
        label.end();
        const body = doc.struct("LBody");
        item.add(body);
        const content = li.cloneNode(true) as HTMLElement;
        content.querySelectorAll("ul,ol").forEach((n) => n.remove());
        textBlock(content, "P", "", body);
        for (const nested of Array.from(li.children))
          if (/^(UL|OL)$/.test(nested.tagName))
            await render(nested as HTMLElement, body);
        body.end();
        item.end();
      }
      list.end();
      return;
    }
    if (
      el.querySelector("iframe,video") ||
      el.tagName === "IFRAME" ||
      el.tagName === "VIDEO"
    )
      warnings.add("Video is represented by its available text/link.");
    if (/^(P|H[1-6]|PRE|BLOCKQUOTE)$/.test(el.tagName))
      textBlock(el, /^H/.test(el.tagName) ? el.tagName : "P");
    else if (el.children.length)
      for (const child of Array.from(el.children))
        await render(child as HTMLElement);
    else textBlock(el, "P");
  }
  try {
    const children = Array.from(root.children);
    for (let i = 0; i < children.length; i++) {
      await render(children[i] as HTMLElement);
      options.onProgress?.(i + 1, children.length);
      if (i % 10 === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    documentStructure.end();
    const pages = doc.bufferedPageRange().count;
    for (let i = 0; i < pages; i++) {
      check();
      doc.switchToPage(i);
      doc.markContent("Artifact", { type: "Pagination" });
      const bottomMargin = doc.page.margins.bottom;
      // Pagination lives outside the body box; without this PDFKit starts a new page for the footer.
      doc.page.margins.bottom = 0;
      doc.font("Noto").fontSize(9);
      if (settings.header)
        doc.text(settings.header, settings.margin, 15, {
          width: contentWidth(),
          lineBreak: false,
        });
      const footer = [
        settings.footer,
        settings.numbering ? i + 1 + " / " + pages : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (footer)
        doc.text(footer, settings.margin, doc.page.height - 24, {
          width: contentWidth(),
          lineBreak: false,
          align: "center",
        });
      doc.endMarkedContent();
      doc.page.margins.bottom = bottomMargin;
    }
    doc.end();
    const blob = await completion;
    diagnostic(options.sink, "pdf.completed", undefined, {
      pages,
      warnings: warnings.size,
    });
    return {
      blob,
      pages,
      warnings: [...warnings],
      capabilities: {
        selectableText: true,
        tagged: true,
        pdfUaCertified: false,
      },
    };
  } catch (error) {
    doc.destroy();
    void completion.catch(() => {});
    diagnostic(options.sink, "pdf.failed", undefined, {
      cancelled: Boolean(options.signal?.aborted),
    });
    throw error;
  }
}
