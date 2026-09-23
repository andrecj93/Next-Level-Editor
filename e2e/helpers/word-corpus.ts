import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";

// Upstream fixtures are read from the lockfile-pinned Mammoth 1.12.3 package.
// Their BSD-2-Clause license stays in node_modules/mammoth/LICENSE; no binaries
// or author metadata are copied into this repository or the editor package.
const upstream = resolve("node_modules/mammoth/test/test-data");
const ns = "http://schemas.openxmlformats.org";
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const run = (text: string, properties = "") =>
  `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ""}<w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
const paragraph = (text: string, properties = "") =>
  `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ""}${run(text)}</w:p>`;
const item = (text: string, level: number) =>
  paragraph(
    text,
    `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="7"/></w:numPr>`,
  );
const image = (id: string, alt: string, drawingId = 1) =>
  `<w:r><w:drawing><wp:inline><wp:extent cx="95250" cy="95250"/><wp:docPr id="${drawingId}" name="Fixture image ${drawingId}" descr="${escape(alt)}"/><a:graphic><a:graphicData uri="${ns}/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="Image ${drawingId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="95250" cy="95250"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const cell = (body: string, properties = "") =>
  `<w:tc>${properties ? `<w:tcPr>${properties}</w:tcPr>` : ""}${body}</w:tc>`;
const table = (rows: string[]) =>
  `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>${rows.join("")}</w:tbl>`;

export interface WordCorpusCase {
  name: string;
  bytes: Buffer;
  sha256: string;
  text: string;
  matches: Record<string, string[]>;
  images?: { alt: string; width: number; height: number; mime: string }[];
}
export type EncodedImages = Record<"jpeg" | "webp", string>;
export const corpusNames = [
  "upstream-list",
  "upstream-table",
  "upstream-strict",
  "upstream-image-relative",
  "upstream-image-root",
  "headings-and-nested-lists",
  "merged-and-nested-tables",
  "jpeg-alt",
  "gif-alt",
  "webp-alt",
] as const;
export type CorpusName = (typeof corpusNames)[number];
const upstreamCases = {
  "upstream-list": {
    file: "simple-list.docx",
    text: "AppleBanana",
    matches: { "ul > li": ["Apple", "Banana"] },
  },
  "upstream-table": {
    file: "tables.docx",
    text: "AboveTop leftTop rightBottom leftBottom rightBelow",
    matches: {
      "table td": ["Top left", "Top right", "Bottom left", "Bottom right"],
      ":scope > p": ["Above", "Below"],
    },
  },
  "upstream-strict": {
    file: "strict-format.docx",
    text: "Test",
    matches: { p: ["Test"] },
  },
  "upstream-image-relative": {
    file: "tiny-picture.docx",
    text: "",
    matches: {},
    images: [{ alt: "", width: 10, height: 10, mime: "png" }],
  },
  "upstream-image-root": {
    file: "tiny-picture-target-base-relative.docx",
    text: "",
    matches: {},
    images: [{ alt: "", width: 10, height: 10, mime: "png" }],
  },
};
function pack(
  body: string,
  pictures: { type: string; bytes: Uint8Array }[] = [],
) {
  const parts: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${pictures.map((p, i) => `<Override PartName="/word/media/image${i}.${p.type}" ContentType="image/${p.type}"/>`).join("")}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rDocument" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ),
    "word/_rels/document.xml.rels": strToU8(
      `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rStyles" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rNumbers" Type="${ns}/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${pictures.map((p, i) => `<Relationship Id="rImage${i}" Type="${ns}/officeDocument/2006/relationships/image" Target="media/image${i}.${p.type}"/>`).join("")}<Relationship Id="rLink" Type="${ns}/officeDocument/2006/relationships/hyperlink" Target="https://example.com/reading" TargetMode="External"/></Relationships>`,
    ),
    "word/styles.xml": strToU8(
      `<w:styles xmlns:w="${ns}/wordprocessingml/2006/main">${Array.from({ length: 6 }, (_, i) => `<w:style w:type="paragraph" w:styleId="Heading${i + 1}"><w:name w:val="heading ${i + 1}"/></w:style>`).join("")}</w:styles>`,
    ),
    "word/numbering.xml": strToU8(
      `<w:numbering xmlns:w="${ns}/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="3">${["decimal", "bullet", "decimal"].map((format, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${format === "bullet" ? "•" : "%" + (level + 1) + "."}"/></w:lvl>`).join("")}</w:abstractNum><w:num w:numId="7"><w:abstractNumId w:val="3"/></w:num></w:numbering>`,
    ),
    "word/document.xml": strToU8(
      `<w:document xmlns:w="${ns}/wordprocessingml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships" xmlns:wp="${ns}/drawingml/2006/wordprocessingDrawing" xmlns:a="${ns}/drawingml/2006/main" xmlns:pic="${ns}/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`,
    ),
  };
  pictures.forEach((p, i) => {
    parts[`word/media/image${i}.${p.type}`] = p.bytes;
  });
  return Buffer.from(
    zipSync(parts, { level: 6, mtime: new Date("2000-01-01T00:00:00Z") }),
  );
}
export function wordCorpus(
  name: CorpusName,
  encoded: EncodedImages,
): WordCorpusCase {
  let data: Omit<WordCorpusCase, "name" | "sha256">;
  if (name in upstreamCases) {
    const value = upstreamCases[name as keyof typeof upstreamCases];
    data = { ...value, bytes: readFileSync(resolve(upstream, value.file)) };
  } else if (name === "headings-and-nested-lists") {
    const headings = Array.from({ length: 6 }, (_, index) =>
      paragraph(
        `Section ${index + 1}`,
        `<w:pStyle w:val="Heading${index + 1}"/>`,
      ),
    ).join("");
    const body =
      headings +
      paragraph("Olá café — العربية עברית 中文 😀.") +
      `<w:p>${run("Bold ", "<w:b/>")}${run("italic ", "<w:i/>")}<w:hyperlink r:id="rLink">${run("Read more")}</w:hyperlink></w:p>` +
      item("Parent one", 0) +
      item("Nested bullet", 1) +
      item("Deep number", 2) +
      item("Parent two", 0) +
      paragraph("Final paragraph.");
    data = {
      bytes: pack(body),
      text: "Section 1Section 2Section 3Section 4Section 5Section 6Olá café — العربية עברית 中文 😀.Bold italic Read moreParent oneNested bulletDeep numberParent twoFinal paragraph.",
      matches: {
        h1: ["Section 1"],
        h2: ["Section 2"],
        h3: ["Section 3"],
        h4: ["Section 4"],
        h5: ["Section 5"],
        h6: ["Section 6"],
        "ol > li > ul > li > ol > li": ["Deep number"],
        "ol > li > ul > li": ["Nested bulletDeep number"],
        strong: ["Bold "],
        em: ["italic "],
        'a[href="https://example.com/reading"]': ["Read more"],
      },
    };
  } else if (name === "merged-and-nested-tables") {
    const nested = table([
      `<w:tr>${cell(paragraph("Inner one"))}${cell(paragraph("Inner two"))}</w:tr>`,
    ]);
    const body =
      paragraph("Before table") +
      table([
        `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell(paragraph("Shared heading"), '<w:gridSpan w:val="2"/>')}</w:tr>`,
        `<w:tr>${cell(paragraph("Merged row"), '<w:vMerge w:val="restart"/>')}${cell(item("Cell list", 0) + item("Nested cell item", 1) + `<w:p>${image("rImage0", "A red square — Olá")}</w:p>`)}</w:tr>`,
        `<w:tr>${cell(paragraph(""), "<w:vMerge/>")}${cell(nested + paragraph("After inner"))}</w:tr>`,
      ]) +
      `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr>${run("Picture in list")}${image("rImage0", "Repeated red square", 2)}</w:p>` +
      paragraph("After table");
    data = {
      bytes: pack(body, [
        {
          type: "png",
          bytes: readFileSync(resolve(upstream, "tiny-picture.png")),
        },
      ]),
      text: "Before tableShared headingMerged rowCell listNested cell itemInner oneInner twoAfter innerPicture in listAfter table",
      matches: {
        'th[colspan="2"]': ["Shared heading"],
        'td[rowspan="2"]': ["Merged row"],
        "td table td": ["Inner one", "Inner two"],
        "td ol > li > ul > li": ["Nested cell item"],
      },
      images: [
        { alt: "A red square — Olá", width: 10, height: 10, mime: "png" },
        { alt: "Repeated red square", width: 10, height: 10, mime: "png" },
      ],
    };
  } else {
    const type = name.slice(0, -4) as "jpeg" | "gif" | "webp";
    const bytes =
      type === "gif"
        ? Buffer.from(
            "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
            "base64",
          )
        : Buffer.from(encoded[type].split(",")[1], "base64");
    data = {
      bytes: pack(
        paragraph("Before image") +
          `<w:p>${image("rImage0", `${type.toUpperCase()} illustration — café`)}</w:p>` +
          paragraph("After image"),
        [{ type, bytes }],
      ),
      text: "Before imageAfter image",
      matches: {},
      images: [
        {
          alt: `${type.toUpperCase()} illustration — café`,
          width: type === "gif" ? 1 : 2,
          height: type === "gif" ? 1 : 2,
          mime: type,
        },
      ],
    };
  }
  return {
    ...data,
    name,
    sha256: createHash("sha256").update(data.bytes).digest("hex"),
  };
}
