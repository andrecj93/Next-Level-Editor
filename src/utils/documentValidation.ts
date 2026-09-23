import {
  defaultDocumentMetadata,
  type DocumentMetadata,
  type DocumentSnapshot,
} from "../types/document";
import { cloneDocument } from "./documentDiagnostics";
/** Stored snapshots and provider payloads are data, including those in browser storage. */
export function validateDocumentSnapshot(
  value: unknown,
  sanitize: (html: string) => string,
): DocumentSnapshot {
  if (!value || typeof value !== "object")
    throw new Error("Invalid document snapshot.");
  const candidate = value as DocumentSnapshot;
  if (typeof candidate.html !== "string" || candidate.html.length > 20_000_000)
    throw new Error("Invalid document content.");
  const raw = candidate.metadata;
  if (
    !raw ||
    raw.schemaVersion !== 1 ||
    !raw.page ||
    typeof raw.comments !== "string"
  )
    throw new Error("Unsupported document metadata.");
  const defaults = defaultDocumentMetadata();
  const metadata = cloneDocument({
    ...defaults,
    ...raw,
    page: { ...defaults.page, ...raw.page },
  }) as DocumentMetadata;
  if (!["apa", "numbered"].includes(metadata.citationStyle))
    throw new Error("Invalid citation style.");
  for (const key of [
    "notes",
    "sources",
    "suggestions",
    "templateFields",
  ] as const) {
    if (!Array.isArray(metadata[key]) || metadata[key].length > 10000)
      throw new Error("Invalid document collection.");
  }
  if (
    !metadata.notes.every(
      (n) => typeof n?.id === "string" && typeof n.text === "string",
    ) ||
    !metadata.sources.every(
      (s) =>
        typeof s?.id === "string" &&
        ["title", "author", "year"].every(
          (k) => typeof s[k as keyof typeof s] === "string",
        ),
    )
  )
    throw new Error("Invalid reference data.");
  for (const suggestion of metadata.suggestions) {
    if (
      !suggestion ||
      !["pending", "accepted", "rejected", "orphaned"].includes(
        suggestion.status,
      ) ||
      !["id", "blockId", "before", "after", "author", "createdAt"].every(
        (k) => typeof suggestion[k as keyof typeof suggestion] === "string",
      )
    )
      throw new Error("Invalid review data.");
    suggestion.before = sanitize(suggestion.before);
    suggestion.after = sanitize(suggestion.after);
  }
  if (
    !metadata.templateFields.every(
      (f) =>
        f &&
        typeof f.name === "string" &&
        ["string", "number", "date", "boolean", "list"].includes(f.type),
    )
  )
    throw new Error("Invalid template fields.");
  if (
    metadata.templateDatasets &&
    (!Array.isArray(metadata.templateDatasets) ||
      metadata.templateDatasets.length > 50 ||
      !metadata.templateDatasets.every(
        (d) =>
          typeof d?.name === "string" &&
          d.name.length <= 100 &&
          d.values &&
          typeof d.values === "object" &&
          !Array.isArray(d.values),
      ))
  )
    throw new Error("Invalid template datasets.");
  const comments = JSON.parse(metadata.comments);
  if (!Array.isArray(comments) || comments.length > 10000)
    throw new Error("Invalid comment data.");
  if (
    !comments.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        Array.isArray(t.comments) &&
        t.comments.every(
          (c: unknown) =>
            c && typeof c === "object" && "id" in c && typeof c.id === "string",
        ),
    )
  )
    throw new Error("Invalid comment threads.");
  if (
    !["title", "language", "header", "footer"].every(
      (k) => typeof metadata.page[k as keyof typeof metadata.page] === "string",
    )
  )
    throw new Error("Invalid page settings.");
  return { html: sanitize(candidate.html), metadata };
}
