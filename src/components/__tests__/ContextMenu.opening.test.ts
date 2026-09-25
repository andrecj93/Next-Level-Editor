import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ContextMenu from '../ContextMenu.vue';

describe('context menu opening interactions', () => {
  let wrapper: ReturnType<typeof mount> | undefined;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const open = async () => {
    const editor = document.createElement('textarea');
    document.body.appendChild(editor);
    editor.focus();
    wrapper = mount(ContextMenu, {
      props: {
        show: false,
        position: { top: 8, left: 8 },
        items: ['Copy', 'Paste', 'Insert link'].map(label => ({ id: label, label, onClick: vi.fn() })),
      },
      attachTo: document.body,
    });
    await wrapper.setProps({ show: true });
    await nextTick();
    return { editor, items: [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')] };
  };

  it('responds to the first navigation key as soon as the menu appears', async () => {
    const { items } = await open();
    expect(document.activeElement).toBe(items[0]);
    // The opening click guard is still pending; keyboard input is already valid.
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    expect(wrapper!.emitted('close')).toBeUndefined();
  });

  it('accepts Escape immediately and returns to writing', async () => {
    const { editor } = await open();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(wrapper!.emitted('close')).toHaveLength(1);
    await wrapper!.setProps({ show: false });
    await nextTick();
    expect(document.activeElement).toBe(editor);
  });

  it.each(['close', 'unmount'])('cancels pending outside-click setup on %s', async action => {
    await open();
    const listener = vi.spyOn(document, 'addEventListener');
    if (action === 'close') await wrapper!.setProps({ show: false });
    else { wrapper!.unmount(); wrapper = undefined; }
    await vi.runAllTimersAsync();
    expect(listener.mock.calls.filter(([event]) => event === 'click' || event === 'keydown')).toEqual([]);
  });
});
