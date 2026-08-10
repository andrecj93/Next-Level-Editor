import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useComments } from "../useComments";

/**
 * #13: a thread's resolved/open status lives in threads.value, which is NOT part
 * of undo history — but the highlight span's `comment-highlight-resolved` class
 * IS (it round-trips in the content). Resolve a comment, then Ctrl+Z: undo
 * restored the pre-resolve DOM (span without the resolved class), yet
 * restoreThreads FORCED the class back on from the stale thread.status, so the
 * resolve could never be undone. restoreThreads must instead read resolved-ness
 * FROM the restored span and sync the model to it.
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

const selectText = (editor: HTMLElement, start: number, end: number) => {
  const textNode = editor.querySelector("p")!.firstChild as Text;
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

afterEach(() => {
  for (const el of editors.splice(0)) el.remove();
  document.body.innerHTML = "";
  window.getSelection()?.removeAllRanges();
});

describe("restoreThreads syncs resolved-state from the DOM (#13)", () => {
  it("reopens a thread when the restored span dropped the resolved class", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({ editorElement: ref(editor) });

    selectText(editor, 0, 5); // "Hello"
    comments.captureSelection();
    const thread = comments.addThread("note")!;
    comments.resolveThread(thread.id);
    expect(thread.status).toBe("resolved");

    // Simulate undo restoring the pre-resolve DOM: the span loses the resolved
    // class while the (non-history-tracked) model still says resolved.
    editor
      .querySelectorAll(".comment-highlight-resolved")
      .forEach((s) => s.classList.remove("comment-highlight-resolved"));

    comments.restoreThreads();

    // The model is synced FROM the DOM: open again, and not re-decorated.
    expect(thread.status).toBe("open");
    expect(editor.querySelector(".comment-highlight-resolved")).toBeNull();
  });

  it("keeps a thread resolved when the restored span still carries the class", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({ editorElement: ref(editor) });

    selectText(editor, 0, 5);
    comments.captureSelection();
    const thread = comments.addThread("note")!;
    comments.resolveThread(thread.id);

    comments.restoreThreads();

    expect(thread.status).toBe("resolved");
    expect(editor.querySelector(".comment-highlight-resolved")).not.toBeNull();
  });
});
