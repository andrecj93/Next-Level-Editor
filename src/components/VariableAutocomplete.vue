<template>
  <div
    v-if="isOpen && filteredVariables.length > 0"
    class="variable-autocomplete"
    :style="positionStyle"
    @mousedown.prevent
  >
    <div class="variable-autocomplete-header">
      <span class="variable-autocomplete-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            :d="BRACES_ICON_PATH"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span>Variables</span>
    </div>

    <div class="variable-autocomplete-list">
      <div
        v-for="(variable, index) in filteredVariables"
        :key="variable.id"
        class="variable-autocomplete-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @mouseenter="selectedIndex = index"
        @click="selectVariable(variable)"
      >
        <div class="variable-autocomplete-item-main">
          <span class="variable-autocomplete-item-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                :d="getCategoryIconPath(variable.category)"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="variable-autocomplete-item-content">
            <div class="variable-autocomplete-item-name">
              {{ variable.name }}
            </div>
            <div class="variable-autocomplete-item-label">
              {{ variable.label }}
            </div>
          </div>
        </div>
        <div
          v-if="variable.description"
          class="variable-autocomplete-item-description"
        >
          {{ variable.description }}
        </div>
      </div>
    </div>

    <div class="variable-autocomplete-footer">
      <span class="variable-autocomplete-hint">
        <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Insert <kbd>Esc</kbd> Close
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { Variable, VariableCategory } from "../composables/useVariables";

// Stroke icon paths (24px viewBox), matching the editor's icon language —
// no emoji in the chrome. Keyed by category id with a tag-shaped fallback.
const BRACES_ICON_PATH =
  "M9 4C7.5 4 7 5 7 6.5V9c0 1.5-1 2.3-2.2 2.6v.8C6 12.7 7 13.5 7 15v2.5C7 19 7.5 20 9 20M15 4c1.5 0 2 1 2 2.5V9c0 1.5 1 2.3 2.2 2.6v.8C18 12.7 17 13.5 17 15v2.5c0 1.5-.5 2.5-2 2.5";
const CATEGORY_ICON_PATHS: Record<string, string> = {
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  date: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  document:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6",
  company:
    "M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M9.5 7h1M13.5 7h1M9.5 11h1M13.5 11h1M9.5 15h1M13.5 15h1",
};
const DEFAULT_ICON_PATH =
  "M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42L12 2zM7 7h.01";

interface Props {
  variables: Variable[];
  categories: VariableCategory[];
  query: string;
  isOpen: boolean;
  position: { top: number; left: number };
}

interface Emits {
  (e: "select", variable: Variable): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedIndex = ref(0);

// Filter variables based on query
const filteredVariables = computed(() => {
  if (!props.query) return props.variables.slice(0, 10);

  const lowerQuery = props.query.toLowerCase();
  return props.variables
    .filter(
      (v) =>
        v.name.toLowerCase().includes(lowerQuery) ||
        v.label.toLowerCase().includes(lowerQuery) ||
        v.description?.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10);
});

// Position style
const positionStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
}));

// Get category icon path (stroke SVG, keyed by category id)
const getCategoryIconPath = (categoryId?: string): string => {
  return (categoryId && CATEGORY_ICON_PATHS[categoryId]) || DEFAULT_ICON_PATH;
};

// Select variable
const selectVariable = (variable: Variable) => {
  emit("select", variable);
};

/**
 * Keyboard navigation. Returns true when the event was consumed so the host
 * editor can give the open dropdown priority over its own keydown handling
 * (Enter would otherwise insert a paragraph before this component ever saw
 * the key). Exposed via defineExpose for that carve-out.
 */
const handleEditorKeydown = (e: KeyboardEvent): boolean => {
  if (!props.isOpen || filteredVariables.value.length === 0) return false;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        filteredVariables.value.length - 1
      );
      return true;
    case "ArrowUp":
      e.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      return true;
    case "Enter":
    case "Tab":
      e.preventDefault();
      if (filteredVariables.value[selectedIndex.value]) {
        selectVariable(filteredVariables.value[selectedIndex.value]);
      }
      return true;
    case "Escape":
      e.preventDefault();
      emit("close");
      return true;
  }
  return false;
};

// Document-level fallback (e.g. hosts that don't wire the editor carve-out).
// Skips events the editor-level call already consumed (they arrive here with
// defaultPrevented set) so keys are never handled twice.
const handleDocumentKeydown = (e: KeyboardEvent) => {
  if (e.defaultPrevented) return;
  handleEditorKeydown(e);
};

// Reset selected index when query changes
watch(
  () => props.query,
  () => {
    selectedIndex.value = 0;
  }
);

// Reset selected index when variables change
watch(filteredVariables, () => {
  if (selectedIndex.value >= filteredVariables.value.length) {
    selectedIndex.value = Math.max(0, filteredVariables.value.length - 1);
  }
});

onMounted(() => {
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleDocumentKeydown);
});

defineExpose({ handleEditorKeydown });
</script>

<style scoped>
.variable-autocomplete {
  position: fixed;
  z-index: 10000;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 450px;
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
}

.variable-autocomplete-header {
  padding: 10px 12px;
  background: var(--editor-toolbar-bg, #f8f9fa);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.variable-autocomplete-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color, #007bff);
}

.variable-autocomplete-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.variable-autocomplete-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.variable-autocomplete-item:hover,
.variable-autocomplete-item.is-selected {
  background: var(--hover-bg, #f0f0f0);
}

.variable-autocomplete-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.variable-autocomplete-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #666);
  flex-shrink: 0;
}

.variable-autocomplete-item-content {
  flex: 1;
  min-width: 0;
}

.variable-autocomplete-item-name {
  font-size: 13px;
  font-family: "Courier New", monospace;
  font-weight: 600;
  color: var(--primary-color, #007bff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variable-autocomplete-item-label {
  font-size: 12px;
  color: var(--text-muted, #666);
  margin-top: 2px;
}

.variable-autocomplete-item-description {
  font-size: 11px;
  color: var(--text-muted, #888);
  margin-top: 4px;
  margin-left: 26px; /* icon (16px) + gap (10px) */
  line-height: 1.4;
}

.variable-autocomplete-footer {
  padding: 8px 12px;
  background: var(--editor-toolbar-bg, #f8f9fa);
  border-top: 1px solid var(--border-color, #e0e0e0);
  font-size: 11px;
  color: var(--text-muted, #666);
}

.variable-autocomplete-hint {
  display: flex;
  align-items: center;
  gap: 12px;
}

.variable-autocomplete-hint kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 3px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

/* Scrollbar styling */
.variable-autocomplete-list::-webkit-scrollbar {
  width: 8px;
}

.variable-autocomplete-list::-webkit-scrollbar-track {
  background: transparent;
}

.variable-autocomplete-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #ccc);
  border-radius: 4px;
}

.variable-autocomplete-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, #aaa);
}
</style>
