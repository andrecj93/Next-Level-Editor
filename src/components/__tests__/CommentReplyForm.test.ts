import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import CommentReplyForm from "../CommentReplyForm.vue";
import type { MentionSuggestion } from "../../composables/useComments";

const users: MentionSuggestion[] = [
  { id: "u1", name: "Alice Wonder", email: "alice@example.com" },
  { id: "u2", name: "Amir Khan", email: "amir@example.com" },
];

/**
 * Type text into the textarea and place the cursor at the end so the
 * @mention detection in handleInput sees the full text.
 */
async function typeInTextarea(wrapper: VueWrapper, text: string) {
  const textarea = wrapper.find("textarea");
  await textarea.setValue(text);
  const el = textarea.element as HTMLTextAreaElement;
  el.setSelectionRange(el.value.length, el.value.length);
  await textarea.trigger("input");
}

describe("CommentReplyForm mentions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows suggestions from the injected mentionSearch provider after the debounce", async () => {
    const mentionSearch = vi.fn().mockResolvedValue(users);
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "Thanks @a");

    // Debounced: not called immediately
    expect(mentionSearch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);
    await nextTick();

    expect(mentionSearch).toHaveBeenCalledWith("a");

    const dropdown = wrapper.find(".comment-mention-dropdown");
    expect(dropdown.exists()).toBe(true);
    expect(dropdown.text()).toContain("Alice Wonder");
    expect(dropdown.text()).toContain("Amir Khan");
  });

  it("supports a synchronous mentionSearch provider", async () => {
    const mentionSearch = vi.fn(() => users);
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "@am");
    await vi.advanceTimersByTimeAsync(150);
    await nextTick();

    expect(mentionSearch).toHaveBeenCalledWith("am");
    expect(wrapper.find(".comment-mention-dropdown").text()).toContain(
      "Amir Khan"
    );
  });

  it("debounces rapid typing into a single provider call with the final query", async () => {
    const mentionSearch = vi.fn().mockResolvedValue(users);
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "@a");
    await vi.advanceTimersByTimeAsync(100);
    await typeInTextarea(wrapper, "@al");
    await vi.advanceTimersByTimeAsync(150);

    expect(mentionSearch).toHaveBeenCalledTimes(1);
    expect(mentionSearch).toHaveBeenCalledWith("al");
  });

  it("shows no suggestions when no provider is supplied", async () => {
    const wrapper = mount(CommentReplyForm);

    await typeInTextarea(wrapper, "@jo");
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();

    expect(wrapper.find(".comment-mention-dropdown").exists()).toBe(false);
    // The old hardcoded mock users must be gone
    expect(wrapper.html()).not.toContain("John Doe");
    expect(wrapper.html()).not.toContain("Jane Smith");
    expect(wrapper.html()).not.toContain("Bob Johnson");
  });

  it("inserts the mention into the content when a suggestion is clicked", async () => {
    const mentionSearch = vi.fn().mockResolvedValue([users[0]]);
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "Thanks @al");
    await vi.advanceTimersByTimeAsync(150);
    await nextTick();

    await wrapper.find(".comment-mention-item").trigger("click");
    await nextTick();

    const textarea = wrapper.find("textarea")
      .element as HTMLTextAreaElement;
    expect(textarea.value).toBe("Thanks @Alice Wonder ");
    expect(wrapper.find(".comment-mention-dropdown").exists()).toBe(false);
  });

  it("submits the reply including the selected mention and resets the form", async () => {
    const mentionSearch = vi.fn().mockResolvedValue([users[0]]);
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "Hi @al");
    await vi.advanceTimersByTimeAsync(150);
    await nextTick();
    await wrapper.find(".comment-mention-item").trigger("click");
    await nextTick();

    await wrapper.find(".comment-reply-submit").trigger("click");

    const submitted = wrapper.emitted("submit");
    expect(submitted).toBeTruthy();
    expect(submitted?.[0][0]).toBe("Hi @Alice Wonder");
    expect(submitted?.[0][1]).toEqual(["Alice"]);

    const textarea = wrapper.find("textarea")
      .element as HTMLTextAreaElement;
    await nextTick();
    expect(textarea.value).toBe("");
  });

  it("drops stale results when the mention context is dismissed before the search resolves", async () => {
    let resolveSearch!: (value: MentionSuggestion[]) => void;
    const mentionSearch = vi.fn(
      () =>
        new Promise<MentionSuggestion[]>((resolve) => {
          resolveSearch = resolve;
        })
    );
    const wrapper = mount(CommentReplyForm, {
      props: { mentionSearch },
    });

    await typeInTextarea(wrapper, "@a");
    await vi.advanceTimersByTimeAsync(150);
    expect(mentionSearch).toHaveBeenCalledTimes(1);

    // User deletes the mention before the search resolves
    await typeInTextarea(wrapper, "done");

    resolveSearch(users);
    await vi.advanceTimersByTimeAsync(0);
    await nextTick();

    expect(wrapper.find(".comment-mention-dropdown").exists()).toBe(false);
  });
});
