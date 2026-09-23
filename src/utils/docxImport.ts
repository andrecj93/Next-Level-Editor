import { diagnostic } from "./documentDiagnostics";
import type { DiagnosticSink } from "../types/document";
export interface DocxReport {
  html: string;
  converter: string;
  warnings: string[];
  trackedChanges: boolean;
  structures: {
    paragraphs: number;
    headings: number;
    tables: number;
    images: number;
  };
}
import {
  inspectDocxArchive,
  defaultDocxLimits,
  type DocxLimits,
} from "./docxArchive";
export {
  inspectDocxArchive,
  defaultDocxLimits,
  type DocxLimits,
} from "./docxArchive";
export async function importDocx(
  file: File,
  options: {
    signal?: AbortSignal;
    limits?: Partial<DocxLimits>;
    sink?: DiagnosticSink;
  } = {},
): Promise<DocxReport> {
  const limits = { ...defaultDocxLimits, ...options.limits };
  if (!/\.docx$/i.test(file.name)) throw new Error("Choose a .docx file.");
  if (file.size > limits.compressedBytes)
    throw new Error("The Word file exceeds the import size limit.");
  if (options.signal?.aborted)
    throw new DOMException("Cancelled", "AbortError");
  diagnostic(options.sink, "import.started", undefined, { bytes: file.size });
  const buffer = await file.arrayBuffer();
  inspectDocxArchive(buffer, limits);
  const { default: DocxWorker } = await import(
    "../workers/docx.worker?worker&inline"
  );
  const worker = new DocxWorker();
  try {
    return await new Promise<DocxReport>((resolve, reject) => {
      const abort = () => {
        cleanup();
        reject(new DOMException("Cancelled", "AbortError"));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Word conversion timed out. Try a smaller document."));
      }, limits.timeoutMs);
      const cleanup = () => {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
        worker.terminate();
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      worker.onerror = () => {
        cleanup();
        reject(new Error("The Word converter could not read this file."));
      };
      worker.onmessage = (event) => {
        cleanup();
        if (event.data.error) reject(new Error(event.data.error));
        else {
          diagnostic(options.sink, "import.completed", undefined, {
            warnings: event.data.warnings.length,
          });
          resolve(event.data);
        }
      };
      if (options.signal?.aborted) {
        abort();
        return;
      }
      worker.postMessage({ buffer, limits }, [buffer]);
    });
  } catch (e) {
    diagnostic(options.sink, "import.failed", undefined, {
      cancelled: Boolean(options.signal?.aborted),
    });
    throw e;
  } finally {
    worker.terminate();
  }
}
