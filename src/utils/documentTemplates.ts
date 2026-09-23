import type { TemplateField, TemplateValue } from "../types/document";
import { documentRoot } from "./documentOperations";
export interface TemplateProblem {
  field: string;
  message: string;
  occurrences: number;
}
export interface TemplateResult {
  html: string;
  problems: TemplateProblem[];
}
const safePath = /^[a-zA-Z_][a-zA-Z0-9_.-]{0,100}$/;
const forbidden = new Set(["__proto__", "constructor", "prototype"]);
export function readTemplateValue(
  data: Record<string, TemplateValue>,
  path: string,
): TemplateValue | undefined {
  if (!safePath.test(path) || path.split(".").some((p) => forbidden.has(p)))
    return undefined;
  let value: TemplateValue | undefined = data;
  for (const part of path.split(".")) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !Object.prototype.hasOwnProperty.call(value, part)
    )
      return undefined;
    value = value[part];
  }
  return value;
}
function format(value: TemplateValue | undefined, locale: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number")
    return new Intl.NumberFormat(locale).format(value);
  if (typeof value === "boolean") return String(value);
  return typeof value === "string" ? value : "";
}
export function renderDocumentTemplate(
  html: string,
  fields: TemplateField[],
  dataset: Record<string, TemplateValue>,
  locale = "en",
): TemplateResult {
  const data = Object.assign(Object.create(null), dataset) as Record<
    string,
    TemplateValue
  >;
  const root = documentRoot(html);
  const problems: TemplateProblem[] = [];
  const formatted = new Map<string, string>();
  const seen = new Set<string>();
  for (const field of fields) {
    if (
      !safePath.test(field.name) ||
      field.name.split(".").some((p) => forbidden.has(p))
    )
      throw new Error("Invalid template field name.");
    if (seen.has(field.name))
      throw new Error("Template field names must be unique.");
    seen.add(field.name);
    let value = readTemplateValue(data, field.name);
    if (
      value === undefined &&
      field.default !== undefined &&
      !field.name.includes(".")
    ) {
      data[field.name] = field.default;
      value = field.default;
    }
    const missing = value === undefined || value === null || value === "";
    const valid =
      missing ||
      (field.type === "list"
        ? Array.isArray(value)
        : field.type === "date"
          ? typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value
          : field.type === "number"
            ? typeof value === "number" && Number.isFinite(value)
            : typeof value === field.type);
    const occurrences = Array.from(root.querySelectorAll("*")).filter(
      (el) =>
        Array.from(el.childNodes).some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "")
              .replace(/\s+/g, "")
              .includes("{{" + field.name + "}}"),
        ) || el.getAttribute("data-variable") === field.name,
    ).length;
    if ((field.required && missing) || !valid)
      problems.push({
        field: field.name,
        message: !valid
          ? "Value has the wrong type."
          : "Required value is missing.",
        occurrences,
      });
    if (!missing && valid) {
      if (field.type === "date" && typeof value === "string")
        formatted.set(
          field.name,
          new Intl.DateTimeFormat(locale, {
            timeZone: "UTC",
            ...(field.format === "date-long"
              ? { dateStyle: "long" as const }
              : {}),
          }).format(new Date(value)),
        );
      else if (typeof value === "number")
        formatted.set(
          field.name,
          new Intl.NumberFormat(
            locale,
            field.format === "percent"
              ? { style: "percent" }
              : field.format === "integer"
                ? { maximumFractionDigits: 0 }
                : {},
          ).format(value),
        );
    }
  }
  let produced = 0;
  function process(
    parent: HTMLElement,
    scope: Record<string, TemplateValue>,
    depth: number,
  ) {
    if (depth > 4) throw new Error("Template nesting limit exceeded.");
    for (const el of Array.from(parent.children) as HTMLElement[]) {
      const condition = el.getAttribute("data-nle-if");
      if (condition) {
        const negate = condition.startsWith("!");
        const name = negate ? condition.slice(1) : condition;
        if (!safePath.test(name))
          throw new Error("Invalid template condition.");
        const val = readTemplateValue(scope, name);
        const truth = Array.isArray(val) ? val.length > 0 : Boolean(val);
        if (truth === negate) {
          el.remove();
          continue;
        }
        el.removeAttribute("data-nle-if");
      }
      const repeat = el.getAttribute("data-nle-repeat");
      if (repeat) {
        const values = readTemplateValue(scope, repeat);
        if (values !== undefined && !Array.isArray(values))
          throw new Error("Repeated data must be a list.");
        if (Array.isArray(values))
          for (const item of values) {
            if (++produced > 1000)
              throw new Error("Template output limit exceeded.");
            const copy = el.cloneNode(true) as HTMLElement;
            copy.removeAttribute("data-nle-repeat");
            copy.removeAttribute("data-nle-id");
            copy.removeAttribute("id");
            copy.querySelectorAll("[id],[data-nle-id]").forEach((n) => {
              n.removeAttribute("id");
              n.removeAttribute("data-nle-id");
            });
            el.parentNode!.insertBefore(copy, el);
            processElement(
              copy,
              Object.assign(Object.create(null), scope, { item }),
              depth + 1,
            );
          }
        el.remove();
        continue;
      }
      processElement(el, scope, depth);
    }
    for (const child of Array.from(parent.childNodes))
      if (child.nodeType === Node.TEXT_NODE)
        child.textContent = substitute(child.textContent ?? "", scope);
  }
  function substitute(text: string, scope: Record<string, TemplateValue>) {
    return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_all, name: string) => {
      const value = readTemplateValue(scope, name);
      if (value === undefined && !problems.some((p) => p.field === name))
        problems.push({
          field: name,
          message: "No value was provided.",
          occurrences: 1,
        });
      return formatted.get(name) ?? format(value, locale);
    });
  }
  function processElement(
    el: HTMLElement,
    scope: Record<string, TemplateValue>,
    depth: number,
  ) {
    if (el.classList.contains("editor-variable")) {
      const name = el.getAttribute("data-variable") ?? "";
      const value = readTemplateValue(scope, name);
      if (value === undefined && !problems.some((p) => p.field === name))
        problems.push({
          field: name,
          message: "No value was provided.",
          occurrences: 1,
        });
      el.replaceWith(
        document.createTextNode(formatted.get(name) ?? format(value, locale)),
      );
      return;
    }
    process(el, scope, depth);
  }
  process(root, data, 0);
  if (root.innerHTML.length > 2_000_000)
    throw new Error("Generated document is too large.");
  return { html: root.innerHTML, problems };
}
