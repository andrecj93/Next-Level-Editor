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
  return review;
}

describe('writing companion review and focus', () => {
  it('continues at the next note without skipping it', async () => {
    setup(3);
    const button = wrapper.get<HTMLButtonElement>('[aria-label^="Dismiss note"]');
    button.element.focus();
    await button.trigger('click');
    await nextTick();
    expect(wrapper.get('.note-passage').text()).toContain('house 1');
    expect(document.activeElement).toBe(wrapper.get('.note-passage').element);
  });

  it('returns to the previous note when the last note is dismissed', async () => {
    setup(2);
    await wrapper.get('[aria-label="Next note"]').trigger('click');
    const button = wrapper.get<HTMLButtonElement>('[aria-label^="Dismiss note"]');
    button.element.focus();
    await button.trigger('click');
    await nextTick();
    expect(wrapper.get('.note-passage').text()).toContain('house 0');
    expect(document.activeElement).toBe(wrapper.get('.note-passage').element);
  });

  it('recovers focus when a touch browser does not focus the tapped button', async () => {
    setup(2);
    expect(document.activeElement).toBe(document.body);
    await wrapper.get('[aria-label^="Dismiss note"]').trigger('click');
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get('.note-passage').element);
    expect(wrapper.get('.note-passage').text()).toContain('house 1');
  });

  it('keeps all decisions independent and eventually returns to Writing notes', async () => {
    setup(6);
    const dismiss = async () => {
      const button = wrapper.get<HTMLButtonElement>('[aria-label^="Dismiss note"]');
      button.element.focus();
      await button.trigger('click');
      await nextTick();
    };
    for (let index = 0; index < 6; index++) {
      expect(wrapper.get('.note-passage').text()).toContain(`house ${index}`);
      await dismiss();
    }
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

  it('lets the writer browse every note without dismissing earlier passages', async () => {
    setup(12);
    expect(wrapper.find('.note-pagination').text()).toContain('1 of 12');
    expect(wrapper.find('[aria-label="Previous note"]').attributes('disabled')).toBeDefined();
    for (let index = 1; index < 12; index++) {
      await wrapper.get('[aria-label="Next note"]').trigger('click');
      expect(wrapper.get('.note-passage').text()).toContain(`house ${index}`);
      expect(wrapper.findAll('.writing-note')).toHaveLength(1);
      expect(document.activeElement).toBe(wrapper.get('.note-passage').element);
    }
    expect(wrapper.find('.note-pagination').text()).toContain('12 of 12');
    expect(wrapper.find('[aria-label="Next note"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[aria-label="Previous note"]').trigger('click');
    expect(wrapper.find('.note-passage').text()).toContain('house 10');
    expect(wrapper.emitted('dismiss')).toBeUndefined();
    expect(wrapper.emitted('apply')).toBeUndefined();
  });

  it('starts beside the writing position without taking manuscript focus', async () => {
    const review = setup(12);
    manuscript = document.createElement('textarea');
    document.body.appendChild(manuscript);
    manuscript.focus();
    await wrapper.setProps({ startNoteId: review.notes[10].id });
    expect(wrapper.find('.note-pagination').text()).toContain('11 of 12');
    expect(document.activeElement).toBe(manuscript);
    await wrapper.setProps({ startNoteId: 'removed-passage' });
    expect(wrapper.find('.note-pagination').text()).toContain('11 of 12');
  });

  it('keeps the passage being read when an earlier paragraph gains a note', async () => {
    setup(3);
    await wrapper.get('[aria-label="Next note"]').trigger('click');
    const passage = wrapper.get<HTMLButtonElement>('.note-passage').element;
    passage.focus();
    await wrapper.setProps({ review: reviewWriting('<p>The the visitor returned in order to find house 0.</p><p>She returned in order to find house 1.</p><p>She returned in order to find house 2.</p>') });
    expect(wrapper.get('.note-passage').text()).toContain('house 1');
    expect(wrapper.get('.note-pagination').text()).toContain('3 of 4');
    expect(document.activeElement).toBe(passage);
  });

  it('keeps the passage being read when an earlier note disappears', async () => {
    setup(3);
    await wrapper.get('[aria-label="Next note"]').trigger('click');
    await wrapper.setProps({ review: reviewWriting('<p>She returned to find house 0.</p><p>She returned in order to find house 1.</p><p>She returned in order to find house 2.</p>') });
    expect(wrapper.get('.note-passage').text()).toContain('house 1');
    expect(wrapper.get('.note-pagination').text()).toContain('1 of 2');
  });

  it('retains focus and the same repeated passage when inserted blocks change note IDs', async () => {
    const repeated = '<p>She returned in order to find the house.</p>';
    setup(1);
    await wrapper.setProps({ review: reviewWriting(repeated.repeat(3)) });
    await wrapper.get('[aria-label="Next note"]').trigger('click');
    const passage = wrapper.get<HTMLButtonElement>('.note-passage').element;
    passage.focus();
    await wrapper.setProps({ review: reviewWriting('<h2>A new chapter</h2>' + repeated.repeat(3)) });
    expect(wrapper.get('.note-pagination').text()).toContain('2 of 3');
    expect(wrapper.get('.note-location').text()).toBe('A new chapter · Paragraph 2');
    expect(document.activeElement).toBe(passage);
  });

  it('keeps actions outside the scrolling passage and disables edits in read-only mode', async () => {
    const review = setup(1);
    await wrapper.setProps({ readonly: true });
    expect(wrapper.get('.note-actions').element.closest('.companion-body')).toBeNull();
    expect(wrapper.get('.note-apply').attributes('disabled')).toBeDefined();
    await wrapper.get('.note-passage').trigger('click');
    expect(wrapper.emitted('locate')?.[0]).toEqual([review.notes[0]]);
  });

  it('reveals outside keyboard focus when the compact overlay is left', async () => {
    setup(1);
    manuscript = document.createElement('textarea');
    document.body.appendChild(manuscript);
    const passage = wrapper.get<HTMLButtonElement>('.note-passage');
    passage.element.focus();
    manuscript.focus();
    expect(wrapper.emitted('leave')).toBeUndefined();
    (wrapper.element as HTMLElement).style.position = 'fixed';
    passage.element.focus();
    manuscript.focus();
    expect(wrapper.emitted('leave')).toHaveLength(1);
    expect(document.activeElement).toBe(manuscript);
  });
});
