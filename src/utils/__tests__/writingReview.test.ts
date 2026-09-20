import { describe, expect, it } from 'vitest';
import { reviewWriting, writingNoteRange } from '../writingReview';
import { getWordCount } from '../commands';

describe('manuscript review', () => {
  it('counts adjacent paragraphs without merging their last and first words', () => {
    const html = '<h1>The book</h1><p>One thought.</p><p>Another <em>thought</em>.</p>';
    expect(getWordCount(html)).toBe(6);
    expect(reviewWriting(html).words).toBe(6);
    expect(getWordCount('<p>un<em>believ</em>able<br>weather</p>')).toBe(2);
  });
  it('keeps chapters in order and avoids duplicating nested quote paragraphs', () => {
    const review = reviewWriting('<h1>Book</h1><h2>Arrival</h2><blockquote><p>A quiet house.</p></blockquote><h2>Departure</h2>');
    expect(review.outline.map(item => item.text)).toEqual(['Book', 'Arrival', 'Departure']);
    expect(review.paragraphs).toBe(1);
    expect(review.notes).toEqual([]);
  });
  it('offers exact, optional edits without evaluating prose as a quality score', () => {
    const review = reviewWriting('<p>In order to find the the house, she walked.</p>');
    expect(review.notes.map(note => [note.quote, note.replacement])).toEqual([['the the', 'the'], ['In order to', 'To']]);
  });
  it('reviews the first line before the writer creates a paragraph', () => {
    expect(reviewWriting('The <em>the</em> house.').notes[0].replacement).toBe('The');
  });
  it('keeps the bare first paragraph after Enter creates further blocks', () => {
    const root = document.createElement('div');
    root.innerHTML = 'The <em>the</em> house.<p>Another paragraph.</p><div>She went in order to listen.</div>';
    const review = reviewWriting(root.innerHTML);
    expect(review.notes.map(note => note.quote)).toEqual(['The the', 'in order to']);
    expect(review.paragraphs).toBe(3);
    for (const note of review.notes) expect(writingNoteRange(root, note)?.toString()).toBe(note.quote);
  });
  it('locates a passage across inline formatting and refuses a stale suggestion', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>She went in <em>order</em> to listen.</p>';
    const note = reviewWriting(root.innerHTML).notes[0];
    expect(writingNoteRange(root, note)?.toString()).toBe('in order to');
    root.innerHTML = '<p>She went in <em>order</em> to leave.</p>';
    expect(writingNoteRange(root, note)).toBeNull();
    root.innerHTML = '<p>She went somewhere completely different.</p>';
    expect(writingNoteRange(root, note)).toBeNull();
  });
  it('does not offer replacements inside code or generated content', () => {
    expect(reviewWriting('<pre><code>the the in order to</code></pre><div contenteditable="false"><p>the the</p></div>').notes).toEqual([]);
  });
  it('protects inline variables and code while reviewing the surrounding prose', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p><span contenteditable="false">the the</span> <code>in order to</code> She went in order to listen.</p>';
    const review = reviewWriting(root.innerHTML);
    expect(review.notes).toHaveLength(1);
    expect(writingNoteRange(root, review.notes[0])?.toString()).toBe('in order to');
    expect(writingNoteRange(root, { ...review.notes[0], start: 0, quote: 'the the' })).toBeNull();
    // A token inserted inside a previously valid phrase invalidates its edit.
    root.innerHTML = '<p><span contenteditable="false">the the</span> <code>in order to</code> She went in <span contenteditable="false">order</span> to listen.</p>';
    expect(writingNoteRange(root, review.notes[0])).toBeNull();
  });
  it('treats line breaks as whitespace without merging paragraphs', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>She went<br>in <em>order</em> to listen.</p><p>the</p><p>the</p>';
    const review = reviewWriting(root.innerHTML);
    expect(review.notes).toHaveLength(1);
    expect(writingNoteRange(root, review.notes[0])?.toString()).toBe('in order to');
  });
  it('only points to a long sentence, leaving its rhythm to the writer', () => {
    const sentence = Array.from({length: 38}, (_, i) => `word${i}`).join(' ') + '.';
    const review = reviewWriting(`<p>A short sentence. ${sentence} Another short one.</p>`);
    expect(review.notes).toHaveLength(1);
    expect(review.notes[0].quote).toBe(sentence);
    expect(review.notes[0].replacement).toBeUndefined();
  });
});
