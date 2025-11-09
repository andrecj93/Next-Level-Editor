<template>
  <div class="editor-footer">
    <span class="word-count">{{ wordCount }} words</span>
    <span class="char-count">{{ characterCount }} characters</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  wordCount: number
  characterCount: number
}>()
</script>

<style scoped>
.editor-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-alt);
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.word-count,
.char-count {
  display: flex;
  align-items: center;
}
</style>
