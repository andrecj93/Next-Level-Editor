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
  /* Unify the editor's accent with the site's warm ink (demo-only — real
     consumers keep the library's default blue or theme it themselves). The
     editor exposes its accent as CSS custom properties; `var(--accent)` already
     flips for light/dark on the site, and this selector out-specifies the
     editor's own base + .theme-dark token definitions. */
  --toolbar-accent: var(--accent);
  --toolbar-hover: color-mix(in srgb, var(--accent) 14%, transparent);
  --history-active: var(--accent);
  --history-bg: color-mix(in srgb, var(--accent) 9%, transparent);
  /* The editor also drives a second accent chain (--color-primary ->
     --primary-color) for active dropdowns, inline comments, autocomplete, etc.
     Remap it too so nothing stays blue. (Teleported modals live outside this
     subtree and keep the library default — acceptable for the marketing site.) */
  --color-primary: var(--accent);
  --primary-color: var(--accent);
  --primary-hover: var(--accent-strong);
  --toolbar-btn-active: color-mix(in srgb, var(--accent) 14%, transparent);
}
/* The Export button hardcodes a blue gradient; repaint it in the brand ink so
   the one filled control matches the rest of the warmed toolbar. */
.editor-sheet :deep(.editor-toolbar-modern .export-section .dropdown-trigger) {
  background: var(--brand-gradient);
  box-shadow: 0 2px 8px -1px rgba(196, 57, 44, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.editor-sheet
  :deep(.editor-toolbar-modern .export-section .dropdown-trigger:hover:not(:disabled)) {
  background: var(--brand-gradient);
  filter: brightness(1.06);
  box-shadow: 0 5px 14px -2px rgba(196, 57, 44, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
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
