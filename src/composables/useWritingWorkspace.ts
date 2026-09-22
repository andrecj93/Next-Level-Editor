import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { reviewWriting, type WritingNote, type WritingReview } from '../utils/writingReview';

// A paragraph can move without changing the writer's decision. Exact text and
// occurrence keep identical passages independent, without storing manuscript
// contents in browser storage or relying on a lossy hash.
function noteKeys(notes: WritingNote[]): Map<string, string> {
  const occurrences = new Map<string, number>();
  return new Map(notes.map(note => {
    const signature = JSON.stringify([note.blockText, note.start, note.quote, note.title]);
    const occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);
    return [note.id, `${occurrence}:${signature}`];
  }));
}

export function useWritingWorkspace(html: Ref<string>, enabled: Ref<boolean>) {
  const review = ref<WritingReview>({ words: 0, paragraphs: 0, readingMinutes: 1, outline: [], notes: [] });
  const dismissedNotes = ref(new Set<string>());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    clearTimeout(timer);
    if (!enabled.value || typeof DOMParser === 'undefined') return;
    const next = reviewWriting(html.value);
    if (dismissedNotes.value.size) {
      const previousKeys = noteKeys(review.value.notes);
      const kept = new Set([...dismissedNotes.value].map(id => previousKeys.get(id)));
      // Prune decisions as soon as their paragraph changes or disappears.
      dismissedNotes.value = new Set([...noteKeys(next.notes)]
        .filter(([, key]) => kept.has(key)).map(([id]) => id));
    }
    review.value = next;
  };
  const dismissNote = (note: WritingNote): boolean => {
    if (dismissedNotes.value.has(note.id) || !review.value.notes.some(current =>
      current.id === note.id && current.blockText === note.blockText)) return false;
    dismissedNotes.value.add(note.id);
    return true;
  };
  watch([html, enabled], () => {
    clearTimeout(timer);
    if (enabled.value && typeof DOMParser !== 'undefined') timer = setTimeout(refresh, 650);
  }, { immediate: true });
  onScopeDispose(() => clearTimeout(timer));
  return { review, refresh, dismissedNotes, dismissNote };
}
