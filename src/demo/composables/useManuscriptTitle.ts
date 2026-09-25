import { onScopeDispose, ref, watch, type Ref } from 'vue';

/** The document header should not parse a book on every keystroke. */
export function useManuscriptTitle(html: Ref<string>, revision: Ref<number>) {
  const title = ref('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    title.value = html.value
      ? new DOMParser().parseFromString(html.value, 'text/html').querySelector('h1')?.textContent?.trim().slice(0, 100) ?? ''
      : '';
  };
  watch([html, revision], ([value, version], [, previousVersion]) => {
    clearTimeout(timer);
    // Initial recovery and an explicit document replacement update at once.
    // Ordinary typing, including title edits, settles after a short pause.
    if (!value || version !== previousVersion) refresh();
    else timer = setTimeout(refresh, 250);
  }, { immediate: true });
  onScopeDispose(() => clearTimeout(timer));
  return title;
}
