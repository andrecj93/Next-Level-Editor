import { ref, computed, watch, nextTick } from "vue";
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
  onMentionTriggered?: (query: string) => Promise<MentionSuggestion[]>;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  function createHighlight(
    range: Range,
    threadId: string,
    isResolved: boolean
  ): HTMLElement {
    const span = document.createElement("span");
    span.className = isResolved
      ? "comment-highlight comment-highlight-resolved"
      : "comment-highlight";
    span.dataset.threadId = threadId;
    span.dataset.commentThread = threadId;

    // Wrap range contents
    try {
      range.surroundContents(span);
    } catch {
      // If surroundContents fails (crossing boundaries), use extractContents
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }

    // Add click handler
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveThread(threadId);
    });

    return span;
  }

  /**
   * Remove highlight element
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
   * Update highlight style based on thread status
   */
  function updateHighlight(threadId: string, isResolved: boolean): void {
    const thread = threads.value.find((t) => t.id === threadId);
    if (!thread?.highlightElement) return;

    if (isResolved) {
      thread.highlightElement.classList.add("comment-highlight-resolved");
    } else {
      thread.highlightElement.classList.remove("comment-highlight-resolved");
    }
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

    // If no comments left, delete thread
    if (thread.comments.length === 0) {
      deleteThread(threadId);
      return true;
    }

    // Callbacks
    options.onCommentDeleted?.(threadId, commentId);

    return true;
  }

  /**
   * Delete entire thread
   */
  function deleteThread(threadId: string): boolean {
    const index = threads.value.findIndex((t) => t.id === threadId);
    if (index === -1) return false;

    const thread = threads.value[index];

    // Remove highlight
    if (thread.highlightElement) {
      removeHighlightInternal(thread.highlightElement);
    }

    threads.value.splice(index, 1);

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

    if (threadId) {
      // Scroll thread into view if needed
      nextTick(() => {
        const thread = threads.value.find((t) => t.id === threadId);
        if (thread?.highlightElement) {
          thread.highlightElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    }
  }

  /**
   * Extract mentions from text
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
  function restoreThreads(): void {
    if (!editorElement?.value) return;

    threads.value.forEach((thread) => {
      // Remove old highlight if exists
      if (thread.highlightElement) {
        removeHighlightInternal(thread.highlightElement);
      }

      // Try to restore range
      const range = deserializeRange(thread.rangeData, editorElement.value!);
      if (range) {
        thread.highlightElement = createHighlight(
          range,
          thread.id,
          thread.status === "resolved"
        );
      } else {
        console.warn("Failed to restore thread range:", thread.id);
      }
    });
  }

  /**
   * Export threads to JSON
   */
  function exportThreads(): string {
    const exportData = threads.value.map((thread) => ({
      id: thread.id,
      rangeData: thread.rangeData,
      comments: thread.comments,
      status: thread.status,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import threads from JSON
   */
  function importThreads(json: string): boolean {
    try {
      const importData = JSON.parse(json);

      if (!Array.isArray(importData)) {
        throw new TypeError("Invalid import data format");
      }

      threads.value = importData.map((data) => ({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      }));

      // Restore highlights
      restoreThreads();

      return true;
    } catch (error) {
      console.error("Failed to import threads:", error);
      return false;
    }
  }

  /**
   * Clear all threads
   */
  function clearAllThreads(): void {
    threads.value.forEach((thread) => {
      if (thread.highlightElement) {
        removeHighlightInternal(thread.highlightElement);
      }
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
