import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { getTextStatistics } from '../utils/commands';

/** Keep book-length counting off the typing path, with a bounded live update. */
export function useDocumentStatistics(html: Ref<string>, editor: Ref<HTMLElement | null>) {
  const statistics = shallowRef({ wordCount: 0, characterCount: 0 });
  let pause: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(pause);
    clearTimeout(deadline);
    pause = deadline = undefined;
  };
  const refresh = () => {
    cancel();
    const root = editor.value;
    const content = html.value || root?.innerHTML || '';
    statistics.value = getTextStatistics(content, root && root.innerHTML === content ? root : undefined);
  };
  watch([html, editor], ([content, root], [previous, previousRoot]) => {
    clearTimeout(pause);
    // Small documents stay immediate. Opening/replacing a surface never shows
    // the previous document's count, even when the new manuscript is large.
    if (previous === undefined || root !== previousRoot || content.length < 20000) refresh();
    else {
      pause = setTimeout(refresh, 150);
      deadline ??= setTimeout(refresh, 1000);
    }
  }, { immediate: true });
  onScopeDispose(cancel);
  return statistics;
}
