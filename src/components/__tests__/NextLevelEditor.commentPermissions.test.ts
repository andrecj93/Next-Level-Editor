import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';
import CommentsSidebar from '../CommentsSidebar.vue';
import CommentModal from '../CommentModal.vue';
import type { DocumentRole } from '../../types/document';

let wrapper: VueWrapper | undefined;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.useRealTimers(); });
const threads = JSON.stringify([{
  id: 'thread', status: 'open',
  rangeData: { startContainerPath: [0, 0], startOffset: 0, endContainerPath: [0, 0], endOffset: 5, text: 'Hello' },
  comments: [
    { id: 'first', author: { id: 'writer', name: 'Writer' }, content: 'Keep this discussion.' },
    { id: 'reply', author: { id: 'reader', name: 'Reader' }, content: 'Keep this reply.' },
  ],
  createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z',
}]);
async function editor(role: DocumentRole, readonly = false) {
  vi.useFakeTimers();
  const save = vi.fn(() => true);
  wrapper = mount(NextLevelEditor, { props: {
    modelValue: '<p>Hello world.</p>', commentThreads: threads, enableComments: true,
    documentOptions: { id: 'permission-test', role }, readonly, saveHandler: save,
  }, attachTo: document.body });
  await nextTick();
  return { sidebar: wrapper.findComponent(CommentsSidebar), modal: wrapper.findComponent(CommentModal), save };
}

describe('discussion permissions', () => {
  it.each([['viewer', false], ['author', true]] as const)('keeps existing discussion readable for %s / readonly=%s and blocks every mutation', async (role, readonly) => {
    const { sidebar, modal, save } = await editor(role, readonly);
    const before = JSON.stringify(sidebar.props('threads'));
    const html = wrapper!.get('.editor-content').element.innerHTML;
    await wrapper!.get('.comment-highlight').trigger('click');
    expect(sidebar.props('isOpen')).toBe(true);
    expect(sidebar.text()).toContain('Keep this discussion.');
    expect(sidebar.text()).toContain('Comments are read-only.');
    expect(sidebar.find('.comments-fab, .comment-actions, .comment-add-reply-btn').exists()).toBe(false);
    expect(sidebar.text()).toContain('Keep this reply.');
    for (const event of ['resolve-thread', 'reopen-thread', 'delete-thread', 'create-comment']) sidebar.vm.$emit(event, 'thread');
    sidebar.vm.$emit('add-reply', 'thread', 'Forbidden reply', []);
    modal.vm.$emit('submit', 'Forbidden comment', []);
    await nextTick();
    await vi.advanceTimersByTimeAsync(2500);
    expect(JSON.stringify(sidebar.props('threads'))).toBe(before);
    expect(wrapper!.get('.editor-content').element.innerHTML).toBe(html);
    expect(wrapper!.emitted('update:commentThreads')).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
  });

  it.each(['author', 'reviewer'] as const)('allows %s discussion and removes a pending reply when permission is revoked', async role => {
    const { sidebar, modal } = await editor(role);
    await sidebar.get('.comment-add-reply-btn').trigger('click');
    expect(sidebar.find('textarea').exists()).toBe(true);
    sidebar.vm.$emit('add-reply', 'thread', 'Allowed reply', []);
    await nextTick();
    expect(sidebar.props('threads')[0].comments.at(-1)?.content).toBe('Allowed reply');
    const before = JSON.stringify(sidebar.props('threads'));
    await wrapper!.setProps({ documentOptions: { id: 'permission-test', role: 'viewer' } });
    expect(sidebar.find('textarea').exists()).toBe(false);
    sidebar.vm.$emit('add-reply', 'thread', 'Late reply', []);
    modal.vm.$emit('submit', 'Late comment', []);
    await nextTick();
    expect(JSON.stringify(sidebar.props('threads'))).toBe(before);
    expect(modal.props('isOpen')).toBe(false);
  });

  it('does not persist an author edit queued before becoming a viewer', async () => {
    const { sidebar, save } = await editor('author');
    await vi.advanceTimersByTimeAsync(2500);
    save.mockClear();
    sidebar.vm.$emit('add-reply', 'thread', 'Unsaved reply', []);
    await nextTick();
    await wrapper!.setProps({ documentOptions: { id: 'permission-test', role: 'viewer' } });
    await vi.advanceTimersByTimeAsync(2500);
    expect(save).not.toHaveBeenCalled();
    expect(sidebar.props('threads')[0].comments.at(-1)?.content).toBe('Unsaved reply');
    expect(wrapper!.get('.auto-save-indicator').text()).toContain("Couldn't save changes");
    await wrapper!.get('.save-retry').trigger('click');
    expect(save).not.toHaveBeenCalled();
    await wrapper!.setProps({ documentOptions: { id: 'permission-test', role: 'author' } });
    await wrapper!.get('.save-retry').trigger('click');
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledOnce();
  });
});
