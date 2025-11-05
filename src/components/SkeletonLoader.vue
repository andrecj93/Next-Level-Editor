<template>
  <div class="skeleton-loader" :class="{ [variant]: true }">
    <div v-if="variant === 'editor'" class="skeleton-editor">
      <div class="skeleton-toolbar">
        <div class="skeleton-toolbar-group">
          <div v-for="i in 8" :key="i" class="skeleton-btn" />
        </div>
        <div class="skeleton-toolbar-divider" />
        <div class="skeleton-toolbar-group">
          <div v-for="i in 6" :key="i" class="skeleton-btn" />
        </div>
      </div>
      <div class="skeleton-content">
        <div v-for="i in lines" :key="i" class="skeleton-line" :style="{ width: getLineWidth(i) }" />
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-text small" />
      </div>
    </div>

    <div v-else-if="variant === 'modal'" class="skeleton-modal">
      <div class="skeleton-modal-header">
        <div class="skeleton-title" />
      </div>
      <div class="skeleton-modal-body">
        <div v-for="i in 4" :key="i" class="skeleton-field">
          <div class="skeleton-label" />
          <div class="skeleton-input" />
        </div>
      </div>
      <div class="skeleton-modal-footer">
        <div class="skeleton-btn-group">
          <div class="skeleton-btn" />
          <div class="skeleton-btn primary" />
        </div>
      </div>
    </div>

    <div v-else-if="variant === 'dropdown'" class="skeleton-dropdown">
      <div v-for="i in items" :key="i" class="skeleton-dropdown-item">
        <div class="skeleton-icon" />
        <div class="skeleton-text" />
      </div>
    </div>

    <div v-else-if="variant === 'table'" class="skeleton-table">
      <div class="skeleton-table-row header">
        <div v-for="i in columns" :key="i" class="skeleton-table-cell" />
      </div>
      <div v-for="i in rows" :key="i" class="skeleton-table-row">
        <div v-for="j in columns" :key="j" class="skeleton-table-cell" />
      </div>
    </div>

    <div v-else-if="variant === 'card'" class="skeleton-card">
      <div class="skeleton-card-image" />
      <div class="skeleton-card-body">
        <div class="skeleton-title" />
        <div class="skeleton-text" />
        <div class="skeleton-text" />
      </div>
    </div>

    <div v-else class="skeleton-text" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'editor' | 'modal' | 'dropdown' | 'table' | 'card' | 'text'
  lines?: number
  items?: number
  rows?: number
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  lines: 10,
  items: 5,
  rows: 5,
  columns: 3,
})

function getLineWidth(index: number): string {
  // Vary line widths to look more natural
  const widths = ['100%', '95%', '90%', '100%', '85%', '100%', '92%', '100%', '88%', '100%']
  return widths[index % widths.length]
}
</script>

<style scoped>
.skeleton-loader {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Editor Skeleton */
.skeleton-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--toolbar-bg, #f8f9fb);
  border-bottom: 1px solid var(--editor-border, #d8dde6);
}

.skeleton-toolbar-group {
  display: flex;
  gap: 4px;
}

.skeleton-toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--editor-border, #d8dde6);
}

.skeleton-btn {
  width: 32px;
  height: 32px;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 6px;
}

.skeleton-btn.primary {
  width: 80px;
}

.skeleton-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.skeleton-line {
  height: 18px;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
}

.skeleton-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--editor-border, #d8dde6);
  display: flex;
  justify-content: space-between;
}

/* Modal Skeleton */
.skeleton-modal {
  background: var(--editor-bg, #ffffff);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
}

.skeleton-modal-header {
  margin-bottom: 20px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
}

.skeleton-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.skeleton-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-label {
  height: 14px;
  width: 30%;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
}

.skeleton-input {
  height: 40px;
  width: 100%;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 6px;
}

.skeleton-modal-footer {
  display: flex;
  justify-content: flex-end;
}

.skeleton-btn-group {
  display: flex;
  gap: 12px;
}

/* Dropdown Skeleton */
.skeleton-dropdown {
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 8px;
  padding: 8px;
  min-width: 200px;
}

.skeleton-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
}

.skeleton-icon {
  width: 20px;
  height: 20px;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
  flex-shrink: 0;
}

/* Table Skeleton */
.skeleton-table {
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-table-row {
  display: flex;
  border-bottom: 1px solid var(--editor-border, #d8dde6);
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-row.header {
  background: var(--toolbar-bg, #f8f9fb);
}

.skeleton-table-cell {
  flex: 1;
  height: 48px;
  padding: 12px;
  display: flex;
  align-items: center;
}

.skeleton-table-cell::before {
  content: '';
  width: 80%;
  height: 16px;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
}

/* Card Skeleton */
.skeleton-card {
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 12px;
  overflow: hidden;
}

.skeleton-card-image {
  width: 100%;
  height: 200px;
  background: var(--skeleton-bg, #e5e7eb);
}

.skeleton-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Text Skeleton */
.skeleton-text {
  height: 16px;
  width: 100%;
  background: var(--skeleton-bg, #e5e7eb);
  border-radius: 4px;
}

.skeleton-text.small {
  width: 120px;
}

/* Dark Mode */
.theme-dark .skeleton-btn,
.theme-dark .skeleton-line,
.theme-dark .skeleton-title,
.theme-dark .skeleton-label,
.theme-dark .skeleton-input,
.theme-dark .skeleton-icon,
.theme-dark .skeleton-text,
.theme-dark .skeleton-table-cell::before,
.theme-dark .skeleton-card-image {
  background: rgba(30, 41, 59, 0.6);
}

/* Shimmer Effect (Optional Enhancement) */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-loader.shimmer .skeleton-btn,
.skeleton-loader.shimmer .skeleton-line,
.skeleton-loader.shimmer .skeleton-title,
.skeleton-loader.shimmer .skeleton-label,
.skeleton-loader.shimmer .skeleton-input,
.skeleton-loader.shimmer .skeleton-icon,
.skeleton-loader.shimmer .skeleton-text,
.skeleton-loader.shimmer .skeleton-card-image {
  background: linear-gradient(
    90deg,
    var(--skeleton-bg, #e5e7eb) 0px,
    rgba(229, 231, 235, 0.5) 50%,
    var(--skeleton-bg, #e5e7eb) 100px
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear, pulse 1.5s ease-in-out infinite;
}

/* Responsive */
@media (max-width: 640px) {
  .skeleton-modal {
    min-width: auto;
    width: 100%;
  }

  .skeleton-toolbar-group {
    gap: 2px;
  }

  .skeleton-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
