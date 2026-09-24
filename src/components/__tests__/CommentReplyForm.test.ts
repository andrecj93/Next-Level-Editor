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
  it.each(['Enter', 'Tab'])('accepts a visible mention suggestion with %s', async key => {
    const wrapper = mount(CommentReplyForm, { props: { mentionSearch: () => users } });
    await typeInTextarea(wrapper, 'Thanks @a');
    await vi.advanceTimersByTimeAsync(160);
    await wrapper.get('textarea').trigger('keydown', { key: 'ArrowDown' });
    await wrapper.get('textarea').trigger('keydown', { key });
    expect(wrapper.get('textarea').element.value).toBe('Thanks @Amir Khan ');
    expect(wrapper.emitted('draft-change')?.at(-1)).toEqual(['Thanks @Amir Khan ']);
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });

  it('drops old mention results as soon as the writer changes the query', async () => {
    let resolveOld!: (items: MentionSuggestion[]) => void;
    const search = vi.fn((query: string) => query === 'a'
      ? new Promise<MentionSuggestion[]>(resolve => { resolveOld = resolve; }) : [users[1]]);
    const wrapper = mount(CommentReplyForm, { props: { mentionSearch: search } });
    await typeInTextarea(wrapper, '@a');
    await vi.advanceTimersByTimeAsync(160);
    await typeInTextarea(wrapper, '@am');
    resolveOld([users[0]]);
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.find('.comment-mention-dropdown').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(160);
    expect(wrapper.get('.comment-mention-dropdown').text()).toContain('Amir Khan');
    expect(wrapper.get('.comment-mention-dropdown').text()).not.toContain('Alice Wonder');
    wrapper.unmount();
  });

  it.each(['absent', 'empty', 'pending', 'rejected'])('leaves editing keys native when suggestions are %s', async state => {
    const mentionSearch = state === 'absent' ? undefined : state === 'pending'
      ? () => new Promise<MentionSuggestion[]>(() => {})
      : state === 'rejected' ? () => Promise.reject(new Error('Unavailable')) : () => [];
    const wrapper = mount(CommentReplyForm, { props: { mentionSearch } });
    await typeInTextarea(wrapper, 'Thanks @Celia');
    await vi.advanceTimersByTimeAsync(160);
    for (const key of ['Enter', 'Tab', 'ArrowUp', 'ArrowDown']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      wrapper.get('textarea').element.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(false);
    }
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true });
    expect(wrapper.emitted('submit')?.[0][0]).toBe('Thanks @Celia');
    wrapper.unmount();
  });

  it('does not submit or query mentions until text composition commits', async () => {
    const mentionSearch = vi.fn(() => users);
    const wrapper = mount(CommentReplyForm, { props: { mentionSearch } });
    await typeInTextarea(wrapper, 'A reply');
    const textarea = wrapper.get('textarea');
    await textarea.trigger('compositionstart');
    await textarea.setValue('A reply @a');
    await textarea.trigger('keydown', { key: 'Enter', ctrlKey: true });
    await wrapper.get('.comment-reply-submit').trigger('click');
    await vi.advanceTimersByTimeAsync(160);
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(mentionSearch).not.toHaveBeenCalled();
    await textarea.trigger('compositionend');
    await vi.advanceTimersByTimeAsync(160);
    expect(mentionSearch).toHaveBeenCalledWith('a');
    wrapper.unmount();
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])('ignores a composition Enter signalled by %j', async flags => {
    const wrapper = mount(CommentReplyForm);
    await typeInTextarea(wrapper, 'A reply');
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true, ...flags });
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });

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
