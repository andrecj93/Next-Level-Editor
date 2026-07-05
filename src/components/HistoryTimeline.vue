<template>
  <div class="history-timeline" :class="{ 'is-compact': compact }">
    <!-- Timeline Header -->
    <div class="timeline-header">
      <h3 class="timeline-title">
        {{ title }}
      </h3>
      <div class="timeline-actions">
        <button
          v-if="showClearButton && hasHistory"
          class="btn-clear"
          :aria-label="clearButtonLabel"
          @click="handleClear"
        >
          {{ clearButtonLabel }}
        </button>
        <button
          v-if="showExportButton && hasHistory"
          class="btn-export"
          :aria-label="exportButtonLabel"
          @click="handleExport"
        >
          {{ exportButtonLabel }}
        </button>
      </div>
    </div>

    <!-- Timeline Progress Bar -->
    <div v-if="showProgress && hasHistory" class="timeline-progress-container">
      <div class="timeline-progress-bar">
        <div
          class="timeline-progress-fill"
          :style="{ width: `${timelineProgress}%` }"
        />
      </div>
      <div class="timeline-progress-text">
        {{ currentIndex + 1 }} / {{ historySize }}
      </div>
    </div>

    <!-- Timeline Navigation -->
    <div v-if="showNavigation && hasHistory" class="timeline-navigation">
      <button
        :disabled="!canGoBack"
        class="nav-btn"
        aria-label="Go to first"
        @click="handleGoToFirst"
      >
        ⏮
      </button>
      <button
        :disabled="!canGoBack"
        class="nav-btn"
        aria-label="Go back"
        @click="handleGoBack"
      >
        ◀
      </button>
      <button
        :disabled="!canGoForward"
        class="nav-btn"
        aria-label="Go forward"
        @click="handleGoForward"
      >
        ▶
      </button>
      <button
        :disabled="!canGoForward"
        class="nav-btn"
        aria-label="Go to latest"
        @click="handleGoToLatest"
      >
        ⏭
      </button>
    </div>

    <!-- Timeline Entries -->
    <div v-if="hasHistory" ref="entriesContainer" class="timeline-entries">
      <div
        v-for="(entry, index) in history"
        :key="entry.id"
        class="timeline-entry"
        :class="{
          'is-current': index === currentIndex,
          'is-past': index < currentIndex,
          'is-future': index > currentIndex,
        }"
        @click="handleEntryClick(index)"
      >
        <div class="entry-marker" />
        <div class="entry-content">
          <div class="entry-header">
            <span class="entry-label">
              {{ entry.label || `Version ${index + 1}` }}
            </span>
            <span class="entry-time">
              {{ formatTime(entry.timestamp) }}
            </span>
          </div>
          <div
            v-if="showPreview && index === currentIndex"
            class="entry-preview"
          >
            {{ truncateContent(entry.content) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="timeline-empty">
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { HistoryEntry } from "../composables/useHistoryTimeline";
import { smoothScrollIntoView } from "../utils/scroll";

interface Props {
  history: readonly HistoryEntry[];
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  hasHistory: boolean;
  historySize: number;
  timelineProgress: number;
  title?: string;
  compact?: boolean;
  showProgress?: boolean;
  showNavigation?: boolean;
  showPreview?: boolean;
  showClearButton?: boolean;
  showExportButton?: boolean;
  clearButtonLabel?: string;
  exportButtonLabel?: string;
  emptyMessage?: string;
  maxPreviewLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: "History Timeline",
  compact: false,
  showProgress: true,
  showNavigation: true,
  showPreview: true,
  showClearButton: true,
  showExportButton: true,
  clearButtonLabel: "Clear",
  exportButtonLabel: "Export",
  emptyMessage: "No history available",
  maxPreviewLength: 100,
});

interface Emits {
  (e: "goToEntry", index: number): void;
  (e: "goBack"): void;
  (e: "goForward"): void;
  (e: "goToFirst"): void;
  (e: "goToLatest"): void;
  (e: "clear"): void;
  (e: "export"): void;
}

const emit = defineEmits<Emits>();

const entriesContainer = ref<HTMLElement | null>(null);

// Event handlers
const handleEntryClick = (index: number) => {
  emit("goToEntry", index);
};

const handleGoBack = () => {
  emit("goBack");
};

const handleGoForward = () => {
  emit("goForward");
};

const handleGoToFirst = () => {
  emit("goToFirst");
};

const handleGoToLatest = () => {
  emit("goToLatest");
};

const handleClear = () => {
  emit("clear");
};

const handleExport = () => {
  emit("export");
};

// Utility functions
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const truncateContent = (content: string): string => {
  if (content.length <= props.maxPreviewLength) {
    return content;
  }
  return content.substring(0, props.maxPreviewLength) + "...";
};

// Expose methods for parent component
defineExpose({
  scrollToEntry: (index: number) => {
    if (!entriesContainer.value) return;
    const entries = entriesContainer.value.querySelectorAll(".timeline-entry");
    const entry = entries[index] as HTMLElement;
    if (entry) {
      smoothScrollIntoView(entry, { behavior: "smooth", block: "center" });
    }
  },
});
</script>

<style scoped>
.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  max-height: 600px;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.timeline-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.timeline-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-clear,
.btn-export {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover,
.btn-export:hover {
  background: var(--bg-hover, #f0f0f0);
}

.timeline-progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timeline-progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.timeline-progress-fill {
  height: 100%;
  background: var(--primary-color, #4caf50);
  transition: width 0.3s ease;
}

.timeline-progress-text {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.timeline-navigation {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.nav-btn {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:not(:disabled):hover {
  background: var(--bg-hover, #f0f0f0);
  transform: scale(1.05);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.timeline-entries {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.timeline-entry {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.timeline-entry:hover {
  background: var(--bg-hover, #f0f0f0);
}

.timeline-entry.is-current {
  background: var(--primary-light, #e8f5e9);
  border-left: 3px solid var(--primary-color, #4caf50);
}

.timeline-entry.is-past {
  opacity: 0.6;
}

.timeline-entry.is-future {
  opacity: 0.4;
}

.entry-marker {
  width: 12px;
  height: 12px;
  margin-top: 0.25rem;
  border-radius: 50%;
  background: var(--text-secondary, #999);
  flex-shrink: 0;
}

.timeline-entry.is-current .entry-marker {
  background: var(--primary-color, #4caf50);
  box-shadow: 0 0 0 4px var(--primary-light, #e8f5e9);
}

.entry-content {
  flex: 1;
  min-width: 0;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.entry-label {
  font-weight: 500;
  color: var(--text-primary, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #999);
  flex-shrink: 0;
}

.entry-preview {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-primary, #fff);
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary, #999);
}

.is-compact {
  padding: 0.5rem;
  max-height: 400px;
}

.is-compact .timeline-title {
  font-size: 1rem;
}

.is-compact .timeline-entry {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
}

.is-compact .entry-marker {
  width: 8px;
  height: 8px;
}

/* Dark mode support — keyed to the editor's own theme class (.theme-dark on
   the .next-level-editor root), not the OS prefers-color-scheme setting. */
.theme-dark .history-timeline {
  background: var(--bg-secondary-dark, #2a2a2a);
}

.theme-dark .timeline-title {
  color: var(--text-primary-dark, #f0f0f0);
}

.theme-dark .btn-clear,
.theme-dark .btn-export {
  background: var(--bg-primary-dark, #1e1e1e);
  color: var(--text-primary-dark, #f0f0f0);
  border-color: var(--border-color-dark, #444);
}

.theme-dark .btn-clear:hover,
.theme-dark .btn-export:hover {
  background: var(--bg-hover-dark, #333);
}

.theme-dark .timeline-progress-bar {
  background: var(--bg-tertiary-dark, #444);
}

.theme-dark .timeline-entry:hover {
  background: var(--bg-hover-dark, #333);
}

.theme-dark .entry-label {
  color: var(--text-primary-dark, #f0f0f0);
}

.theme-dark .entry-preview {
  background: var(--bg-primary-dark, #1e1e1e);
}
</style>
