import { type Ref } from "vue";
import { indentListItem, outdentListItem } from "../utils/formatting";
import { applyChecklistItemA11y } from "../utils/checklist";
import {
  MERGEABLE_BLOCKS,
  isVisuallyEmptyBlock,
  mergeBlockBackward,
  mergeBlockForward,
} from "../utils/blockMerge";

const BLOCK_ELEMENT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
]);

interface KeyboardShortcutsOptions {
  editorContent: Ref<HTMLDivElement | null>;
  onInput: () => void;
  /**
   * Retained for call-site compatibility but intentionally unused: every
   * mutation path in this composable dispatches a synthetic "input" event,
   * and the host's @input pipeline already captures the snapshot (plus
   * sanitize + emit + auto-save). Calling this as well would double-emit.
   */
  onCaptureSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  openCommandMenu: () => void;
  insertLink: () => void;
  openFindReplaceModal: () => void;
  handleInlineAction: (tag: string) => void;
  handleBlockAction: (tag: string) => void;
  /**
   * Optional hook to keyboard-drive the open slash-command menu. Runs before
   * the editor's own Enter/Tab handling; returns true when it consumed the key.
   */
  handleSlashMenuKeydown?: (event: KeyboardEvent) => boolean;
}

/**
 * Checks if an element or document fragment has no meaningful text content
 */
function isEmptyContent(element: HTMLElement | DocumentFragment): boolean {
  let content: string | null | undefined;

  if (element instanceof DocumentFragment) {
    content = Array.from(element.childNodes)
      .map((n) => n.textContent)
      .join("");
  } else {
    content = element.textContent;
  }

  return !content?.trim();
}

/**
 * Ensures an element is visible by adding a <br> tag if it's empty
 */
function ensureVisibleElement(element: HTMLElement) {
  if (isEmptyContent(element) && !element.querySelector("br")) {
    element.innerHTML = "<br>";
  }
}

/**
 * Populates a new element with extracted content, ensuring it remains visible
 */
function populateNewElement(element: HTMLElement, content: DocumentFragment) {
  if (content.childNodes.length === 0) {
    element.innerHTML = "<br>";
  } else {
    element.appendChild(content);
    ensureVisibleElement(element);
  }
}

/**
 * Composable for managing keyboard shortcuts in the editor
 * Handles Enter key behavior, Tab indentation, and command shortcuts
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    editorContent,
    undo,
    redo,
    openCommandMenu,
    insertLink,
    openFindReplaceModal,
    handleInlineAction,
    handleBlockAction,
    handleSlashMenuKeydown,
  } = options;

  /**
   * Find the current block element from a node
   */
  const findCurrentBlock = (
    startNode: Node
  ): { block: HTMLElement | null; tag: string } => {
    let currentBlock: HTMLElement | null = null;
    let currentBlockTag = "";
    let node: Node | null = startNode;

    while (node && node !== editorContent.value) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        if (BLOCK_ELEMENT_TAGS.has(tagName)) {
          currentBlock = element;
          currentBlockTag = tagName;
          break;
        }
      }
      node = node.parentNode;
    }

    return { block: currentBlock, tag: currentBlockTag };
  };

  /**
   * Handle Enter key within a list item
   */
  const handleEnterInListItem = (
    range: Range,
    currentBlock: HTMLElement,
    selection: Selection
  ) => {
    // Check if current list item is empty
    const isCurrentEmpty = isEmptyContent(currentBlock);

    if (isCurrentEmpty) {
      // Enter on an empty item breaks out of the list. Items that FOLLOW the
      // empty one must move into a new list below the inserted paragraph, so an
      // empty item in the MIDDLE splits the list ([A] / paragraph / [B]) rather
      // than stranding the paragraph after the whole list. A trailing empty
      // item (nothing after it) has no split — it just becomes the paragraph.
      const listParent = currentBlock.parentNode as HTMLElement; // ul or ol
      const grandParent = listParent.parentNode;

      // A NESTED empty item (its list sits inside another <li>) outdents one
      // level on Enter, like Shift+Tab. Breaking it out to a paragraph would
      // insert that <p> into grandParent — the parent <li> — leaving invalid
      // <p>-in-<li> and stranding the caret indented. Only a TOP-LEVEL empty item
      // exits the list to a paragraph (handled below).
      if (
        grandParent instanceof HTMLElement &&
        grandParent.tagName.toLowerCase() === "li" &&
        editorContent.value &&
        outdentListItem(editorContent.value)
      ) {
        editorContent.value.dispatchEvent(
          new Event("input", { bubbles: true })
        );
        return;
      }

      // Collect the items after the empty one before we mutate the DOM.
      const trailing: HTMLElement[] = [];
      let sib = currentBlock.nextElementSibling;
      while (sib) {
        trailing.push(sib as HTMLElement);
        sib = sib.nextElementSibling;
      }

      currentBlock.remove();

      // Create a new paragraph with clean formatting.
      const newParagraph = document.createElement("p");
      newParagraph.innerHTML = "<br>";
      newParagraph.style.marginLeft = "";
      newParagraph.style.paddingLeft = "";
      newParagraph.style.textIndent = "";
      newParagraph.style.listStyleType = "none";

      if (grandParent) {
        grandParent.insertBefore(newParagraph, listParent.nextSibling);

        if (trailing.length > 0) {
          // Trailing items → their own list after the paragraph.
          const listTag = listParent.tagName.toLowerCase();
          const newList = document.createElement(listTag);
          // Preserve ordered-list numbering: the second half continues from
          // where the first half left off.
          if (listTag === "ol") {
            const leadingCount =
              listParent.querySelectorAll(":scope > li").length;
            (newList as HTMLOListElement).start = leadingCount + 1;
          }
          trailing.forEach((li) => newList.appendChild(li));
          grandParent.insertBefore(newList, newParagraph.nextSibling);
        }

        // If the empty item was first (leading list now empty), drop the husk.
        if (!listParent.querySelector("li")) {
          listParent.remove();
        }
      }

      // Move cursor to the new paragraph
      const newRange = document.createRange();
      newRange.setStart(newParagraph, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      if (editorContent.value) {
        editorContent.value.dispatchEvent(
          new Event("input", { bubbles: true })
        );
      }
      return;
    }

    // Normal behavior: create new list item
    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.setEnd(currentBlock, currentBlock.childNodes.length);
    const afterContent = afterRange.extractContents();

    const newLi = document.createElement("li");
    populateNewElement(newLi, afterContent);
    // Continue checklist semantics: a new item in a `ul.checklist` must carry
    // the checkbox state + ARIA, else screen readers announce it as a plain list
    // item until it's toggled or round-trips through the sanitizer.
    if (currentBlock.parentElement?.classList.contains("checklist")) {
      newLi.setAttribute("data-checked", "false");
      applyChecklistItemA11y(newLi, false);
    }
    ensureVisibleElement(currentBlock);

    if (currentBlock.nextSibling) {
      currentBlock.parentNode?.insertBefore(newLi, currentBlock.nextSibling);
    } else {
      currentBlock.parentNode?.appendChild(newLi);
    }

    const newRange = document.createRange();
    newRange.setStart(newLi, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    if (editorContent.value) {
      editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  /**
   * Handle Enter key within a regular block element
   */
  const handleEnterInBlock = (
    range: Range,
    currentBlock: HTMLElement
  ): HTMLElement => {
    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.setEnd(currentBlock, currentBlock.childNodes.length);
    const afterContent = afterRange.extractContents();

    ensureVisibleElement(currentBlock);

    const currentTag = currentBlock.tagName.toLowerCase();
    const isHeading = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(currentTag);
    const isQuote = currentTag === "blockquote";
    // A mid-content split of a heading keeps BOTH halves a heading, and a
    // mid-content split of a blockquote CONTINUES the quote (like Word / Google
    // Docs) — the tail clones the source tag. Enter at the END (no tail content)
    // starts a fresh <p> instead: you don't want the next line to inherit the
    // heading, and an empty Enter is how you exit a blockquote. Without the
    // blockquote case, Enter mid-quote silently stripped the quote from the tail
    // and a multi-line blockquote was impossible.
    const tailHasContent = (afterContent.textContent ?? "").length > 0;
    const tail = document.createElement(
      (isHeading || isQuote) && tailHasContent ? currentTag : "p"
    );

    populateNewElement(tail, afterContent);

    // Only a plain-paragraph tail needs the inherited heading/list styling
    // stripped; a cloned heading tail must KEEP its heading styling.
    if (tail.tagName.toLowerCase() === "p") {
      if (isHeading) {
        tail.style.fontSize = "";
        tail.style.fontWeight = "";
        tail.style.color = "";
        tail.style.backgroundColor = "";
        tail.style.marginLeft = "";
        tail.style.paddingLeft = "";
        tail.style.textIndent = "";
        tail.style.textAlign = "";
      }
      // Clear list-specific styling if transitioning from list context.
      if (currentBlock.closest("ul, ol")) {
        tail.style.marginLeft = "";
        tail.style.paddingLeft = "";
        tail.style.textIndent = "";
      }
    }

    if (currentBlock.nextSibling) {
      currentBlock.parentNode?.insertBefore(tail, currentBlock.nextSibling);
    } else {
      currentBlock.parentNode?.appendChild(tail);
    }
    return tail;
  };

  /**
   * Handle Enter key when no block element exists
   */
  const handleEnterWithoutBlock = (
    range: Range,
    newParagraph: HTMLParagraphElement
  ) => {
    if (!editorContent.value) return;

    try {
      const beforeRange = document.createRange();
      beforeRange.setStart(editorContent.value, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const beforeContent = beforeRange.extractContents();

      const afterRange = document.createRange();
      afterRange.setStart(range.startContainer, range.startOffset);
      afterRange.setEnd(
        editorContent.value,
        editorContent.value.childNodes.length
      );
      const afterContent = afterRange.extractContents();

      const firstParagraph = document.createElement("p");
      populateNewElement(firstParagraph, beforeContent);
      populateNewElement(newParagraph, afterContent);

      editorContent.value.appendChild(firstParagraph);
      editorContent.value.appendChild(newParagraph);
    } catch (error) {
      console.error("Error handling Enter key:", error);
      newParagraph.innerHTML = "<br>";
      if (editorContent.value.lastChild) {
        editorContent.value.insertBefore(
          newParagraph,
          editorContent.value.lastChild.nextSibling
        );
      } else {
        editorContent.value.appendChild(newParagraph);
      }
    }
  };

  /**
   * Move cursor to the specified element
   */
  const moveCursorToElement = (element: HTMLElement, selection: Selection) => {
    const newRange = document.createRange();
    newRange.setStart(element, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  /**
   * The structural element a caret lives in. `td`/`th` are not block tags, so
   * findCurrentBlock returns null for text placed straight into a cell — two
   * different cells would then compare equal and a cross-CELL selection would
   * not be recognised as spanning. #R23-1
   */
  const structuralHost = (node: Node): Node | null => {
    const { block } = findCurrentBlock(node);
    if (block) return block;
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    return element?.closest("td,th") ?? null;
  };

  /**
   * Put the caret where a cross-block delete joined the document: the start of
   * the block that follows, falling back to the end of the one before. #R23-1
   */
  const collapseCaretAtJoin = (range: Range, selection: Selection) => {
    const container = range.startContainer;
    if (container.nodeType === Node.ELEMENT_NODE) {
      const children = container.childNodes;
      const after = children[range.startOffset];
      if (after && after.nodeType === Node.ELEMENT_NODE) {
        moveCursorToElement(after as HTMLElement, selection);
        return;
      }
      const before =
        range.startOffset > 0 ? children[range.startOffset - 1] : null;
      if (before && before.nodeType === Node.ELEMENT_NODE) {
        const newRange = document.createRange();
        newRange.selectNodeContents(before);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
      }
    }
    selection.removeAllRanges();
    selection.addRange(range);
  };

  /**
   * Handle Enter key to create new paragraphs/list items
   */
  const handleEnterKey = (event: KeyboardEvent) => {
    event.preventDefault();
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Delete any selected content first
    if (!range.collapsed) {
      const spannedBlocks =
        structuralHost(range.startContainer) !==
        structuralHost(range.endContainer);
      range.deleteContents();

      // A cross-block delete leaves the collapsed range on the COMMON ANCESTOR
      // (the root, the <ul>, the <tr>) — never inside a block — so
      // findCurrentBlock below would return null and hand control to
      // handleEnterWithoutBlock, which is only for bare unwrapped text. It then
      // re-wrapped both halves in new <p>s: <p><p>He</p></p><p><p>rld</p></p>,
      // three <ol>s each restarting at 1, a table torn into three tables.
      // Nothing is left to do here — the delete already left the two partial
      // blocks as siblings, which IS the split Enter is supposed to make. Just
      // put the caret at the join. #R23-1
      if (spannedBlocks) {
        collapseCaretAtJoin(range, selection);
        return;
      }
    }

    const { block: currentBlock, tag: currentBlockTag } = findCurrentBlock(
      range.startContainer
    );

    // Enter inside a table cell inserts a line break WITHIN the cell (Word/Docs
    // behavior). `td`/`th` are not block tags, so text placed directly in a cell
    // has NO current block — falling through to handleEnterWithoutBlock would
    // treat the cell text as "no block" and rip the whole table apart (nesting
    // <p> in <td>, wrapping <p> around <table>, splitting the table). Only skip
    // this when a real block (a <p>/<li> the user nested) lives inside the cell,
    // which the normal paths handle safely.
    const enclosingCell = getEnclosingCell(range);
    if (enclosingCell && (!currentBlock || !enclosingCell.contains(currentBlock))) {
      const br = document.createElement("br");
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      // A lone trailing <br> doesn't create a visible new line; add a filler so
      // the caret lands on the new line.
      if (!br.nextSibling) {
        const filler = document.createElement("br");
        br.parentNode?.insertBefore(filler, br.nextSibling);
        range.setStartBefore(filler);
        range.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(range);
      if (editorContent.value) {
        editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    // Handle list items specially. The synthetic input event dispatched
    // inside handleEnterInListItem runs the host's full @input pipeline
    // (snapshot + sanitize + emit + auto-save), so no extra snapshot call
    // is needed here — it would double-emit per Enter.
    if (currentBlock && currentBlockTag === "li") {
      handleEnterInListItem(range, currentBlock, selection);
      return;
    }

    // Create the new block. In a plain block, handleEnterInBlock decides the
    // tail tag (paragraph, or a cloned heading for a mid-heading split) and
    // returns it; without a block we fall back to a fresh paragraph.
    const newParagraph = document.createElement("p");
    const target: HTMLElement = currentBlock
      ? handleEnterInBlock(range, currentBlock)
      : (handleEnterWithoutBlock(range, newParagraph), newParagraph);

    // Move cursor to the new block.
    moveCursorToElement(target, selection);

    // The dispatched input event runs the host's full @input pipeline
    // (snapshot + sanitize + emit + auto-save) and also drives the floating
    // toolbar, smart autocomplete, and variable wrapping — it is the single
    // source of the emit for this Enter (no extra snapshot call).
    if (editorContent.value) {
      editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  /**
   * Find the closest mergeable block (p/h1-h6/blockquote) around the caret,
   * for Backspace/Delete boundary merging. Returns null when the caret sits
   * anywhere inside a list item — li-level Backspace has its own semantics
   * (outdent/exit) that native handling + the list utilities already cover,
   * so block merging must not interfere.
   */
  const findMergeableBlock = (range: Range): HTMLElement | null => {
    const root = editorContent.value;
    if (!root) return null;

    const start = range.startContainer;
    let el: HTMLElement | null =
      start.nodeType === Node.ELEMENT_NODE
        ? (start as HTMLElement)
        : start.parentElement;

    let block: HTMLElement | null = null;
    while (el && el !== root) {
      if (el.tagName === "LI") return null;
      if (!block && MERGEABLE_BLOCKS.has(el.tagName)) block = el;
      el = el.parentElement;
    }
    // `el === root` confirms the block actually lives inside the editor.
    return el === root ? block : null;
  };

  /**
   * True when the collapsed caret sits at the very start (Backspace) or very
   * end (Delete) of `block`. Computed from range boundaries so leading empty
   * text nodes or empty inline wrappers before/after the caret still count
   * as "at the edge". A placeholder <br> only counts as content when the
   * block has real content (then it's a visible line break, not a
   * placeholder, and native deletion should consume it instead).
   */
  const isCaretAtBlockEdge = (
    block: HTMLElement,
    range: Range,
    edge: "start" | "end"
  ): boolean => {
    const probe = document.createRange();
    if (edge === "start") {
      probe.setStart(block, 0);
      probe.setEnd(range.startContainer, range.startOffset);
    } else {
      probe.setStart(range.startContainer, range.startOffset);
      probe.setEnd(block, block.childNodes.length);
    }

    const contents = probe.cloneContents();
    if ((contents.textContent ?? "") !== "") return false;

    const visibleSelector = isVisuallyEmptyBlock(block)
      ? "img,hr,table,video,iframe"
      : "img,hr,table,video,iframe,br";
    return !contents.querySelector(visibleSelector);
  };

  /**
   * Backspace at the start of a block / Delete at its end: perform a
   * normalized merge with the adjacent block instead of trusting native
   * contenteditable (which can produce <span style> soup, stray <div>s or
   * inherit the target block's formatting — all browser-dependent).
   *
   * Returns true when the key was consumed. When the merge helpers return
   * null (first/last block, table/embed neighbor) we deliberately fall
   * through to native behavior, which is a safe no-op there.
   */
  const handleBlockBoundaryDelete = (event: KeyboardEvent): boolean => {
    const root = editorContent.value;
    if (!root) return false;

    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    // Range deletions (including Ctrl+A + Backspace) stay native.
    if (!range.collapsed) return false;

    const block = findMergeableBlock(range);
    if (!block) return false;

    const backward = event.key === "Backspace";
    if (!isCaretAtBlockEdge(block, range, backward ? "start" : "end")) {
      return false;
    }

    const caret = backward
      ? mergeBlockBackward(block, root)
      : mergeBlockForward(block, root);
    if (!caret) return false;

    event.preventDefault();

    // Land the caret EXACTLY at the join point — no jump.
    const newRange = document.createRange();
    newRange.setStart(caret.caretNode, caret.caretOffset);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Same contract as the Enter handlers: ONE synthetic input event drives
    // the host's full @input pipeline (snapshot + sanitize + emit +
    // auto-save); calling onCaptureSnapshot as well would double-emit.
    root.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };

  /**
   * Handle slash command (/) to open quick actions
   */
  const handleSlashCommand = (event: KeyboardEvent) => {
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    const startEl =
      container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : container.parentElement;

    // Never open the menu inside a code block — '/' there is literal code, not a
    // command trigger (findCurrentBlock ignores pre/code, so without this guard a
    // code block reads as an "empty block" and the menu popped on every slash).
    const codeAncestor = startEl?.closest("pre, code");
    if (codeAncestor && editorContent.value?.contains(codeAncestor)) {
      return false;
    }

    // The block the caret sits in, INCLUDING table cells (findCurrentBlock does
    // not recognise td/th, so a mid-cell caret used to read as an empty block and
    // trigger on every '/').
    const contextBlock =
      startEl?.closest(
        "p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th"
      ) ?? null;

    // All text in that block BEFORE the caret — resolved across inline
    // boundaries, so a caret at offset 0 of <strong> after "hello" still sees
    // "hello" instead of looking like the start of the block (#22).
    let textBefore = "";
    if (contextBlock) {
      const pre = document.createRange();
      pre.selectNodeContents(contextBlock);
      try {
        pre.setEnd(range.startContainer, range.startOffset);
        textBefore = pre.toString();
      } catch {
        textBefore = "";
      }
    } else if (container.nodeType === Node.TEXT_NODE) {
      textBefore = (container as Text).data.substring(0, range.startOffset);
    }

    const blockText = contextBlock ? contextBlock.textContent || "" : "";

    // Allow slash commands if:
    // 1. Text before cursor is empty or whitespace only
    // 2. The block is present AND completely empty
    // 3. After whitespace (space or newline)
    const isAtStart = textBefore.trim().length === 0;
    const isEmptyBlock =
      contextBlock !== null && blockText.trim().length === 0;
    const afterWhitespace = textBefore.length > 0 && /\s$/.test(textBefore);

    if (isAtStart || isEmptyBlock || afterWhitespace) {
      event.preventDefault();
      event.stopPropagation();
      openCommandMenu();
      return true;
    }

    return false;
  };

  /**
   * Check if the current selection is within a list item
   */
  const isInListItem = (range: Range): boolean => {
    let node: Node | null = range.startContainer;
    while (node && node !== editorContent.value) {
      if (node.nodeName === "LI") {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  /**
   * Handle list indentation/outdentation
   */
  const handleListIndentation = (
    event: KeyboardEvent,
    isShiftKey: boolean
  ): boolean => {
    if (!editorContent.value) return false;

    event.preventDefault();
    const success = isShiftKey
      ? outdentListItem(editorContent.value)
      : indentListItem(editorContent.value);

    if (success) {
      // Dispatch input event: the host's @input pipeline handles snapshot,
      // sanitize, emit, and auto-save — a separate snapshot call here would
      // fire a second emit + auto-save per indentation.
      editorContent.value.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  };

  /**
   * The table cell (td/th) containing the range's start, or null when the caret
   * isn't inside a table cell within the editor.
   */
  const getEnclosingCell = (range: Range): HTMLTableCellElement | null => {
    let node: Node | null = range.startContainer;
    while (node && node !== editorContent.value) {
      if (node.nodeName === "TD" || node.nodeName === "TH") {
        return node as HTMLTableCellElement;
      }
      node = node.parentNode;
    }
    return null;
  };

  const placeCaretAtCellStart = (cell: Element) => {
    const selection = globalThis.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  /**
   * Tab / Shift+Tab moves between table cells (Word/Google-Docs behavior). The
   * default browser Tab would move focus OUT of the contenteditable entirely.
   * Tab in the last cell appends a new body row and lands in its first cell.
   */
  const handleTableTabKey = (
    event: KeyboardEvent,
    cell: HTMLTableCellElement
  ): boolean => {
    const table = cell.closest("table");
    if (!table || !editorContent.value?.contains(table)) return false;

    event.preventDefault();
    const cells = Array.from(
      table.querySelectorAll<HTMLTableCellElement>("th, td")
    );
    const idx = cells.indexOf(cell);

    if (event.shiftKey) {
      const prev = cells[idx - 1];
      if (prev) placeCaretAtCellStart(prev);
      return true;
    }

    const next = cells[idx + 1];
    if (next) {
      placeCaretAtCellStart(next);
      return true;
    }

    // Last cell: append a new body row mirroring the current row's columns.
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return true;
    const columnCount = row.children.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < columnCount; i++) {
      const td = document.createElement("td");
      const reference = row.children[i] as HTMLElement | undefined;
      if (reference) td.setAttribute("style", reference.getAttribute("style") ?? "");
      td.appendChild(document.createElement("br"));
      newRow.appendChild(td);
    }
    const tbody = table.tBodies[0] ?? (row.parentElement as HTMLElement);
    tbody.appendChild(newRow);
    placeCaretAtCellStart(newRow.firstElementChild as HTMLElement);
    // Row added → run the host input pipeline (snapshot/sanitize/emit/save).
    editorContent.value?.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };

  /**
   * Handle Tab/Shift+Tab for table cells and list indentation
   */
  const handleTabKey = (event: KeyboardEvent) => {
    if (!editorContent.value) return false;

    const selection = globalThis.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cell = getEnclosingCell(range);
      if (cell) {
        return handleTableTabKey(event, cell);
      }
      if (isInListItem(range)) {
        return handleListIndentation(event, event.shiftKey);
      }
    }
    return false;
  };

  /**
   * Handle undo/redo keyboard shortcuts
   */
  const handleUndoRedo = (event: KeyboardEvent): boolean => {
    const key = event.key.toLowerCase();
    const isModifier = event.ctrlKey || event.metaKey;

    if (isModifier && key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return true;
    }

    if (isModifier && key === "y") {
      event.preventDefault();
      redo();
      return true;
    }

    return false;
  };

  /**
   * Handle text formatting shortcuts (bold, italic, underline)
   */
  const handleTextFormatting = (event: KeyboardEvent): boolean => {
    if (!event.ctrlKey && !event.metaKey) return false;

    const key = event.key.toLowerCase();
    const formatMap: Record<string, string> = {
      b: "strong",
      i: "em",
      u: "u",
    };

    if (formatMap[key]) {
      event.preventDefault();
      handleInlineAction(formatMap[key]);
      return true;
    }

    return false;
  };

  /**
   * Handle heading shortcuts (Ctrl+Alt+1/2/3)
   */
  const handleHeadingShortcuts = (event: KeyboardEvent): boolean => {
    if (!(event.ctrlKey || event.metaKey) || !event.altKey) return false;

    const headingMap: Record<string, string> = {
      "1": "h1",
      "2": "h2",
      "3": "h3",
    };

    if (headingMap[event.key]) {
      event.preventDefault();
      handleBlockAction(headingMap[event.key]);
      return true;
    }

    return false;
  };

  /**
   * Handle special action shortcuts (link, find/replace)
   */
  const handleSpecialActions = (event: KeyboardEvent): boolean => {
    if (!event.ctrlKey && !event.metaKey) return false;

    const key = event.key.toLowerCase();

    // Plain Ctrl/Cmd+K only: Ctrl+Shift+K belongs to the command palette
    // (Shift was ADDED to its binding precisely to avoid this collision —
    // matching any Ctrl+K here re-created it, opening both on one press).
    if (key === "k" && !event.shiftKey) {
      event.preventDefault();
      insertLink();
      return true;
    }

    if (key === "f") {
      event.preventDefault();
      openFindReplaceModal();
      return true;
    }

    return false;
  };

  /**
   * Main keyboard event handler
   */
  const handleKeydown = (event: KeyboardEvent) => {
    // IME guard: while a composition session is active (CJK input methods,
    // predictive keyboards), Enter commits the current candidate and must
    // reach the IME untouched — intercepting it here would split the block
    // and corrupt the composition, making CJK typing impossible. keyCode 229
    // is the legacy "key processed by IME" signal some browsers send on
    // keydown before isComposing is set.
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    // Let the slash-command menu (when open) claim Arrow/Enter/Tab/Escape first,
    // so Enter selects a command instead of inserting a new paragraph.
    if (handleSlashMenuKeydown && handleSlashMenuKeydown(event)) {
      return;
    }

    // Handle Enter key
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      handleEnterKey(event);
      return;
    }

    // Handle Backspace/Delete at block boundaries with a normalized merge
    // (the inverse of the Enter split model). Plain keypresses only —
    // modified variants (Ctrl+Backspace word-delete, Shift+Delete cut, …)
    // keep their native semantics.
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      if (handleBlockBoundaryDelete(event)) return;
    }

    // Handle slash command
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      if (handleSlashCommand(event)) return;
    }

    // Handle Tab for list indentation
    if (event.key === "Tab") {
      if (handleTabKey(event)) return;
    }

    // Try each handler in sequence
    if (handleUndoRedo(event)) return;
    if (handleSpecialActions(event)) return;
    if (handleTextFormatting(event)) return;
    if (handleHeadingShortcuts(event)) return;
  };

  return {
    handleKeydown,
  };
}
