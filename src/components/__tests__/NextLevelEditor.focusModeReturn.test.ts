import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => { wrapper?.unmount(); window.getSelection()?.removeAllRanges(); });
async function toggle(label = 'Focus mode') {
  const trigger = wrapper!.get<HTMLButtonElement>('[aria-label="View"]');
  await trigger.trigger('mousedown');
  await trigger.trigger('click');
  const item = wrapper!.get<HTMLButtonElement>(`[role="menuitem"][aria-label="${label}"]`);
  item.element.focus();
  await item.trigger('click');
  await nextTick();
}

describe('focus mode resumes the editing surface', () => {
  it.each([false, true])('preserves the rich-text position (backwards=%s) on entry and exit', async backwards => {
    const html='<p>The bus waited.</p>';
    wrapper=mount(NextLevelEditor,{attachTo:document.body,props:{modelValue:html,writingMode:true}});
    await nextTick();
    const root=wrapper.get<HTMLElement>('[aria-label="Rich text editor"]').element;
    root.focus();
    const text=root.firstChild!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text,15,text,backwards?8:15);
    document.dispatchEvent(new Event('selectionchange'));
    for(const label of ['Focus mode','Exit focus mode']) {
      await toggle(label);
      expect(document.activeElement).toBe(root);
      expect(window.getSelection()!.anchorOffset).toBe(15);
      expect(window.getSelection()!.focusOffset).toBe(backwards?8:15);
      expect(root.innerHTML).toBe(html);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    }
  });

  it.each(['code','split'] as const)('returns to the source selection in %s view', async mode => {
    wrapper=mount(NextLevelEditor,{attachTo:document.body,props:{modelValue:'<p>Wait here.</p>',writingMode:true,defaultViewMode:mode}});
    await nextTick();await nextTick();
    const code=wrapper.get<HTMLTextAreaElement>('.code-editor').element;
    const before=code.value;
    code.focus();code.setSelectionRange(3,7,'backward');
    for(const label of ['Focus mode','Exit focus mode']) {
      await toggle(label);
      expect(document.activeElement).toBe(code);
      expect([code.selectionStart,code.selectionEnd,code.selectionDirection]).toEqual([3,7,'backward']);
      expect(code.value).toBe(before);
      // Source blur publishes its sanitized value, even without an edit.
      expect(wrapper.emitted('update:modelValue')?.every(args => args[0] === '<p>Wait here.</p>')).toBe(true);
    }
  });

  it.each([false,true])('does not insert content into an empty editor (readonly=%s)', async readonly => {
    wrapper=mount(NextLevelEditor,{attachTo:document.body,props:{modelValue:'',writingMode:true}});
    await nextTick();
    const before=wrapper.get('[aria-label="Rich text editor"]').element.innerHTML;
    await toggle();
    if(readonly) await wrapper.setProps({readonly:true});
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    await nextTick();await nextTick();
    expect(wrapper.classes()).not.toContain('is-focus');
    expect(wrapper.get('[aria-label="Rich text editor"]').element.innerHTML).toBe(before);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('does not steal host focus when Escape exits the layout', async () => {
    wrapper=mount(NextLevelEditor,{attachTo:document.body,props:{modelValue:'<p>Wait.</p>',writingMode:true}});
    await nextTick();await toggle();
    const outside=document.createElement('input');document.body.appendChild(outside);
    try {
      outside.focus();outside.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      await nextTick();await nextTick();
      expect(wrapper.classes()).not.toContain('is-focus');
      expect(document.activeElement).toBe(outside);
    } finally {outside.remove();}
  });
});
