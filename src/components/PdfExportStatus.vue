<template>
  <div class="pdf-export-status" role="group" aria-label="PDF export progress">
    <span role="status">{{ cancelling ? 'Cancelling PDF…' : 'Preparing PDF' }}</span>
    <progress v-if="!cancelling" :value="total ? completed : undefined" :max="total || 1" aria-label="PDF pages prepared" />
    <span v-if="total && !cancelling" class="pdf-page-count" :style="{ minWidth: `${String(total).length * 2 + 1}ch` }" aria-hidden="true">{{ completed }}/{{ total }}</span>
    <button type="button" :disabled="cancelling" aria-label="Cancel PDF export" @click="$emit('cancel')">Cancel</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ completed: number; total: number; cancelling: boolean }>();
defineEmits<{ (event: 'cancel'): void }>();
</script>

<style scoped>
.pdf-export-status { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; flex-shrink: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.4; }
.pdf-export-status > span { white-space: nowrap; }
.pdf-page-count { font-variant-numeric: tabular-nums; text-align: right; }
progress { width: 32px; height: 4px; accent-color: var(--toolbar-accent); }
button { min-height: 30px; padding: 3px 6px; border: 0; border-radius: 4px; font: inherit; color: var(--text-color); background: var(--background-alt); cursor: pointer; }
button:hover { background: var(--hover-bg); }
button:focus-visible { outline: 2px solid var(--toolbar-accent); outline-offset: 2px; }
button:disabled { opacity: 0.6; cursor: default; }
@media (pointer: coarse) { button { min-height: 44px; min-width: 44px; } }
@media (prefers-reduced-motion: reduce) { progress { animation: none; } }
@media print { .pdf-export-status { display: none; } }
</style>
