<template>
  <aside ref="panel" class="writing-companion" aria-label="Writing companion" @keydown.esc.stop="$emit('close')">
    <header class="companion-header">
      <span class="companion-title">In the margins</span>
      <button type="button" aria-label="Close writing companion" @click="$emit('close')">×</button>
    </header>
    <div class="companion-tabs" role="group" aria-label="Writing companion views">
      <button ref="reviewButton" type="button" :aria-pressed="tab === 'review'" @click="tab = 'review'">Writing notes <span v-if="visibleNotes.length">{{ visibleNotes.length }}</span></button>
      <button type="button" :aria-pressed="tab === 'outline'" @click="tab = 'outline'">Outline</button>
    </div>
    <div class="companion-body">
      <template v-if="tab === 'review'">
        <p v-if="!visibleNotes.length" class="companion-intro">A second pair of eyes.<br><span>Your words, your decisions.</span></p>
        <p v-if="!review.words" class="companion-empty">Start with a sentence. When you pause, I’ll point out a few places you might want to revisit.</p>
        <p v-else-if="!visibleNotes.length" class="companion-empty">{{ review.notes.length ? 'You’ve considered every note. Keep your voice.' : 'No notes for now. Keep going — there’s room for your next thought.' }}</p>
        <article v-for="note in visibleNotes.slice(0, 5)" :key="note.id" class="writing-note">
          <h3>{{ note.title }}</h3>
          <button type="button" class="note-passage" :aria-label="`Show passage: ${note.quote}`" @click="$emit('locate', note)">“{{ note.quote }}” <span aria-hidden="true">↗</span></button>
          <p>{{ note.detail }}</p>
          <div class="note-actions">
            <button v-if="note.replacement" type="button" class="note-apply" :disabled="readonly" @click="$emit('apply', note)">Use “{{ note.replacement }}”</button>
            <button v-else type="button" @click="$emit('locate', note)">Go to sentence</button>
            <button type="button" :aria-label="`Dismiss note: ${note.title}`" @click="dismiss(note, $event)">Keep as is</button>
          </div>
        </article>
        <p v-if="visibleNotes.length > 5" class="companion-small">{{ visibleNotes.length - 5 }} more notes. Take these one at a time.</p>
        <div class="writing-prompt">
          <span class="companion-kicker">A nudge, if you need one</span>
          <p>{{ prompts[promptIndex] }}</p>
          <button type="button" @click="promptIndex = (promptIndex + 1) % prompts.length">Another prompt <span aria-hidden="true">↻</span></button>
        </div>
      </template>
      <template v-else>
        <p class="companion-intro">Find your way through.</p>
        <p v-if="!review.outline.length" class="companion-empty">Turn a line into a heading with the paragraph menu or type # followed by a space. Your chapters will appear here.</p>
        <nav v-else aria-label="Document outline" class="writing-outline">
          <button v-for="heading in review.outline" :key="heading.block" type="button" :style="{ paddingLeft: `${12 + Math.min(heading.level - 1, 3) * 12}px` }" @click="$emit('navigate', heading.block)">{{ heading.text }}</button>
        </nav>
      </template>
    </div>
    <footer class="companion-footer">
      <span>{{ review.words.toLocaleString() }} words<span v-if="review.words"> · {{ review.readingMinutes }} min read</span></span>
      <small>Private, on-device checks · English prose</small>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { WritingReview, WritingNote } from '../utils/writingReview';
const props = defineProps<{ review: WritingReview; dismissedNotes: ReadonlySet<string>; readonly?: boolean }>();
const emit = defineEmits<{ close: []; locate: [note: WritingNote]; apply: [note: WritingNote]; dismiss: [note: WritingNote]; navigate: [block: number] }>();
const panel = ref<HTMLElement | null>(null);
const reviewButton = ref<HTMLButtonElement | null>(null);
const tab = ref<'review' | 'outline'>('review');
const visibleNotes = computed(() => props.review.notes.filter(note => !props.dismissedNotes.has(note.id)));
const dismiss = async (note: WritingNote, event: MouseEvent) => {
  const article = (event.currentTarget as HTMLElement).closest('.writing-note');
  const document = panel.value?.ownerDocument;
  const ownedFocus = article?.contains(document?.activeElement ?? null);
  const index = visibleNotes.value.findIndex(current => current.id === note.id);
  emit('dismiss', note);
  await nextTick();
  // Removing the focused button sends focus to the body. Continue at the next
  // note (or the previous last note), without stealing focus from the manuscript.
  if (ownedFocus && !article?.isConnected && document?.activeElement === document?.body) {
    const passages = panel.value?.querySelectorAll<HTMLButtonElement>('.note-passage');
    const target = passages?.[Math.min(index, passages.length - 1)] ?? reviewButton.value;
    target?.focus();
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
.companion-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 8px; }
.companion-title { font-weight: 650; font-size: 15px; letter-spacing: -.02em; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: transparent; border-radius: 6px; }
button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.companion-header button { font-size: 22px; width: 32px; height: 32px; }
button:hover { background: var(--hover-bg); }
.companion-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); padding: 0 14px 12px; }
.companion-tabs button { min-height: 36px; padding: 6px 9px; color: var(--text-secondary); }
.companion-tabs [aria-pressed="true"] { background: var(--background-color); color: var(--text-color); box-shadow: 0 1px 3px #00000012; font-weight: 600; }
.companion-tabs span { font-size: 11px; margin-left: 3px; }
.companion-body { padding: 18px 20px; overflow-y: auto; flex: 1; min-height: 0; overscroll-behavior: contain; }
.companion-intro { margin: 0 0 20px; font-family: Georgia, serif; font-size: 19px; line-height: 1.4; }
.companion-intro span { font: 12px/1.6 var(--font-family, sans-serif); color: var(--text-secondary); }
.companion-empty { color: var(--text-secondary); margin-bottom: 24px; }
.writing-note { border-top: 1px solid var(--border-color); padding: 18px 0; }
.writing-note:first-child { border-top: 0; padding-top: 0; }
.writing-note h3 { font: 600 13px/1.5 var(--font-family, sans-serif); margin: 0 0 10px; }
.note-passage { text-align: left; color: var(--text-color); font: italic 15px/1.55 Georgia, serif; padding: 8px 12px; background: var(--background-alt); border-left: 2px solid var(--primary-color); border-radius: 0 6px 6px 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; width: 100%; }
.note-passage span { color: var(--primary-color); }
.writing-note p { color: var(--text-secondary); font-size: 12px; }
.note-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-left: -6px; }
.note-actions button { padding: 6px; min-height: 32px; font-size: 12px; }
.note-actions .note-apply { color: var(--toolbar-accent-ink, var(--primary-color)); font-weight: 600; }
.note-actions button:disabled { opacity: .5; cursor: default; }
.writing-prompt { border-top: 1px solid var(--border-color); padding-top: 24px; margin-top: 12px; }
.companion-kicker { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-secondary); }
.writing-prompt p { font-family: Georgia, serif; font-size: 16px; }
.writing-prompt button { color: var(--toolbar-accent-ink, var(--primary-color)); padding: 6px 0; font-size: 12px; }
.companion-small { color: var(--text-secondary); font-size: 12px; }
.companion-footer { display: grid; gap: 4px; padding: 14px 20px; border-top: 1px solid var(--border-color); font-size: 12px; }
.companion-footer small { color: var(--text-secondary); font-size: 10px; }
.writing-outline { display: grid; gap: 3px; }
.writing-outline button { padding: 9px 12px; text-align: left; border-left: 2px solid var(--border-color); border-radius: 0; overflow-wrap: anywhere; }
.writing-outline button:hover { border-color: var(--primary-color); }
@media (max-width: 700px) { .writing-companion { width: 100%; flex-basis: auto; max-height: 45%; border-left: 0; border-top: 1px solid var(--border-color); } .companion-header { padding-top: 8px; } .companion-intro, .writing-prompt, .companion-footer { display: none; } .companion-body { padding: 0 18px; } }
@media (max-height: 500px) {
  .writing-companion { position: fixed; inset: 8px 8px calc(8px + var(--nle-mobile-toolbar-clearance, 0px)); width: auto; max-height: none; z-index: 10001; border: 1px solid var(--border-color); border-radius: 10px; box-shadow: var(--shadow-lg); }
  .companion-header { padding: 6px 14px; flex-shrink: 0; }
  .companion-tabs { padding-bottom: 6px; flex-shrink: 0; }
  .companion-body { padding: 0 18px; }
  .companion-intro, .writing-prompt, .companion-footer { display: none; }
}
</style>
