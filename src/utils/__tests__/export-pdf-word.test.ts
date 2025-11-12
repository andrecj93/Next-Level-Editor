import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportAsPdf, exportAsWord } from "../export";

// Mock the external libraries
vi.mock("jspdf", () => {
  class MockJsPDF {
    addImage = vi.fn();
    addPage = vi.fn();
    save = vi.fn();
  }
  return {
    default: MockJsPDF,
  };
});

vi.mock("html2canvas", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => "data:image/png;base64,test",
      width: 800,
      height: 600,
    })
  ),
}));

vi.mock("html-docx-js-typescript", () => ({
  asBlob: vi.fn(() =>
    Promise.resolve(
      new Blob(["test"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    )
  ),
}));

describe("PDF and Word Export Tests", () => {
  // Shared setup for both test suites
  beforeEach(() => {
    // Mock document methods
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => null as any
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => null as any
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    // Mock link click and remove
    const mockClick = vi.fn();
    const mockRemove = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const element = {
        style: {},
        innerHTML: "",
        click: mockClick,
        remove: mockRemove,
        href: "",
        download: "",
      } as any;

      if (tag === "a") {
        element.click = mockClick;
        element.remove = mockRemove;
      }

      if (tag === "div") {
        element.remove = mockRemove;
      }

      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("exportAsPdf", () => {
    it("exports PDF with default filename", async () => {
      const mockElement = document.createElement("div");
      mockElement.innerHTML = "<p>Test content</p>";

      await expect(exportAsPdf(mockElement)).resolves.not.toThrow();
    });

    it("exports PDF with custom filename", async () => {
      const mockElement = document.createElement("div");
      mockElement.innerHTML = "<p>Test content</p>";

      await expect(
        exportAsPdf(mockElement, "custom.pdf")
      ).resolves.not.toThrow();
    });
  });

  describe("exportAsWord", () => {
    it("exports Word with default filename", async () => {
      const html = "<p>Test content</p>";

      await expect(exportAsWord(html)).resolves.not.toThrow();
    });

    it("exports Word with custom filename", async () => {
      const html = "<p>Test content</p>";

      await expect(exportAsWord(html, "custom.docx")).resolves.not.toThrow();
    });

    it("handles HTML with various elements", async () => {
      const html =
        "<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p><ul><li>Item 1</li><li>Item 2</li></ul>";

      await expect(exportAsWord(html)).resolves.not.toThrow();
    });
  });
});
