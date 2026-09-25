import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WritingStatsPanel from '../WritingStatsPanel.vue';
import type { WritingIssues } from '../../composables/useWritingAssistant';

const empty = (): WritingIssues => ({ passiveVoice: [], adverbs: [], complexWords: [], repeatedWords: [], cliches: [] });

describe('writing feedback respects the author', () => {
  it('does not turn a recurring character name into an issue or claim a full review', () => {
    const wrapper = mount(WritingStatsPanel, { props: { issues: { ...empty(), repeatedWords: [{ word: 'Celia', count: 16 }] } } });
    expect(wrapper.text()).toContain('No matches for these style checks');
    expect(wrapper.text()).toContain('not a full grammar or spelling review');
    expect(wrapper.findAll('details')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('No major writing issues');
    wrapper.unmount();
  });

  it('shows the exact phrase in context without interpreting markup', () => {
    const text = 'Mara <really> wanted to answer.';
    const wrapper = mount(WritingStatsPanel, { props: { text, issues: { ...empty(), adverbs: [{ word: 'really', position: 6 }] } } });
    expect(wrapper.get('summary').text()).toBe('Adverbs and intensifiers (1)');
    expect(wrapper.get('.style-context').text()).toBe(text);
    expect(wrapper.get('strong').text()).toBe('really');
    expect(wrapper.find('really').exists()).toBe(false);
    expect(wrapper.text()).toContain('Keep it when it does');
    wrapper.unmount();
  });

  it('uses phrase-only fallback when offsets no longer match the supplied text', () => {
    const wrapper = mount(WritingStatsPanel, { props: { text: 'A different draft.', issues: { ...empty(), passiveVoice: [{ text: 'was folded', position: 5 }] } } });
    expect(wrapper.get('.style-context').text()).toBe('was folded');
    expect(wrapper.text()).not.toContain('different draft');
    wrapper.unmount();
  });

  it('keeps context inside the matched paragraph', () => {
    const text = 'Previous chapter.\n\n\n\nMara really wanted to answer.\n\nNext chapter.';
    const wrapper = mount(WritingStatsPanel, { props: { text, issues: { ...empty(), adverbs: [{ word: 'really', position: text.indexOf('really') }] } } });
    expect(wrapper.get('.style-context').text()).toBe('Mara really wanted to answer.');
    wrapper.unmount();
  });

  it('lets the author review all matches in manageable batches, resetting after an edit', async () => {
    const issues = { ...empty(), complexWords: Array.from({ length: 12 }, (_, position) => ({ word: 'utilize', position, suggestion: 'use' })) };
    const wrapper = mount(WritingStatsPanel, { props: { issues } });
    expect(wrapper.findAll('.style-context')).toHaveLength(5);
    await wrapper.get('.more-matches').trigger('click');
    expect(wrapper.findAll('.style-context')).toHaveLength(10);
    await wrapper.get('.more-matches').trigger('click');
    expect(wrapper.findAll('.style-context')).toHaveLength(12);
    expect(wrapper.find('.more-matches').exists()).toBe(false);
    expect(wrapper.text()).toContain('Alternative: “use”');
    await wrapper.setProps({ issues: { ...issues } });
    expect(wrapper.findAll('.style-context')).toHaveLength(5);
    wrapper.unmount();
  });
});
