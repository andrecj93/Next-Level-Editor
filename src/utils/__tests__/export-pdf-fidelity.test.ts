import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * PDF export used a bare clone with NO .editor-content class, so every
 * editor-scoped style (most visibly the checklist checkboxes + checked state)
 * was lost in the raster. And the off-screen clone was removed only on the
 * success path, so any html2canvas failure leaked a full-document copy into
 * <body> permanently.
 */

const h2c = vi.fn();
vi.mock("html2canvas", () => ({ default: (...a: unknown[]) => h2c(...a) }));
vi.mock("jspdf", () => ({
  default: class {
    addImage = vi.fn();
    addPage = vi.fn();
    save = vi.fn();
  },
}));

// Import AFTER mocks are registered.
let exportAsPdf: typeof import("../export").exportAsPdf;

beforeEach(async () => {
  h2c.mockReset();
  ({ exportAsPdf } = await import("../export"));
});

afterEach(() => {
  document
    .querySelectorAll('div[style*="-9999px"]')
    .forEach((n) => n.remove());
  vi.restoreAllMocks();
});

const okCanvas = () =>
  Promise.resolve({
    toDataURL: () => "data:image/png;base64,x",
    width: 800,
    height: 600,
  });

describe("exportAsPdf fidelity + cleanup", () => {
  it("renders the clone WITH the editor-content class (scoped styles apply)", async () => {
    h2c.mockImplementation(okCanvas);
    const el = document.createElement("div");
    el.innerHTML =
      '<ul class="checklist"><li data-checked="true">done</li></ul>';

    await exportAsPdf(el, "doc.pdf");

    expect(h2c).toHaveBeenCalledTimes(1);
    const clone = h2c.mock.calls[0][0] as HTMLElement;
    expect(clone.className).toContain("editor-content");
    // The checklist markup made it into the clone verbatim.
    expect(clone.querySelector('li[data-checked="true"]')).not.toBeNull();
  });

  it("removes the clone on the success path", async () => {
    h2c.mockImplementation(okCanvas);
    const el = document.createElement("div");
    el.innerHTML = "<p>hi</p>";

    await exportAsPdf(el, "doc.pdf");

    expect(document.querySelectorAll('div[style*="-9999px"]')).toHaveLength(0);
  });

  it("removes the clone even when html2canvas fails (no leak)", async () => {
    h2c.mockRejectedValue(new Error("canvas boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const el = document.createElement("div");
    el.innerHTML = "<p>hi</p>";

    await expect(exportAsPdf(el, "doc.pdf")).rejects.toThrow("canvas boom");

    // The off-screen clone must NOT be left attached to the document.
    expect(document.querySelectorAll('div[style*="-9999px"]')).toHaveLength(0);
  });
});
