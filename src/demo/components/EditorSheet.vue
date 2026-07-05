<template>
  <div class="sheet editor-sheet">
    <div v-if="filename" class="sheet-chrome">
      <span class="sheet-dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="sheet-name">{{ filename }}</span>
      <span v-if="badge" class="sheet-badge">{{ badge }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * EditorSheet — the recurring "sheet of paper" frame. Wraps any content (most
 * often a live NextLevelEditor) in the document-chrome look so every editor on
 * the site reads as a real file lifting off the page. Filename chrome is
 * optional; omit it for a bare framed surface.
 */
defineProps<{ filename?: string; badge?: string }>();
</script>

<style scoped>
.editor-sheet :deep(.next-level-editor) {
  /* Let the framed editor sit flush inside the sheet — the sheet owns the
     border/radius/shadow, so strip the editor's own outer chrome. */
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.sheet-badge {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--brand-gradient-soft);
  border: 1px solid var(--rule-red);
  padding: 2px 9px;
  border-radius: 999px;
}
</style>
