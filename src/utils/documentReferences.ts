import type {
  CitationSource,
  DocumentMetadata,
  CitationFormatter,
} from "../types/document";
import { documentRoot } from "./documentOperations";
const safeUrl = (value: string) => /^https?:\/\//i.test(value);
export function formatCitation(
  source: CitationSource,
  style: "apa" | "numbered",
  index: number,
): string {
  if (style === "numbered") return "[" + (index + 1) + "]";
  return (
    "(" +
    (source.author.trim() || "Unknown author") +
    ", " +
    (source.year.trim() || "n.d.") +
    ")"
  );
}
export function renderReferences(
  html: string,
  metadata: DocumentMetadata,
  formatter?: CitationFormatter,
): string {
  const root = documentRoot(html);
  root.querySelectorAll("[data-nle-generated]").forEach((el) => el.remove());
  const usedSources: string[] = [],
    usedNotes: string[] = [];
  const citedIds = new Set(
    Array.from(root.querySelectorAll("[data-nle-cite]")).map((el) =>
      el.getAttribute("data-nle-cite"),
    ),
  );
  const citedSources = metadata.sources.filter((s) => citedIds.has(s.id));
  if (metadata.citationStyle === "apa" && citedSources.length && !formatter)
    throw new Error("The APA formatter has not loaded. Try again.");
  const formatted =
    metadata.citationStyle === "apa" && citedSources.length
      ? formatter!.format(citedSources, metadata.page.language)
      : undefined;
  root.querySelectorAll<HTMLElement>("[data-nle-cite]").forEach((el) => {
    const id = el.getAttribute("data-nle-cite")!;
    const source = metadata.sources.find((s) => s.id === id);
    if (!source) {
      el.textContent = "[Missing source]";
      return;
    }
    if (!usedSources.includes(id)) usedSources.push(id);
    el.textContent =
      formatted?.citation(
        id,
        el.getAttribute("data-nle-locator") ?? source.locator,
      ) ??
      formatCitation(source, metadata.citationStyle, usedSources.indexOf(id));
  });
  const occurrences = new Map<string, string[]>();
  root.querySelectorAll<HTMLElement>("[data-nle-note]").forEach((el) => {
    const id = el.getAttribute("data-nle-note")!;
    if (!usedNotes.includes(id)) usedNotes.push(id);
    const index = usedNotes.indexOf(id) + 1;
    el.textContent = "[" + index + "]";
    const references = occurrences.get(id) ?? [];
    const refId =
      "nle-ref-" + id + (references.length ? "-" + references.length : "");
    references.push(refId);
    occurrences.set(id, references);
    el.setAttribute("id", refId);
    if (el.tagName === "A") el.setAttribute("href", "#nle-note-" + id);
  });
  if (usedNotes.length) {
    const heading = document.createElement("h2");
    heading.setAttribute("data-nle-generated", "notes");
    heading.textContent = metadata.page.language.startsWith("pt")
      ? "Notas"
      : "Notes";
    root.appendChild(heading);
    usedNotes.forEach((id, index) => {
      const paragraph = document.createElement("p");
      paragraph.setAttribute("data-nle-generated", "notes");
      paragraph.id = "nle-note-" + id;
      paragraph.textContent =
        index +
        1 +
        ". " +
        (metadata.notes.find((n) => n.id === id)?.text ?? "[Missing note]") +
        " ";
      for (const [occurrence, refId] of (occurrences.get(id) ?? []).entries()) {
        const back = document.createElement("a");
        back.href = "#" + refId;
        back.textContent = "↩" + (occurrence ? String(occurrence + 1) : "");
        back.setAttribute(
          "title",
          metadata.page.language.startsWith("pt")
            ? "Voltar à referência"
            : "Back to reference",
        );
        paragraph.append(back, " ");
      }
      root.appendChild(paragraph);
    });
  }
  if (usedSources.length) {
    const heading = document.createElement("h2");
    heading.setAttribute("data-nle-generated", "bibliography");
    heading.textContent = metadata.page.language.startsWith("pt")
      ? "Bibliografia"
      : "Bibliography";
    root.appendChild(heading);
    (formatted?.bibliography.map((entry) => entry.id) ?? usedSources).forEach(
      (id, index) => {
        const source = metadata.sources.find((s) => s.id === id)!;
        const p = document.createElement("p");
        p.setAttribute("data-nle-generated", "bibliography");
        const entry = formatted?.bibliography.find((entry) => entry.id === id);
        if (entry) {
          const holder = documentRoot(entry.html);
          p.innerHTML =
            holder.querySelector(".csl-entry")?.innerHTML ?? holder.innerHTML;
        } else {
          p.textContent =
            "[" +
            (index + 1) +
            "] " +
            (source.author || "Unknown author") +
            ". (" +
            (source.year || "n.d.") +
            "). " +
            source.title +
            ". " +
            (source.publisher ?? "") +
            " ";
          if (source.url && safeUrl(source.url)) {
            const a = document.createElement("a");
            a.href = source.url;
            a.textContent = source.url;
            p.appendChild(a);
          }
        }
        root.appendChild(p);
      },
    );
  }
  return root.innerHTML;
}
