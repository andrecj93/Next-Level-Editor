import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";
import { ref, nextTick } from "vue";
import { useComments } from "../useComments";
import type {
  CommentAuthor,
  MentionSuggestion,
} from "../useComments";

/**
 * Build an editor element attached to the document with the given HTML and
 * return it. Callers are responsible for cleanup via `cleanupEditors`.
 */
const createdEditors: HTMLElement[] = [];
function makeEditor(html = "<p>Hello wonderful world</p>"): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("contenteditable", "true");
  el.innerHTML = html;
  document.body.appendChild(el);
  createdEditors.push(el);
  return el;
}

/**
 * Select a substring within the first text node of a paragraph so that
 * captureSelection / addThread have a real, non-collapsed Range to work with.
 */
function selectTextInEditor(
  editor: HTMLElement,
  start: number,
  end: number,
  selector = "p"
): Range {
  const target = selector
    ? editor.querySelector(selector)!
    : (editor as unknown as Element);
  const textNode = target.firstChild as Text;
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

/**
 * Select the first `len` characters of the paragraph at index `pIndex`.
 * Using a distinct paragraph per thread avoids the text-node fragmentation
 * that happens once addThread wraps part of a paragraph in a highlight span.
 */
function selectParagraph(
  editor: HTMLElement,
  pIndex: number,
  len: number
): Range {
  const p = editor.querySelectorAll("p")[pIndex];
  const textNode = p.firstChild as Text;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, len);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  return range;
}

describe("useComments", () => {
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    window.getSelection()?.removeAllRanges();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const el of createdEditors.splice(0)) {
      el.remove();
    }
    document.body.innerHTML = "";
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("initial state and currentUser", () => {
    it("uses a default Anonymous User when none provided", () => {
      const { currentUser, threads, activeThreadId, isAddingComment } =
        useComments();

      expect(currentUser.value).toEqual({
        id: "default-user",
        name: "Anonymous User",
        color: "#3b82f6",
      });
      expect(threads.value).toEqual([]);
      expect(activeThreadId.value).toBeNull();
      expect(isAddingComment.value).toBe(false);
    });

    it("uses the provided currentUser", () => {
      const user: CommentAuthor = {
        id: "u-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        color: "#ff0000",
      };
      const { currentUser } = useComments({ currentUser: user });

      expect(currentUser.value).toEqual(user);
    });

    it("initializes empty mention state", () => {
      const { mentionQuery, mentionSuggestions } = useComments();
      expect(mentionQuery.value).toBe("");
      expect(mentionSuggestions.value).toEqual([]);
    });
  });

  describe("computed: activeThread / openThreads / resolvedThreads", () => {
    it("computes activeThread from activeThreadId", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("first")!;

      expect(comments.activeThread.value?.id).toBe(thread.id);

      comments.setActiveThread(null);
      expect(comments.activeThread.value).toBeUndefined();
    });

    it("splits threads into open and resolved buckets", () => {
      const editor = makeEditor("<p>alpha</p><p>bravo</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectParagraph(editor, 0, 5);
      comments.captureSelection();
      const t1 = comments.addThread("a")!;

      selectParagraph(editor, 1, 5);
      comments.captureSelection();
      const t2 = comments.addThread("b")!;

      expect(comments.openThreads.value.map((t) => t.id)).toEqual([
        t1.id,
        t2.id,
      ]);
      expect(comments.resolvedThreads.value).toEqual([]);

      comments.resolveThread(t1.id);
      expect(comments.openThreads.value.map((t) => t.id)).toEqual([t2.id]);
      expect(comments.resolvedThreads.value.map((t) => t.id)).toEqual([t1.id]);
    });
  });

  describe("captureSelection / hasActiveSelection", () => {
    it("returns false when there is no editor element", () => {
      const comments = useComments();
      expect(comments.captureSelection()).toBe(false);
      expect(comments.hasActiveSelection.value).toBe(false);
    });

    it("returns false when there is no selection range", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      window.getSelection()?.removeAllRanges();
      expect(comments.captureSelection()).toBe(false);
      expect(comments.hasActiveSelection.value).toBe(false);
    });

    it("returns false when the selection is outside the editor", () => {
      const editor = makeEditor();
      const outside = document.createElement("div");
      outside.textContent = "outside text";
      document.body.appendChild(outside);
      createdEditors.push(outside);

      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      const range = document.createRange();
      range.selectNodeContents(outside);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      expect(comments.captureSelection()).toBe(false);
    });

    it("returns false when the selection is only whitespace", () => {
      const editor = makeEditor("<p>   </p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 3);
      expect(comments.captureSelection()).toBe(false);
    });

    it("captures a valid, non-empty selection within the editor", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      expect(comments.captureSelection()).toBe(true);
      expect(comments.hasActiveSelection.value).toBe(true);
    });
  });

  describe("clearSelection", () => {
    it("clears the captured selection and adding state", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.startAddComment();
      expect(comments.hasActiveSelection.value).toBe(true);
      expect(comments.isAddingComment.value).toBe(true);

      comments.clearSelection();
      expect(comments.hasActiveSelection.value).toBe(false);
      expect(comments.isAddingComment.value).toBe(false);
    });
  });

  describe("startAddComment", () => {
    it("returns false and warns when there is no valid selection", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      window.getSelection()?.removeAllRanges();
      expect(comments.startAddComment()).toBe(false);
      expect(comments.isAddingComment.value).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith("No valid selection to comment on");
    });

    it("captures selection and enters adding mode on success", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      expect(comments.startAddComment()).toBe(true);
      expect(comments.isAddingComment.value).toBe(true);
    });
  });

  describe("addThread", () => {
    it("returns null and warns when there is no editor element", () => {
      const comments = useComments();
      expect(comments.addThread("hi")).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith("No editor or selection available");
    });

    it("returns null when there is no captured selection", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      // No captureSelection called -> selectedRange is null
      expect(comments.addThread("hi")).toBeNull();
    });

    it("creates a thread with an initial comment, highlight, and active id", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onCommentAdded = vi.fn();
      const comments = useComments({ editorElement, onCommentAdded });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("Nice paragraph", ["ada"])!;

      expect(thread).not.toBeNull();
      expect(comments.threads.value).toHaveLength(1);
      expect(thread.status).toBe("open");
      expect(thread.comments).toHaveLength(1);

      const comment = thread.comments[0];
      expect(comment.content).toBe("Nice paragraph");
      expect(comment.mentions).toEqual(["ada"]);
      expect(comment.isEdited).toBe(false);
      expect(comment.threadId).toBe(thread.id);
      // author is a copy of currentUser, not the same reference
      expect(comment.author).toEqual(comments.currentUser.value);
      expect(comment.author).not.toBe(comments.currentUser.value);

      // Active thread + range data
      expect(comments.activeThreadId.value).toBe(thread.id);
      expect(thread.rangeData.text).toBe("Hello");

      // Highlight element inserted into the DOM with correct dataset
      expect(thread.highlightElement).toBeInstanceOf(HTMLElement);
      const highlight = editor.querySelector<HTMLElement>(".comment-highlight");
      expect(highlight).not.toBeNull();
      expect(highlight?.dataset.threadId).toBe(thread.id);
      expect(highlight?.dataset.commentThread).toBe(thread.id);

      // Selection state cleared after adding
      expect(comments.hasActiveSelection.value).toBe(false);
      expect(comments.isAddingComment.value).toBe(false);

      // Callback fired with the thread + comment
      expect(onCommentAdded).toHaveBeenCalledWith(thread, comment);
    });

    it("defaults mentions to an empty array", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("no mentions")!;
      expect(thread.comments[0].mentions).toEqual([]);
    });

    it("clicking the highlight sets it as the active thread", () => {
      const editor = makeEditor("<p>alpha beta gamma delta</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("one")!;

      // Move active away, then click the highlight to restore it
      comments.setActiveThread(null);
      expect(comments.activeThreadId.value).toBeNull();

      thread.highlightElement!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      expect(comments.activeThreadId.value).toBe(thread.id);
    });

    it("highlights each block separately when the selection crosses block boundaries", () => {
      const editor = makeEditor("<p>first</p><p>second</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      // Build a range spanning two paragraphs so surroundContents fails.
      const p1 = editor.querySelectorAll("p")[0];
      const p2 = editor.querySelectorAll("p")[1];
      const range = document.createRange();
      range.setStart(p1.firstChild!, 0);
      range.setEnd(p2.firstChild!, 6);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      expect(comments.captureSelection()).toBe(true);
      const thread = comments.addThread("cross")!;

      expect(thread).not.toBeNull();
      // Paragraph structure is preserved: one highlight span per block, both
      // sharing the thread id — NOT one merged span that destroys the blocks.
      const highlights = editor.querySelectorAll<HTMLElement>(
        ".comment-highlight"
      );
      expect(highlights.length).toBe(2);
      expect(editor.querySelectorAll("p").length).toBe(2);
      expect(highlights[0].textContent).toBe("first");
      expect(highlights[1].textContent).toBe("second");
      highlights.forEach((h) =>
        expect(h.getAttribute("data-thread-id")).toBe(thread.id)
      );
      // No highlight span wraps a block element.
      expect(editor.querySelector(".comment-highlight p")).toBeNull();
    });
  });

  describe("addReply", () => {
    it("returns null and warns when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.addReply("missing", "reply")).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith("Thread not found");
    });

    it("appends a reply comment and updates the thread timestamp", async () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onCommentAdded = vi.fn();
      const comments = useComments({ editorElement, onCommentAdded });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const originalUpdatedAt = thread.updatedAt.getTime();
      onCommentAdded.mockClear();

      // Ensure a measurable time delta for updatedAt.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(originalUpdatedAt + 1000));

      const reply = comments.addReply(thread.id, "a reply", ["bob"])!;

      vi.useRealTimers();

      expect(reply).not.toBeNull();
      expect(reply.content).toBe("a reply");
      expect(reply.mentions).toEqual(["bob"]);
      expect(reply.threadId).toBe(thread.id);
      expect(thread.comments).toHaveLength(2);
      expect(thread.comments[1]).toBe(reply);
      expect(thread.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
      expect(onCommentAdded).toHaveBeenCalledWith(thread, reply);
    });

    it("defaults mentions to an empty array", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const reply = comments.addReply(thread.id, "no mentions")!;
      expect(reply.mentions).toEqual([]);
    });
  });

  describe("updateComment", () => {
    it("returns false when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.updateComment("no-thread", "no-comment", "x")).toBe(
        false
      );
    });

    it("returns false when the comment does not exist in the thread", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;

      expect(comments.updateComment(thread.id, "missing-comment", "x")).toBe(
        false
      );
    });

    it("updates content, mentions and edit metadata and fires callback", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onCommentUpdated = vi.fn();
      const comments = useComments({ editorElement, onCommentUpdated });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const comment = thread.comments[0];
      expect(comment.isEdited).toBe(false);
      expect(comment.updatedAt).toBeUndefined();

      const ok = comments.updateComment(
        thread.id,
        comment.id,
        "edited content",
        ["carol"]
      );

      expect(ok).toBe(true);
      expect(comment.content).toBe("edited content");
      expect(comment.mentions).toEqual(["carol"]);
      expect(comment.isEdited).toBe(true);
      expect(comment.updatedAt).toBeInstanceOf(Date);
      expect(onCommentUpdated).toHaveBeenCalledWith(thread, comment);
    });

    it("defaults mentions to an empty array when omitted", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const comment = thread.comments[0];

      comments.updateComment(thread.id, comment.id, "changed");
      expect(comment.mentions).toEqual([]);
    });
  });

  describe("deleteComment", () => {
    it("returns false when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.deleteComment("no-thread", "no-comment")).toBe(false);
    });

    it("returns false when the comment does not exist", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;

      expect(comments.deleteComment(thread.id, "nope")).toBe(false);
    });

    it("removes a reply but keeps the thread when comments remain", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onCommentDeleted = vi.fn();
      const comments = useComments({ editorElement, onCommentDeleted });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const reply = comments.addReply(thread.id, "reply")!;

      const ok = comments.deleteComment(thread.id, reply.id);

      expect(ok).toBe(true);
      expect(thread.comments).toHaveLength(1);
      expect(comments.threads.value).toHaveLength(1);
      expect(onCommentDeleted).toHaveBeenCalledWith(thread.id, reply.id);
    });

    it("deletes the whole thread when the last comment is removed", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onCommentDeleted = vi.fn();
      const comments = useComments({ editorElement, onCommentDeleted });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const only = thread.comments[0];

      const ok = comments.deleteComment(thread.id, only.id);

      expect(ok).toBe(true);
      expect(comments.threads.value).toHaveLength(0);
      // Highlight removed from DOM as part of thread deletion
      expect(editor.querySelector(".comment-highlight")).toBeNull();
      // The callback fires for the last comment too — the host must learn its
      // final comment was deleted (before the now-empty thread is removed).
      expect(onCommentDeleted).toHaveBeenCalledWith(thread.id, only.id);
    });
  });

  describe("deleteThread", () => {
    it("returns false when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.deleteThread("missing")).toBe(false);
    });

    it("removes the thread, unwraps the highlight, and clears active id", () => {
      const editor = makeEditor("<p>alpha beta gamma</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      expect(comments.activeThreadId.value).toBe(thread.id);
      expect(editor.querySelector(".comment-highlight")).not.toBeNull();

      const ok = comments.deleteThread(thread.id);

      expect(ok).toBe(true);
      expect(comments.threads.value).toHaveLength(0);
      expect(comments.activeThreadId.value).toBeNull();
      // Highlight span unwrapped; original text preserved
      expect(editor.querySelector(".comment-highlight")).toBeNull();
      expect(editor.textContent).toContain("alpha beta gamma");
    });

    it("keeps the active id when deleting a non-active thread", () => {
      const editor = makeEditor("<p>alpha</p><p>bravo</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectParagraph(editor, 0, 5);
      comments.captureSelection();
      const t1 = comments.addThread("first")!;

      selectParagraph(editor, 1, 5);
      comments.captureSelection();
      const t2 = comments.addThread("second")!;

      // t2 is active. Delete t1 -> active id must remain t2.
      expect(comments.activeThreadId.value).toBe(t2.id);
      comments.deleteThread(t1.id);
      expect(comments.activeThreadId.value).toBe(t2.id);
    });

    it("deletes a thread that has no highlight element without throwing", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      thread.highlightElement = undefined; // skip the unwrap branch

      expect(comments.deleteThread(thread.id)).toBe(true);
      expect(comments.threads.value).toHaveLength(0);
    });

    it("deletes cleanly when the highlight has already been detached from the DOM", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;

      // Detach the highlight span so removeHighlightInternal's parentNode
      // guard short-circuits during deletion.
      thread.highlightElement!.remove();

      expect(comments.deleteThread(thread.id)).toBe(true);
      expect(comments.threads.value).toHaveLength(0);
    });
  });

  describe("resolveThread / reopenThread", () => {
    it("resolveThread returns false when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.resolveThread("missing")).toBe(false);
    });

    it("reopenThread returns false when the thread does not exist", () => {
      const comments = useComments();
      expect(comments.reopenThread("missing")).toBe(false);
    });

    it("resolves and reopens a thread, toggling highlight class and callbacks", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const onThreadResolved = vi.fn();
      const onThreadReopened = vi.fn();
      const comments = useComments({
        editorElement,
        onThreadResolved,
        onThreadReopened,
      });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const highlight = thread.highlightElement!;

      expect(comments.resolveThread(thread.id)).toBe(true);
      expect(thread.status).toBe("resolved");
      expect(highlight.classList.contains("comment-highlight-resolved")).toBe(
        true
      );
      expect(onThreadResolved).toHaveBeenCalledWith(thread.id);

      expect(comments.reopenThread(thread.id)).toBe(true);
      expect(thread.status).toBe("open");
      expect(highlight.classList.contains("comment-highlight-resolved")).toBe(
        false
      );
      expect(onThreadReopened).toHaveBeenCalledWith(thread.id);
    });

    it("updateHighlight tolerates a thread without a highlight element", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      // Strip the highlight so updateHighlight's early return branch runs.
      thread.highlightElement = undefined;

      expect(() => comments.resolveThread(thread.id)).not.toThrow();
      expect(thread.status).toBe("resolved");
    });
  });

  describe("setActiveThread", () => {
    it("sets and clears the active thread id", () => {
      const comments = useComments();
      comments.setActiveThread("abc");
      expect(comments.activeThreadId.value).toBe("abc");
      comments.setActiveThread(null);
      expect(comments.activeThreadId.value).toBeNull();
    });
  });

  describe("extractMentions", () => {
    it("extracts @mentions from text", () => {
      const { extractMentions } = useComments();
      expect(extractMentions("hi @ada and @bob!")).toEqual(["ada", "bob"]);
    });

    it("returns an empty array when there are no mentions", () => {
      const { extractMentions } = useComments();
      expect(extractMentions("no mentions here")).toEqual([]);
    });

    it("handles underscores and digits in mention words", () => {
      const { extractMentions } = useComments();
      expect(extractMentions("@user_1 pinged @dev2")).toEqual([
        "user_1",
        "dev2",
      ]);
    });

    it("stops a mention at non-word characters", () => {
      const { extractMentions } = useComments();
      expect(extractMentions("email me @ada.lovelace")).toEqual(["ada"]);
    });
  });

  describe("searchMentions / clearMentions", () => {
    it("stores the query and returns no suggestions when no handler is set", async () => {
      const comments = useComments();
      await comments.searchMentions("ad");
      expect(comments.mentionQuery.value).toBe("ad");
      expect(comments.mentionSuggestions.value).toEqual([]);
    });

    it("delegates to onMentionTriggered and stores its suggestions", async () => {
      const suggestions: MentionSuggestion[] = [
        { id: "1", name: "Ada" },
        { id: "2", name: "Adam" },
      ];
      const onMentionTriggered = vi.fn().mockResolvedValue(suggestions);
      const comments = useComments({ onMentionTriggered });

      await comments.searchMentions("ad");

      expect(onMentionTriggered).toHaveBeenCalledWith("ad");
      expect(comments.mentionQuery.value).toBe("ad");
      expect(comments.mentionSuggestions.value).toEqual(suggestions);
    });

    it("clears the mention query and suggestions", async () => {
      const onMentionTriggered = vi
        .fn()
        .mockResolvedValue([{ id: "1", name: "Ada" }]);
      const comments = useComments({ onMentionTriggered });

      await comments.searchMentions("ad");
      expect(comments.mentionSuggestions.value).toHaveLength(1);

      comments.clearMentions();
      expect(comments.mentionQuery.value).toBe("");
      expect(comments.mentionSuggestions.value).toEqual([]);
    });
  });

  describe("getThreadsInRange", () => {
    it("returns threads whose highlight intersects the given range", () => {
      const editor = makeEditor("<p>alpha beta gamma delta</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("hl")!;

      // Range that contains the whole paragraph (and thus the highlight).
      const range = document.createRange();
      range.selectNodeContents(editor.querySelector("p")!);

      const found = comments.getThreadsInRange(range);
      expect(found.map((t) => t.id)).toContain(thread.id);
    });

    it("ignores threads without a highlight element", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("hl")!;
      thread.highlightElement = undefined;

      const range = document.createRange();
      range.selectNodeContents(editor);

      expect(comments.getThreadsInRange(range)).toEqual([]);
    });
  });

  /**
   * Serialized-thread JSON whose range path ([0,0], offsets 0..len) resolves
   * cleanly against a pristine `<p>Hello wonderful world</p>` editor. Used to
   * drive the successful restore path via importThreads.
   */
  function serializedThreadJson(
    id = "t-restore",
    status: "open" | "resolved" = "open",
    len = 5
  ): string {
    return JSON.stringify([
      {
        id,
        rangeData: {
          startContainerPath: [0, 0],
          startOffset: 0,
          endContainerPath: [0, 0],
          endOffset: len,
          text: "Hello",
        },
        comments: [
          {
            id: `${id}-c`,
            threadId: id,
            author: { id: "u", name: "U" },
            content: "restored",
            mentions: [],
            createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
            isEdited: false,
          },
        ],
        status,
        createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2024-01-02T00:00:00.000Z").toISOString(),
      },
    ]);
  }

  describe("restoreThreads", () => {
    it("does nothing when there is no editor element", () => {
      const comments = useComments();
      expect(() => comments.restoreThreads()).not.toThrow();
    });

    it("creates a highlight from serialized range data on restore", () => {
      // Import puts a thread in state and calls restoreThreads. Because the
      // editor is pristine, the serialized path resolves and a highlight is
      // materialized into the DOM.
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      comments.importThreads(serializedThreadJson());

      const thread = comments.threads.value[0];
      expect(thread.highlightElement).toBeInstanceOf(HTMLElement);
      expect(editor.querySelectorAll(".comment-highlight")).toHaveLength(1);
      const highlight = editor.querySelector<HTMLElement>(".comment-highlight");
      expect(highlight?.textContent).toBe("Hello");
      expect(highlight?.dataset.threadId).toBe(thread.id);
    });

    it("keeps the resolved style when restoring a resolved thread", () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      comments.importThreads(serializedThreadJson("t-res", "resolved"));

      const thread = comments.threads.value[0];
      expect(
        thread.highlightElement?.classList.contains(
          "comment-highlight-resolved"
        )
      ).toBe(true);
    });

    it("re-links to a live highlight span instead of the stale serialized range", () => {
      const editor = makeEditor("<p>Hello world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 6, 11); // "world"
      comments.captureSelection();
      const thread = comments.addThread("note")!;
      expect(editor.querySelector(".comment-highlight")?.textContent).toBe(
        "world"
      );

      // Corrupt the serialized range: if restore re-anchored from it the
      // highlight would drift or be dropped. The live span must win instead.
      thread.rangeData.startOffset = 999;
      thread.rangeData.startContainerPath = [99];
      thread.rangeData.endContainerPath = [99];

      comments.restoreThreads();

      const highlights = editor.querySelectorAll<HTMLElement>(
        ".comment-highlight"
      );
      expect(highlights.length).toBe(1);
      expect(highlights[0].textContent).toBe("world");
      // The re-linked span is clickable (listener re-bound after the rebuild).
      highlights[0].click();
      expect(comments.activeThreadId.value).toBe(thread.id);
    });

    it("warns when no live span exists and the range cannot be restored", () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;

      // Simulate the highlight span being lost (content replaced with no
      // surviving comment-highlight) so there is nothing live to re-link to.
      editor.querySelectorAll<HTMLElement>(".comment-highlight").forEach((el) => {
        while (el.firstChild) el.parentNode!.insertBefore(el.firstChild, el);
        el.remove();
      });

      // Corrupt the stored path so getNodeFromPath returns null.
      thread.rangeData.startContainerPath = [99];
      thread.rangeData.endContainerPath = [99];

      comments.restoreThreads();

      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to restore thread range:",
        thread.id
      );
    });

    it("logs and skips a thread when the range offset is out of bounds", () => {
      // The path resolves to a valid text node, but an offset beyond its length
      // makes range.setEnd throw inside deserializeRange, hitting its catch.
      const editor = makeEditor("<p>Hi</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      const json = JSON.stringify([
        {
          id: "oob",
          rangeData: {
            startContainerPath: [0, 0],
            startOffset: 0,
            endContainerPath: [0, 0],
            endOffset: 999, // "Hi" only has length 2
            text: "Hi",
          },
          comments: [
            {
              id: "oob-c",
              threadId: "oob",
              author: { id: "u", name: "U" },
              content: "x",
              mentions: [],
              createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
              isEdited: false,
            },
          ],
          status: "open",
          createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          updatedAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        },
      ]);

      const ok = comments.importThreads(json);

      // Import itself succeeds; only the highlight restoration fails.
      expect(ok).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to deserialize range:",
        expect.anything()
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to restore thread range:",
        "oob"
      );
      expect(editor.querySelector(".comment-highlight")).toBeNull();
    });
  });

  describe("exportThreads / importThreads", () => {
    it("exports threads to a JSON string with ISO dates", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root", ["ada"])!;

      const json = comments.exportThreads();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(thread.id);
      expect(parsed[0].status).toBe("open");
      expect(typeof parsed[0].createdAt).toBe("string");
      expect(parsed[0].createdAt).toBe(thread.createdAt.toISOString());
      expect(parsed[0].comments[0].content).toBe("root");
      // highlightElement (a DOM node) is intentionally not exported
      expect(parsed[0].highlightElement).toBeUndefined();
    });

    it("round-trips exported data back through importThreads", () => {
      // Author a thread in one editor, export it, then import into a freshly
      // rendered editor with the same structure (the intended cross-session
      // flow). The serialized path resolves and the highlight is rebuilt.
      const authoringEditor = makeEditor("<p>Hello wonderful world</p>");
      const authoringRef = ref<HTMLElement | undefined>(authoringEditor);
      const authoring = useComments({ editorElement: authoringRef });

      selectTextInEditor(authoringEditor, 0, 5);
      authoring.captureSelection();
      const thread = authoring.addThread("root")!;
      const json = authoring.exportThreads();

      const freshEditor = makeEditor("<p>Hello wonderful world</p>");
      const freshRef = ref<HTMLElement | undefined>(freshEditor);
      const fresh = useComments({ editorElement: freshRef });

      const ok = fresh.importThreads(json);

      expect(ok).toBe(true);
      expect(fresh.threads.value).toHaveLength(1);
      const imported = fresh.threads.value[0];
      expect(imported.id).toBe(thread.id);
      expect(imported.status).toBe("open");
      expect(imported.comments[0].content).toBe("root");
      // Dates were re-hydrated from ISO strings into Date instances.
      expect(imported.createdAt).toBeInstanceOf(Date);
      expect(imported.updatedAt).toBeInstanceOf(Date);
      // Highlight was restored into the fresh editor's DOM.
      expect(freshEditor.querySelector(".comment-highlight")).not.toBeNull();
    });

    it("returns false and logs when given invalid JSON", () => {
      const comments = useComments();
      expect(comments.importThreads("{ not json")).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("returns false when the JSON is not an array", () => {
      const comments = useComments();
      expect(comments.importThreads('{"foo":"bar"}')).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("clearAllThreads", () => {
    it("removes every highlight and resets thread + active state", () => {
      const editor = makeEditor("<p>alpha</p><p>bravo</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectParagraph(editor, 0, 5);
      comments.captureSelection();
      comments.addThread("a");

      selectParagraph(editor, 1, 5);
      comments.captureSelection();
      comments.addThread("b");

      expect(comments.threads.value).toHaveLength(2);
      expect(editor.querySelectorAll(".comment-highlight").length).toBe(2);

      comments.clearAllThreads();

      expect(comments.threads.value).toHaveLength(0);
      expect(comments.activeThreadId.value).toBeNull();
      expect(editor.querySelectorAll(".comment-highlight").length).toBe(0);
    });

    it("tolerates threads that have no highlight element", () => {
      const editor = makeEditor();
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("a")!;
      thread.highlightElement = undefined;

      expect(() => comments.clearAllThreads()).not.toThrow();
      expect(comments.threads.value).toHaveLength(0);
    });
  });

  describe("watch on editorElement", () => {
    it("restores threads when the editor element reference changes", async () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;

      // Swap in a brand-new editor element with the same structure. The
      // post-flush watcher should re-run restoreThreads against it.
      const newEditor = makeEditor("<p>Hello wonderful world</p>");
      editorElement.value = newEditor;
      await nextTick();

      // A highlight now exists in the new editor.
      expect(newEditor.querySelector(".comment-highlight")).not.toBeNull();
      expect(thread.highlightElement).toBeInstanceOf(HTMLElement);
    });

    it("does not attempt to restore when the editor element becomes undefined", async () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("root")!;
      const highlightBefore = thread.highlightElement;

      // The watcher fires but its guard (editorElement.value truthy) is false,
      // so restoreThreads is skipped and the existing highlight is untouched.
      editorElement.value = undefined;
      await nextTick();

      expect(thread.highlightElement).toBe(highlightBefore);
      expect(comments.threads.value).toHaveLength(1);
    });
  });

  describe("getThreadsInRange (nested range branch)", () => {
    it("matches a thread when the query range is nested inside its highlight", () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("hl")!;

      // Build a collapsed range sitting inside the highlight's text so that
      // highlightElement.contains(range.commonAncestorContainer) is true.
      const inner = thread.highlightElement!.firstChild!;
      const range = document.createRange();
      range.setStart(inner, 1);
      range.setEnd(inner, 3);

      const found = comments.getThreadsInRange(range);
      expect(found.map((t) => t.id)).toContain(thread.id);
    });
  });

  describe("export/import round-trip rehydrates dates", () => {
    it("restores comment createdAt as a Date, not a string", () => {
      const editor = makeEditor("<p>Hello wonderful world</p>");
      const editorElement = ref<HTMLElement | undefined>(editor);
      const comments = useComments({ editorElement });

      selectTextInEditor(editor, 0, 5);
      comments.captureSelection();
      const thread = comments.addThread("a comment")!;
      expect(thread.comments[0].createdAt).toBeInstanceOf(Date);

      const json = comments.exportThreads();
      // Round-trip through import (dates are ISO strings inside the JSON).
      expect(comments.importThreads(json)).toBe(true);

      const restored = comments.threads.value.find((t) => t.id === thread.id)!;
      expect(restored.createdAt).toBeInstanceOf(Date);
      const comment = restored.comments[0];
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(Number.isNaN(comment.createdAt.getTime())).toBe(false);
      // No Invalid Date is injected for the absent optional updatedAt.
      expect(
        (comment as { updatedAt?: Date }).updatedAt === undefined ||
          !Number.isNaN((comment as { updatedAt: Date }).updatedAt.getTime())
      ).toBe(true);
    });
  });
});
