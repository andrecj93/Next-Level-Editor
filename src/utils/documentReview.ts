import type { DocumentMetadata, ReviewSuggestion } from "../types/document";
import { assignBlockIds, documentRoot, findBlock } from "./documentOperations";
import { operationId } from "./documentDiagnostics";
export function proposeDocumentChanges(
  before: string,
  after: string,
  metadata: DocumentMetadata,
  author: string,
): string {
  const oldRoot = documentRoot(before),
    root = documentRoot(after);
  assignBlockIds(oldRoot);
  assignBlockIds(root);
  for (const block of Array.from(root.children) as HTMLElement[]) {
    const id = block.getAttribute("data-nle-id")!;
    const old = findBlock(oldRoot, id);
    const clean = block.cloneNode(true) as HTMLElement;
    clean.removeAttribute("data-nle-suggestion");
    clean.removeAttribute("data-nle-deletion");
    const oldClean = old?.cloneNode(true) as HTMLElement | undefined;
    oldClean?.removeAttribute("data-nle-suggestion");
    oldClean?.removeAttribute("data-nle-deletion");
    if (block.hasAttribute("data-nle-deletion")) continue;
    if (oldClean?.outerHTML === clean.outerHTML) continue;
    let suggestion = metadata.suggestions.find(
      (s) => s.blockId === id && s.status === "pending",
    );
    if (!suggestion) {
      suggestion = {
        id: operationId(),
        blockId: id,
        before: oldClean?.outerHTML ?? "",
        after: clean.outerHTML,
        author,
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      metadata.suggestions.push(suggestion);
    } else suggestion.after = clean.outerHTML;
    block.setAttribute("data-nle-suggestion", suggestion.id);
  }
  for (const old of Array.from(oldRoot.children) as HTMLElement[]) {
    const id = old.getAttribute("data-nle-id")!;
    if (findBlock(root, id)) continue;
    let copy = old.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-nle-suggestion");
    copy.removeAttribute("data-nle-deletion");
    let suggestion = metadata.suggestions.find(
      (s) => s.blockId === id && s.status === "pending",
    );
    if (suggestion && !suggestion.before) {
      suggestion.status = "rejected";
      continue;
    }
    if (suggestion) {
      suggestion.after = "";
      copy = documentRoot(suggestion.before).firstElementChild as HTMLElement;
    } else {
      suggestion = {
        id: operationId(),
        blockId: id,
        before: copy.outerHTML,
        after: "",
        author,
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      metadata.suggestions.push(suggestion);
    }
    copy.setAttribute("data-nle-suggestion", suggestion.id);
    copy.setAttribute("data-nle-deletion", "true");
    // Retain deleted content in its prior position until a reviewer decides.
    const next = old.nextElementSibling?.getAttribute("data-nle-id");
    root.insertBefore(copy, next ? (findBlock(root, next) ?? null) : null);
  }
  return root.innerHTML;
}
export function decideSuggestion(
  html: string,
  suggestion: ReviewSuggestion,
  accept: boolean,
): string {
  if (suggestion.status !== "pending")
    throw new Error("This suggestion was already reviewed.");
  const root = documentRoot(html),
    block = findBlock(root, suggestion.blockId);
  if (!block || block.getAttribute("data-nle-suggestion") !== suggestion.id)
    throw new Error("The suggestion target changed or was removed.");
  const clean = block.cloneNode(true) as HTMLElement;
  clean.removeAttribute("data-nle-suggestion");
  clean.removeAttribute("data-nle-deletion");
  if (clean.outerHTML !== (suggestion.after || suggestion.before))
    throw new Error(
      "The passage changed after this suggestion. Refresh before reviewing.",
    );
  const replacement = accept ? suggestion.after : suggestion.before;
  const holder = documentRoot(replacement);
  block.replaceWith(...Array.from(holder.childNodes));
  suggestion.status = accept ? "accepted" : "rejected";
  return root.innerHTML;
}
export function acceptedDocument(
  html: string,
  metadata: DocumentMetadata,
): string {
  if (metadata.suggestions.some((s) => s.status === "orphaned"))
    throw new Error(
      "Resolve orphaned review suggestions before exporting accepted content.",
    );
  let result = html;
  for (const suggestion of metadata.suggestions.filter(
    (s) => s.status === "pending",
  ))
    result = decideSuggestion(result, { ...suggestion }, false);
  return result;
}
