import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useExportActions } from "../useExportActions";
import * as exportUtils from "../../utils/export";

/**
 * R24-3 (round-24 audit, found independently by two hunters): exports read the
 * pill's data-value — a snapshot stamped at INSERTION time — while printing
 * re-resolves every pill via the beforeprint hook. Insert {{ date.today }} on
 * Monday, export on Wednesday: the file says Monday, the printout says
 * Wednesday. Same divergence for any host-updated variable. README promises
 * exports and print produce the same finished document.
 *
 * The fix is symmetry: useExportActions accepts the same refresh pass the
 * beforeprint hook uses — `prepareHtml` for the string-based formats (works in
 * every view mode, including Preview where no surface is mounted) and
 * `prepareRoot` for PDF (which rasterizes the live element).
 */
vi.mock("../../utils/export", () => ({
  exportAsHtml: vi.fn(),
  exportAsMarkdown: vi.fn(),
  exportAsPdf: vi.fn(async () => {}),
  exportAsWord: vi.fn(async () => {}),
  formatHtml: vi.fn((h: string) => h),
}));

const STALE = '<p><span class="editor-variable" data-value="OLD">x</span></p>';
const FRESH = '<p><span class="editor-variable" data-value="NEW">x</span></p>';

let editorContent: ReturnType<typeof ref<HTMLElement | null>>;

const makeActions = (withHooks: boolean) => {
  const el = document.createElement("div");
  el.innerHTML = STALE;
  editorContent = ref<HTMLElement | null>(el);
  return useExportActions({
    editorContent: editorContent as never,
    codeContent: ref(""),
    showToast: vi.fn(),
    updateCodeContent: vi.fn(),
    ...(withHooks
      ? {
          prepareHtml: (html: string) => html.replace("OLD", "NEW"),
          prepareRoot: (root: HTMLElement) => {
            root.querySelector<HTMLElement>(".editor-variable")!.dataset.value =
              "NEW";
          },
        }
      : {}),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useExportActions refreshes variables before exporting (#R24-3)", () => {
  it("string formats export the PREPARED html", () => {
    const actions = makeActions(true);

    actions.exportHtml();
    actions.exportMarkdown();

    expect(vi.mocked(exportUtils.exportAsHtml).mock.calls[0][0]).toBe(FRESH);
    expect(vi.mocked(exportUtils.exportAsMarkdown).mock.calls[0][0]).toBe(FRESH);
  });

  it("Word exports the PREPARED html", async () => {
    const actions = makeActions(true);

    await actions.exportWord();

    expect(vi.mocked(exportUtils.exportAsWord).mock.calls[0][0]).toBe(FRESH);
  });

  it("PDF refreshes the live root before rasterizing", async () => {
    const actions = makeActions(true);

    await actions.exportPdf();

    const root = vi.mocked(exportUtils.exportAsPdf).mock.calls[0][0];
    expect(
      root.querySelector<HTMLElement>(".editor-variable")!.dataset.value
    ).toBe("NEW");
  });

  it("without hooks, behavior is unchanged (control)", () => {
    const actions = makeActions(false);

    actions.exportHtml();

    expect(vi.mocked(exportUtils.exportAsHtml).mock.calls[0][0]).toBe(STALE);
  });
});
