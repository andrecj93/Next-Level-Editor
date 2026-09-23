import { ref, computed, watch } from "vue";
import type { Ref } from "vue";

/**
 * Comment thread interface
 */
export interface CommentThread {
  id: string;
  rangeData: SerializedRange;
  comments: Comment[];
  status: "open" | "resolved";
  createdAt: Date;
  updatedAt: Date;
  highlightElement?: HTMLElement;
}

/**
 * Individual comment interface
 */
export interface Comment {
  id: string;
  threadId: string;
  author: CommentAuthor;
  content: string;
  mentions: string[];
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

/**
 * Comment author interface
 */
export interface CommentAuthor {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color?: string;
}

/**
 * Serialized range data for persistence
 */
export interface SerializedRange {
  startContainerPath: number[];
  startOffset: number;
  endContainerPath: number[];
  endOffset: number;
  text: string;
}

export const MAX_COMMENT_DATA_LENGTH = 2_000_000;

/** Validate the entire snapshot before replacing live discussion state. */
export function parseCommentThreads(json: string): CommentThread[] {
  if (json.length > MAX_COMMENT_DATA_LENGTH) throw new TypeError("Comment data is too large");
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value) || value.length > 10_000) throw new TypeError("Invalid comment threads");
  const object = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new TypeError("Invalid comment record");
    return item as Record<string, unknown>;
  };
  const text = (item: unknown): string => {
    if (typeof item !== "string") throw new TypeError("Invalid comment text");
    return item;
  };
  const id = (item: unknown): string => {
    const result = text(item);
    if (!result || result.length > 256) throw new TypeError("Invalid comment identifier");
    return result;
  };
  const integer = (item: unknown): number => {
    if (typeof item !== "number" || !Number.isSafeInteger(item) || item < 0) throw new TypeError("Invalid comment position");
    return item;
  };
  const path = (item: unknown): number[] => {
    if (item === undefined) return []; // Legacy hand-built snapshots omitted paths.
    if (!Array.isArray(item) || item.length > 256) throw new TypeError("Invalid comment path");
    return item.map(integer);
  };
  const date = (item: unknown, fallback: Date): Date => {
    if (item === undefined) return fallback;
    const result = new Date(text(item));
    if (!Number.isFinite(result.getTime())) throw new TypeError("Invalid comment date");
    return result;
  };
  const threadIds = new Set<string>();
  return value.map((item) => {
    const data = object(item);
    const threadId = id(data.id);
    if (threadIds.has(threadId)) throw new TypeError("Duplicate comment thread");
    threadIds.add(threadId);
    if (data.status !== "open" && data.status !== "resolved") throw new TypeError("Invalid comment status");
    const range = object(data.rangeData);
    const createdAt = date(data.createdAt, new Date());
    if (!Array.isArray(data.comments)) throw new TypeError("Invalid thread comments");
    const commentIds = new Set<string>();
    const comments = data.comments.map((entry): Comment => {
      const comment = object(entry);
      const commentId = id(comment.id);
      if (commentIds.has(commentId)) throw new TypeError("Duplicate comment");
      commentIds.add(commentId);
      const author = typeof comment.author === "string"
        ? { id: comment.author, name: comment.author }
        : object(comment.author);
      if (comment.threadId !== undefined && comment.threadId !== threadId) throw new TypeError("Mismatched comment thread");
      const mentions = comment.mentions ?? [];
      if (!Array.isArray(mentions)) throw new TypeError("Invalid mentions");
      return {
        id: commentId, threadId,
        author: {
          id: id(author.id), name: text(author.name),
          ...(author.email !== undefined ? { email: text(author.email) } : {}),
          ...(author.avatarUrl !== undefined ? { avatarUrl: text(author.avatarUrl) } : {}),
          ...(author.color !== undefined ? { color: text(author.color) } : {}),
        },
        content: text(comment.content ?? comment.text),
        mentions: mentions.map(text),
        createdAt: date(comment.createdAt, createdAt),
        ...(comment.updatedAt !== undefined ? { updatedAt: date(comment.updatedAt, createdAt) } : {}),
        isEdited: comment.isEdited === true,
      };
    });
    return {
      id: threadId, status: data.status, comments, createdAt,
      updatedAt: date(data.updatedAt, createdAt),
      rangeData: {
        startContainerPath: path(range.startContainerPath), startOffset: integer(range.startOffset),
        endContainerPath: path(range.endContainerPath), endOffset: integer(range.endOffset), text: text(range.text),
      },
    };
  });
}

/** DOM references are deliberately excluded from the persisted snapshot. */
export function serializeCommentThreads(threads: CommentThread[]): string {
  return JSON.stringify(threads.map(({ id, rangeData, comments, status, createdAt, updatedAt }) => ({
    id, rangeData, comments, status, createdAt, updatedAt,
  })), null, 2);
}

/**
 * Mention suggestion interface
 */
export interface MentionSuggestion {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface UseCommentsOptions {
  editorElement?: Ref<HTMLElement | undefined>;
  currentUser?: CommentAuthor;
  onCommentAdded?: (thread: CommentThread, comment: Comment) => void;
  onCommentUpdated?: (thread: CommentThread, comment: Comment) => void;
  onCommentDeleted?: (threadId: string, commentId: string) => void;
  onThreadResolved?: (threadId: string) => void;
  onThreadReopened?: (threadId: string) => void;
  /** A reader activated an inline highlight, including the already-active thread. */
  onThreadActivated?: (threadId: string) => void;
  onMentionTriggered?: (query: string) => Promise<MentionSuggestion[]>;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Remove highlight element from DOM
 */
function removeHighlightInternal(element: HTMLElement): void {
  if (!element.parentNode) return;

  // Move children out of span
  while (element.firstChild) {
    element.parentNode.insertBefore(element.firstChild, element);
  }

  // Remove span
  element.remove();
}

/**
 * Extract mentions from comment text
 */
function extractMentionsFromText(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Get node path from root element
 */
function getNodePath(node: Node, root: Node): number[] {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) break;

    const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
    path.unshift(index);
    current = parent;
  }

  return path;
}

/**
 * Get node from path
 */
function getNodeFromPath(path: number[], root: Node): Node | null {
  let current: Node = root;

  for (const index of path) {
    if (
      !current.childNodes ||
      index < 0 ||
      index >= current.childNodes.length
    ) {
      return null;
    }
    current = current.childNodes[index];
  }

  return current;
}

/**
 * Comments & Suggestions System Composable
 *
 * Provides comprehensive commenting functionality for collaborative editing:
 * - Inline comments anchored to text ranges
 * - Comment threads with replies
 * - Resolve/unresolve functionality
 * - @ mentions with autocomplete
 * - Visual highlighting of commented text
 * - Persistence of comment positions using Range API
 */
export function useComments(options: UseCommentsOptions = {}) {
  const editorElement = options.editorElement;
  const currentUser = ref<CommentAuthor>(
    options.currentUser || {
      id: "default-user",
      name: "Anonymous User",
      color: "#3b82f6",
    }
  );

  // State
  const threads = ref<CommentThread[]>([]);
  const activeThreadId = ref<string | null>(null);
  // Thread ids the user genuinely DELETED. Not part of undo history, so it
  // survives an undo that resurrects a deleted thread's highlight — letting
  // restoreThreads unwrap that dangling ghost while PRESERVING an anchor whose
  // thread simply has not been loaded yet (initial load before importThreads).
  // #r20-1
  const deletedThreadIds = new Set<string>();
  const selectedRange = ref<Range | null>(null);
  const isAddingComment = ref(false);
  const mentionQuery = ref("");
  const mentionSuggestions = ref<MentionSuggestion[]>([]);

  // Computed
  const activeThread = computed(() =>
    threads.value.find((t) => t.id === activeThreadId.value)
  );

  const openThreads = computed(() =>
    threads.value.filter((t) => t.status === "open")
  );

  const resolvedThreads = computed(() =>
    threads.value.filter((t) => t.status === "resolved")
  );

  const hasActiveSelection = computed(() => selectedRange.value !== null);

  /**
   * Serialize a Range for storage
   */
  function serializeRange(range: Range, root: HTMLElement): SerializedRange {
    return {
      startContainerPath: getNodePath(range.startContainer, root),
      startOffset: range.startOffset,
      endContainerPath: getNodePath(range.endContainer, root),
      endOffset: range.endOffset,
      text: range.toString(),
    };
  }

  /**
   * Deserialize a Range from stored data
   */
  function deserializeRange(
    data: SerializedRange,
    root: HTMLElement
  ): Range | null {
    try {
      const range = document.createRange();

      const startContainer = getNodeFromPath(data.startContainerPath, root);
      const endContainer = getNodeFromPath(data.endContainerPath, root);

      if (!startContainer || !endContainer) {
        return null;
      }

      range.setStart(startContainer, data.startOffset);
      range.setEnd(endContainer, data.endOffset);

      return range;
    } catch (error) {
      console.error("Failed to deserialize range:", error);
      return null;
    }
  }

  /**
   * Create highlight element for commented text
   */
  const HIGHLIGHT_BLOCK_TAGS = new Set([
    "P",
    "DIV",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "LI",
    "BLOCKQUOTE",
    "PRE",
    // Table cells are blocks too. Without them, a selection spanning two
    // cells found ZERO blocks and fell into the single-block fallback, whose
    // extractContents ripped the <td>s out of the row into a <span> sibling
    // of the emptied cells — structurally corrupting the table.
    "TD",
    "TH",
  ]);

  /** Build a fresh comment-highlight span (class + anchoring data + click). */
  function makeHighlightSpan(threadId: string, isResolved: boolean): HTMLElement {
    const span = document.createElement("span");
    span.className = isResolved
      ? "comment-highlight comment-highlight-resolved"
      : "comment-highlight";
    span.dataset.threadId = threadId;
    span.dataset.commentThread = threadId;
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveThread(threadId);
      options.onThreadActivated?.(threadId);
    });
    return span;
  }

  /** Every live highlight span belonging to a thread (a cross-block comment
   *  produces one span per block, all sharing the thread id). */
  function getThreadSpans(threadId: string): HTMLElement[] {
    const editor = editorElement?.value;
    if (!editor) return [];
    return Array.from(
      editor.querySelectorAll<HTMLElement>(".comment-highlight[data-thread-id]")
    ).filter((span) => span.dataset.threadId === threadId);
  }

  /** Unwrap every live highlight span of a thread (handles cross-block spans). */
  function removeThreadHighlights(threadId: string, fallback?: HTMLElement): void {
    const spans = getThreadSpans(threadId);
    if (spans.length === 0 && fallback) {
      removeHighlightInternal(fallback);
      return;
    }
    spans.forEach((span) => removeHighlightInternal(span));
  }

  /** Outermost block elements a range intersects, in document order. */
  function collectHighlightBlocks(range: Range): HTMLElement[] {
    const editor = editorElement?.value;
    if (!editor) return [];
    const blocks: HTMLElement[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const el = node as HTMLElement;
        if (!HIGHLIGHT_BLOCK_TAGS.has(el.tagName)) return NodeFilter.FILTER_SKIP;
        return range.intersectsNode(el)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });
    let current: Node | null = walker.nextNode();
    while (current) {
      const el = current as HTMLElement;
      // Keep the leaf-most intersected block (skip wrappers that contain
      // another intersected block).
      current = walker.nextNode();
      const hasIntersectedChild =
        current !== null && el.contains(current as Node);
      if (!hasIntersectedChild) blocks.push(el);
    }
    return blocks;
  }

  function createHighlight(
    range: Range,
    threadId: string,
    isResolved: boolean
  ): HTMLElement {
    const span = makeHighlightSpan(threadId, isResolved);

    // Fast path: a same-block selection wraps cleanly in one span.
    try {
      range.surroundContents(span);
      return span;
    } catch {
      // Fall through to the cross-boundary handling below.
    }

    const blocks = collectHighlightBlocks(range);
    if (blocks.length <= 1) {
      // Boundary quirk within a single block (e.g. partial-node endpoints):
      // extracting + reinserting is safe and keeps everything in one span.
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      return span;
    }

    // Cross-block selection: wrap each block's slice in its own span sharing the
    // thread id, so the paragraph structure is preserved instead of being merged
    // into a single inline span. Build every sub-range up front (blocks are
    // disjoint subtrees, so mutating one never invalidates another).
    const subRanges = blocks.map((block) => {
      const sub = document.createRange();
      if (block.contains(range.startContainer)) {
        sub.setStart(range.startContainer, range.startOffset);
      } else {
        sub.setStart(block, 0);
      }
      if (block.contains(range.endContainer)) {
        sub.setEnd(range.endContainer, range.endOffset);
      } else {
        sub.setEnd(block, block.childNodes.length);
      }
      return sub;
    });

    const spans: HTMLElement[] = [];
    subRanges.forEach((sub, index) => {
      if (sub.collapsed) return;
      const blockSpan = index === 0 ? span : makeHighlightSpan(threadId, isResolved);
      try {
        sub.surroundContents(blockSpan);
      } catch {
        const contents = sub.extractContents();
        blockSpan.appendChild(contents);
        sub.insertNode(blockSpan);
      }
      spans.push(blockSpan);
    });

    // Return the first span as the thread's primary anchor (scroll/focus).
    return spans[0] ?? span;
  }

  /**
   * Update highlight style based on thread status
   */
  function updateHighlight(threadId: string, isResolved: boolean): void {
    // Toggle every span of the thread (cross-block comments have more than one),
    // falling back to the stored primary element if none are found live.
    const spans = getThreadSpans(threadId);
    const thread = threads.value.find((t) => t.id === threadId);
    const targets = spans.length
      ? spans
      : thread?.highlightElement
        ? [thread.highlightElement]
        : [];
    targets.forEach((el) => {
      el.classList.toggle("comment-highlight-resolved", isResolved);
    });
  }

  /**
   * Store current selection
   */
  function captureSelection(): boolean {
    if (!editorElement?.value) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);

    // Check if selection is within editor
    if (!editorElement.value.contains(range.commonAncestorContainer)) {
      return false;
    }

    // Check if selection has content
    if (range.toString().trim().length === 0) {
      return false;
    }

    selectedRange.value = range.cloneRange();
    return true;
  }

  /**
   * Clear current selection
   */
  function clearSelection(): void {
    selectedRange.value = null;
    isAddingComment.value = false;
  }

  /**
   * Start adding a comment to selected text
   */
  function startAddComment(): boolean {
    if (!captureSelection()) {
      console.warn("No valid selection to comment on");
      return false;
    }

    isAddingComment.value = true;
    return true;
  }

  /**
   * Add a new comment thread
   */
  function addThread(
    content: string,
    mentions: string[] = []
  ): CommentThread | null {
    if (!editorElement?.value || !selectedRange.value) {
      console.warn("No editor or selection available");
      return null;
    }

    const threadId = generateId();
    const commentId = generateId();

    // Serialize range
    const rangeData = serializeRange(selectedRange.value, editorElement.value);

    // Create highlight
    const highlightElement = createHighlight(
      selectedRange.value,
      threadId,
      false
    );

    // Create comment
    const comment: Comment = {
      id: commentId,
      threadId,
      author: { ...currentUser.value },
      content,
      mentions,
      createdAt: new Date(),
      isEdited: false,
    };

    // Create thread
    const thread: CommentThread = {
      id: threadId,
      rangeData,
      comments: [comment],
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
      highlightElement,
    };

    threads.value.push(thread);
    activeThreadId.value = threadId;

    // Clear selection state
    clearSelection();

    // Callbacks
    options.onCommentAdded?.(thread, comment);

    return thread;
  }

  /**
   * Add a reply to existing thread
   */
  function addReply(
    threadId: string,
    content: string,
    mentions: string[] = []
  ): Comment | null {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread) {
      console.warn("Thread not found");
      return null;
    }

    const commentId = generateId();

    const comment: Comment = {
      id: commentId,
      threadId,
      author: { ...currentUser.value },
      content,
      mentions,
      createdAt: new Date(),
      isEdited: false,
    };

    thread.comments.push(comment);
    thread.updatedAt = new Date();

    // Callbacks
    options.onCommentAdded?.(thread, comment);

    return comment;
  }

  /**
   * Update a comment
   */
  function updateComment(
    threadId: string,
    commentId: string,
    content: string,
    mentions: string[] = []
  ): boolean {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread) return false;

    const comment = thread.comments.find((c) => c.id === commentId);
    if (!comment) return false;

    comment.content = content;
    comment.mentions = mentions;
    comment.updatedAt = new Date();
    comment.isEdited = true;

    thread.updatedAt = new Date();

    // Callbacks
    options.onCommentUpdated?.(thread, comment);

    return true;
  }

  /**
   * Delete a comment
   */
  function deleteComment(threadId: string, commentId: string): boolean {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread) return false;

    const index = thread.comments.findIndex((c) => c.id === commentId);
    if (index === -1) return false;

    thread.comments.splice(index, 1);
    thread.updatedAt = new Date();

    // Fire the callback for EVERY deleted comment — including the last one in a
    // thread. Previously the length===0 branch removed the thread and returned
    // first, so the host never learned the final comment was deleted and its
    // persisted state drifted.
    options.onCommentDeleted?.(threadId, commentId);

    // If no comments left, delete the (now-empty) thread.
    if (thread.comments.length === 0) {
      deleteThread(threadId);
    }

    return true;
  }

  /**
   * Delete entire thread
   */
  function deleteThread(threadId: string): boolean {
    const index = threads.value.findIndex((t) => t.id === threadId);
    if (index === -1) return false;

    const thread = threads.value[index];

    // Remove highlight (all spans for cross-block comments)
    removeThreadHighlights(thread.id, thread.highlightElement);

    threads.value.splice(index, 1);
    deletedThreadIds.add(threadId);

    if (activeThreadId.value === threadId) {
      activeThreadId.value = null;
    }

    return true;
  }

  /**
   * Resolve a thread
   */
  function resolveThread(threadId: string): boolean {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread) return false;

    thread.status = "resolved";
    thread.updatedAt = new Date();

    updateHighlight(threadId, true);

    // Callbacks
    options.onThreadResolved?.(threadId);

    return true;
  }

  /**
   * Reopen a resolved thread
   */
  function reopenThread(threadId: string): boolean {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread) return false;

    thread.status = "open";
    thread.updatedAt = new Date();

    updateHighlight(threadId, false);

    // Callbacks
    options.onThreadReopened?.(threadId);

    return true;
  }

  /**
   * Set active thread
   */
  function setActiveThread(threadId: string | null): void {
    activeThreadId.value = threadId;
  }

  /**
   * Search for mention suggestions
   */
  async function searchMentions(query: string): Promise<void> {
    mentionQuery.value = query;

    if (options.onMentionTriggered) {
      mentionSuggestions.value = await options.onMentionTriggered(query);
    } else {
      // Default: no suggestions
      mentionSuggestions.value = [];
    }
  }

  /**
   * Clear mention suggestions
   */
  function clearMentions(): void {
    mentionQuery.value = "";
    mentionSuggestions.value = [];
  }

  /**
   * Get threads for a specific range
   */
  function getThreadsInRange(range: Range): CommentThread[] {
    return threads.value.filter((thread) => {
      if (!thread.highlightElement) return false;

      return (
        range.intersectsNode(thread.highlightElement) ||
        thread.highlightElement.contains(range.commonAncestorContainer) ||
        range.commonAncestorContainer.contains(thread.highlightElement)
      );
    });
  }

  /**
   * Restore threads after content update
   */
  function restoreThreads(preferModel = false): void {
    const editor = editorElement?.value;
    if (!editor) return;

    // The thread model (threads.value) is NOT part of undo history, but the
    // highlight spans live in the content, which IS. After an undo/redo restores
    // innerHTML a span can reappear whose thread was deleted — a dangling, inert,
    // un-clickable highlight. Unwrap those.
    //
    // Distinguish a resurrected DELETED ghost from a not-yet-loaded ANCHOR: on
    // initial load (or before importThreads) threads.value is empty and the
    // highlights in the content are anchors awaiting their threads — stripping
    // them is data loss (#r20-1). So unwrap a highlight only when it is
    // genuinely orphaned: its id is missing, OR its thread was explicitly
    // deleted, OR threads ARE loaded and none matches it.
    const liveThreadIds = new Set(threads.value.map((thread) => thread.id));
    editor
      .querySelectorAll<HTMLElement>(".comment-highlight")
      .forEach((span) => {
        const id = span.dataset.threadId;
        const orphaned =
          !id ||
          deletedThreadIds.has(id) ||
          ((preferModel || liveThreadIds.size > 0) && !liveThreadIds.has(id));
        if (orphaned) {
          removeHighlightInternal(span);
        }
      });

    threads.value.forEach((thread) => {
      // Prefer highlight spans still live in the DOM (preserved through the
      // sanitizer round-trip): re-link + re-bind them so the anchor follows its
      // text through edits instead of drifting from a stale serialized range.
      // innerHTML rebuilds drop event listeners, so re-decorate a fresh span.
      const existing = getThreadSpans(thread.id);
      if (existing.length > 0) {
        // The restored DOM is authoritative for resolved-ness: thread.status is
        // NOT part of undo history, so after an undo/redo sync the model FROM
        // the span's class instead of forcing the span to match a stale status
        // (which made resolve/unresolve impossible to undo). #13
        if (preferModel) {
          existing.forEach((span) => span.classList.toggle("comment-highlight-resolved", thread.status === "resolved"));
        } else {
          thread.status = existing.some((span) =>
            span.classList.contains("comment-highlight-resolved")
          ) ? "resolved" : "open";
        }
        const rebound = existing.map((span) => {
          const clone = span.cloneNode(true) as HTMLElement;
          clone.addEventListener("click", (e) => {
            e.stopPropagation();
            setActiveThread(thread.id);
            options.onThreadActivated?.(thread.id);
          });
          span.replaceWith(clone);
          return clone;
        });
        thread.highlightElement = rebound[0];
        return;
      }

      // No live span (older content / imported threads): the model IS the source
      // of truth. Fall back to the serialized range, clearing any stale ref first.
      const isResolved = thread.status === "resolved";
      if (thread.highlightElement) {
        removeHighlightInternal(thread.highlightElement);
      }
      const range = deserializeRange(thread.rangeData, editor);
      // A serialized range is a POSITIONAL node path. If the document was
      // REPLACED (the host swapped v-model) or edited underneath, that path
      // resolves to whatever text now sits there — re-anchoring stamped the
      // previous document's comment onto unrelated content, mid-word, and the
      // span (preserved by the sanitizer) was written back to the host. Only
      // re-anchor when the text at the path is still the text that was
      // commented on. #r21-3
      if (range && range.toString() === thread.rangeData.text) {
        thread.highlightElement = createHighlight(range, thread.id, isResolved);
      } else {
        console.warn("Failed to restore thread range:", thread.id);
      }
    });
  }

  /**
   * Export threads to JSON
   */
  function exportThreads(): string {
    return serializeCommentThreads(threads.value);
  }

  /**
   * Import threads from JSON
   */
  function importThreads(json: string): boolean {
    try {
      const imported = parseCommentThreads(json);
      const importedIds = new Set(imported.map((thread) => thread.id));
      threads.value.forEach((thread) => {
        if (!importedIds.has(thread.id)) {
          removeThreadHighlights(thread.id, thread.highlightElement);
          deletedThreadIds.add(thread.id);
        }
      });
      importedIds.forEach((id) => deletedThreadIds.delete(id));
      threads.value = imported;
      if (activeThreadId.value && !importedIds.has(activeThreadId.value)) activeThreadId.value = null;
      // Restore highlights
      restoreThreads(true);
      console.debug("[NextLevelEditor comments] Threads restored", { threads: imported.length });
      return true;
    } catch {
      // Invalid JSON may contain private discussion text: never log its payload.
      console.error("Failed to import threads: invalid comment data");
      return false;
    }
  }

  /**
   * Clear all threads
   */
  function clearAllThreads(): void {
    threads.value.forEach((thread) => {
      removeThreadHighlights(thread.id, thread.highlightElement);
    });

    threads.value = [];
    activeThreadId.value = null;
  }

  // Watch for editor content changes to restore threads
  if (editorElement) {
    watch(
      () => editorElement.value,
      () => {
        if (editorElement.value) {
          restoreThreads();
        }
      },
      { flush: "post" }
    );
  }

  return {
    // State
    threads,
    activeThreadId,
    currentUser,
    isAddingComment,
    hasActiveSelection,
    mentionQuery,
    mentionSuggestions,

    // Computed
    activeThread,
    openThreads,
    resolvedThreads,

    // Thread management
    startAddComment,
    addThread,
    addReply,
    updateComment,
    deleteComment,
    deleteThread,
    resolveThread,
    reopenThread,
    setActiveThread,

    // Selection
    captureSelection,
    clearSelection,

    // Mentions
    extractMentions: extractMentionsFromText,
    searchMentions,
    clearMentions,

    // Utilities
    getThreadsInRange,
    restoreThreads,
    exportThreads,
    importThreads,
    clearAllThreads,
  };
}
