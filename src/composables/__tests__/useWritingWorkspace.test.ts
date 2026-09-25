import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { useWritingWorkspace } from '../useWritingWorkspace';

const passage = '<p>She returned in order to find the house.</p>';
const scopes: EffectScope[] = [];
const workspace = (initial = passage) => {
  const html = ref(initial);
  const enabled = ref(true);
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() => useWritingWorkspace(html, enabled))!;
  state.refresh();
  return { ...state, html, enabled, scope };
};

describe('writing workspace decisions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    scopes.splice(0).forEach(scope => scope.stop());
    vi.useRealTimers();
  });

  it('keeps a decision when unrelated paragraphs move and inline formatting changes', () => {
    const state = workspace('<h2>Arrival</h2>' + passage);
    expect(state.dismissNote(state.review.value.notes[0])).toBe(true);
    state.html.value = '<p>A new opening.</p><h2>Arrival</h2>' + passage.replace('returned', '<em>returned</em>');
    state.refresh();
    expect(state.review.value.notes[0].block).toBe(2);
    expect(state.dismissedNotes.value.has(state.review.value.notes[0].id)).toBe(true);
    state.html.value = passage + '<h2>Arrival</h2><p>A new opening.</p>';
    state.refresh();
    expect(state.review.value.notes[0].block).toBe(0);
    expect(state.dismissedNotes.value.has(state.review.value.notes[0].id)).toBe(true);
  });

  it('reviews the paragraph again when its text changes even if the note location is unchanged', () => {
    const state = workspace();
    const originalNote = state.review.value.notes[0];
    state.dismissNote(originalNote);
    state.html.value = passage.replace('find', 'see');
    state.refresh();
    expect(state.review.value.notes[0].id).toBe(originalNote.id);
    expect(state.dismissedNotes.value.size).toBe(0);
    expect(state.dismissNote(originalNote)).toBe(false);
  });

  it('keeps identical paragraphs and separate occurrences independently reviewable', () => {
    const repeated = '<p>In order to write, in order to remember.</p>';
    const state = workspace(repeated + repeated);
    expect(state.review.value.notes).toHaveLength(4);
    state.dismissNote(state.review.value.notes[2]);
    state.html.value = '<p>Another paragraph.</p>' + repeated + repeated;
    state.refresh();
    expect(state.review.value.notes.map(note => state.dismissedNotes.value.has(note.id))).toEqual([false, false, true, false]);
  });

  it('forgets removed notes and does not hide them in a later document', () => {
    const state = workspace();
    state.dismissNote(state.review.value.notes[0]);
    state.html.value = '<p>A different story.</p>';
    state.refresh();
    expect(state.dismissedNotes.value.size).toBe(0);
    state.html.value = passage;
    state.refresh();
    expect(state.review.value.notes).toHaveLength(1);
    expect(state.dismissedNotes.value.size).toBe(0);
  });

  it('does not change the document, dismiss twice, or share decisions between editors', () => {
    const first = workspace();
    const second = workspace();
    const note = first.review.value.notes[0];
    expect(first.dismissNote(note)).toBe(true);
    expect(first.dismissNote(note)).toBe(false);
    expect(first.html.value).toBe(passage);
    expect(second.dismissedNotes.value.size).toBe(0);
  });

  it('reconciles decisions after a typing pause and cancels pending work on disposal', async () => {
    const state = workspace();
    state.dismissNote(state.review.value.notes[0]);
    state.html.value = '<h2>Arrival</h2>' + passage;
    await nextTick();
    await vi.advanceTimersByTimeAsync(649);
    expect(state.review.value.notes[0].block).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.review.value.notes[0].block).toBe(1);
    expect(state.dismissedNotes.value.has(state.review.value.notes[0].id)).toBe(true);
    state.html.value = '<p>Another story.</p>';
    await nextTick();
    state.scope.stop();
    await vi.runAllTimersAsync();
    expect(state.review.value.notes).toHaveLength(1);
  });

  it('does not review text while writing mode is disabled', async () => {
    const state = workspace();
    state.enabled.value = false;
    state.html.value = '<p>Another story.</p>';
    await nextTick();
    state.refresh();
    await vi.runAllTimersAsync();
    expect(state.review.value.notes).toHaveLength(1);
    state.enabled.value = true;
    await nextTick();
    await vi.runAllTimersAsync();
    expect(state.review.value.notes).toHaveLength(0);
  });

  it('restores exact kept passages after remount without hiding another occurrence', () => {
    const duplicate = passage + passage;
    const original = workspace(duplicate);
    original.dismissNote(original.review.value.notes[1]);
    const stored = original.serializedDecisions.value;
    const restored = workspace('<p>An earlier memory.</p>' + duplicate);
    expect(restored.importDecisions(stored)).toBe(true);
    expect(restored.review.value.notes.map(note => restored.dismissedNotes.value.has(note.id))).toEqual([false, true]);
    expect(restored.serializedDecisions.value).toBe(stored);
    expect(restored.html.value).toBe('<p>An earlier memory.</p>' + duplicate);
  });

  it('does not revive a kept decision for a changed passage on recovery', () => {
    const original = workspace();
    original.dismissNote(original.review.value.notes[0]);
    const restored = workspace(passage.replace('house', 'harbor'));
    expect(restored.importDecisions(original.serializedDecisions.value)).toBe(true);
    expect(restored.dismissedNotes.value.size).toBe(0);
    expect(restored.serializedDecisions.value).toBe('[]');
  });

  it('rejects invalid external decisions without clearing the current choice', () => {
    const state = workspace();
    state.dismissNote(state.review.value.notes[0]);
    const stored = state.serializedDecisions.value;
    expect(state.importDecisions('["broken"]')).toBe(false);
    expect(state.serializedDecisions.value).toBe(stored);
    expect(state.dismissedNotes.value.size).toBe(1);
  });

  it('retains imported decisions while writing mode is disabled', () => {
    const original = workspace();
    original.dismissNote(original.review.value.notes[0]);
    const restored = workspace();
    restored.enabled.value = false;
    expect(restored.importDecisions(original.serializedDecisions.value)).toBe(true);
    restored.enabled.value = true;
    restored.refresh();
    expect(restored.dismissedNotes.value.size).toBe(1);
  });
});
