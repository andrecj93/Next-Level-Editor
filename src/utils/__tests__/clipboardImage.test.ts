import { describe, it, expect } from "vitest";
import {
  pickImageFile,
  hasFileTransfer,
  htmlHasVisibleContent,
  htmlHasStructure,
  isInsertableImage,
  readFileAsDataUrl,
  MAX_PASTED_IMAGE_BYTES,
} from "../clipboardImage";

const imageFile = (bytes = 4, type = "image/png") =>
  new File([new Uint8Array(bytes)], "shot.png", { type });

const fileItem = (file: File | null, type = "image/png"): DataTransferItem =>
  ({
    kind: "file",
    type,
    getAsFile: () => file,
  }) as unknown as DataTransferItem;

const stringItem = (): DataTransferItem =>
  ({
    kind: "string",
    type: "text/plain",
    getAsFile: () => null,
  }) as unknown as DataTransferItem;

describe("hasFileTransfer (#r16-5)", () => {
  it("detects a non-image file in the files list", () => {
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(hasFileTransfer({ files: [pdf] })).toBe(true);
  });

  it("detects a file-kind item even when getAsFile is unavailable", () => {
    expect(hasFileTransfer({ items: [fileItem(null, "application/zip")] })).toBe(
      true
    );
  });

  it("is false for string-only transfers and empty sources", () => {
    expect(hasFileTransfer({ items: [stringItem()] })).toBe(false);
    expect(hasFileTransfer({})).toBe(false);
    expect(hasFileTransfer(null)).toBe(false);
  });
});

describe("htmlHasVisibleContent (#r16-1)", () => {
  it("is true for text and for meaningful media", () => {
    expect(htmlHasVisibleContent("<p>hi</p>")).toBe(true);
    expect(htmlHasVisibleContent('<img src="data:image/png;base64,AA==">')).toBe(
      true
    );
    expect(htmlHasVisibleContent("<table><tr><td>A</td></tr></table>")).toBe(
      true
    );
    expect(htmlHasVisibleContent("<hr>")).toBe(true);
  });

  it("does NOT count bare list structure as visible — a stripped-image list item must prefer the bitmap (#r18)", () => {
    // A bare empty list (an image-only <li> whose <img src=file://> the
    // sanitizer stripped) is NOT "visible content": if a bitmap is on the
    // clipboard it must win. Bare-li visibility is decided by htmlHasStructure
    // (consulted only AFTER the bitmap fallback), never here.
    expect(htmlHasVisibleContent("<ul><li></li></ul>")).toBe(false);
    expect(
      htmlHasVisibleContent(
        '<ul class="checklist"><li data-checked="true" role="checkbox" aria-checked="true"><br></li></ul>'
      )
    ).toBe(false);
  });

  it("is false for empty markup and for a src-stripped image husk", () => {
    expect(htmlHasVisibleContent("")).toBe(false);
    expect(htmlHasVisibleContent("  \n ")).toBe(false);
    expect(htmlHasVisibleContent("<p>  </p><div><span></span></div>")).toBe(
      false
    );
    // What the sanitizer leaves of Office's file:/// single-image html.
    expect(htmlHasVisibleContent("<img>")).toBe(false);
  });
});

describe("htmlHasStructure — text-less structure worth pasting last (#r18)", () => {
  it("is true for a list (empty checklist / bare list item)", () => {
    expect(
      htmlHasStructure(
        '<ul class="checklist"><li data-checked="true"><br></li></ul>'
      )
    ).toBe(true);
    expect(htmlHasStructure("<ul><li></li></ul>")).toBe(true);
  });

  it("is false for a plain image husk or empty markup", () => {
    expect(htmlHasStructure("<img>")).toBe(false);
    expect(htmlHasStructure("<p></p>")).toBe(false);
    expect(htmlHasStructure("")).toBe(false);
  });
});

describe("pickImageFile", () => {
  it("returns an image from the files list", () => {
    const f = imageFile();
    expect(pickImageFile({ files: [f] })).toBe(f);
  });

  it("returns an image materialised from the items list", () => {
    const f = imageFile();
    expect(pickImageFile({ items: [stringItem(), fileItem(f)] })).toBe(f);
  });

  it("ignores non-image files and string items", () => {
    const txt = new File(["x"], "a.txt", { type: "text/plain" });
    expect(pickImageFile({ files: [txt], items: [stringItem()] })).toBeNull();
  });

  it("returns null for an empty or missing payload", () => {
    expect(pickImageFile(null)).toBeNull();
    expect(pickImageFile({})).toBeNull();
  });
});

describe("isInsertableImage", () => {
  it("accepts a small image", () => {
    expect(isInsertableImage(imageFile(100))).toBe(true);
  });

  it("rejects an empty file", () => {
    expect(isInsertableImage(imageFile(0))).toBe(false);
  });

  it("rejects a file over the cap", () => {
    const big = { type: "image/png", size: MAX_PASTED_IMAGE_BYTES + 1 } as File;
    expect(isInsertableImage(big)).toBe(false);
  });

  it("rejects a non-image", () => {
    expect(
      isInsertableImage(new File(["x"], "a.txt", { type: "text/plain" }))
    ).toBe(false);
  });
});

describe("readFileAsDataUrl", () => {
  it("reads an image blob as a data URL", async () => {
    const url = await readFileAsDataUrl(imageFile());
    expect(url.startsWith("data:image/png")).toBe(true);
  });
});
