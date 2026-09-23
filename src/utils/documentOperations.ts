import { diffWordsWithSpace } from "diff";
import { operationId } from "./documentDiagnostics";
export const BLOCK_ID = "data-nle-id";
export function documentRoot(html: string): HTMLDivElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}
export function assignBlockIds(root: HTMLElement): void {
  const seen = new Set<string>();
  for (const el of Array.from(root.children)) {
    let id = el.getAttribute(BLOCK_ID) ?? "";
    if (!/^nle-[a-zA-Z0-9-]{1,90}$/.test(id) || seen.has(id)) {
      id = operationId();
      el.setAttribute(BLOCK_ID, id);
    }
    seen.add(id);
  }
}
export interface BlockAnchor {
  id: string;
  text: string;
  start: number;
  end: number;
  html: string;
}
export function selectedAnchor(root: HTMLElement): BlockAnchor | null {
  const selection = root.ownerDocument.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  let el: Node = range.startContainer;
  while (el.parentNode && el.parentNode !== root) el = el.parentNode;
  if (!(el instanceof HTMLElement) || !el.contains(range.endContainer))
    return null;
  assignBlockIds(root);
  const before = root.ownerDocument.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return {
    id: el.getAttribute(BLOCK_ID)!,
    text: range.toString(),
    start,
    end: start + range.toString().length,
    html: el.innerHTML,
  };
}
export function findBlock(
  root: HTMLElement,
  id: string,
): HTMLElement | undefined {
  return Array.from(root.children).find(
    (el) => el.getAttribute(BLOCK_ID) === id,
  ) as HTMLElement | undefined;
}
export function anchorRange(
  root: HTMLElement,
  anchor: BlockAnchor,
): Range | null {
  const block = findBlock(root, anchor.id);
  // Exact block content makes stale acceptance impossible, including same-length edits.
  if (!block || block.innerHTML !== anchor.html) return null;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0,
    start = false,
    end = false,
    node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (!start && offset + length >= anchor.start) {
      range.setStart(node, anchor.start - offset);
      start = true;
    }
    if (offset + length >= anchor.end) {
      range.setEnd(node, anchor.end - offset);
      end = true;
      break;
    }
    offset += length;
  }
  if (!start && anchor.start === 0 && anchor.end === 0) {
    range.selectNodeContents(block);
    range.collapse(true);
    return range;
  }
  return start && end ? range : null;
}
export function htmlText(html: string): string {
  const root = documentRoot(html);
  for (const br of Array.from(root.querySelectorAll("br")))
    br.replaceWith("\n");
  return Array.from(root.childNodes)
    .map((node) => node.textContent ?? "")
    .join("\n");
}
export function compareDocuments(before: string, after: string) {
  return {
    changes: diffWordsWithSpace(htmlText(before), htmlText(after)),
    formattingChanged: before !== after && htmlText(before) === htmlText(after),
  };
}
export function moveDocumentBlock(
  root: HTMLElement,
  id: string,
  direction: "up" | "down",
  chapter = false,
): boolean {
  const block = findBlock(root, id);
  if (!block) return false;
  const blocks = Array.from(root.children);
  const start = blocks.indexOf(block);
  let end = start + 1;
  const level = /^H[1-6]$/.test(block.tagName) ? Number(block.tagName[1]) : 0;
  if (chapter && level) {
    while (
      end < blocks.length &&
      !(
        /^H[1-6]$/.test(blocks[end].tagName) &&
        Number(blocks[end].tagName[1]) <= level
      )
    )
      end++;
  }
  const group = blocks.slice(start, end);
  if (direction === "up") {
    if (!start) return false;
    let target = start - 1;
    if (chapter && level)
      while (
        target > 0 &&
        !(
          /^H[1-6]$/.test(blocks[target].tagName) &&
          Number(blocks[target].tagName[1]) <= level
        )
      )
        target--;
    group.forEach((node) => root.insertBefore(node, blocks[target]));
  } else {
    if (end >= blocks.length) return false;
    let next = end + 1;
    if (chapter && level)
      while (
        next < blocks.length &&
        !(
          /^H[1-6]$/.test(blocks[next].tagName) &&
          Number(blocks[next].tagName[1]) <= level
        )
      )
        next++;
    group.forEach((node) => root.insertBefore(node, blocks[next] ?? null));
  }
  return true;
}
export function duplicateDocumentBlock(root: HTMLElement, id: string): boolean {
  const block = findBlock(root, id);
  if (!block) return false;
  if (
    block.querySelector("[data-thread-id], [data-nle-cite], [data-nle-note]") ||
    block.hasAttribute("data-nle-suggestion")
  )
    throw new Error(
      "Resolve or remove references before duplicating this block.",
    );
  const copy = block.cloneNode(true) as HTMLElement;
  copy.setAttribute(BLOCK_ID, operationId());
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  copy
    .querySelectorAll("[data-nle-id]")
    .forEach((el) => el.removeAttribute("data-nle-id"));
  root.insertBefore(copy, block.nextSibling);
  return true;
}
