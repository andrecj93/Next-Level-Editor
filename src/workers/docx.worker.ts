import mammoth from "mammoth/mammoth.browser";
import { zipSync } from "fflate";
import { expandDocxArchive, type DocxLimits } from "../utils/docxArchive";
self.onmessage = async (
  event: MessageEvent<{ buffer: ArrayBuffer; limits: DocxLimits }>,
) => {
  try {
    const { buffer, limits } = event.data;
    const files = expandDocxArchive(buffer, limits);
    const xml = new TextDecoder().decode(files["word/document.xml"]);
    for (const [name, bytes] of Object.entries(files))
      if (
        /\.(?:xml|rels)$/i.test(name) &&
        /<!DOCTYPE|<!ENTITY/i.test(new TextDecoder().decode(bytes))
      )
        throw new Error("Document entity declarations are not supported.");
    const trackedChanges = /<\w+:(?:ins|del|moveFrom|moveTo)\b/.test(xml);
    const warnings: string[] = [];
    if (trackedChanges)
      warnings.push(
        "This file contains tracked changes. Only the accepted-text view can be imported; review metadata will not be retained.",
      );
    const unsupported: [RegExp, string][] = [
      [/<\w+:commentRangeStart\b/, "Comments are not imported."],
      [
        /<\w+:footnoteReference\b/,
        "Footnotes are converted to linked endnotes; verify numbering.",
      ],
      [
        /<\w+:(?:headerReference|footerReference)\b/,
        "Headers and footers are not imported.",
      ],
      [/<\w+:sectPr\b/, "Word page geometry is not retained."],
      [/<\w+:fldChar\b/, "Calculated fields require review after conversion."],
    ];
    for (const [pattern, warning] of unsupported)
      if (pattern.test(xml)) warnings.push(warning);
    const relationships = Object.entries(files)
      .filter(([name]) => name.endsWith(".rels"))
      .map(([, bytes]) => new TextDecoder().decode(bytes))
      .join("");
    if (/TargetMode=["']External["']/i.test(relationships))
      warnings.push(
        "External resources were not fetched. Hyperlinks are retained only after sanitization.",
      );
    const normalized = zipSync(files, { level: 0 });
    const result = await mammoth.convertToHtml(
      { arrayBuffer: normalized.buffer as ArrayBuffer },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        ignoreEmptyParagraphs: false,
        convertImage: mammoth.images.imgElement(async (image) => {
          if (!/^image\/(png|jpeg|gif|webp)$/.test(image.contentType)) {
            warnings.push("An unsupported image was omitted.");
            return { src: "" };
          }
          return {
            src:
              "data:" +
              image.contentType +
              ";base64," +
              (await image.readAsBase64String()),
          };
        }),
      },
    );
    self.postMessage({
      html: result.value,
      converter: "mammoth 1.12.3",
      trackedChanges,
      warnings: [
        ...warnings,
        ...result.messages.map((message) => message.message),
      ],
      structures: {
        paragraphs: (result.value.match(/<p\b/g) ?? []).length,
        headings: (result.value.match(/<h[1-6]\b/g) ?? []).length,
        tables: (result.value.match(/<table\b/g) ?? []).length,
        images: (result.value.match(/<img\b/g) ?? []).length,
      },
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Word conversion failed.",
    });
  }
};
