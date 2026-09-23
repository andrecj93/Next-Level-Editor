import type {
  CitationSource,
  DocumentMetadata,
  DocumentNote,
} from "../types/document";
import { cloneDocument, operationId } from "./documentDiagnostics";

export const REFERENCE_CLIPBOARD_TYPE =
  "application/x-next-level-editor-references+json";
const attribute = "data-nle-reference-fragment";
const maxPayload = 1_000_000;
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^nle-[a-zA-Z0-9-]{1,90}$/.test(value);
interface ReferencePayload {
  version: 1;
  documentId: string;
  sources: CitationSource[];
  notes: DocumentNote[];
}
// Template contents are inert, including media and scripts in untrusted HTML.
function fragment(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template;
}
function readPayload(raw: string): ReferencePayload | null {
  if (!raw || raw.length > maxPayload) return null;
  try {
    const value = JSON.parse(raw) as ReferencePayload;
    if (
      value?.version !== 1 ||
      typeof value.documentId !== "string" ||
      value.documentId.length > 1000
    )
      return null;
    if (
      !Array.isArray(value.sources) ||
      !Array.isArray(value.notes) ||
      value.sources.length > 1000 ||
      value.notes.length > 1000
    )
      return null;
    const sources: CitationSource[] = [],
      notes: DocumentNote[] = [];
    for (const source of value.sources) {
      if (
        !source ||
        !validId(source.id) ||
        sources.some((s) => s.id === source.id)
      )
        return null;
      const record: CitationSource = {
        id: source.id,
        author: "",
        title: "",
        year: "",
      };
      for (const key of [
        "author",
        "title",
        "year",
        "publisher",
        "url",
        "locator",
      ] as const) {
        const text = source[key];
        if (text === undefined && !["author", "title", "year"].includes(key))
          continue;
        if (
          typeof text !== "string" ||
          text.length > (key === "locator" ? 120 : 10000)
        )
          return null;
        record[key] = text;
      }
      if (record.url && !/^https?:\/\//i.test(record.url)) return null;
      if (
        source.type !== undefined &&
        source.type !== "book" &&
        source.type !== "webpage"
      )
        return null;
      if (source.type) record.type = source.type;
      sources.push(record);
    }
    for (const note of value.notes) {
      if (
        !note ||
        !validId(note.id) ||
        typeof note.text !== "string" ||
        note.text.length > 10000 ||
        notes.some((n) => n.id === note.id)
      )
        return null;
      notes.push({ id: note.id, text: note.text });
    }
    return { version: 1, documentId: value.documentId, sources, notes };
  } catch {
    return null;
  }
}
const sourceKey = (source: CitationSource) =>
  JSON.stringify([
    source.author,
    source.title,
    source.year,
    source.publisher ?? "",
    source.url ?? "",
    source.type ?? "book",
  ]);

/** Copies only definitions referenced by this selection, never the whole document metadata. */
export function createReferenceFragment(
  html: string,
  metadata: DocumentMetadata,
  documentId: string,
): { html: string; data: string } | null {
  const content = fragment(html);
  const cited = new Set(
    Array.from(content.content.querySelectorAll("[data-nle-cite]")).map((el) =>
      el.getAttribute("data-nle-cite"),
    ),
  );
  const noted = new Set(
    Array.from(content.content.querySelectorAll("[data-nle-note]")).map((el) =>
      el.getAttribute("data-nle-note"),
    ),
  );
  if (!cited.size && !noted.size) return null;
  const payload = readPayload(
    JSON.stringify({
      version: 1,
      documentId,
      sources: metadata.sources.filter((s) => cited.has(s.id)),
      notes: metadata.notes.filter((n) => noted.has(n.id)),
    }),
  );
  if (!payload)
    throw new Error(
      "The reference selection is too large or contains invalid definitions. Copy a smaller passage.",
    );
  const data = JSON.stringify(payload);
  const wrapper = document.createElement("div");
  wrapper.setAttribute(attribute, data);
  wrapper.append(content.content);
  return { html: wrapper.outerHTML, data };
}

export function hasReferenceFragment(html: string, data = ""): boolean {
  return (
    Boolean(data) ||
    /data-nle-(?:reference-fragment|cite|note|generated)\s*=/i.test(html)
  );
}

/** Remaps internal links as a group; an imported ID can never shadow a destination ID. */
export function remapFragmentAnchors(root: ParentNode): void {
  const ids = new Map<string, string>();
  root.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
    const before = el.id,
      after = "nle-note-" + operationId();
    if (!ids.has(before)) ids.set(before, after);
    el.id = after;
  });
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((el) => {
    const before = el.getAttribute("href")!.slice(1),
      after = ids.get(before);
    if (after) el.setAttribute("href", "#" + after);
    else if (/^nle-(note|ref)-/.test(before)) el.removeAttribute("href");
  });
}

/** Untrusted clipboard/import boundary. The caller commits HTML and metadata together. */
export function importReferenceFragment(options: {
  html: string;
  data?: string;
  metadata: DocumentMetadata;
  documentId: string;
  sanitize: (html: string) => string;
  /** Plain-HTML consumers retain visible text but cannot persist reference definitions. */
  preserveDefinitions?: boolean;
}) {
  if (options.html.length > 20_000_000)
    throw new Error("The pasted content is too large. Copy a smaller passage.");
  const incoming = fragment(options.html);
  const envelopes = incoming.content.querySelectorAll(`[${attribute}]`);
  const raw =
    options.data ||
    (envelopes.length === 1 ? envelopes[0].getAttribute(attribute)! : "");
  const payload =
    options.preserveDefinitions === false ? null : readPayload(raw);
  for (const envelope of envelopes)
    envelope.replaceWith(...Array.from(envelope.childNodes));
  const content = fragment(options.sanitize(incoming.innerHTML));
  const root = content.content,
    metadata = cloneDocument(options.metadata);
  let sourcesAdded = 0,
    notesAdded = 0,
    unresolved = 0;
  const sourceMap = new Map<string, string>(),
    noteMap = new Map<string, string>();
  const sourceDefinitions = new Map(
    payload?.sources.map((source) => [source.id, source]),
  );
  const noteDefinitions = new Map(
    payload?.notes.map((note) => [note.id, note]),
  );
  const existingNotes = new Map(metadata.notes.map((note) => [note.id, note]));
  const equivalentSources = new Map(
    metadata.sources
      .filter((source) => validId(source.id))
      .map((source) => [sourceKey(source), source.id]),
  );
  const used = new Set(
    [...metadata.sources, ...metadata.notes].map((record) => record.id),
  );
  const nextId = () => {
    let id: string;
    do {
      id = operationId();
    } while (used.has(id));
    used.add(id);
    return id;
  };
  // Generated end matter is rebuilt against the destination document. Without
  // a payload, preserve its readable text as ordinary imported paragraphs.
  root.querySelectorAll("[data-nle-generated]").forEach((el) => {
    if (payload) el.remove();
    else el.removeAttribute("data-nle-generated");
  });
  root
    .querySelectorAll<HTMLElement>("[data-nle-cite], [data-nle-note]")
    .forEach((el) => {
      if (
        el.hasAttribute("data-nle-cite") &&
        el.hasAttribute("data-nle-note")
      ) {
        for (const key of [
          "data-nle-cite",
          "data-nle-note",
          "data-nle-locator",
          "id",
          "href",
        ])
          el.removeAttribute(key);
        unresolved++;
        return;
      }
      const kind = el.hasAttribute("data-nle-cite") ? "source" : "note";
      const key = kind === "source" ? "data-nle-cite" : "data-nle-note";
      const previous = el.getAttribute(key)!;
      const map = kind === "source" ? sourceMap : noteMap;
      const source =
        kind === "source" ? sourceDefinitions.get(previous) : undefined;
      // The source default belongs to every occurrence, even when the
      // definition is deduplicated against a destination with a different locator.
      if (source?.locator && !el.hasAttribute("data-nle-locator"))
        el.setAttribute("data-nle-locator", source.locator);
      let id = map.get(previous);
      if (!id && kind === "source") {
        if (source) {
          const key = sourceKey(source);
          id = equivalentSources.get(key);
          if (!id) {
            id = nextId();
            metadata.sources.push({ ...source, id });
            equivalentSources.set(key, id);
            sourcesAdded++;
          }
        }
      } else if (!id) {
        const note = noteDefinitions.get(previous);
        if (note) {
          const existing = existingNotes.get(previous);
          id =
            payload?.documentId === options.documentId &&
            existing?.text === note.text
              ? existing.id
              : undefined;
          if (!id) {
            id = nextId();
            metadata.notes.push({ ...note, id });
            notesAdded++;
          }
        }
      }
      el.removeAttribute("id");
      if (kind === "note") el.removeAttribute("href");
      if (id) {
        el.setAttribute(key, id);
        map.set(previous, id);
      } else {
        el.removeAttribute(key);
        el.removeAttribute("data-nle-locator");
        unresolved++;
      }
    });
  // Cross-document text never adopts an unrelated destination review/comment identity.
  root.querySelectorAll("*").forEach((el) => {
    for (const key of [
      "data-nle-id",
      "data-nle-suggestion",
      "data-nle-deletion",
      "data-thread-id",
      "data-comment-thread",
    ])
      el.removeAttribute(key);
    el.classList.remove("comment-highlight");
  });
  remapFragmentAnchors(root);
  if (metadata.sources.length > 10000 || metadata.notes.length > 10000)
    throw new Error("The document reference limit has been reached.");
  return {
    html: options.sanitize(content.innerHTML),
    metadata,
    sourcesAdded,
    notesAdded,
    unresolved,
    invalidPayload:
      options.preserveDefinitions !== false &&
      Boolean(raw || envelopes.length) &&
      !payload,
  };
}

/** Keeps the insertion caret after reference labels change length during renumbering. */
export function formatReferenceCaret(
  html: string,
  caret: number,
  format: (html: string) => string,
) {
  const container = document.createElement("div");
  container.append(fragment(html).content);
  const marker = document.createElement("span"),
    key = operationId();
  marker.setAttribute("data-nle-caret", key);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null,
    remaining = caret;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, remaining));
      range.collapse(true);
      range.insertNode(marker);
      // Citation/note labels are replaced atomically by the formatter.
      const reference = marker.closest("[data-nle-cite], [data-nle-note]");
      if (reference) reference.after(marker);
      break;
    }
    remaining -= length;
  }
  if (!marker.parentNode) container.append(marker);
  container.innerHTML = format(container.innerHTML);
  const position = container.querySelector(`[data-nle-caret="${key}"]`);
  if (!position)
    throw new Error(
      "Choose a passage outside generated notes or bibliography.",
    );
  const prefix = document.createRange();
  prefix.selectNodeContents(container);
  prefix.setEndBefore(position);
  const nextCaret = prefix.toString().length;
  position.remove();
  return { html: container.innerHTML, caret: nextCaret };
}
