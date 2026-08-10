import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useComments } from "../useComments";

/**
 * r20 comments-persistence findings:
 *  - R20-1: restoreThreads unwrapped EVERY highlight whose id was not in
 *    threads.value. On initial load (before importThreads) threads is empty, so
 *    a document loaded with comment-highlight anchors had them all stripped —
 *    data loss. An anchor whose thread was NEVER loaded must survive; only a
 *    KNOWN-DELETED thread's resurrected ghost (undo/redo) is unwrapped.
 *  - R20-3: importThreads converted thread-level createdAt/updatedAt
 *    unconditionally, producing Invalid Date for a partial/hand-built payload
 *    (the comment-level conversion already guards against this).
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

describe("restoreThreads preserves not-yet-loaded anchors (#r20-1)", () => {
  it("keeps a comment-highlight whose thread has not been loaded yet", () => {
    // Initial load: content carries an anchor, threads are not imported yet.
    const editor = makeEditor(
      '<p>Hello <span class="comment-highlight" data-thread-id="t1" ' +
        'data-comment-thread="t1">brave</span> world</p>'
    );
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });
    expect(comments.threads.value).toHaveLength(0);

    comments.restoreThreads();

    // The anchor survives so a later importThreads can re-bind it.
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();
    expect(
      editor.querySelector(".comment-highlight")!.getAttribute("data-thread-id")
    ).toBe("t1");
  });

  it("still unwraps a KNOWN-DELETED thread's resurrected ghost (undo)", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });

    // Create then delete a real thread — id enters the deleted set.
    const textNode = editor.querySelector("p")!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    comments.captureSelection();
    const thread = comments.addThread("note")!;
    comments.deleteThread(thread.id);

    // Simulate undo restoring the innerHTML: the deleted thread's highlight is
    // back in the DOM while threads.value stays empty.
    const p = editor.querySelector("p")!;
    p.innerHTML =
      `<span class="comment-highlight" data-thread-id="${thread.id}" ` +
      `data-comment-thread="${thread.id}">Hello</span> world`;
    expect(comments.threads.value).toHaveLength(0);

    comments.restoreThreads();

    // The dangling ghost is cleaned up (its thread was genuinely deleted).
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    expect(p.textContent).toBe("Hello world");
  });
});

describe("restoreThreads still re-anchors a VALID serialized range (#r21-3 guard)", () => {
  it("creates the highlight when the text at the serialized path still matches", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });

    // rangeData whose text matches what actually sits at that path.
    const ok = comments.importThreads(
      JSON.stringify([
        {
          id: "t1",
          rangeData: {
            startContainerPath: [0, 0],
            startOffset: 0,
            endContainerPath: [0, 0],
            endOffset: 5,
            text: "Hello",
          },
          status: "open",
          comments: [],
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ])
    );

    expect(ok).toBe(true);
    const highlight = editor.querySelector(".comment-highlight");
    expect(highlight).not.toBeNull();
    expect(highlight!.textContent).toBe("Hello");
  });

  it("does NOT anchor when the text at that path no longer matches", () => {
    const editor = makeEditor("<p>Totally different content</p>");
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });

    comments.importThreads(
      JSON.stringify([
        {
          id: "t1",
          rangeData: {
            startContainerPath: [0, 0],
            startOffset: 0,
            endContainerPath: [0, 0],
            endOffset: 5,
            text: "Hello",
          },
          status: "open",
          comments: [],
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ])
    );

    // The stale anchor is skipped rather than stamped onto unrelated text.
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    expect(editor.textContent).toBe("Totally different content");
  });
});

describe("importThreads never injects an Invalid Date (#r20-3)", () => {
  it("defaults absent thread-level createdAt/updatedAt to a valid date", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });

    const ok = comments.importThreads(
      JSON.stringify([
        {
          id: "t1",
          rangeData: { startOffset: 0, endOffset: 5, text: "Hello" },
          status: "open",
          comments: [{ id: "c1", text: "hi", author: "A" }],
          // createdAt / updatedAt intentionally absent
        },
      ])
    );

    expect(ok).toBe(true);
    const thread = comments.threads.value[0];
    expect(thread.createdAt instanceof Date).toBe(true);
    expect(Number.isNaN(thread.createdAt.getTime())).toBe(false);
    expect(Number.isNaN(thread.updatedAt.getTime())).toBe(false);
  });

  it("still honours present thread dates", () => {
    const editor = makeEditor("<p>Hello world</p>");
    const comments = useComments({
      editorElement: ref<HTMLElement | undefined>(editor),
    });
    const when = "2026-01-15T10:00:00.000Z";

    comments.importThreads(
      JSON.stringify([
        {
          id: "t1",
          rangeData: { startOffset: 0, endOffset: 5, text: "Hello" },
          status: "open",
          createdAt: when,
          updatedAt: when,
          comments: [],
        },
      ])
    );

    expect(comments.threads.value[0].createdAt.toISOString()).toBe(when);
  });
});
