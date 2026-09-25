import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import CommentsSidebar from "../CommentsSidebar.vue";
import CommentModal from "../CommentModal.vue";

/**
 * Commenting inserts <span class="comment-highlight" data-thread-id="…"> into
 * the document, and resolve/delete restyle or unwrap it. That markup is MEANT to
 * persist — useHtmlSanitizer special-cases it and restoreThreads documents it as
 * "preserved through the sanitizer round-trip" — but the mutation happens outside
 * Vue, so it must go through the snapshot path or the host never receives the
 * anchor: the reviewer comments, sees "Saved", reloads, and the highlight is gone
 * (the thread then falls back to serialized offsets that drift as the doc is
 * edited).
 */
describe("NextLevelEditor — comment highlights reach the model", () => {
  let wrapper: VueWrapper | null = null;

  const DOC = "<p>Hello brave new world</p>";

  const mountEditor = async (saveHandler?: (content: string) => boolean) => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: DOC,
        enableComments: true,
        ...(saveHandler ? { saveHandler } : {}),
      },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper.find(".editor-content").element as HTMLElement;
  };

  /** Select the word "brave" so addThread has a range to anchor to. */
  const selectBrave = (editor: HTMLElement) => {
    const textNode = editor.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    document.dispatchEvent(new Event("selectionchange"));
  };

  /**
   * Drive the real flow: the sidebar's "create comment" captures the live
   * selection (startAddComment), then the modal submits against it.
   */
  const submitComment = async (text: string) => {
    wrapper!.findComponent(CommentsSidebar).vm.$emit("create-comment");
    await nextTick();
    wrapper!.findComponent(CommentModal).vm.$emit("submit", text, []);
    await nextTick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("emits the highlight anchor when a comment is added", async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await nextTick();

    await submitComment("Nice word");

    // The anchor really is in the document...
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();

    // ...so the host must have been told, or the comment is lost on reload.
    const emitted = (wrapper!.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1]).toContain("comment-highlight");
  });

  it("persists the highlight through auto-save", async () => {
    // Signature declared on the mock (so mock.calls[n][0] stays typed) rather
    // than as an unused parameter the linter has to be told to ignore.
    const saveHandler = vi.fn<(content: string) => boolean>(() => true);
    const editor = await mountEditor(saveHandler);
    selectBrave(editor);
    await nextTick();

    await submitComment("Nice word");
    vi.advanceTimersByTime(2500);
    await flushPromises();

    expect(saveHandler).toHaveBeenCalled();
    const saved = String(saveHandler.mock.calls[saveHandler.mock.calls.length - 1][0]);
    expect(saved).toContain("comment-highlight");
  });

  it('saves reply-only changes and restores their bodies and resolution on remount', async () => {
    const saveHandler = vi.fn<(content: string) => boolean>(() => true);
    const editor = await mountEditor(saveHandler);
    selectBrave(editor);
    await submitComment('An opening note');
    const threadId = editor.querySelector<HTMLElement>('.comment-highlight')!.dataset.threadId!;
    vi.advanceTimersByTime(2500);
    await flushPromises();
    saveHandler.mockClear();
    const htmlBeforeReply = editor.innerHTML;
    wrapper!.findComponent(CommentsSidebar).vm.$emit('add-reply', threadId, 'A reply worth keeping', []);
    await nextTick();
    expect(editor.innerHTML).toBe(htmlBeforeReply);
    expect(wrapper!.find('.auto-save-indicator').text()).toContain('Unsaved changes');
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(saveHandler).toHaveBeenCalledOnce();
    const emitted = wrapper!.emitted('update:commentThreads')!;
    const threads = JSON.parse(String(emitted.at(-1)![0]));
    expect(threads[0].comments.map((comment: { content: string }) => comment.content)).toEqual(['An opening note', 'A reply worth keeping']);
    expect(threads[0]).not.toHaveProperty('highlightElement');
    wrapper!.findComponent(CommentsSidebar).vm.$emit('resolve-thread', threadId);
    await nextTick();
    const persistedThreads = String(wrapper!.emitted('update:commentThreads')!.at(-1)![0]);
    const persistedHtml = editor.innerHTML;
    wrapper!.unmount();
    saveHandler.mockClear();
    wrapper = mount(NextLevelEditor, { props: { modelValue: persistedHtml, commentThreads: persistedThreads, enableComments: true, saveHandler }, attachTo: document.body });
    await nextTick();
    const restored = wrapper.findComponent(CommentsSidebar).props('threads');
    expect(restored).toHaveLength(1);
    expect(restored[0].status).toBe('resolved');
    expect(restored[0].comments[1].content).toBe('A reply worth keeping');
    expect(restored[0].comments[1].createdAt).toBeInstanceOf(Date);
    expect(wrapper.find('.comment-highlight').text()).toBe('brave');
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(wrapper.emitted('update:commentThreads')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(saveHandler).not.toHaveBeenCalled();
  });

  it('keeps the live anchor and caret when the host echoes the comment model', async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await submitComment('Keep the word');
    const anchor = editor.querySelector('.comment-highlight')!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(anchor.firstChild!, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    const snapshot = String(wrapper!.emitted('update:commentThreads')!.at(-1)![0]);
    await wrapper!.setProps({ commentThreads: snapshot });
    expect(editor.querySelector('.comment-highlight')).toBe(anchor);
    expect(selection.anchorNode).toBe(anchor.firstChild);
    expect(selection.anchorOffset).toBe(2);
  });

  it('offers Retry for a failed reply-only save and includes the latest discussion', async () => {
    const saveHandler = vi.fn<(content: string) => boolean>(() => true);
    const editor = await mountEditor(saveHandler);
    selectBrave(editor);
    await submitComment('Keep the word');
    vi.advanceTimersByTime(2500);
    await flushPromises();
    saveHandler.mockReturnValue(false);
    const threadId = editor.querySelector<HTMLElement>('.comment-highlight')!.dataset.threadId!;
    wrapper!.findComponent(CommentsSidebar).vm.$emit('add-reply', threadId, 'Unsaved reply', []);
    await nextTick();
    vi.advanceTimersByTime(2500);
    await flushPromises();
    expect(wrapper!.find('.auto-save-indicator').text()).toContain("Couldn't save changes");
    saveHandler.mockReturnValue(true);
    await wrapper!.find('.save-retry').trigger('click');
    await flushPromises();
    expect(wrapper!.find('.auto-save-indicator').text()).toContain('Saved');
    expect(String(wrapper!.emitted('update:commentThreads')!.at(-1)![0])).toContain('Unsaved reply');
  });

  it('ignores invalid host metadata without replacing the current thread', async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await submitComment('Keep this discussion');
    const anchor = editor.querySelector('.comment-highlight');
    await wrapper!.setProps({ commentThreads: '[{"id":"incomplete"}]' });
    expect(editor.querySelector('.comment-highlight')).toBe(anchor);
    expect(wrapper!.findComponent(CommentsSidebar).props('threads')[0].comments[0].content).toBe('Keep this discussion');
  });

  it('opens an inline discussion repeatedly and reveals resolved replies in the right tab', async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await submitComment('Keep this passage');
    const sidebar = wrapper!.findComponent(CommentsSidebar);
    const threadId = editor.querySelector<HTMLElement>('.comment-highlight')!.dataset.threadId!;
    sidebar.vm.$emit('add-reply', threadId, 'A useful reply', []);
    sidebar.vm.$emit('resolve-thread', threadId);
    await nextTick();
    for (let attempt = 0; attempt < 2; attempt++) {
      sidebar.vm.$emit('close');
      await nextTick();
      await nextTick();
      expect(sidebar.props('isOpen')).toBe(false);
      (editor.querySelector('.comment-highlight') as HTMLElement).click();
      await nextTick();
      await nextTick();
      expect(sidebar.props('isOpen')).toBe(true);
      expect(sidebar.find('[role="tab"][aria-selected="true"]').text()).toBe('Resolved1');
      expect(sidebar.find('.comment-reply').text()).toContain('A useful reply');
    }
    expect(editor.textContent).toBe('Hello brave new world');
  });

  it("emits when a thread is deleted (highlight unwrapped)", async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await nextTick();
    await submitComment("Nice word");
    expect(editor.querySelector(".comment-highlight")).not.toBeNull();

    const threadId = editor
      .querySelector<HTMLElement>(".comment-highlight")!
      .dataset.threadId!;
    wrapper!.findComponent(CommentsSidebar).vm.$emit("delete-thread", threadId);
    await nextTick();

    // Deleting unwraps the span — the host must hear about that too.
    expect(editor.querySelector(".comment-highlight")).toBeNull();
    const emitted = (wrapper!.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1]).not.toContain("comment-highlight");
  });

  it('returns to the commented passage after thread changes replace its DOM nodes', async () => {
    const editor = await mountEditor();
    editor.focus();
    selectBrave(editor);
    await submitComment('Keep this word');
    const sidebar = wrapper!.findComponent(CommentsSidebar);
    const threadId = editor.querySelector<HTMLElement>('.comment-highlight')!.dataset.threadId!;
    sidebar.vm.$emit('resolve-thread', threadId);
    await nextTick();
    sidebar.vm.$emit('reopen-thread', threadId);
    await nextTick();
    // Autosave/source round-trips may replace every node while the author is
    // reading the discussion. An old DOM Range can no longer identify 'brave'.
    const savedHtml = editor.innerHTML;
    editor.innerHTML = savedHtml;
    (sidebar.find('.comments-sidebar-close').element as HTMLButtonElement).focus();
    sidebar.vm.$emit('close');
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(editor);
    expect(window.getSelection()!.toString()).toBe('brave');
  });

  it('does not apply a prior comment selection to a replaced document', async () => {
    const editor = await mountEditor();
    selectBrave(editor);
    await submitComment('Keep this word');
    await wrapper!.setProps({ modelValue: '<p>An entirely different document.</p>' });
    const sidebar = wrapper!.findComponent(CommentsSidebar);
    (sidebar.find('.comments-sidebar-close').element as HTMLButtonElement).focus();
    sidebar.vm.$emit('close');
    await nextTick();
    await nextTick();
    expect(editor.textContent).toBe('An entirely different document.');
    expect(window.getSelection()!.isCollapsed).toBe(true);
  });

  it.each([
    ['a new paragraph', '<p>A line.</p><p><br></p>', 'p:last-child', 0],
    ['outside bold text', '<p><strong>Bold opening.</strong> Then ordinary prose.</p>', 'p', 1],
    ['an empty list item', '<ul><li>First item.</li><li><br></li></ul>', 'li:last-child', 0],
  ] as const)('returns to %s after reading comments', async (_label, html, selector, offset) => {
    const editor = await mountEditor();
    await wrapper!.setProps({ modelValue: html });
    editor.focus();
    const container = editor.querySelector(selector)!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(container, Number(offset));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await wrapper!.find('.comments-toggle-fab').trigger('click');
    const sidebar = wrapper!.findComponent(CommentsSidebar);
    (sidebar.find('.comments-sidebar-close').element as HTMLButtonElement).focus();
    sidebar.vm.$emit('close');
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(editor);
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorNode).toBe(container);
    expect(selection.anchorOffset).toBe(Number(offset));
    expect(editor.innerHTML).toBe(html);
  });
});
