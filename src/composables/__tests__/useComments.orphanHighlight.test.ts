import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useComments } from "../useComments";

/**
 * #5 (HIGH): the thread model (threads.value) is NOT part of undo history, but
 * the highlight spans in the content ARE. Delete a comment, then Ctrl+Z: undo
 * restores the innerHTML — bringing the highlight span back — while threads.value
 * stays empty. restoreThreads only iterated threads.value, so the resurrected
 * span was left dangling: inert, un-clickable, with no thread behind it. It must
 * unwrap any highlight whose thread no longer exists.
 */
const editors: HTMLElement[] = [];
const makeEditor = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.setAttribute("contenteditable", "true");
  el.innerHTML = html;
  document.body.appendChild(el);
  editors.push(el);
  return el;
};

afterEach(() => {
  for (const el of editors.splice(0)) el.remove();
  document.body.innerHTML = "";
  window.getSelection()?.removeAllRanges();
});

describe("restoreThreads reconciles orphan highlights (#5)", () => {
  it("unwraps a highlight whose thread was DELETED (undo resurrects it)", () => {
    // Faithful undo flow: a real thread is created and deleted (so its id is
    // known-deleted), then undo restores innerHTML — bringing the span back
    // while threads.value stays empty. A NOT-yet-loaded anchor must survive
    // (see useComments.r20.test.ts); only a known-deleted ghost is unwrapped.
    const editor = makeEditor("<p>Alpha beta gamma</p>");
    const editorElement = ref<HTMLElement | undefined>(editor);
    const comments = useComments({ editorElement });

    const textNode = editor.querySelector("p")!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 10); // "beta"
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    comments.captureSelection();
    const thread = comments.addThread("note")!;
    comments.deleteThread(thread.id);

    // Simulate undo restoring the deleted thread's highlight into the content.
    editor.querySelector("p")!.innerHTML =
      `Alpha <span class="comment-highlight" data-thread-id="${thread.id}" ` +
      `data-comment-thread="${thread.id}">beta</span> gamma`;
    expect(comments.threads.value).toHaveLength(0);

    comments.restoreThreads();

    // No dangling highlight remains; the text is preserved as plain content.
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    expect(editor.querySelector("p")!.textContent).toBe("Alpha beta gamma");
  });

  it("keeps a highlight that still maps to a live thread", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const editorElement = ref<HTMLElement | undefined>(editor);
    const comments = useComments({ editorElement });

    const range = document.createRange();
    const textNode = editor.querySelector("p")!.firstChild as Text;
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5); // "Hello"
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    comments.captureSelection();
    const thread = comments.addThread("note")!;

    // Inject an orphan span alongside the live one.
    const orphan = document.createElement("span");
    orphan.className = "comment-highlight";
    orphan.dataset.threadId = "ghost";
    orphan.textContent = "x";
    editor.querySelector("p")!.appendChild(orphan);

    comments.restoreThreads();

    const highlights = editor.querySelectorAll(".comment-highlight");
    expect(highlights).toHaveLength(1);
    expect(highlights[0].getAttribute("data-thread-id")).toBe(thread.id);
  });
});
