import type { DiagnosticSink } from "../types/document";
import { diagnostic } from "./documentDiagnostics";
import type { PDFPageProxy, RenderTask } from "pdfjs-dist";

/** Stop waiting even if a browser module, worker or text request never settles. */
async function bounded<T>(
  work: Promise<T>,
  signals: AbortSignal[],
  cancel = () => {},
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    const stop = (error: Error) => {
      try {
        cancel();
      } finally {
        reject(error);
      }
    };
    abort = () => stop(new DOMException("Cancelled", "AbortError"));
    timer = setTimeout(
      () =>
        stop(
          new Error(
            "PDF preview could not be loaded. Download the PDF to view it.",
          ),
        ),
      30_000,
    );
    for (const signal of signals)
      signal.addEventListener("abort", abort, { once: true });
    if (signals.some((signal) => signal.aborted)) abort();
  });
  try {
    return await Promise.race([work, interrupted]);
  } finally {
    clearTimeout(timer);
    for (const signal of signals) signal.removeEventListener("abort", abort);
  }
}

export interface PdfPreviewPage {
  canvas: HTMLCanvasElement;
  text: string;
  width: number;
  height: number;
}
export interface PdfPreviewDocument {
  pages: number;
  render: (
    page: number,
    width: number,
    signal: AbortSignal,
  ) => Promise<PdfPreviewPage>;
  destroy: () => Promise<void>;
}

/** The preview reads the exact export bytes and owns its worker per document. */
export async function openPdfPreview(
  blob: Blob,
  options: { signal: AbortSignal; sink?: DiagnosticSink; documentId?: string },
): Promise<PdfPreviewDocument> {
  const check = (signal = options.signal) => {
    if (signal.aborted || options.signal.aborted)
      throw new DOMException("Cancelled", "AbortError");
  };
  check();
  const started = Date.now();
  diagnostic(options.sink, "layout.preview_started", options.documentId, {
    renderer: "pdfjs",
    bytes: blob.size,
  });
  let dispose = async () => {};
  try {
    if (blob.size > 64_000_000)
      throw new Error(
        "This preview is too large. Download the PDF to view it.",
      );
    const [{ default: moduleUrl }, { default: workerUrl }] = await bounded(
      Promise.all([
        // Keep the browser-only module as a package asset. Inlining a dynamic
        // import in UMD would otherwise execute PDF.js during a server require().
        import("pdfjs-dist/build/pdf.min.mjs?url&no-inline"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url&no-inline"),
      ]),
      [options.signal],
    );
    check();
    const { getDocument, PDFWorker } = (await bounded(
      import(/* @vite-ignore */ moduleUrl),
      [options.signal],
    )) as typeof import("pdfjs-dist");
    check();
    const data = new Uint8Array(
      await bounded(blob.arrayBuffer(), [options.signal]),
    );
    check();
    const port = new Worker(workerUrl, {
      type: "module",
      name: "nle-pdf-preview",
    });
    dispose = async () => {
      port.terminate();
    };
    const worker = PDFWorker.create({ port });
    dispose = async () => {
      worker.destroy();
      port.terminate();
    };
    const loading = getDocument({
      data,
      worker,
      isEvalSupported: false,
      enableXfa: false,
      useWasm: false,
      disableAutoFetch: true,
      disableRange: true,
      disableStream: true,
      useWorkerFetch: false,
      stopAtErrors: true,
    });
    let disposed = false;
    const destroy = async () => {
      if (disposed) return;
      disposed = true;
      options.signal.removeEventListener("abort", abort);
      try {
        await loading.destroy();
      } finally {
        worker.destroy();
        port.terminate();
        diagnostic(options.sink, "layout.preview_disposed", options.documentId, {
          renderer: "pdfjs",
          cancelled: options.signal.aborted,
        });
      }
    };
    const abort = () => {
      void destroy().catch(() => {});
    };
    dispose = destroy;
    options.signal.addEventListener("abort", abort, { once: true });
    if (options.signal.aborted) abort();
    const pdf = await bounded(loading.promise, [options.signal], abort);
    check();
    if (disposed)
      throw new Error(
        "PDF preview could not be loaded. Download the PDF to view it.",
      );
    diagnostic(options.sink, "layout.preview_completed", options.documentId, {
      renderer: "pdfjs",
      pages: pdf.numPages,
      durationMs: Date.now() - started,
    });
    return {
      pages: pdf.numPages,
      destroy,
      async render(number, width, signal) {
        check(signal);
        if (disposed) throw new DOMException("Cancelled", "AbortError");
        const pending = new AbortController();
        let page: PDFPageProxy | undefined,
          task: RenderTask | undefined,
          cleaned = false;
        const cleanup = () => {
          if (page && !cleaned) {
            cleaned = true;
            page.cleanup();
          }
        };
        const work = (async () => {
          try {
            page = await pdf.getPage(number);
            check(pending.signal);
            const original = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({
              scale:
                Math.max(
                  80,
                  Math.min(Number.isFinite(width) ? width : 800, 1200),
                ) / original.width,
            });
            const ratio = Math.min(
              window.devicePixelRatio || 1,
              2,
              Math.sqrt(8_000_000 / (viewport.width * viewport.height)),
              4096 / Math.max(viewport.width, viewport.height),
            );
            // Separate canvases prevent a superseded render painting a newer page.
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
            canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            canvas.setAttribute("aria-hidden", "true");
            task = page.render({
              canvas,
              viewport,
              transform: [ratio, 0, 0, ratio, 0, 0],
            });
            await task.promise;
            check(pending.signal);
            const content = await page.getTextContent();
            check(pending.signal);
            return {
              canvas,
              width: viewport.width,
              height: viewport.height,
              text: content.items
                .map((item) =>
                  "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
                )
                .join(""),
            };
          } finally {
            cleanup();
          }
        })();
        try {
          return await bounded(work, [signal, options.signal], () => {
            pending.abort();
            task?.cancel();
          });
        } finally {
          cleanup();
        }
      },
    };
  } catch (error) {
    await dispose().catch(() => {});
    diagnostic(options.sink, "layout.preview_failed", options.documentId, {
      renderer: "pdfjs",
      cancelled: options.signal.aborted,
    });
    throw error;
  }
}
