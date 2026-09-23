import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import DocumentPdfPreview from "../DocumentPdfPreview.vue";
import type {
  PdfPreviewDocument,
  PdfPreviewPage,
} from "../../utils/pdfPreview";
const preview = vi.hoisted(() => vi.fn());
vi.mock("../../utils/pdfPreview", () => ({ openPdfPreview: preview }));
let wrapper: VueWrapper | undefined;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const painted = (text: string): PdfPreviewPage => ({
  canvas: document.createElement("canvas"),
  text,
  width: 400,
  height: 600,
});
function documentFixture(text: string): PdfPreviewDocument {
  return {
    pages: 4,
    destroy: vi.fn(async () => {}),
    render: vi.fn(async () => painted(text)),
  };
}
function show() {
  wrapper = mount(DocumentPdfPreview, {
    props: { blob: new Blob(["one"]), documentId: "preview", sink: vi.fn() },
  });
  return wrapper;
}
beforeEach(() => {
  preview.mockReset();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("destroys a document that arrives after its preview was closed", async () => {
  const late = deferred<PdfPreviewDocument>(),
    doc = documentFixture("late");
  preview.mockReturnValue(late.promise);
  show().unmount();
  wrapper = undefined;
  expect(preview.mock.calls[0][1].signal.aborted).toBe(true);
  late.resolve(doc);
  await flushPromises();
  expect(doc.destroy).toHaveBeenCalledTimes(1);
  expect(doc.render).not.toHaveBeenCalled();
});

it("replacing a PDF cancels the old render and ignores its late canvas/text", async () => {
  const late = deferred<PdfPreviewPage>(),
    first = documentFixture("old"),
    second = documentFixture("new");
  vi.mocked(first.render).mockReturnValue(late.promise);
  preview.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  const view = show();
  await flushPromises();
  const signal = vi.mocked(first.render).mock.calls[0][2];
  await view.setProps({ blob: new Blob(["two"]) });
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(view.find("pre").text()).toBe("new");
  late.resolve(painted("old"));
  await flushPromises();
  expect(view.find("pre").text()).toBe("new");
  expect(view.findAll("canvas")).toHaveLength(1);
});

it("recovers from rendering failure with a fresh document and returns to writing", async () => {
  const first = documentFixture("bad"),
    second = documentFixture("recovered");
  vi.mocked(first.render).mockRejectedValue(new Error("render failed"));
  preview.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  const view = show();
  await flushPromises();
  expect(view.find('[role="alert"]').text()).toContain("Download the PDF");
  expect(view.find("[aria-busy]").attributes("aria-busy")).toBe("false");
  await view
    .findAll("button")
    .find((button) => button.text() === "Retry preview")!
    .trigger("click");
  await flushPromises();
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(view.find('[role="alert"]').exists()).toBe(false);
  expect(view.find("pre").text()).toBe("recovered");
  await view
    .findAll("button")
    .find((button) => button.text() === "Return to writing")!
    .trigger("click");
  expect(view.emitted("return")).toHaveLength(1);
});

it("loads without ResizeObserver and removes its window resize fallback", async () => {
  vi.stubGlobal("ResizeObserver", undefined);
  const add = vi.spyOn(window, "addEventListener"),
    remove = vi.spyOn(window, "removeEventListener");
  preview.mockResolvedValue(documentFixture("fallback"));
  const view = show();
  await flushPromises();
  expect(view.find("pre").text()).toBe("fallback");
  const handler = add.mock.calls.find((call) => call[0] === "resize")?.[1];
  expect(handler).toBeTypeOf("function");
  view.unmount();
  wrapper = undefined;
  expect(remove).toHaveBeenCalledWith("resize", handler);
});
