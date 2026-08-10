/**
 * Utilities for creating and managing embedded resizable content in the editor
 * Supports images, videos, and other embeddable content with resize and drag capabilities
 */

import { splitBlockAtCaret, placeCaretInside } from "./blockInsertion";

export interface EmbeddedContentOptions {
  type: "image" | "video" | "embed" | "file";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  alignment?: "left" | "center" | "right";
}

/**
 * Escape a value for safe interpolation into an HTML attribute. Without this,
 * an embed's raw iframe HTML (full of double-quotes) breaks out of data-src and
 * corrupts the container tag (lost tabindex, spilled sibling nodes).
 */
function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Create an embedded resizable container with content
 */
export function createEmbeddedResizable(
  options: EmbeddedContentOptions
): string {
  const {
    type,
    src,
    alt = "",
    width = 400,
    height = 300,
    maintainAspectRatio = true,
    alignment = "center",
  } = options;

  let contentHtml = "";

  // Generate content based on type
  switch (type) {
    case "image":
      contentHtml = `<img src="${escapeAttr(src)}" alt="${escapeAttr(
        alt
      )}" style="width: 100%; height: 100%; object-fit: contain;" />`;
      break;
    case "video":
      contentHtml = `<video src="${escapeAttr(
        src
      )}" controls style="width: 100%; height: 100%; object-fit: contain;"></video>`;
      break;
    case "embed":
      // Assume src is already HTML for embeds (like YouTube iframes)
      contentHtml = src;
      break;
    case "file":
      contentHtml = `<a href="${escapeAttr(src)}" download="${escapeAttr(
        alt
      )}" target="_blank" style="display: flex; align-items: center; justify-content: center; height: 100%; text-decoration: none; color: inherit;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 8px;">📎</div>
          <div style="font-weight: 600;">${escapeAttr(alt) || "Download File"}</div>
        </div>
      </a>`;
      break;
  }

  // Create the embedded resizable container
  return `<div
    class="embedded-resizable-container"
    data-type="${type}"
    data-src="${type === "embed" ? "" : escapeAttr(src)}"
    data-width="${width}"
    data-height="${height}"
    data-maintain-aspect="${maintainAspectRatio}"
    data-alignment="${alignment}"
    style="${buildEmbedContainerStyle(width, height, alignment)}"
    contenteditable="false"
    tabindex="0"
  >
    ${contentHtml}
  </div>`;
}

/**
 * Build the container's inline style deterministically from its (validated)
 * numeric size and alignment. Shared with the HTML sanitizer, which REGENERATES
 * the container style from the data-* attributes on every round-trip instead of
 * trusting arbitrary user-supplied inline CSS.
 */
export function buildEmbedContainerStyle(
  width: number,
  height: number,
  alignment: "left" | "center" | "right"
): string {
  let marginStyle = "margin: 16px auto;";
  if (alignment === "left") {
    marginStyle = "margin: 16px 0 16px 0;";
  } else if (alignment === "right") {
    marginStyle = "margin: 16px 0 16px auto;";
  }
  return [
    "position: relative",
    "display: block",
    `width: ${width}px`,
    `height: ${height}px`,
    marginStyle.slice(0, -1),
    "border: 2px dashed rgba(102, 126, 234, 0.3)",
    "border-radius: 8px",
    "overflow: hidden",
    "transition: all 0.2s ease",
    "cursor: pointer",
  ].join("; ");
}

/**
 * Insert embedded resizable content into the editor at the current selection
 */
export function insertEmbeddedResizable(options: EmbeddedContentOptions): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Create temporary container to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = createEmbeddedResizable(options);

  const embeddedElement = temp.firstElementChild;
  if (!embeddedElement) return;

  // The container is display:block. Inserting it at a caret INSIDE a <p> nests a
  // block in a <p> (`<p>…<div>…</div>…</p>`) — invalid HTML the parser
  // foster-parents on the next v-model round-trip, orphaning the trailing text
  // and moving the media. Split the caret's block first (like insertHorizontalRule)
  // so the container lands between blocks.
  const start = range.startContainer;
  const startEl =
    start.nodeType === Node.ELEMENT_NODE
      ? (start as HTMLElement)
      : start.parentElement;
  const editableRoot = startEl?.closest<HTMLElement>(
    '[contenteditable="true"]'
  );
  const tail = editableRoot ? splitBlockAtCaret(range, editableRoot) : null;

  if (tail?.parentNode) {
    tail.parentNode.insertBefore(embeddedElement, tail);
    addEmbeddedInteractivity(embeddedElement as HTMLElement);
    placeCaretInside(tail, true);
    return;
  }

  // Caret was already at block level (or outside a splittable block).
  range.insertNode(embeddedElement);
  addEmbeddedInteractivity(embeddedElement as HTMLElement);
  range.setStartAfter(embeddedElement);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Tracks elements that already have interactivity bound so re-initialization
// (after undo/redo/reload) never double-binds the same live element. A WeakSet
// keyed by instance is used so the flag is NOT persisted in innerHTML — new
// element instances created by an innerHTML reset are correctly re-initialized.
const initializedEmbeds = new WeakSet<HTMLElement>();

// ---------------------------------------------------------------------------
// Module-level interaction state + delegated document listeners.
//
// Document-level mousemove/mouseup/click handlers are attached exactly ONCE
// (lazily, on the first initialization) instead of once per embedded element.
// Per-element document listeners used to leak: they were never removed when
// the element was detached (innerHTML reset, undo/redo, deletion) and kept
// referencing the dead nodes forever. The delegated handlers below only hold
// the currently-selected / actively-dragged container.
// ---------------------------------------------------------------------------

const RESIZE_HANDLE_CLASS = "embed-resize-handle";
const HANDLE_POSITIONS = ["nw", "ne", "sw", "se"] as const;
type HandlePosition = (typeof HANDLE_POSITIONS)[number];

const MIN_SIZE = 100;
const MAX_SIZE = 1200;

let selectedContainer: HTMLElement | null = null;
let dragState: {
  container: HTMLElement;
  startX: number;
  startY: number;
} | null = null;
let resizeState: {
  container: HTMLElement;
  handle: HandlePosition;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
} | null = null;
// After a drag/resize ends, the browser fires a click (often outside the
// container) that would immediately deselect it — swallow that one click.
let suppressNextDocumentClick = false;
let documentListenersAttached = false;

function clampSize(value: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(value)));
}

/**
 * Clamp width/height into [MIN_SIZE, MAX_SIZE] while PRESERVING their ratio, by
 * scaling BOTH axes by the same factor. Clamping each axis independently (as
 * clampSize does) distorts an aspect-locked box near the limits — a wide image
 * dragged toward the minimum snapped square with empty bands.
 */
export function clampKeepingAspect(
  width: number,
  height: number
): { width: number; height: number } {
  let w = width;
  let h = height;
  const minAxis = Math.min(w, h);
  if (minAxis > 0 && minAxis < MIN_SIZE) {
    const scale = MIN_SIZE / minAxis;
    w *= scale;
    h *= scale;
  }
  const maxAxis = Math.max(w, h);
  if (maxAxis > MAX_SIZE) {
    const scale = MAX_SIZE / maxAxis;
    w *= scale;
    h *= scale;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

function getCurrentSize(element: HTMLElement): {
  width: number;
  height: number;
} {
  const width =
    Number.parseInt(element.style.width || "") ||
    Number.parseInt(element.dataset.width || "") ||
    element.offsetWidth ||
    400;
  const height =
    Number.parseInt(element.style.height || "") ||
    Number.parseInt(element.dataset.height || "") ||
    element.offsetHeight ||
    300;
  return { width, height };
}

/**
 * Append the four visible corner resize handles to a selected container.
 */
function addResizeHandles(element: HTMLElement): void {
  removeResizeHandles(element);
  for (const position of HANDLE_POSITIONS) {
    const handle = document.createElement("div");
    handle.className = RESIZE_HANDLE_CLASS;
    handle.dataset.handle = position;
    handle.setAttribute("contenteditable", "false");
    handle.setAttribute("aria-hidden", "true");
    handle.style.position = "absolute";
    handle.style.width = "12px";
    handle.style.height = "12px";
    handle.style.background = "#667eea";
    handle.style.border = "2px solid #ffffff";
    handle.style.borderRadius = "50%";
    handle.style.boxSizing = "border-box";
    handle.style.zIndex = "101";
    handle.style.cursor = `${position}-resize`;
    // Placed just inside each corner — the container clips overflow, so
    // handles straddling the border would be cut off.
    if (position.includes("n")) {
      handle.style.top = "0px";
    } else {
      handle.style.bottom = "0px";
    }
    if (position.includes("w")) {
      handle.style.left = "0px";
    } else {
      handle.style.right = "0px";
    }
    element.appendChild(handle);
  }
}

function removeResizeHandles(element: HTMLElement): void {
  element
    .querySelectorAll(`.${RESIZE_HANDLE_CLASS}`)
    .forEach((handle) => handle.remove());
}

function selectContainer(element: HTMLElement): void {
  if (selectedContainer === element) return;
  if (selectedContainer) deselectContainer(selectedContainer);
  selectedContainer = element;
  element.style.borderStyle = "solid";
  element.style.borderColor = "#667eea";
  element.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.2)";
  element.style.zIndex = "100";
  element.style.cursor = "move";
  addResizeHandles(element);
}

function deselectContainer(element: HTMLElement): void {
  if (selectedContainer === element) selectedContainer = null;
  element.style.borderStyle = "dashed";
  element.style.borderColor = "rgba(102, 126, 234, 0.3)";
  element.style.boxShadow = "none";
  element.style.zIndex = "auto";
  element.style.cursor = "pointer";
  removeResizeHandles(element);
}

function handleDocumentMouseMove(e: MouseEvent): void {
  if (resizeState) {
    const { container, handle, startX, startY, startWidth, startHeight } =
      resizeState;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let width = startWidth + (handle.includes("e") ? deltaX : -deltaX);
    let height = startHeight + (handle.includes("s") ? deltaY : -deltaY);

    if (
      container.dataset.maintainAspect === "true" &&
      startWidth > 0 &&
      startHeight > 0
    ) {
      const ratio = startWidth / startHeight;
      // Let the dominant axis of the drag drive, derive the other from it.
      if (Math.abs(width - startWidth) >= Math.abs(height - startHeight)) {
        height = width / ratio;
      } else {
        width = height * ratio;
      }
      // Clamp BOTH axes together so the box keeps its ratio at the size limits
      // (clamping each independently distorts it near min/max).
      const clamped = clampKeepingAspect(width, height);
      updateEmbeddedDimensions(container, clamped.width, clamped.height);
      return;
    }

    updateEmbeddedDimensions(container, clampSize(width), clampSize(height));
    return;
  }

  if (dragState) {
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    // Update position using transform to avoid layout shifts
    dragState.container.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }
}

/**
 * Tell the editor this module mutated the document.
 *
 * embeddedResizable is a standalone DOM module with no reference to the Vue
 * layer, so a resize or delete used to be invisible to v-model, history and
 * auto-save: the new size lived only in the DOM until the user happened to type
 * something else. A bubbling `input` event is the same signal the keyboard
 * shortcut paths use — the host's @input pipeline runs snapshot + sanitize +
 * emit + auto-save off it, so this is the single source of the emit.
 *
 * Pass a node that is still connected; for a delete, resolve the host BEFORE
 * detaching the element.
 */
function notifyEditorChange(host: Element | null): void {
  host?.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The contenteditable surface owning this embed, or null when detached. */
function editorHostOf(element: Element): Element | null {
  return element.closest('[contenteditable="true"]');
}

/** Caret range at viewport coordinates (caretRangeFromPoint with the
 *  caretPositionFromPoint fallback for engines that lack it). */
function caretRangeAtPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === "function") {
    return doc.caretRangeFromPoint(x, y);
  }
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

/**
 * Complete a drag-to-move by relocating the container in the DOCUMENT at the
 * drop point. The container is display:block, so it is placed between
 * top-level blocks — before or after the block under the pointer — mirroring
 * how insertEmbeddedResizable splits blocks on insert (a block nested inside a
 * <p> is invalid HTML the next round-trip would mangle). Returns true when the
 * container actually moved.
 */
function moveContainerToPoint(
  container: HTMLElement,
  x: number,
  y: number
): boolean {
  const host = editorHostOf(container);
  if (!host) return false;
  const range = caretRangeAtPoint(x, y);
  if (!range) return false;
  const node = range.startContainer;
  // Dropped on itself or outside this editor: snap back.
  if (container.contains(node) || !host.contains(node)) return false;

  // The top-level block under the pointer (direct child of the host).
  let block: Node | null = node;
  while (block && block.parentNode !== host) {
    block = block.parentNode;
  }
  if (!block || block === container) return false;

  const rect =
    block.nodeType === Node.ELEMENT_NODE
      ? (block as HTMLElement).getBoundingClientRect()
      : null;
  const placeAfter = rect ? y > rect.top + rect.height / 2 : true;
  host.insertBefore(
    container,
    placeAfter ? (block as ChildNode).nextSibling : (block as ChildNode)
  );
  return true;
}

function handleDocumentMouseUp(e: MouseEvent): void {
  if (resizeState) {
    const container = resizeState.container;
    container.style.cursor =
      selectedContainer === container ? "move" : "pointer";
    resizeState = null;
    suppressNextDocumentClick = true;
    // The resize is committed — persist it (dimensions were written live).
    notifyEditorChange(editorHostOf(container));
    return;
  }
  if (dragState) {
    const container = dragState.container;
    const moved =
      Math.abs(e.clientX - dragState.startX) > 3 ||
      Math.abs(e.clientY - dragState.startY) > 3;
    container.style.cursor =
      selectedContainer === container ? "move" : "pointer";
    // The live drag feedback is a cosmetic transform only — the document flow
    // never changed, and the transform neither reached v-model nor survived
    // the sanitizer round-trip (the "move" silently vanished on save/reload).
    // Clear it and complete the move for real at the drop point; an invalid
    // drop (outside the editor, onto itself) snaps back.
    container.style.transform = "";
    if (moved && moveContainerToPoint(container, e.clientX, e.clientY)) {
      notifyEditorChange(editorHostOf(container));
    }
    dragState = null;
    suppressNextDocumentClick = true;
  }
}

function handleDocumentClick(e: MouseEvent): void {
  if (suppressNextDocumentClick) {
    suppressNextDocumentClick = false;
    return;
  }
  if (!selectedContainer) return;
  if (selectedContainer.contains(e.target as Node)) return;
  deselectContainer(selectedContainer);
}

function ensureDocumentListeners(): void {
  if (documentListenersAttached) return;
  documentListenersAttached = true;
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);
  document.addEventListener("click", handleDocumentClick);
}

/**
 * Add interactivity to an embedded element (selection, resize handles, etc.)
 */
function addEmbeddedInteractivity(element: HTMLElement): void {
  if (initializedEmbeds.has(element)) return;
  initializedEmbeds.add(element);

  ensureDocumentListeners();

  // Drop any stale handles that were serialized into saved HTML while a
  // previous instance of this container was selected.
  removeResizeHandles(element);

  // Click to select
  element.addEventListener("click", (e) => {
    e.stopPropagation();
    selectContainer(element);
  });

  // Mouse down starts a corner-handle resize or (when selected) a drag-to-move
  element.addEventListener("mousedown", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const handleEl = target?.closest?.(
      `.${RESIZE_HANDLE_CLASS}`
    ) as HTMLElement | null;

    if (handleEl && element.contains(handleEl)) {
      e.preventDefault();
      e.stopPropagation();
      const { width, height } = getCurrentSize(element);
      resizeState = {
        container: element,
        handle: (handleEl.dataset.handle as HandlePosition) || "se",
        startX: e.clientX,
        startY: e.clientY,
        startWidth: width,
        startHeight: height,
      };
      return;
    }

    if (selectedContainer !== element) return;

    dragState = {
      container: element,
      startX: e.clientX,
      startY: e.clientY,
    };
    element.style.cursor = "grabbing";
    e.preventDefault();
  });

  // Keyboard support
  element.addEventListener("keydown", (e) => {
    if (selectedContainer !== element) return;

    const { width: currentWidth, height: currentHeight } =
      getCurrentSize(element);

    switch (e.key) {
      case "Delete":
      case "Backspace":
        e.preventDefault();
        if (confirm("Delete this embedded content?")) {
          if (selectedContainer === element) selectedContainer = null;
          if (dragState?.container === element) dragState = null;
          if (resizeState?.container === element) resizeState = null;
          // Resolve the host BEFORE detaching — closest() returns null once the
          // element is out of the tree, and preventDefault means the browser
          // fires no input event of its own.
          const host = editorHostOf(element);
          const parent = element.parentNode;
          const nextSibling = element.nextSibling;
          element.remove();
          // Place a caret where the embed was: it is contenteditable=false and
          // focusable, so deleting it otherwise leaves NO caret and the next
          // keystroke goes nowhere until the user clicks back in.
          if (host instanceof HTMLElement) host.focus();
          if (parent) {
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              if (nextSibling) {
                range.setStartBefore(nextSibling);
              } else if (parent.lastChild) {
                range.setStartAfter(parent.lastChild);
              } else {
                range.setStart(parent, 0);
              }
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
          notifyEditorChange(host);
        }
        break;
      case "Escape":
        deselectContainer(element);
        break;
      case "ArrowLeft":
        if (e.shiftKey) {
          e.preventDefault();
          updateEmbeddedDimensions(
            element,
            clampSize(currentWidth - 10),
            currentHeight
          );
          notifyEditorChange(editorHostOf(element));
        }
        break;
      case "ArrowRight":
        if (e.shiftKey) {
          e.preventDefault();
          updateEmbeddedDimensions(
            element,
            clampSize(currentWidth + 10),
            currentHeight
          );
          notifyEditorChange(editorHostOf(element));
        }
        break;
      case "ArrowUp":
        if (e.shiftKey) {
          e.preventDefault();
          updateEmbeddedDimensions(
            element,
            currentWidth,
            clampSize(currentHeight - 10)
          );
          notifyEditorChange(editorHostOf(element));
        }
        break;
      case "ArrowDown":
        if (e.shiftKey) {
          e.preventDefault();
          updateEmbeddedDimensions(
            element,
            currentWidth,
            clampSize(currentHeight + 10)
          );
          notifyEditorChange(editorHostOf(element));
        }
        break;
    }
  });

  // Hover effect
  element.addEventListener("mouseenter", () => {
    if (selectedContainer !== element) {
      element.style.borderStyle = "dashed";
      element.style.borderColor = "#667eea";
    }
  });

  element.addEventListener("mouseleave", () => {
    if (selectedContainer !== element) {
      element.style.borderStyle = "dashed";
      element.style.borderColor = "rgba(102, 126, 234, 0.3)";
    }
  });
}

/**
 * Initialize all existing embedded elements in the editor
 */
export function initializeEmbeddedElements(root: HTMLElement): void {
  const embeddedElements = root.querySelectorAll(
    ".embedded-resizable-container"
  );
  embeddedElements.forEach((element) => {
    addEmbeddedInteractivity(element as HTMLElement);
  });
}

/**
 * Get embedded content dimensions from an element
 */
export function getEmbeddedDimensions(element: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: Number.parseInt(element.dataset.width || "400"),
    height: Number.parseInt(element.dataset.height || "300"),
  };
}

/**
 * Update embedded content dimensions
 */
export function updateEmbeddedDimensions(
  element: HTMLElement,
  width: number,
  height: number
): void {
  element.dataset.width = width.toString();
  element.dataset.height = height.toString();
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
}
