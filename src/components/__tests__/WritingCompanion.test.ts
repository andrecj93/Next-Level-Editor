import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import WritingCompanion from '../WritingCompanion.vue';
import { reviewWriting, type WritingNote } from '../../utils/writingReview';

let wrapper: VueWrapper;
let manuscript: HTMLTextAreaElement | undefined;
afterEach(() => {
  wrapper?.unmount();
  manuscript?.remove();
  manuscript = undefined;
});

function setup(count: number, afterDismiss?: () => void) {
  const review = reviewWriting(Array.from({ length: count }, (_, index) => `<p>She returned in order to find house ${index}.</p>`).join(''));
  const dismissed = new Set<string>();
  wrapper = mount(WritingCompanion, {
    attachTo: document.body,
    props: {
      review,
      dismissedNotes: dismissed,
      onDismiss: (note: WritingNote) => {
        dismissed.add(note.id);
        void wrapper.setProps({ dismissedNotes: new Set(dismissed) });
        afterDismiss?.();
      },
    },
  });
}

describe('writing companion focus after keeping a passage', () => {
  it('continues at the next note without skipping it', async () => {
    setup(3);
    const secondPassage = wrapper.findAll('.note-passage')[1].element;
    const button = wrapper.findAll<HTMLButtonElement>('[aria-label^="Dismiss note"]')[0];
    button.element.focus();
    await button.trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(secondPassage);
  });

  it('returns to the previous note when the last note is dismissed', async () => {
    setup(2);
    const firstPassage = wrapper.find('.note-passage').element;
    const button = wrapper.findAll<HTMLButtonElement>('[aria-label^="Dismiss note"]')[1];
    button.element.focus();
    await button.trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(firstPassage);
  });

  it('reaches the newly revealed sixth note and eventually returns to Writing notes', async () => {
    setup(6);
    const dismiss = async (index: number) => {
      const button = wrapper.findAll<HTMLButtonElement>('[aria-label^="Dismiss note"]')[index];
      button.element.focus();
      await button.trigger('click');
      await nextTick();
    };
    await dismiss(4);
    expect(wrapper.findAll('.writing-note')).toHaveLength(5);
    expect(document.activeElement).toBe(wrapper.findAll('.note-passage')[4].element);
    for (let index = 0; index < 5; index++) await dismiss(0);
    expect(document.activeElement).toBe(wrapper.find('.companion-tabs button').element);
    expect(wrapper.text()).toContain('You’ve considered every note. Keep your voice.');
  });

  it('does not steal focus that deliberately moved back to the manuscript', async () => {
    manuscript = document.createElement('textarea');
    document.body.appendChild(manuscript);
    setup(2, () => manuscript!.focus());
    const button = wrapper.find<HTMLButtonElement>('[aria-label^="Dismiss note"]');
    button.element.focus();
    await button.trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(manuscript);
  });
});
