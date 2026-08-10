import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import CommentThreadCard from "../CommentThreadCard.vue";
import type { CommentThread, Comment } from "../../composables/useComments";

/**
 * Stored XSS: comment bodies are arbitrary user input (typed in a plain
 * textarea, or arriving via importThreads' JSON), rendered through
 * v-html="renderCommentContent(...)" — which only styled @mentions and never
 * escaped the content. `<img src=x onerror=...>` in a comment became live DOM
 * in every viewer's page. Content must be HTML-escaped BEFORE the mention
 * markup is layered on.
 */
function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    threadId: "t1",
    author: { id: "u1", name: "Ana" },
    content: "hi",
    mentions: [],
    createdAt: new Date(),
    isEdited: false,
    ...overrides,
  };
}

function makeThread(firstContent: string, replies: string[] = []): CommentThread {
  return {
    id: "t1",
    rangeData: {
      startContainerPath: [],
      startOffset: 0,
      endContainerPath: [],
      endOffset: 0,
      text: "quoted",
    },
    comments: [
      makeComment({ content: firstContent }),
      ...replies.map((content, i) =>
        makeComment({ id: `r${i}`, content })
      ),
    ],
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

let wrapper: ReturnType<typeof mount> | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const PAYLOAD = '<img src=x onerror="window.__pwned=1"> hi @bob';

describe("CommentThreadCard escapes comment HTML", () => {
  it("never turns comment markup into live DOM (main comment)", () => {
    wrapper = mount(CommentThreadCard, {
      props: { thread: makeThread(PAYLOAD), isActive: true },
    });

    // No element was created from the payload…
    expect(wrapper.find(".comment-text img").exists()).toBe(false);
    // …the markup is visible as TEXT…
    expect(wrapper.get(".comment-text").text()).toContain("<img");
    // …and the mention styling still works on the escaped content.
    expect(wrapper.find(".comment-text .comment-mention").exists()).toBe(true);
    expect(wrapper.get(".comment-text .comment-mention").text()).toBe("@bob");
  });

  it("escapes reply bodies too", () => {
    // Replies only render when the card is expanded (isExpanded is a prop —
    // the toggle emits to the parent).
    wrapper = mount(CommentThreadCard, {
      props: {
        thread: makeThread("first", ['<svg onload="x()">boom @ana']),
        isActive: true,
        isExpanded: true,
      },
    });

    // The component's own UI icons are SVGs — assert on the attack vector:
    // no ELEMENT carries the payload's onload handler (the payload's markup
    // may legitimately appear as escaped TEXT).
    expect(wrapper.findAll("[onload]")).toHaveLength(0);
    expect(wrapper.html()).toContain("&lt;svg");
    expect(wrapper.text()).toContain("boom");
  });
});
