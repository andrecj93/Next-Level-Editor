<template>
  <div class="editor-footer">
    <button
      class="width-toggle"
      type="button"
      :aria-pressed="fullWidth"
      :title="
        fullWidth
          ? 'Switch back to the centered reading column'
          : 'Expand the writing column to fill the editor'
      "
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
      <span>{{ fullWidth ? "Fit width" : "Full width" }}</span>
    </button>

    <div class="footer-counts">
      <span class="word-count">{{ wordCount }} words</span>
      <span class="char-count">{{ characterCount }} characters</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  wordCount: number;
  characterCount: number;
  fullWidth?: boolean;
}>();

defineEmits<{
  (e: "toggle-full-width"): void;
}>();
</script>

<style scoped>
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
