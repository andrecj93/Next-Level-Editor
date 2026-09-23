import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import { reviewWriting, type WritingNote, type WritingReview } from '../utils/writingReview';
import { parseWritingDecisions, serializeWritingDecisions } from '../utils/writingDecisions';

// A paragraph can move without changing the writer's decision. Exact text and
// occurrence keep identical passages independent, without relying on a lossy
// hash. Hosts may persist these private decisions with their document.
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
  const keptKeys = ref(new Set<string>());
  const currentKeys = computed(() => noteKeys(review.value.notes));
  const dismissedNotes = computed(() => new Set([...currentKeys.value]
    .filter(([, key]) => keptKeys.value.has(key)).map(([id]) => id)));
  const serializedDecisions = computed(() => serializeWritingDecisions(keptKeys.value));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    clearTimeout(timer);
    if (!enabled.value || typeof DOMParser === 'undefined') return;
    review.value = reviewWriting(html.value);
    if (keptKeys.value.size) {
      const available = new Set(currentKeys.value.values());
      // Prune decisions as soon as their paragraph changes or disappears.
      keptKeys.value = new Set([...keptKeys.value].filter(key => available.has(key)));
    }
  };
  const dismissNote = (note: WritingNote): boolean => {
    if (dismissedNotes.value.has(note.id) || !review.value.notes.some(current =>
      current.id === note.id && current.blockText === note.blockText)) return false;
    keptKeys.value.add(currentKeys.value.get(note.id)!);
    return true;
  };
  const importDecisions = (value: string): boolean => {
    try {
      const keys = parseWritingDecisions(value);
      keptKeys.value = keys;
      refresh();
      console.debug('[NextLevelEditor] Writing decisions restored', { count: keptKeys.value.size });
      return true;
    } catch {
      console.warn('[NextLevelEditor] Writing decisions could not be restored');
      return false;
    }
  };
  const revisitKeptNotes = () => {
    const count = keptKeys.value.size;
    keptKeys.value = new Set();
    return count;
  };
  watch([html, enabled], () => {
    clearTimeout(timer);
    if (enabled.value && typeof DOMParser !== 'undefined') timer = setTimeout(refresh, 650);
  }, { immediate: true });
  onScopeDispose(() => clearTimeout(timer));
  return { review, refresh, dismissedNotes, dismissNote, serializedDecisions, importDecisions, revisitKeptNotes };
}
