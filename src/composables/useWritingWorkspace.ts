import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { reviewWriting, type WritingReview } from '../utils/writingReview';

export function useWritingWorkspace(html: Ref<string>, enabled: Ref<boolean>) {
  const review = ref<WritingReview>({ words: 0, paragraphs: 0, readingMinutes: 1, outline: [], notes: [] });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    clearTimeout(timer);
    if (enabled.value && typeof DOMParser !== 'undefined') review.value = reviewWriting(html.value);
  };
  watch([html, enabled], () => {
    clearTimeout(timer);
    if (enabled.value && typeof DOMParser !== 'undefined') timer = setTimeout(refresh, 650);
  }, { immediate: true });
  onScopeDispose(() => clearTimeout(timer));
  return { review, refresh };
}
