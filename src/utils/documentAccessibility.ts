import { fingerprint } from "./documentDiagnostics";
export type ContentRule =
  | "image-alt"
  | "heading-order"
  | "link-purpose"
  | "table-header"
  | "text-contrast";
export interface ContentFinding {
  id: string;
  rule: ContentRule;
  severity: "warning" | "error" | "manual";
  message: string;
  index: number;
  signature: string;
}
const selector = "img,h1,h2,h3,h4,h5,h6,a,table,[style]";
function rgb(value: string): number[] | null {
  const match = value.match(
    /^rgb[a]?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i,
  );
  if (match && (!match[4] || Number(match[4]) === 1))
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  const hex = value.match(/^#([a-f\d]{6}|[a-f\d]{3})$/i);
  if (hex) {
    const v =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  }
  return null;
}
export function contrastRatio(a: number[], b: number[]): number {
  const luminance = (c: number[]) =>
    c
      .map((v) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      })
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function auditDocument(root: HTMLElement): ContentFinding[] {
  const result: ContentFinding[] = [];
  let heading = 0;
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
  elements.forEach((el, index) => {
    const add = (
      rule: ContentRule,
      severity: ContentFinding["severity"],
      message: string,
    ) => {
      const signature = fingerprint(el.outerHTML);
      result.push({
        id: rule + ":" + index + ":" + signature,
        rule,
        severity,
        message,
        index,
        signature,
      });
    };
    if (el.tagName === "IMG" && !el.hasAttribute("alt"))
      add(
        "image-alt",
        "error",
        "Add an image description or explicitly mark the image as decorative.",
      );
    if (/^H[1-6]$/.test(el.tagName)) {
      const level = Number(el.tagName[1]);
      if (level > heading + 1)
        add(
          "heading-order",
          "warning",
          "Check whether this heading skips a level intentionally.",
        );
      heading = level;
    }
    if (
      el.tagName === "A" &&
      /^(click here|here|read more|link|clique aqui|aqui|ler mais)?[.!\s]*$/i.test(
        el.textContent?.trim() ?? "",
      )
    )
      add(
        "link-purpose",
        "warning",
        "Use link text that describes its destination.",
      );
    if (el.tagName === "TABLE" && !el.querySelector("th"))
      add(
        "table-header",
        "warning",
        "Identify header cells if this is a data table.",
      );
    if (el.style.color) {
      const fg = rgb(el.style.color),
        bg = rgb(el.style.backgroundColor);
      if (fg && bg && contrastRatio(fg, bg) < 4.5)
        add(
          "text-contrast",
          "warning",
          "Text contrast is below 4.5:1. Use a clearer foreground/background pair.",
        );
      else if (!fg || !bg)
        add(
          "text-contrast",
          "manual",
          "Contrast needs a manual check because the background or colour cannot be determined reliably.",
        );
    }
  });
  return result;
}
export function findingTarget(
  root: HTMLElement,
  finding: ContentFinding,
): HTMLElement | null {
  const el = root.querySelectorAll<HTMLElement>(selector)[finding.index];
  return el && fingerprint(el.outerHTML) === finding.signature ? el : null;
}
export function repairFinding(
  root: HTMLElement,
  finding: ContentFinding,
  value: string,
): void {
  const el = findingTarget(root, finding);
  if (!el)
    throw new Error("This passage changed. Run the document check again.");
  if (finding.rule === "image-alt")
    el.setAttribute("alt", value.slice(0, 2000));
  if (finding.rule === "heading-order") {
    if (!/^[1-6]$/.test(value))
      throw new Error("Choose a heading level from 1 to 6.");
    const heading = document.createElement("h" + value);
    Array.from(el.attributes).forEach((attr) =>
      heading.setAttribute(attr.name, attr.value),
    );
    while (el.firstChild) heading.appendChild(el.firstChild);
    el.replaceWith(heading);
  }
  if (finding.rule === "link-purpose") {
    if (!value.trim()) throw new Error("Enter meaningful link text.");
    el.textContent = value;
  }
  if (finding.rule === "table-header") {
    el.querySelector("tr")
      ?.querySelectorAll("td")
      .forEach((cell) => {
        const header = document.createElement("th");
        Array.from(cell.attributes).forEach((attr) =>
          header.setAttribute(attr.name, attr.value),
        );
        header.setAttribute("scope", "col");
        while (cell.firstChild) header.appendChild(cell.firstChild);
        cell.replaceWith(header);
      });
  }
  if (finding.rule === "text-contrast") {
    el.style.color = "#111111";
    el.style.backgroundColor = "#ffffff";
  }
}
