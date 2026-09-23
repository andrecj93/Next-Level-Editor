<template>
  <aside ref="panel" class="writing-companion" :aria-label="t('Writing companion')" @keydown.esc.stop="$emit('close')" @focusout="onFocusOut">
    <header class="companion-header">
      <span class="companion-title">{{ t("In the margins") }}</span>
      <nav v-if="tab === 'review' && visibleNotes.length > 1" class="note-pagination" :aria-label="t('Writing note navigation')">
        <button type="button" :aria-label="t('Previous note')" :disabled="noteIndex === 0" @click="changeNote(-1)">←</button>
        <span>{{ noteIndex + 1 }} {{ t('of') }} {{ visibleNotes.length }}</span>
        <button type="button" :aria-label="t('Next note')" :disabled="noteIndex === visibleNotes.length - 1" @click="changeNote(1)">→</button>
      </nav>
      <button type="button" :aria-label="t('Close writing companion')" @click="$emit('close')">×</button>
    </header>
    <div class="companion-tabs" role="group" :aria-label="t('Writing companion views')">
      <button ref="reviewButton" type="button" :aria-pressed="tab === 'review'" @click="tab = 'review'">{{ t("Writing notes") }} <span v-if="visibleNotes.length">{{ visibleNotes.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'outline'" @click="tab = 'outline'">{{ t("Outline") }}</button>
    </div>
    <div ref="body" class="companion-body">
      <template v-if="tab === 'review'">
        <p v-if="languageSupported === false" role="status">{{ t('English prose checks are unavailable for this document language.') }}</p>
        <p v-if="!visibleNotes.length" class="companion-intro">{{ t("A second pair of eyes.") }}<br><span>{{ t("Your words, your decisions.") }}</span></p>
        <p v-if="!review.words" class="companion-empty">{{ t("Start with a sentence. When you pause, I’ll point out a few places you might want to revisit.") }}</p>
        <p v-else-if="languageSupported !== false && !visibleNotes.length" class="companion-empty">{{ t(review.notes.length ? 'You’ve considered every note. Keep your voice.' : 'No notes for now. Keep going — there’s room for your next thought.') }}</p>
        <article v-if="currentNote && currentContext" :key="currentNote.id" class="writing-note">
          <p class="note-location">{{ currentContext.location }}</p>
          <h3>{{ t(currentNote.title) }}</h3>
          <button type="button" class="note-passage" :aria-label="`${t('Show passage in')} ${currentContext.location}: ${currentContext.before}${currentNote.quote}${currentContext.after}`" @click="$emit('locate', currentNote)">“{{ currentContext.before }}<mark>{{ currentNote.quote }}</mark>{{ currentContext.after }}” <span aria-hidden="true">↗</span></button>
          <p>{{ t(currentNote.detail) }}</p>
        </article>
        <div v-if="!visibleNotes.length" class="writing-prompt">
          <span class="companion-kicker">{{ t("A nudge, if you need one") }}</span>
          <p>{{ t(prompts[promptIndex]) }}</p>
          <button type="button" @click="promptIndex = (promptIndex + 1) % prompts.length">{{ t('Another prompt') }} <span aria-hidden="true">↻</span></button>
        </div>
      </template>
      <template v-else>
        <p class="companion-intro">{{ t("Find your way through.") }}</p>
        <p v-if="!review.outline.length" class="companion-empty">{{ t("Turn a line into a heading with the paragraph menu or type # followed by a space. Your chapters will appear here.") }}</p>
        <nav v-else :aria-label="t('Document outline')" class="writing-outline">
          <button v-for="heading in review.outline" :key="heading.block" type="button" :style="{ paddingLeft: `${12 + Math.min(heading.level - 1, 3) * 12}px` }" @click="$emit('navigate', heading.block)">{{ heading.text }}</button>
        </nav>
      </template>
    </div>
    <div v-if="tab === 'review' && currentNote" :key="currentNote.id" class="note-actions">
      <button v-if="currentNote.replacement" type="button" class="note-apply" :disabled="readonly" @click="$emit('apply', currentNote)">{{ t('Use') }} “{{ currentNote.replacement }}”</button>
      <button v-else type="button" @click="$emit('locate', currentNote)">{{ t('Go to sentence') }}</button>
      <button type="button" :aria-label="t('Dismiss note') + ': ' + t(currentNote.title)" @click="dismiss(currentNote, $event)">{{ t('Keep as is') }}</button>
    </div>
    <footer class="companion-footer">
      <span>{{ t('{count} words', { count: review.words }) }}<span v-if="review.words"> · {{ number(review.readingMinutes) }} {{ t("min read") }}</span></span>
      <small>{{ t("Private, on-device checks · English prose") }}</small>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, number } = useEditorLocale();
import { computed, nextTick, ref, watch } from 'vue';
import { writingNoteContext, type WritingReview, type WritingNote } from '../utils/writingReview';
const props = withDefaults(defineProps<{ review: WritingReview; dismissedNotes: ReadonlySet<string>; readonly?: boolean; startNoteId?: string; languageSupported?: boolean }>(), { readonly: false, startNoteId: undefined, languageSupported: true });
const emit = defineEmits<{ close: []; leave: []; locate: [note: WritingNote]; apply: [note: WritingNote]; dismiss: [note: WritingNote]; navigate: [block: number] }>();
const panel = ref<HTMLElement | null>(null);
const body = ref<HTMLElement | null>(null);
const reviewButton = ref<HTMLButtonElement | null>(null);
const tab = ref<'review' | 'outline'>('review');
const onFocusOut = (event: FocusEvent) => {
  const target = event.relatedTarget as Node | null;
  if (target && panel.value && !panel.value.contains(target) && getComputedStyle(panel.value).position === 'fixed') {
    // The compact review is nonmodal. When Tab leaves it, reveal the control
    // receiving focus instead of leaving that control hidden under the panel.
    emit('leave');
  }
};
const visibleNotes = computed(() => props.review.notes.filter(note => !props.dismissedNotes.has(note.id)));
const noteIndex = ref(0);
const currentNote = computed(() => visibleNotes.value[noteIndex.value]);
const currentContext = computed(() => currentNote.value && writingNoteContext(currentNote.value, props.review.outline));
watch(() => visibleNotes.value.length, count => { noteIndex.value = Math.max(0, Math.min(noteIndex.value, count - 1)); });
const scrollToNote = () => {
  if (body.value) body.value.scrollTop = 0;
};
watch(() => props.startNoteId, async id => {
  const index = visibleNotes.value.findIndex(note => note.id === id);
  if (index < 0) return;
  noteIndex.value = index;
  await nextTick();
  if (tab.value === 'review') scrollToNote();
}, { immediate: true });
const changeNote = async (direction: number) => {
  noteIndex.value = Math.max(0, Math.min(visibleNotes.value.length - 1, noteIndex.value + direction));
  await nextTick();
  scrollToNote();
  // The navigation button may now be disabled. Put keyboard focus on the
  // newly revealed passage instead of allowing it to fall back to the body.
  panel.value?.querySelector<HTMLButtonElement>('.note-passage')?.focus({ preventScroll: true });
};
const dismiss = async (note: WritingNote, event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement;
  const document = panel.value?.ownerDocument;
  // Safari may blur the editor without focusing the tapped button. That
  // otherwise leaves the next keyboard action stranded on the page body.
  const ownedFocus = document?.activeElement === button || document?.activeElement === document?.body;
  emit('dismiss', note);
  await nextTick();
  // Continue at the next note (or previous last note), without stealing focus
  // if the writer deliberately moved back into the manuscript meanwhile.
  if (ownedFocus && (document?.activeElement === button || document?.activeElement === document?.body)) {
    scrollToNote();
    const target = panel.value?.querySelector<HTMLButtonElement>('.note-passage') ?? reviewButton.value;
    target?.focus({ preventScroll: true });
  }
};
const promptIndex = ref(0);
const prompts = [
  'What is the one thing you want the reader to feel in the next paragraph?',
  'Try a concrete detail: a sound, a gesture, an object someone left behind.',
  'What changes here? Write the moment before it changes, then the moment after.',
  'Write the next sentence as if you were telling it to someone sitting beside you.',
];
</script>

<style scoped>
.writing-companion { width: 280px; flex: 0 0 280px; min-height: 0; display: flex; flex-direction: column; border-left: 1px solid var(--border-color); background: var(--background-color); color: var(--text-color); font: 13px/1.55 var(--font-family, sans-serif); }
.companion-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 16px 12px 8px; }
.companion-title { font-weight: 650; font-size: 14px; letter-spacing: -.02em; min-width: 0; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: transparent; border-radius: 6px; }
button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.companion-header > button { font-size: 22px; width: 32px; height: 32px; flex-shrink: 0; }
button:hover { background: var(--hover-bg); }
.companion-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); padding: 0 14px 12px; }
.companion-tabs button { min-height: 36px; padding: 6px 9px; color: var(--text-secondary); }
.companion-tabs [aria-pressed="true"] { background: var(--background-color); color: var(--text-color); box-shadow: 0 1px 3px #00000012; font-weight: 600; }
.companion-tabs span { font-size: 11px; margin-left: 3px; }
.note-pagination { display: flex; align-items: center; gap: 2px; margin-left: auto; flex-shrink: 0; }
.note-pagination span { color: var(--text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.note-pagination button { min-width: 32px; min-height: 32px; font-size: 18px; }
.note-pagination button:disabled { opacity: .4; cursor: default; }
.companion-body { padding: 18px 20px; overflow-y: auto; flex: 1; min-height: 0; overscroll-behavior: contain; }
.companion-intro { margin: 0 0 20px; font-family: Georgia, serif; font-size: 19px; line-height: 1.4; }
.companion-intro span { font: 12px/1.6 var(--font-family, sans-serif); color: var(--text-secondary); }
.companion-empty { color: var(--text-secondary); margin-bottom: 24px; }
.writing-note { border-top: 1px solid var(--border-color); padding: 18px 0; }
.writing-note:first-child { border-top: 0; padding-top: 0; }
.writing-note h3 { font: 600 13px/1.5 var(--font-family, sans-serif); margin: 0 0 10px; }
.writing-note .note-location { margin: 0 0 6px; color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }
.note-passage { text-align: left; color: var(--text-color); font: italic 15px/1.55 Georgia, serif; padding: 8px 12px; background: var(--background-alt); border-left: 2px solid var(--primary-color); border-radius: 0 6px 6px 0; display: block; overflow-wrap: anywhere; width: 100%; }
.note-passage span { color: var(--primary-color); }
.note-passage mark { color: inherit; background: transparent; font-style: normal; font-weight: 600; text-decoration: underline; text-decoration-color: var(--primary-color); text-underline-offset: 3px; }
.writing-note p { color: var(--text-secondary); font-size: 12px; }
.note-actions { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 14px; flex-shrink: 0; border-top: 1px solid var(--border-color); }
.note-actions button { padding: 6px; min-height: 36px; font-size: 12px; }
.note-actions .note-apply { color: var(--toolbar-accent-ink, var(--primary-color)); font-weight: 600; }
.note-actions button:disabled { opacity: .5; cursor: default; }
.writing-prompt { border-top: 1px solid var(--border-color); padding-top: 24px; margin-top: 12px; }
.companion-kicker { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-secondary); }
.writing-prompt p { font-family: Georgia, serif; font-size: 16px; }
.writing-prompt button { color: var(--toolbar-accent-ink, var(--primary-color)); padding: 6px 0; font-size: 12px; }
.companion-footer { display: grid; gap: 4px; padding: 14px 20px; border-top: 1px solid var(--border-color); font-size: 12px; }
.companion-footer small { color: var(--text-secondary); font-size: 10px; }
.writing-outline { display: grid; gap: 3px; }
.writing-outline button { padding: 9px 12px; text-align: left; border-left: 2px solid var(--border-color); border-radius: 0; overflow-wrap: anywhere; }
.writing-outline button:hover { border-color: var(--primary-color); }
@media (max-width: 700px) { .writing-companion { width: 100%; flex: 0 0 max(45%, 264px); height: max(45%, 264px); max-height: calc(100% - 96px); border-left: 0; border-top: 1px solid var(--border-color); } .companion-header { padding-top: 8px; } .companion-intro, .writing-prompt, .companion-footer { display: none; } .companion-body { padding: 0 18px; } }
@media (max-height: 500px) {
  .writing-companion { position: fixed; inset: 8px 8px calc(8px + var(--nle-mobile-toolbar-clearance, 0px)); width: auto; height: auto; max-height: none; z-index: 10001; border: 1px solid var(--border-color); border-radius: 10px; box-shadow: var(--shadow-lg); }
  .companion-header { padding: 6px 14px; flex-shrink: 0; }
  .companion-tabs { padding-bottom: 6px; flex-shrink: 0; }
  .companion-body { padding: 0 18px; }
  .companion-intro, .writing-prompt, .companion-footer { display: none; }
}
/* Available manuscript space matters more than the device name: a small
   portrait phone can have less room than a landscape tablet once tools and
   its keyboard are present. Avoid squeezing the note's scroll area to zero. */
@container nle-writing-area (max-width: 700px) and (max-height: 359px) {
  .writing-companion { position: fixed; inset: 8px 8px calc(8px + var(--nle-mobile-toolbar-clearance, 0px)); width: auto; height: auto; max-height: none; z-index: 10001; border: 1px solid var(--border-color); border-radius: 10px; box-shadow: var(--shadow-lg); }
  .companion-header { padding: 6px 14px; flex-shrink: 0; }
  .companion-tabs { padding-bottom: 6px; flex-shrink: 0; }
  .companion-body { padding: 0 18px; }
  .companion-intro, .writing-prompt, .companion-footer { display: none; }
}
</style>
