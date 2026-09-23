<template>
  <section v-if="show" ref="panel" class="writing-search" role="search" :aria-label="t('Find & Replace')" @keydown="onKeydown">
    <div class="search-controls">
      <div class="search-query-row">
        <label class="search-field">
          <span class="sr-only">{{ t('Find') }}</span>
          <input
            ref="queryInput" v-model="query" type="text" :placeholder="t('Find in document…')" :aria-describedby="statusId"
            autocomplete="off" autocapitalize="off" autocorrect="off" :spellcheck="false"
            @compositionstart="composing = true" @compositionend="finishComposition" @keydown.enter="navigateFromInput">
        </label>
        <span :id="statusId" class="search-count" role="status" aria-live="polite" aria-atomic="true">{{ pending ? t('Searching…') : query ? result.total ? t('{current} of {total}', { current: result.current, total: result.total }) : t('No matches') : t('Find a passage') }}</span>
        <button type="button" :aria-label="t('Previous match')" :title="t('Previous match') + ' (' + shortcut('Shift+Enter') + ')'" :disabled="!result.total" @click="search('previous')">↑</button>
        <button type="button" :aria-label="t('Next match')" :title="t('Next match') + ' (' + shortcut('Enter') + ')'" :disabled="!result.total" @click="search('next')">↓</button>
        <button type="button" :aria-label="t('Close search')" :title="t('Close search') + ' (' + shortcut('Escape') + ')'" @click="closeSearch">×</button>
      </div>
      <div class="search-options">
        <label><input v-model="caseSensitive" type="checkbox"> {{ t('Match case') }}</label>
        <label><input v-model="wholeWord" type="checkbox"> {{ t('Whole word') }}</label>
        <button type="button" :aria-label="t('Show replacement controls')" :aria-expanded="replaceOpen" @click="toggleReplace">{{ t('Replace') }} <span aria-hidden="true">{{ replaceOpen ? '−' : '+' }}</span></button>
      </div>
      <div v-if="replaceOpen" class="search-replace-row">
        <label class="search-field">
          <span class="sr-only">{{ t('Replace with') }}</span>
          <input ref="replacementInput" v-model="replacement" type="text" :placeholder="t('Replace with…')" @keydown.enter="replaceFromInput">
        </label>
        <button type="button" class="replace-action" :disabled="readonly || !result.total" @click="replaceCurrent">{{ t('Replace') }}</button>
        <button type="button" class="replace-action" :disabled="readonly || !result.total" @click="replaceEvery">{{ t('Replace all') }}</button>
      </div>
    </div>
    <div class="search-context">
      <button v-if="result.passage" type="button" class="search-passage" :aria-label="t('Edit passage in {heading}: {excerpt}', { heading: passageHeading, excerpt: result.passage.before + result.passage.match + result.passage.after })" @click="editPassage">
        <span class="search-location">{{ passageHeading }}</span>
        <span>{{ result.passage.before }}<mark>{{ result.passage.match }}</mark>{{ result.passage.after }}</span>
      </button>
      <p v-else>{{ t(query ? 'Try another word or change the search options.' : 'Search your words. The manuscript stays open while you revise.') }}</p>
      <span v-if="notice" class="search-notice" role="status">{{ noticeText }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRef, watch } from 'vue';
import { useEditorLocale } from '../composables/useEditorLocale';
import type { FindRequest, FindResult, ReplaceRequest } from '../composables/useFindReplace';
import { keepRangeVisible } from '../utils/caretVisibility';
import { useStableId } from '../utils/useStableId';
import { useWritingReflow } from '../composables/useWritingReflow';

const props = defineProps<{
  show: boolean; content: string; editor: HTMLElement | null; readonly?: boolean;
  initiallyReplace?: boolean;
  find: (data: FindRequest) => FindResult;
  replace: (data: ReplaceRequest) => void;
  replaceAll: (data: ReplaceRequest) => void;
  clear: () => void;
}>();
const emit = defineEmits<{ close: [range?: Range]; 'match-revealed': [] }>();
const panel = ref<HTMLElement | null>(null);
const queryInput = ref<HTMLInputElement | null>(null);
const replacementInput = ref<HTMLInputElement | null>(null);
const query = ref('');
const replacement = ref('');
const caseSensitive = ref(false);
const wholeWord = ref(false);
const replaceOpen = ref(false);
const composing = ref(false);
const pending = ref(false);
const notice = ref('');
const { t, shortcut } = useEditorLocale();
const noticeCount = ref(0);
const noticeText = computed(() => t(notice.value, { count: noticeCount.value }));
const result = shallowRef<FindResult>({ current: 0, total: 0 });
const passageHeading = computed(() => result.value.passage?.heading === 'Matching passage' ? t('Matching passage') : result.value.passage?.heading ?? '');
const revealMatch = (range: Range) => {
  const root = props.editor;
  if (!root?.contains(range.startContainer)) return;
  const rect = range.getClientRects?.()[0];
  if (!rect?.height) return;
  const box = root.getBoundingClientRect();
  root.scrollTop += rect.top - box.top - (box.height - rect.height) / 2;
  keepRangeVisible(root, range, 24);
  // Native focus can leave a host's smooth scroll queued after this measurement.
  // Finish at the revealed position instead of drifting back to the old field.
  const view = root.ownerDocument.defaultView;
  view?.scrollTo({ top: view.scrollY, left: view.scrollX, behavior: 'instant' });
  rememberMatchPosition();
  // The manuscript also preserves its reading position during layout changes.
  // Replace that snapshot after navigation so it cannot undo this reveal.
  emit('match-revealed');
};
const rememberMatchPosition = useWritingReflow(toRef(props, 'editor'), toRef(props, 'show'), {
  hasFocus: root => Boolean(panel.value?.contains(root.ownerDocument.activeElement)),
  snapshot: root => {
    const range = result.value.range;
    const rect = range?.getClientRects?.()[0];
    const box = root.getBoundingClientRect();
    const visible = rect && rect.height > 0 && rect.top >= box.top && rect.bottom <= box.bottom;
    return () => { if (visible && range === result.value.range) revealMatch(range!); };
  },
});
const statusId = `${useStableId()}-writing-search-status`;
let timer: ReturnType<typeof setTimeout> | undefined;
let returnRange: Range | undefined;
let returnToMatch = false;
const options = () => ({ caseSensitive: caseSensitive.value, wholeWord: wholeWord.value });
const stopPending = () => { clearTimeout(timer); timer = undefined; pending.value = false; };
const search = (direction: FindRequest['direction'] = 'current', selectMatch = true) => {
  stopPending();
  if (!props.show || composing.value) return;
  const document = panel.value?.ownerDocument;
  const focused = document?.activeElement as HTMLElement | null;
  const input = focused?.tagName === 'INPUT' && (focused as HTMLInputElement).type === 'text' ? focused as HTMLInputElement : null;
  const inputSelection = input ? [input.selectionStart, input.selectionEnd] as const : null;
  result.value = props.find({ findText: query.value, direction, options: options(), preview: true, selectMatch });
  const selected = result.value.range;
  if (selected && (selectMatch || returnToMatch)) {
    returnRange = selected.cloneRange();
    returnToMatch = true;
  }
  if (selectMatch && selected) {
    revealMatch(selected);
    // The excerpt can wrap after this render. Measure the same live range
    // again after layout without borrowing the search input's selection.
    void nextTick(() => { if (props.show && result.value.range === selected) revealMatch(selected); });
  }
  // Setting a DOM selection focuses contenteditable in Chromium. Keep typing
  // and navigation in the search control that initiated this operation.
  if (selectMatch && focused && panel.value?.contains(focused)) {
    focused.focus({ preventScroll: true });
    if (input && inputSelection) input.setSelectionRange(inputSelection[0], inputSelection[1]);
  }
};
const schedule = (selectMatch: boolean) => {
  stopPending();
  if (props.show && !composing.value) {
    pending.value = true;
    timer = setTimeout(() => search('current', selectMatch), 150);
  }
};
watch([query, caseSensitive, wholeWord], () => { notice.value = ''; schedule(true); });
watch(() => props.content, () => {
  if (props.editor?.contains(props.editor.ownerDocument.activeElement)) { returnRange = undefined; returnToMatch = false; }
  schedule(false);
});
const focusSearch = async (replace = false) => {
  if (replace) replaceOpen.value = true;
  await nextTick();
  const field = replace ? replacementInput.value : queryInput.value;
  field?.focus({ preventScroll: true });
  field?.select();
  // Reveal the panel's edges as well as its input. On short viewports the
  // input alone can be visible while the surrounding controls are clipped.
  panel.value?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  field?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
};
watch(() => props.show, async show => {
  stopPending();
  returnToMatch = false;
  if (!show) { returnRange = undefined; props.clear(); return; }
  const selection = props.editor?.ownerDocument.getSelection();
  const selected = selection?.rangeCount && props.editor?.contains(selection.anchorNode) && props.editor.contains(selection.focusNode)
    ? selection.toString() : '';
  returnRange = selection?.rangeCount && props.editor?.contains(selection.anchorNode) && props.editor.contains(selection.focusNode)
    ? selection.getRangeAt(0).cloneRange() : undefined;
  if (selected && selected.length <= 200 && !/[\r\n]/.test(selected)) query.value = selected;
  replaceOpen.value = Boolean(props.initiallyReplace);
  notice.value = '';
  await focusSearch(props.initiallyReplace);
  if (!props.show) return;
  search();
  console.debug('[NextLevelEditor] Writing search opened', { matches: result.value.total });
}, { flush: 'post', immediate: true });
const finishComposition = () => { composing.value = false; schedule(true); };
const navigateFromInput = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  // The engine distinguishes a new query from a refresh of the same query.
  // A pending document recount must not swallow Enter or Shift+Enter.
  search(event.shiftKey ? 'previous' : 'next');
};
const replaceData = (): ReplaceRequest => ({ findText: query.value, replaceText: replacement.value, options: options() });
const replaceCurrent = () => {
  if (props.readonly || !query.value) return;
  if (timer) search();
  if (!result.value.total) return;
  props.replace(replaceData());
  search('next');
  notice.value = 'Replaced one occurrence. Undo is available in the manuscript.';
  console.debug('[NextLevelEditor] Search replacement completed', { scope: 'one', remaining: result.value.total });
};
const replaceEvery = () => {
  if (props.readonly || !query.value) return;
  if (timer) search();
  if (!result.value.total) return;
  const count = result.value.total;
  props.replaceAll(replaceData());
  search();
  noticeCount.value = count;
  notice.value = count === 1 ? 'Replaced {count} occurrence. Undo is available in the manuscript.' : 'Replaced {count} occurrences. Undo is available in the manuscript.';
  console.debug('[NextLevelEditor] Search replacement completed', { scope: 'all', count });
};
const replaceFromInput = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  replaceCurrent();
};
const toggleReplace = async () => {
  replaceOpen.value = !replaceOpen.value;
  await focusSearch(replaceOpen.value);
};
// Text inputs own a separate selection. Keep a bookmark before they disappear
// so Escape and Close return to the match, not the editor's old focus position.
const closeSearch = () => emit('close', returnRange);
const editPassage = () => { search(); closeSearch(); };
const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearch(); }
};
const rememberWriterRange = () => {
  returnToMatch = false;
  const selection = props.editor?.ownerDocument.getSelection();
  returnRange = selection?.rangeCount && props.editor?.contains(selection.anchorNode) && props.editor.contains(selection.focusNode)
    ? selection.getRangeAt(0).cloneRange() : undefined;
};
const onManuscriptPointer = (event: PointerEvent) => {
  if (!props.show) return;
  if (props.editor?.contains(event.target as Node)) { returnRange = undefined; returnToMatch = false; }
  else if (panel.value?.contains(event.target as Node) && props.editor?.contains(props.editor.ownerDocument.activeElement)) rememberWriterRange();
};
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (!props.show || event.isComposing) return;
  const target = event.target as Node | null;
  // Once the writer moves their own caret, closing search must leave it there.
  if (target && props.editor?.contains(target)) { returnRange = undefined; returnToMatch = false; }
  if (!(event.ctrlKey || event.metaKey) || !['f', 'h'].includes(event.key.toLowerCase())) return;
  if (!target || (!panel.value?.contains(target) && !props.editor?.contains(target))) return;
  if (props.editor?.contains(target)) rememberWriterRange();
  event.preventDefault();
  event.stopPropagation();
  void focusSearch(event.key.toLowerCase() === 'h');
};
onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown, true);
  document.addEventListener('pointerdown', onManuscriptPointer, true);
});
onBeforeUnmount(() => {
  stopPending(); props.clear();
  document.removeEventListener('keydown', onDocumentKeydown, true);
  document.removeEventListener('pointerdown', onManuscriptPointer, true);
});
defineExpose({ focusSearch });
</script>

<style scoped>
.writing-search { flex: 0 1 auto; min-width: 0; max-height: 42dvh; overflow: auto; background: var(--background-alt); color: var(--text-color); border-bottom: 1px solid var(--border-color); font: 12px/1.5 var(--font-family, sans-serif); overscroll-behavior: contain; }
.search-controls { position: sticky; top: 0; z-index: 1; padding: 8px 16px 0; background: var(--background-alt); }
.search-query-row, .search-replace-row { display: flex; align-items: center; gap: 6px; }
.search-field { flex: 1; min-width: 0; }
.search-field input { width: 100%; min-width: 0; min-height: 38px; padding: 7px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background-color); color: var(--text-color); font: inherit; font-size: 14px; }
button { min-width: 36px; min-height: 36px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
button:hover:not(:disabled) { background: var(--hover-bg); }
button:disabled { opacity: .4; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.search-query-row > button { flex-shrink: 0; font-size: 20px; }
.search-count { flex: 0 0 82px; text-align: center; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.search-options { display: flex; align-items: center; gap: 18px; }
.search-options label { display: flex; align-items: center; gap: 5px; min-height: 34px; cursor: pointer; white-space: nowrap; }
.search-options input { accent-color: var(--primary-color); }
.search-options button { margin-left: auto; padding-inline: 8px; }
.search-replace-row { padding-bottom: 8px; }
.replace-action { padding: 6px 12px; background: var(--background-color); border: 1px solid var(--border-color); white-space: nowrap; }
.search-context { padding: 0 16px 8px; min-height: 42px; }
.search-context p { margin: 2px 0; color: var(--text-secondary); }
.search-passage { display: flex; align-items: baseline; gap: 12px; width: 100%; min-width: 0; padding: 5px 8px; text-align: left; }
.search-location { flex: 0 1 auto; color: var(--text-secondary); font-size: 11px; }
.search-passage > span { overflow-wrap: anywhere; }
.search-passage mark { color: inherit; background: transparent; font-weight: 700; text-decoration: underline; text-decoration-color: var(--primary-color); text-underline-offset: 3px; }
.search-notice { display: block; color: var(--text-secondary); font-size: 11px; padding: 3px 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 700px) {
  .search-controls { padding: 6px 10px 0; }
  .search-query-row { display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, 36px); gap: 4px; }
  .search-query-row .search-count { grid-column: 1 / -1; grid-row: 2; min-height: 18px; text-align: left; }
  .search-options { gap: 8px; }
  .search-context { padding: 0 10px 6px; }
  .search-passage { flex-direction: column; gap: 2px; padding: 4px; }
  .search-replace-row { gap: 4px; }
  .replace-action { padding-inline: 8px; }
  .search-field input { font-size: 16px; }
}
@media (max-height: 500px) { .search-context { display: none; } .writing-search { flex-shrink: 0; max-height: 45dvh; } }
</style>
