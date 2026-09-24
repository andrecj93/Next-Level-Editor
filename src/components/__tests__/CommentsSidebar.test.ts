import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CommentsSidebar from "../CommentsSidebar.vue";
import CommentThreadCard from "../CommentThreadCard.vue";
import type {
  CommentThread,
  Comment,
  CommentAuthor,
} from "../../composables/useComments";

// ---------------------------------------------------------------------------
// Realistic CommentThread[] fixtures.
//
// CommentsSidebar is a thin orchestrator: it filters `threads` into an Open /
// Resolved tab, renders a real <CommentThreadCard> per visible thread, and
// re-emits the cards' events. So every test mounts the REAL card tree (never a
// stub of the component under test's child) and drives it via real DOM events,
// asserting on the sidebar's `emitted()` and on the props it hands each card.
// ---------------------------------------------------------------------------

function makeAuthor(overrides: Partial<CommentAuthor> = {}): CommentAuthor {
  return { id: "u1", name: "Ada Lovelace", color: "#3b82f6", ...overrides };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    threadId: "t1",
    author: makeAuthor(),
    content: "This paragraph needs a citation",
    mentions: [],
    createdAt: new Date("2026-07-09T10:00:00Z"),
    isEdited: false,
    ...overrides,
  };
}

function makeThread(overrides: Partial<CommentThread> = {}): CommentThread {
  const id = (overrides.id as string) ?? "t1";
  return {
    id,
    rangeData: {
      startContainerPath: [0],
      startOffset: 0,
      endContainerPath: [0],
      endOffset: 5,
      text: "Hello world",
    },
    comments: [makeComment({ threadId: id })],
    status: "open",
    createdAt: new Date("2026-07-09T10:00:00Z"),
    updatedAt: new Date("2026-07-09T10:00:00Z"),
    ...overrides,
  };
}

const mountSidebar = (
  props: Partial<InstanceType<typeof CommentsSidebar>["$props"]> = {}
) =>
  mount(CommentsSidebar, {
    props: {
      threads: [],
      activeThreadId: null,
      ...props,
    },
  });

// happy-dom's window.confirm is a no-op; the delete flow gates on it, so we
// install a controllable stub per test. (An unavoidable browser-API stub — the
// real DOM behaviour under it is still exercised end to end.)
const originalConfirm = window.confirm;
beforeEach(() => {
  window.confirm = vi.fn(() => true);
});
afterEach(() => {
  window.confirm = originalConfirm;
  vi.restoreAllMocks();
});

describe("CommentsSidebar", () => {
  it('retains separate unsent replies through empty tabs and sidebar closure', async () => {
    const w = mountSidebar({ threads: [makeThread({ id: 't1' }), makeThread({ id: 't2' })] });
    const cards = w.findAllComponents(CommentThreadCard);
    await cards[0].get('.comment-add-reply-btn').trigger('click');
    await cards[0].get('textarea').setValue('Keep this first thought.\nAnd this line.');
    await cards[1].get('.comment-add-reply-btn').trigger('click');
    await cards[1].get('textarea').setValue('A different reply.');
    await w.get('[role="tab"][id$="-resolved"]').trigger('click');
    expect(w.find('textarea').exists()).toBe(false);
    await w.setProps({ isOpen: false });
    await w.setProps({ isOpen: true });
    await w.get('[role="tab"][id$="-open"]').trigger('click');
    expect(w.findAll('textarea').map(t => t.element.value)).toEqual(['Keep this first thought.\nAnd this line.', 'A different reply.']);
    expect(w.emitted('add-reply')).toBeUndefined();
    w.unmount();
  });

  it('restores a reply without stealing focus from keyboard tab navigation', async () => {
    const w = mount(CommentsSidebar, { attachTo: document.body, props: { threads: [makeThread()], activeThreadId: null } });
    await w.get('.comment-add-reply-btn').trigger('click');
    await w.get('textarea').setValue('Still thinking.');
    const open = w.get<HTMLButtonElement>('[role="tab"][id$="-open"]');
    open.element.focus();
    await open.trigger('keydown', { key: 'ArrowRight' });
    await w.get('[role="tab"][id$="-resolved"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(w.get('textarea').element.value).toBe('Still thinking.');
    expect(document.activeElement).toBe(open.element);
    w.unmount();
  });

  it.each(['cancel', 'submit'])('clears only the explicitly %s reply draft', async action => {
    const w = mountSidebar({ threads: [makeThread()] });
    await w.get('.comment-add-reply-btn').trigger('click');
    await w.get('textarea').setValue('Keep the final line.');
    await w.get(`.comment-reply-${action}`).trigger('click');
    await w.get('[role="tab"][id$="-resolved"]').trigger('click');
    await w.get('[role="tab"][id$="-open"]').trigger('click');
    expect(w.find('textarea').exists()).toBe(false);
    await w.get('.comment-add-reply-btn').trigger('click');
    expect(w.get('textarea').element.value).toBe('');
    expect(w.emitted('add-reply')?.length ?? 0).toBe(action === 'submit' ? 1 : 0);
    w.unmount();
  });

  it('keeps a draft when its thread resolves, but removes it when the thread is deleted', async () => {
    const thread = makeThread();
    const w = mountSidebar({ threads: [thread] });
    await w.get('.comment-add-reply-btn').trigger('click');
    await w.get('textarea').setValue('An unfinished reply.');
    await w.setProps({ threads: [{ ...thread, status: 'resolved' }] });
    await w.get('[role="tab"][id$="-resolved"]').trigger('click');
    expect(w.get('textarea').element.value).toBe('An unfinished reply.');
    await w.setProps({ threads: [] });
    await w.setProps({ threads: [{ ...thread, status: 'resolved' }] });
    expect(w.find('textarea').exists()).toBe(false);
    w.unmount();
  });

  describe("rendering threads from props", () => {
    it("renders one CommentThreadCard per open thread on the default tab", () => {
      const threads = [
        makeThread({ id: "t1" }),
        makeThread({ id: "t2" }),
        makeThread({ id: "t3" }),
      ];
      const w = mountSidebar({ threads, activeThreadId: null });

      const cards = w.findAllComponents(CommentThreadCard);
      expect(cards).toHaveLength(3);
      expect(cards.map((c) => c.props("thread").id)).toEqual([
        "t1",
        "t2",
        "t3",
      ]);
      w.unmount();
    });

    it("surfaces the author name and comment content in the rendered card", () => {
      const threads = [
        makeThread({
          id: "t1",
          comments: [
            makeComment({
              threadId: "t1",
              author: makeAuthor({ name: "Grace Hopper" }),
              content: "Tighten this sentence",
            }),
          ],
        }),
      ];
      const w = mountSidebar({ threads });

      const text = w.text();
      expect(text).toContain("Grace Hopper");
      expect(text).toContain("Tighten this sentence");
      w.unmount();
    });

    it("hides resolved threads on the Open tab (status filtering)", () => {
      const threads = [
        makeThread({ id: "open-1", status: "open" }),
        makeThread({ id: "resolved-1", status: "resolved" }),
      ];
      const w = mountSidebar({ threads });

      const cards = w.findAllComponents(CommentThreadCard);
      expect(cards.map((c) => c.props("thread").id)).toEqual(["open-1"]);
      w.unmount();
    });

    it("shows Open / Resolved counts in the tab badges", () => {
      const threads = [
        makeThread({ id: "o1", status: "open" }),
        makeThread({ id: "o2", status: "open" }),
        makeThread({ id: "r1", status: "resolved" }),
      ];
      const w = mountSidebar({ threads });

      const badges = w.findAll(".comments-tab-badge").map((b) => b.text());
      expect(badges).toEqual(["2", "1"]);
      w.unmount();
    });
  });

  describe("tab filtering", () => {
    it("switches to resolved threads when the Resolved tab is clicked", async () => {
      const threads = [
        makeThread({ id: "o1", status: "open" }),
        makeThread({ id: "r1", status: "resolved" }),
        makeThread({ id: "r2", status: "resolved" }),
      ];
      const w = mountSidebar({ threads });

      // Default (Open) tab
      expect(
        w.findAllComponents(CommentThreadCard).map((c) => c.props("thread").id)
      ).toEqual(["o1"]);

      // Second tab button is "Resolved"
      const tabs = w.findAll(".comments-tab");
      expect(tabs[1].text()).toContain("Resolved");
      await tabs[1].trigger("click");

      expect(
        w.findAllComponents(CommentThreadCard).map((c) => c.props("thread").id)
      ).toEqual(["r1", "r2"]);
      w.unmount();
    });

    it("returns to open threads when the Open tab is clicked again", async () => {
      const threads = [
        makeThread({ id: "o1", status: "open" }),
        makeThread({ id: "r1", status: "resolved" }),
      ];
      const w = mountSidebar({ threads });
      const tabs = w.findAll(".comments-tab");

      await tabs[1].trigger("click"); // Resolved
      expect(
        w.findAllComponents(CommentThreadCard).map((c) => c.props("thread").id)
      ).toEqual(["r1"]);

      await tabs[0].trigger("click"); // Open
      expect(
        w.findAllComponents(CommentThreadCard).map((c) => c.props("thread").id)
      ).toEqual(["o1"]);
      w.unmount();
    });

    it("marks the current tab active", async () => {
      const w = mountSidebar({ threads: [makeThread()] });
      const tabs = w.findAll(".comments-tab");

      expect(tabs[0].classes()).toContain("active");
      expect(tabs[1].classes()).not.toContain("active");

      await tabs[1].trigger("click");
      expect(tabs[0].classes()).not.toContain("active");
      expect(tabs[1].classes()).toContain("active");
      w.unmount();
    });
  });

  describe("empty states", () => {
    it("shows the 'No comments yet' empty state when there are no threads", () => {
      const w = mountSidebar({ threads: [] });
      expect(w.find(".comments-empty-state").exists()).toBe(true);
      expect(w.find(".comments-empty-text").text()).toBe("No comments yet");
      expect(w.findAllComponents(CommentThreadCard)).toHaveLength(0);
      w.unmount();
    });

    it("shows the open empty state when every thread is resolved (Open tab has none)", () => {
      const w = mountSidebar({
        threads: [makeThread({ id: "r1", status: "resolved" })],
      });
      // Default Open tab => 0 open threads => empty state
      expect(w.find(".comments-empty-text").text()).toBe("No comments yet");
      w.unmount();
    });

    it("shows the 'No resolved comments' empty state on the Resolved tab", async () => {
      const w = mountSidebar({
        threads: [makeThread({ id: "o1", status: "open" })],
      });
      await w.findAll(".comments-tab")[1].trigger("click");

      expect(w.find(".comments-empty-state").exists()).toBe(true);
      expect(w.find(".comments-empty-text").text()).toBe("No resolved comments");
      w.unmount();
    });
  });

  describe("active-thread highlight", () => {
    it("passes is-active=true only to the card matching activeThreadId", () => {
      const threads = [makeThread({ id: "t1" }), makeThread({ id: "t2" })];
      const w = mountSidebar({ threads, activeThreadId: "t2" });

      const byId = Object.fromEntries(
        w
          .findAllComponents(CommentThreadCard)
          .map((c) => [c.props("thread").id, c.props("isActive")])
      );
      expect(byId).toEqual({ t1: false, t2: true });
      w.unmount();
    });

    it("passes is-active=false to all cards when activeThreadId is null", () => {
      const threads = [makeThread({ id: "t1" }), makeThread({ id: "t2" })];
      const w = mountSidebar({ threads, activeThreadId: null });

      expect(
        w
          .findAllComponents(CommentThreadCard)
          .every((c) => c.props("isActive") === false)
      ).toBe(true);
      w.unmount();
    });
  });

  describe("re-emitting card events (real DOM through the real card)", () => {
    it("emits resolve-thread with the id when the card's Resolve button is clicked", async () => {
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });

      await w.get('[aria-label="Resolve thread"]').trigger("click");

      expect(w.emitted("resolve-thread")).toBeTruthy();
      expect(w.emitted("resolve-thread")).toHaveLength(1);
      expect(w.emitted("resolve-thread")![0]).toEqual(["t1"]);
      w.unmount();
    });

    it("emits reopen-thread from a resolved card's Reopen button", async () => {
      const w = mountSidebar({
        threads: [makeThread({ id: "t9", status: "resolved" })],
      });
      await w.findAll(".comments-tab")[1].trigger("click"); // Resolved tab

      await w.get('[aria-label="Reopen thread"]').trigger("click");

      expect(w.emitted("reopen-thread")![0]).toEqual(["t9"]);
      w.unmount();
    });

    it("emits delete-thread when delete is confirmed", async () => {
      window.confirm = vi.fn(() => true);
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });

      await w.get('[aria-label="Delete thread"]').trigger("click");

      expect(window.confirm).toHaveBeenCalledOnce();
      expect(w.emitted("delete-thread")![0]).toEqual(["t1"]);
      w.unmount();
    });

    it("does NOT emit delete-thread when the confirm dialog is dismissed", async () => {
      window.confirm = vi.fn(() => false);
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });

      await w.get('[aria-label="Delete thread"]').trigger("click");

      expect(window.confirm).toHaveBeenCalledOnce();
      expect(w.emitted("delete-thread")).toBeUndefined();
      w.unmount();
    });

    it("emits add-reply(id, content, mentions) end-to-end through the reply form", async () => {
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });

      // Reveal the reply form, type a reply containing a mention, submit it.
      await w.get(".comment-add-reply-btn").trigger("click");
      await w.get(".comment-reply-textarea").setValue("ping @alice please");
      await w.get(".comment-reply-submit").trigger("click");

      const emitted = w.emitted("add-reply");
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(["t1", "ping @alice please", ["alice"]]);
      w.unmount();
    });

    it("toggles a thread's expanded prop when its body is clicked (toggle handler)", async () => {
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });
      const card = () => w.findComponent(CommentThreadCard);

      expect(card().props("isExpanded")).toBe(false);
      await w.get(".comment-main").trigger("click");
      expect(card().props("isExpanded")).toBe(true);
      await w.get(".comment-main").trigger("click");
      expect(card().props("isExpanded")).toBe(false);
      w.unmount();
    });
  });

  describe("select-thread + auto-expand", () => {
    // The card exposes no DOM affordance that emits `select` (clicking its body
    // emits `toggle`), so we exercise the sidebar's real `selectThread` handler
    // by having the REAL child instance emit its declared `select` event.
    it("re-emits select-thread and auto-expands the selected thread", async () => {
      const w = mountSidebar({ threads: [makeThread({ id: "t1" })] });
      const card = w.findComponent(CommentThreadCard);

      expect(card.props("isExpanded")).toBe(false);
      card.vm.$emit("select", "t1");
      await w.vm.$nextTick();

      expect(w.emitted("select-thread")![0]).toEqual(["t1"]);
      expect(card.props("isExpanded")).toBe(true);
      w.unmount();
    });
  });

  describe("new-comment FAB", () => {
    it("emits create-comment when the FAB is clicked (Open tab)", async () => {
      const w = mountSidebar({ threads: [makeThread()] });
      expect(w.find(".comments-fab").exists()).toBe(true);

      await w.get(".comments-fab").trigger("click");
      expect(w.emitted("create-comment")).toBeTruthy();
      w.unmount();
    });

    it("hides the FAB on the Resolved tab", async () => {
      const w = mountSidebar({
        threads: [makeThread({ id: "r1", status: "resolved" })],
      });
      expect(w.find(".comments-fab").exists()).toBe(true);

      await w.findAll(".comments-tab")[1].trigger("click");
      expect(w.find(".comments-fab").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("closing / isOpen", () => {
    it("emits close from the header close button", async () => {
      const w = mountSidebar();
      await w.get(".comments-sidebar-close").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("emits close when the (mobile) backdrop is clicked", async () => {
      const w = mountSidebar({ isOpen: true });
      await w.get(".comments-sidebar-backdrop").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("renders the backdrop and open class only when isOpen is true", async () => {
      const w = mountSidebar({ isOpen: true });
      expect(w.find(".comments-sidebar-backdrop").exists()).toBe(true);
      expect(w.find(".comments-sidebar").classes()).toContain(
        "comments-sidebar-open"
      );

      await w.setProps({ isOpen: false });
      expect(w.find(".comments-sidebar-backdrop").exists()).toBe(false);
      expect(w.find(".comments-sidebar").classes()).not.toContain(
        "comments-sidebar-open"
      );
      w.unmount();
    });
  });
});
