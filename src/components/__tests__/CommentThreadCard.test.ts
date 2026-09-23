import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CommentThreadCard from "../CommentThreadCard.vue";
import type {
  CommentThread,
  Comment,
  CommentAuthor,
} from "../../composables/useComments";

// ---------------------------------------------------------------------------
// Fixtures
//
// CommentThreadCard renders REAL data from a CommentThread: a main comment plus
// optional replies. We build well-formed threads and drive the real DOM. The
// only unavoidable stub is window.confirm — happy-dom does not implement it, and
// handleDelete() calls it before emitting "delete". We stub it to exercise the
// real confirm/cancel branches (not to fake the delete itself).
// ---------------------------------------------------------------------------

function makeAuthor(overrides: Partial<CommentAuthor> = {}): CommentAuthor {
  return {
    id: "u1",
    name: "Ada Lovelace",
    color: "#ff0000",
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    threadId: "t1",
    author: makeAuthor(),
    content: "This is the first comment",
    mentions: [],
    createdAt: new Date(),
    isEdited: false,
    ...overrides,
  };
}

function makeThread(overrides: Partial<CommentThread> = {}): CommentThread {
  return {
    id: "t1",
    rangeData: {
      startContainerPath: [],
      startOffset: 0,
      endContainerPath: [],
      endOffset: 0,
      text: "the quoted selection",
    },
    comments: [makeComment()],
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mountCard = (
  threadOverrides: Partial<CommentThread> = {},
  extraProps: Record<string, unknown> = {}
) =>
  mount(CommentThreadCard, {
    props: {
      thread: makeThread(threadOverrides),
      isActive: false,
      ...extraProps,
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CommentThreadCard", () => {
  it("keeps an orphaned discussion readable and explains its missing passage", () => {
    const w = mountCard({ anchorStatus: "orphaned" }, { readonly: true });
    expect(w.get('[role="status"]').text()).toBe("This passage was removed. The discussion is still available.");
    expect(w.get(".comment-text").text()).toContain("This is the first comment");
    expect(w.find('[aria-label="Delete thread"]').exists()).toBe(false);
    w.unmount();
  });
  // -------------------------------------------------------------------------
  describe("rendering comment data", () => {
    it("renders the author name, timestamp slot and comment body", () => {
      const w = mountCard();
      expect(w.get(".comment-main .comment-author").text()).toBe(
        "Ada Lovelace"
      );
      expect(w.find(".comment-main .comment-time").exists()).toBe(true);
      expect(w.get(".comment-main .comment-text").text()).toContain(
        "This is the first comment"
      );
      w.unmount();
    });

    it("renders the selected-text quote when rangeData.text is present", () => {
      const w = mountCard();
      const quote = w.find(".comment-quote-text");
      expect(quote.exists()).toBe(true);
      // wrapped in curly quotes by the template
      expect(quote.text()).toBe('"the quoted selection"');
      w.unmount();
    });

    it("omits the quote block when rangeData.text is empty", () => {
      const w = mountCard({
        rangeData: {
          startContainerPath: [],
          startOffset: 0,
          endContainerPath: [],
          endOffset: 0,
          text: "",
        },
      });
      expect(w.find(".comment-quote").exists()).toBe(false);
      w.unmount();
    });

    it("shows the author initials in the avatar when no avatarUrl is set", () => {
      const w = mountCard();
      const avatar = w.get(".comment-main .comment-avatar");
      // "Ada Lovelace" -> "AL"
      expect(avatar.text()).toBe("AL");
      expect(avatar.find("img").exists()).toBe(false);
      w.unmount();
    });

    it("renders an <img> avatar (with src + alt) when avatarUrl is provided", () => {
      const w = mountCard({
        comments: [
          makeComment({
            author: makeAuthor({
              name: "Grace Hopper",
              avatarUrl: "https://example.com/grace.png",
            }),
          }),
        ],
      });
      const img = w.get(".comment-main .comment-avatar img");
      expect(img.attributes("src")).toBe("https://example.com/grace.png");
      expect(img.attributes("alt")).toBe("Grace Hopper");
      w.unmount();
    });

    it("applies the author color to the avatar background", () => {
      const w = mountCard();
      const style =
        w.get(".comment-main .comment-avatar").attributes("style") || "";
      // happy-dom may keep the hex or normalise it to rgb()
      expect(style).toMatch(/#ff0000|rgb\(255,\s*0,\s*0\)/i);
      w.unmount();
    });

    it("renders @mentions in the comment body as styled spans", () => {
      const w = mountCard({
        comments: [makeComment({ content: "Hey @alice, please review @bob" })],
      });
      const html = w.get(".comment-main .comment-text").html();
      expect(html).toContain('<span class="comment-mention">@alice</span>');
      expect(html).toContain('<span class="comment-mention">@bob</span>');
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("open-thread actions", () => {
    it("shows the Resolve action (not Reopen) and no Resolved badge", () => {
      const w = mountCard({ status: "open" });
      expect(w.find('[aria-label="Resolve thread"]').exists()).toBe(true);
      expect(w.find('[aria-label="Reopen thread"]').exists()).toBe(false);
      expect(w.find(".comment-status-badge").exists()).toBe(false);
      w.unmount();
    });

    it("emits resolve with the thread id and does NOT toggle (@click.stop)", async () => {
      const w = mountCard({ status: "open" });
      await w.get('[aria-label="Resolve thread"]').trigger("click");
      expect(w.emitted("resolve")).toEqual([["t1"]]);
      // the actions row stops propagation, so the card toggle must not fire
      expect(w.emitted("toggle")).toBeUndefined();
      w.unmount();
    });

    it("emits delete with the thread id when the confirm dialog is accepted", async () => {
      const confirmSpy = vi.fn().mockReturnValue(true);
      vi.stubGlobal("confirm", confirmSpy);

      const w = mountCard();
      await w.get('[aria-label="Delete thread"]').trigger("click");

      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(w.emitted("delete")).toEqual([["t1"]]);
      expect(w.emitted("toggle")).toBeUndefined();
      w.unmount();
    });

    it("does NOT emit delete when the confirm dialog is dismissed", async () => {
      const confirmSpy = vi.fn().mockReturnValue(false);
      vi.stubGlobal("confirm", confirmSpy);

      const w = mountCard();
      await w.get('[aria-label="Delete thread"]').trigger("click");

      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(w.emitted("delete")).toBeUndefined();
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("resolved-thread state", () => {
    it("shows the Reopen action (not Resolve) and the Resolved badge", () => {
      const w = mountCard({ status: "resolved" });
      expect(w.find('[aria-label="Reopen thread"]').exists()).toBe(true);
      expect(w.find('[aria-label="Resolve thread"]').exists()).toBe(false);
      const badge = w.get(".comment-status-badge");
      expect(badge.text()).toContain("Resolved");
      w.unmount();
    });

    it("emits reopen with the thread id when the reopen action is clicked", async () => {
      const w = mountCard({ status: "resolved" });
      await w.get('[aria-label="Reopen thread"]').trigger("click");
      expect(w.emitted("reopen")).toEqual([["t1"]]);
      expect(w.emitted("resolve")).toBeUndefined();
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("toggle interactions", () => {
    it("emits toggle when the main comment area is clicked", async () => {
      const w = mountCard();
      await w.get(".comment-main").trigger("click");
      expect(w.emitted("toggle")).toEqual([["t1"]]);
      w.unmount();
    });

    it("emits toggle when the quote is clicked", async () => {
      const w = mountCard();
      await w.get(".comment-quote").trigger("click");
      expect(w.emitted("toggle")).toEqual([["t1"]]);
      w.unmount();
    });

    it("shows a singular reply-count button for a 2-comment thread and toggles on click", async () => {
      const w = mountCard({
        comments: [makeComment(), makeComment({ id: "c2" })],
      });
      const toggle = w.get(".comment-replies-toggle");
      expect(toggle.text()).toContain("View 1 reply");
      await toggle.trigger("click");
      expect(w.emitted("toggle")).toEqual([["t1"]]);
      w.unmount();
    });

    it("pluralises the reply-count button for a 3-comment thread", () => {
      const w = mountCard({
        comments: [
          makeComment(),
          makeComment({ id: "c2" }),
          makeComment({ id: "c3" }),
        ],
      });
      expect(w.get(".comment-replies-toggle").text()).toContain(
        "View 2 replies"
      );
      w.unmount();
    });

    it("hides the reply-count button when there are no replies", () => {
      const w = mountCard();
      expect(w.find(".comment-replies-toggle").exists()).toBe(false);
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("expanded replies", () => {
    const twoReplyThread = (): Partial<CommentThread> => ({
      comments: [
        makeComment({ content: "Top-level comment" }),
        makeComment({
          id: "c2",
          author: makeAuthor({ id: "u2", name: "Grace Hopper", color: "#00ff00" }),
          content: "First reply @ada",
          isEdited: true,
        }),
      ],
    });

    it("renders the reply list (author, body, edited flag) when isExpanded", () => {
      const w = mountCard(twoReplyThread(), { isExpanded: true });

      const replies = w.findAll(".comment-reply");
      expect(replies).toHaveLength(1);

      const reply = replies[0];
      expect(reply.get(".comment-author").text()).toBe("Grace Hopper");
      expect(reply.get(".comment-text").html()).toContain(
        '<span class="comment-mention">@ada</span>'
      );
      expect(reply.get(".comment-avatar").text()).toBe("GH");
      expect(reply.find(".comment-edited").text()).toBe("(edited)");
      w.unmount();
    });

    it("does not show the '(edited)' marker for an unedited reply", () => {
      const w = mountCard(
        {
          comments: [
            makeComment(),
            makeComment({ id: "c2", isEdited: false }),
          ],
        },
        { isExpanded: true }
      );
      expect(w.find(".comment-reply .comment-edited").exists()).toBe(false);
      w.unmount();
    });

    it("hides the reply-count toggle while expanded and shows a collapse button that toggles", async () => {
      const w = mountCard(twoReplyThread(), { isExpanded: true });
      // reply-count toggle only renders when NOT expanded
      expect(w.find(".comment-replies-toggle").exists()).toBe(false);

      const collapse = w.get(".comment-collapse-btn");
      expect(collapse.text()).toContain("Hide replies");
      await collapse.trigger("click");
      expect(w.emitted("toggle")).toEqual([["t1"]]);
      w.unmount();
    });

    it("does not render replies when expanded but the thread has none", () => {
      const w = mountCard({}, { isExpanded: true });
      expect(w.find(".comment-replies").exists()).toBe(false);
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("reply form toggle + add-reply", () => {
    it("shows the 'Write a reply' button and no form initially", () => {
      const w = mountCard();
      expect(w.find(".comment-add-reply-btn").exists()).toBe(true);
      expect(w.find(".comment-reply-standalone").exists()).toBe(false);
      expect(w.findComponent({ name: "CommentReplyForm" }).exists()).toBe(false);
      w.unmount();
    });

    it("reveals the reply form (and hides the button) when 'Write a reply' is clicked", async () => {
      const w = mountCard();
      await w.get(".comment-add-reply-btn").trigger("click");
      expect(w.find(".comment-reply-standalone").exists()).toBe(true);
      expect(w.find(".comment-reply-textarea").exists()).toBe(true);
      expect(w.find(".comment-add-reply-btn").exists()).toBe(false);
      w.unmount();
    });

    it("emits add-reply(threadId, content, mentions) when the real reply form submits", async () => {
      const w = mountCard();
      await w.get(".comment-add-reply-btn").trigger("click");

      // Drive the REAL CommentReplyForm child, not a stub
      await w.get(".comment-reply-textarea").setValue("Great point @bob");
      await w.get(".comment-reply-submit").trigger("click");

      expect(w.emitted("add-reply")).toEqual([
        ["t1", "Great point @bob", ["bob"]],
      ]);
      // form closes again after a successful reply
      expect(w.find(".comment-reply-standalone").exists()).toBe(false);
      expect(w.find(".comment-add-reply-btn").exists()).toBe(true);
      w.unmount();
    });

    it("closes the form on cancel without emitting add-reply", async () => {
      const w = mountCard();
      await w.get(".comment-add-reply-btn").trigger("click");
      await w.get(".comment-reply-cancel").trigger("click");

      expect(w.emitted("add-reply")).toBeUndefined();
      expect(w.find(".comment-reply-standalone").exists()).toBe(false);
      expect(w.find(".comment-add-reply-btn").exists()).toBe(true);
      w.unmount();
    });
  });

  // -------------------------------------------------------------------------
  describe("relative-time rendering (formatTime)", () => {
    const timeFor = (ago: number) => {
      const w = mountCard({ createdAt: new Date(Date.now() - ago) });
      const text = w.get(".comment-main .comment-time").text();
      w.unmount();
      return text;
    };

    it("shows 'just now' for a timestamp under a minute old", () => {
      expect(timeFor(30 * 1000)).toBe("just now");
    });

    it("shows 'Nm ago' for minutes", () => {
      expect(timeFor(5 * 60 * 1000)).toBe("5m ago");
    });

    it("shows 'Nh ago' for hours", () => {
      expect(timeFor(3 * 60 * 60 * 1000)).toBe("3h ago");
    });

    it("shows 'Nd ago' for days under a week", () => {
      expect(timeFor(2 * 24 * 60 * 60 * 1000)).toBe("2d ago");
    });

    it("uses the editor's default English locale for timestamps a week or older", () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const w = mountCard({ createdAt: old });
      expect(w.get(".comment-main .comment-time").text()).toBe(
        old.toLocaleDateString('en')
      );
      w.unmount();
    });
  });
});
