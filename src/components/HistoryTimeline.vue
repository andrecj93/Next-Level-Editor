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
        <button
          v-if="showCloseButton"
          class="btn-close"
          aria-label="Close history"
          @click="emit('close')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
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
        :disabled="readonly || !canGoBack"
        class="nav-btn"
        aria-label="Go to first"
        @click="handleGoToFirst"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 5v14m13-14-7 7 7 7" /></svg>
      </button>
      <button
        :disabled="readonly || !canGoBack"
        class="nav-btn"
        aria-label="Go back"
        @click="handleGoBack"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <button
        :disabled="readonly || !canGoForward"
        class="nav-btn"
        aria-label="Go forward"
        @click="handleGoForward"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
      <button
        :disabled="readonly || !canGoForward"
        class="nav-btn"
        aria-label="Go to latest"
        @click="handleGoToLatest"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 5v14M6 5l7 7-7 7" /></svg>
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
        role="button"
        tabindex="0"
        :aria-current="index === currentIndex ? 'true' : undefined"
        :aria-disabled="readonly ? 'true' : undefined"
        :aria-label="`Restore ${entry.label || `Version ${index + 1}`}, ${formatTime(entry.timestamp)}`"
        @click="handleEntryClick(index, $event)"
        @keydown.enter.prevent="handleEntryClick(index, $event)"
        @keydown.space.prevent="handleEntryClick(index, $event)"
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
            v-if="showPreview"
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
import { ref, nextTick, watch } from "vue";
import type { HistoryEntry } from "../composables/useHistoryTimeline";

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
  showCloseButton?: boolean;
  readonly?: boolean;
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
  showCloseButton: false,
  readonly: false,
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
  (e: "close"): void;
}

const emit = defineEmits<Emits>();

const entriesContainer = ref<HTMLElement | null>(null);

// Event handlers
const focusControl = (event?: Event) => {
  // Safari pointer activation does not focus buttons. The parent needs this
  // control as the return target after it restores the document's caret.
  const control = event?.currentTarget;
  if (control instanceof HTMLElement) control.focus({ preventScroll: true });
};

const handleEntryClick = (index: number, event?: Event) => {
  if (props.readonly) return;
  focusControl(event);
  emit("goToEntry", index);
};

const handleGoBack = (event?: Event) => {
  if (props.readonly) return;
  focusControl(event);
  emit("goBack");
};

const handleGoForward = (event?: Event) => {
  if (props.readonly) return;
  focusControl(event);
  emit("goForward");
};

const handleGoToFirst = (event?: Event) => {
  if (props.readonly) return;
  focusControl(event);
  emit("goToFirst");
};

const handleGoToLatest = (event?: Event) => {
  if (props.readonly) return;
  focusControl(event);
  emit("goToLatest");
};

const handleClear = (event?: Event) => {
  focusControl(event);
  emit("clear");
};

const handleExport = (event?: Event) => {
  focusControl(event);
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

const scrollToEntry = (index: number) => {
  const container = entriesContainer.value;
  const entry = container?.querySelectorAll<HTMLElement>('.timeline-entry')[index];
  if (!container || !entry) return;
  const row = entry.getBoundingClientRect();
  const list = container.getBoundingClientRect();
  // Scroll only the version list; never displace the manuscript or host page.
  container.scrollTop += row.top - list.top - Math.max(0, (container.clientHeight - row.height) / 2);
};
watch(() => [props.currentIndex, props.history.length], () => {
  nextTick(() => scrollToEntry(props.currentIndex));
}, { immediate: true, flush: 'post' });
defineExpose({ scrollToEntry });
</script>

<style scoped>
.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  min-height: 0;
  color: var(--color-text, #333);
  background: var(--color-surface, #ffffff);
  border-radius: 8px;
  max-height: inherit;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.timeline-title {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
  min-width: 0;
  font-weight: 600;
  color: var(--color-text, #333);
}

.timeline-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
}

.btn-clear,
.btn-export,
.btn-close {
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  font-size: 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  background: var(--color-background, #f9fafb);
  color: var(--color-text, #333);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.btn-clear:hover,
.btn-export:hover {
  background: var(--toolbar-hover, #f0f0f0);
}

.timeline-progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timeline-progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-border, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.timeline-progress-fill {
  height: 100%;
  background: var(--toolbar-accent, #1d4ed8);
  transition: width 0.3s ease;
}

.timeline-progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
  white-space: nowrap;
}

.timeline-navigation {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  justify-content: center;
}

.nav-btn {
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  color: var(--color-text, #333);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  background: var(--color-background, #f9fafb);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.nav-btn:not(:disabled):hover {
  background: var(--toolbar-hover, #f0f0f0);

}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.timeline-entries {
  flex: 1;
  min-height: 0;
  overscroll-behavior: contain;
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
  transition: box-shadow 0.2s;
  position: relative;
}

.timeline-entry:hover {
  background: var(--toolbar-hover, #f0f0f0);
}

.timeline-entry.is-current {
  background: var(--toolbar-hover, #eff6ff);
  border-left: 3px solid var(--toolbar-accent, #1d4ed8);
}

.timeline-entry[aria-disabled="true"] { cursor: default; }



.entry-marker {
  width: 12px;
  height: 12px;
  margin-top: 0.25rem;
  border-radius: 50%;
  background: var(--color-text-secondary, #666);
  flex-shrink: 0;
}

.timeline-entry.is-current .entry-marker {
  background: var(--toolbar-accent, #1d4ed8);
  box-shadow: 0 0 0 4px var(--toolbar-hover, #eff6ff);
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
  color: var(--color-text, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #666);
  flex-shrink: 0;
}

.entry-preview {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background, #f9fafb);
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: anywhere;
}

.timeline-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary, #666);
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

.btn-close { display: inline-flex; align-items: center; justify-content: center; }
.btn-close:hover { background: var(--toolbar-hover, #f0f0f0); }
.timeline-entry:focus-visible, .history-timeline button:focus-visible {
  outline: 2px solid var(--toolbar-accent, #1d4ed8); outline-offset: -2px;
}
@media (max-height: 480px) {
  .timeline-progress-container { display: none; }
}
</style>
