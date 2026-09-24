import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useEditorUIState } from '../useEditorUIState';

describe('notification lifetime', () => {
  let wrapper: VueWrapper;
  let state: ReturnType<typeof useEditorUIState>;
  beforeEach(() => {
    vi.useFakeTimers();
    wrapper = mount({ setup() { state = useEditorUIState({ duration: 3000 }); return () => null; } });
  });
  afterEach(() => { wrapper.unmount(); vi.useRealTimers(); });

  it('gives a replacement notification its full reading time', () => {
    state.showToastNotification('Waiting for clipboard access', 'info');
    vi.advanceTimersByTime(2500);
    state.showToastNotification('Clipboard access is unavailable', 'info');
    vi.advanceTimersByTime(500);
    expect(state.showToast.value).toBe(true);
    expect(state.toastMessage.value).toBe('Clipboard access is unavailable');
    vi.advanceTimersByTime(2500);
    expect(state.showToast.value).toBe(false);
  });

  it('dismisses only the completed operation and clears its timer', () => {
    state.showToastNotification('A reply was saved', 'success');
    state.dismissToastNotification('Waiting for clipboard access');
    expect(state.showToast.value).toBe(true);
    state.dismissToastNotification('A reply was saved');
    expect(state.showToast.value).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    state.showToastNotification('Another notice', 'info');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
