<template>
  <div class="editor-footer">
    <div v-if="writingMode" class="writing-footer-actions">
      <button type="button" class="width-toggle" :aria-label="t('Writing companion')" :aria-description="writingNoteCount ? t('{count} writing notes ready to review', { count: writingNoteCount }) : undefined" :aria-expanded="companionOpen" @click="$emit('toggle-companion')">{{ t("Writing companion") }} <span v-if="writingNoteCount" class="writing-note-count" aria-hidden="true">{{ number(writingNoteCount) }}</span></button>
      <button v-if="enableComments" type="button" class="width-toggle" :aria-expanded="commentsOpen" @click="$emit('open-comments')">{{ t("Comments") }}</button>
      <button v-if="enableVariables" type="button" class="width-toggle" :aria-expanded="variablesOpen" @click="$emit('open-variables')">{{ t("Variables") }}</button>
    </div>
    <button
      v-else
      class="width-toggle"
      type="button"
      :aria-pressed="fullWidth"
      :title="t(
        fullWidth
          ? 'Switch back to the centered reading column'
          : 'Expand the writing column to fill the editor'
      )"
      @click="$emit('toggle-full-width')"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          v-if="fullWidth"
          d="M6 4 3 8l3 4M10 4l3 4-3 4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <path
          v-else
          d="M4 4v8M12 4v8M6.5 8h3M6.5 8 8 6.5M6.5 8 8 9.5M9.5 8 8 6.5M9.5 8 8 9.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
      <span>{{ t(fullWidth ? "Fit width" : "Full width") }}</span>
    </button>

    <div class="footer-counts">
      <slot />
      <span class="word-count">{{ t('{count} words', { count: wordCount }) }}</span>
      <span class="char-count">{{ t('{count} characters', { count: characterCount }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, number } = useEditorLocale();
defineProps<{
  wordCount: number;
  characterCount: number;
  fullWidth?: boolean;
  writingMode?: boolean;
  companionOpen?: boolean;
  writingNoteCount?: number;
  enableComments?: boolean;
  enableVariables?: boolean;
  commentsOpen?: boolean;
  variablesOpen?: boolean;
}>();

defineEmits<{
  (e: "toggle-full-width"): void;
  (e: "toggle-companion"): void;
  (e: "open-comments"): void;
  (e: "open-variables"): void;
}>();
</script>

<style scoped>
.writing-footer-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.writing-footer-actions button { min-height: 30px; }
.writing-note-count { min-width: 18px; padding: 1px 5px; border-radius: 9px; background: var(--background-alt); color: var(--toolbar-accent-ink, var(--text-color)); font-size: 11px; line-height: 16px; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) { .writing-footer-actions { gap: 2px; } .char-count { display: none; } .writing-footer-actions button { font-size: 11px; } }
.editor-footer {
  /* Extra right padding clears the corner resize grip that overlays this
     corner (positioned by the editor root), so the character count never
     sits under it. */
  padding: 8px 30px 8px 16px;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-alt);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.footer-counts {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.word-count,
.char-count {
  display: flex;
  align-items: center;
}

.width-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 6px;
  margin: -3px 0;
  border: none;
  border-radius: var(--radius-md, 6px);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.width-toggle svg {
  width: 14px;
  height: 14px;
}

.width-toggle:hover {
  background: var(--hover-bg, rgba(127, 127, 127, 0.12));
  color: var(--text-primary, var(--text-color));
}

.width-toggle:focus-visible {
  outline: 2px solid var(--focus-color, var(--color-primary, #3b82f6));
  outline-offset: 2px;
}

.width-toggle[aria-pressed="true"] {
  color: var(--primary-color, var(--color-primary, #3b82f6));
}
</style>
