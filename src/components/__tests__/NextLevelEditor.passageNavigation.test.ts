import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import NextLevelEditor from '../NextLevelEditor.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => { wrapper?.unmount(); window.getSelection()?.removeAllRanges(); });

describe('explicit manuscript navigation returns compact writing space', () => {
  for (const action of ['chapter', 'passage']) {
    for (const layout of ['stacked', 'overlay', 'sidebar']) {
      it(`${action} closes a ${layout} only when it obscures writing`, async () => {
        const html = '<h1>My book</h1><h2>First chapter</h2><p>She returned in order to find the house.</p><h2>Second chapter</h2><p>The road was quiet.</p>';
        wrapper = mount(NextLevelEditor, { props: { modelValue: html, writingMode: true }, attachTo: document.body });
        await nextTick();
        const root = wrapper.get<HTMLElement>('[aria-label="Rich text editor"]').element;
        root.querySelectorAll<HTMLElement>('h1,h2,p').forEach(el => { el.scrollIntoView = vi.fn(); });
        const toggle = wrapper.get('.writing-footer-actions button');
        if (toggle.attributes('aria-expanded') !== 'true') await toggle.trigger('click');
        const panel = wrapper.get<HTMLElement>('.writing-companion');
        panel.element.style.position = layout === 'overlay' ? 'fixed' : 'relative';
        panel.element.parentElement!.style.flexDirection = layout === 'stacked' ? 'column' : 'row';
        if (action === 'chapter') {
          await panel.findAll('.companion-tabs button')[1].trigger('click');
          await panel.findAll('.writing-outline button')[2].trigger('click');
        } else await panel.get('.note-passage').trigger('click');
        await nextTick();
        expect(wrapper.find('.writing-companion').exists()).toBe(layout === 'sidebar');
        expect(document.activeElement).toBe(root);
        const selection = window.getSelection()!;
        if (action === 'chapter') {
          expect(selection.focusNode).toBe(root.querySelectorAll('h2')[1]);
          expect(selection.focusOffset).toBe(0);
        } else expect(selection.toString()).toBe('in order to');
        expect(root.innerHTML).toBe(html);
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      });
    }
  }
});
