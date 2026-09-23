import * as Y from "yjs";
import {
  defaultDocumentMetadata,
  type DocumentMetadata,
} from "../types/document";
import { validateDocumentSnapshot } from "./documentValidation";
function fields(metadata: DocumentMetadata): Map<string, string> {
  const result = new Map<string, string>();
  Object.entries(metadata.page).forEach(([key, value]) =>
    result.set("page:" + key, JSON.stringify(value)),
  );
  result.set("citationStyle", JSON.stringify(metadata.citationStyle));
  for (const key of ["sources", "notes", "suggestions"] as const)
    metadata[key].forEach((value) =>
      result.set(key + ":" + value.id, JSON.stringify(value)),
    );
  metadata.templateFields.forEach((value) =>
    result.set("field:" + value.name, JSON.stringify(value)),
  );
  metadata.templateDatasets?.forEach((value) =>
    result.set("dataset:" + value.name, JSON.stringify(value)),
  );
  // Each thread and reply has its own key, so independent replies cannot replace one another.
  for (const thread of JSON.parse(metadata.comments)) {
    const { comments, ...record } = thread;
    result.set("thread:" + thread.id, JSON.stringify(record));
    if (Array.isArray(comments))
      comments.forEach((comment) =>
        result.set(
          "reply:" + thread.id + ":" + comment.id,
          JSON.stringify(comment),
        ),
      );
  }
  return result;
}
export function updateSharedMetadata(
  map: Y.Map<string>,
  before: DocumentMetadata,
  after: DocumentMetadata,
): void {
  const previous = fields(before),
    next = fields(after);
  for (const key of previous.keys()) if (!next.has(key)) map.delete(key);
  for (const [key, value] of next)
    if (previous.get(key) !== value) map.set(key, value);
}
export function readSharedMetadata(
  map: Y.Map<string>,
  sanitize: (html: string) => string,
): DocumentMetadata {
  const result = defaultDocumentMetadata();
  const threads = new Map<string, Record<string, unknown>>();
  const replies: { thread: string; comment: Record<string, unknown> }[] = [];
  map.forEach((serialized, key) => {
    if (typeof serialized !== "string" || serialized.length > 2_000_000)
      throw new Error("Invalid shared document metadata.");
    const value = JSON.parse(serialized);
    if (
      key.startsWith("page:") &&
      Object.prototype.hasOwnProperty.call(result.page, key.slice(5))
    )
      Object.assign(result.page, { [key.slice(5)]: value });
    else if (key === "citationStyle") result.citationStyle = value;
    else if (key.startsWith("sources:")) result.sources.push(value);
    else if (key.startsWith("notes:")) result.notes.push(value);
    else if (key.startsWith("suggestions:")) result.suggestions.push(value);
    else if (key.startsWith("field:")) result.templateFields.push(value);
    else if (key.startsWith("dataset:")) result.templateDatasets!.push(value);
    else if (key.startsWith("thread:"))
      threads.set(key.slice(7), { ...value, comments: [] });
    else if (key.startsWith("reply:")) {
      const boundary = key.indexOf(":", 6);
      replies.push({ thread: key.slice(6, boundary), comment: value });
    }
  });
  for (const { thread, comment } of replies)
    (threads.get(thread)?.comments as unknown[] | undefined)?.push(comment);
  for (const thread of threads.values())
    (thread.comments as { createdAt: string }[]).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  result.comments = JSON.stringify([...threads.values()]);
  return validateDocumentSnapshot({ html: "", metadata: result }, sanitize)
    .metadata;
}
