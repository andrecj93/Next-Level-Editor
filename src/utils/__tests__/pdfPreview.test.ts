import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openPdfPreview } from "../pdfPreview";

const mocks = vi.hoisted(() => ({ document: vi.fn(), worker: vi.fn() }));
vi.mock("pdfjs-dist/build/pdf.min.mjs?url&no-inline", () => ({
  default: "pdfjs-dist",
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url&no-inline", () => ({
  default: "/assets/pdf.worker.min.mjs",
}));
vi.mock("pdfjs-dist", () => ({
  getDocument: mocks.document,
  PDFWorker: { create: mocks.worker },
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
let terminate: ReturnType<typeof vi.fn>,
  workerDestroy: ReturnType<typeof vi.fn>,
  loadingDestroy: ReturnType<typeof vi.fn>;
let page: ReturnType<typeof pageFixture>;
function pageFixture() {
  return {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: 600 * scale,
      height: 800 * scale,
    })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    getTextContent: vi.fn(async () => ({
      items: [
        { str: "Olá world", hasEOL: true },
        { str: "Next line", hasEOL: false },
        { id: "artifact" },
      ],
    })),
    cleanup: vi.fn(),
  };
}
let getPage: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks();
  terminate = vi.fn();
  workerDestroy = vi.fn();
  loadingDestroy = vi.fn(async () => {});
  vi.stubGlobal(
    "Worker",
    class {
      terminate = terminate;
    },
  );
  page = pageFixture();
  getPage = vi.fn(async () => page);
  mocks.worker.mockReturnValue({ destroy: workerDestroy });
  mocks.document.mockReturnValue({
    promise: Promise.resolve({ numPages: 3, getPage }),
    destroy: loadingDestroy,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const blob = () =>
  new Blob(["synthetic PDF bytes"], { type: "application/pdf" });
const options = () => ({
  signal: new AbortController().signal,
  sink: vi.fn(),
  documentId: "preview-test",
});

describe("PDF preview resource ownership", () => {
  it("rejects cancelled and oversized requests before allocating a worker", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      openPdfPreview(blob(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      openPdfPreview({ size: 64_000_001 } as Blob, options()),
    ).rejects.toThrow(/too large/);
    expect(mocks.worker).not.toHaveBeenCalled();
  });
  it("reads only supplied bytes and destroys the owned document exactly once", async () => {
    const controller = new AbortController(),
      sink = vi.fn();
    const doc = await openPdfPreview(blob(), {
      signal: controller.signal,
      sink,
      documentId: "pdf",
    });
    expect(doc.pages).toBe(3);
    expect(mocks.document).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Uint8Array),
        isEvalSupported: false,
        enableXfa: false,
        useWorkerFetch: false,
      }),
    );
    expect(mocks.document.mock.calls[0][0]).not.toHaveProperty("url");
    controller.abort();
    await doc.destroy();
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledTimes(1));
    expect(workerDestroy).toHaveBeenCalledTimes(1);
    expect(loadingDestroy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sink.mock.calls)).not.toContain(
      "synthetic PDF bytes",
    );
    await expect(
      doc.render(1, 500, new AbortController().signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it.each(["worker", "document"] as const)(
    "cleans up a synchronous %s construction failure",
    async (stage) => {
      mocks[stage].mockImplementation(() => {
        throw new Error("construction failed");
      });
      await expect(openPdfPreview(blob(), options())).rejects.toThrow(
        "construction failed",
      );
      expect(terminate).toHaveBeenCalledTimes(1);
      expect(workerDestroy).toHaveBeenCalledTimes(stage === "document" ? 1 : 0);
    },
  );
  it("cleans up rejected parsing without retaining the worker", async () => {
    mocks.document.mockImplementation(() => ({
      promise: Promise.reject(new Error("invalid PDF")),
      destroy: loadingDestroy,
    }));
    await expect(openPdfPreview(blob(), options())).rejects.toThrow(
      "invalid PDF",
    );
    expect(loadingDestroy).toHaveBeenCalledTimes(1);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
  it("bounds a worker that never completes document loading", async () => {
    vi.useFakeTimers();
    mocks.document.mockReturnValue({
      promise: new Promise(() => {}),
      destroy: loadingDestroy,
    });
    const result = openPdfPreview(blob(), options());
    const rejected = expect(result).rejects.toThrow(/Download the PDF/);
    await vi.waitFor(() => expect(mocks.document).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("aborts a pending page lookup and cleans up a page arriving afterwards", async () => {
    const pending = deferred<typeof page>();
    getPage.mockReturnValue(pending.promise);
    const doc = await openPdfPreview(blob(), options()),
      controller = new AbortController();
    const rendered = doc.render(1, 400, controller.signal);
    controller.abort();
    await expect(rendered).rejects.toMatchObject({ name: "AbortError" });
    pending.resolve(page);
    await vi.waitFor(() => expect(page.cleanup).toHaveBeenCalledTimes(1));
    expect(page.render).not.toHaveBeenCalled();
    await doc.destroy();
  });
  it("bounds both a stuck canvas render and stuck text extraction", async () => {
    vi.useFakeTimers();
    const doc = await openPdfPreview(blob(), options()),
      cancel = vi.fn();
    page.render.mockReturnValue({ promise: new Promise(() => {}), cancel });
    const draw = doc.render(1, 400, new AbortController().signal);
    const rejectedDraw = expect(draw).rejects.toThrow(/Download the PDF/);
    await vi.advanceTimersByTimeAsync(30_000);
    await rejectedDraw;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(page.cleanup).toHaveBeenCalledTimes(1);
    page = pageFixture();
    getPage.mockResolvedValue(page);
    page.getTextContent.mockReturnValue(new Promise(() => {}));
    const text = doc.render(2, 400, new AbortController().signal);
    const rejectedText = expect(text).rejects.toThrow(/Download the PDF/);
    await vi.advanceTimersByTimeAsync(30_000);
    await rejectedText;
    expect(page.cleanup).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await doc.destroy();
  });
  it("renders bounded separate canvases and extracts readable page text", async () => {
    vi.stubGlobal("devicePixelRatio", 8);
    const doc = await openPdfPreview(blob(), options());
    const first = await doc.render(1, 100_000, new AbortController().signal);
    const second = await doc.render(2, 320, new AbortController().signal);
    expect(first.canvas).not.toBe(second.canvas);
    expect(first.width).toBe(1200);
    expect(first.canvas.width * first.canvas.height).toBeLessThanOrEqual(
      8_000_000,
    );
    expect(
      Math.max(first.canvas.width, first.canvas.height),
    ).toBeLessThanOrEqual(4096);
    expect(second.width).toBe(320);
    expect(first.text).toBe("Olá world\nNext line ");
    expect(page.cleanup).toHaveBeenCalledTimes(2);
    await doc.destroy();
  });
});
