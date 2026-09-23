<!-- eslint-disable vue/max-attributes-per-line -->
<template>
  <div
    v-if="isOpen"
    :id="listboxId"
    ref="dropdownRef"
    class="autocomplete-dropdown"
    :style="dropdownStyle"
    role="listbox"
    :aria-label="t(ariaLabel)"
  >
    <!-- aria-activedescendant deliberately NOT here: it belongs on the
         FOCUSED element (the host's editing surface / input), pointing INTO
         this listbox — on the popup itself it is inert. The host binds it
         via the exposed listboxId/activeOptionId. #R23-53 -->
    <div
      v-for="(suggestion, index) in suggestions"
      :id="optionId(index)"
      :key="`${suggestion.type}-${index}`"
      class="suggestion-item"
      :class="{ selected: index === selectedIndex }"
      role="option"
      :aria-selected="index === selectedIndex"
      @click="selectSuggestion(index)"
      @mouseenter="selectedIndex = index"
    >
      <span class="suggestion-value">{{ suggestion.value }}</span>
      <span class="suggestion-label">{{ t(suggestion.label) }}</span>
      <span class="suggestion-type">{{
        t(getSuggestionTypeLabel(suggestion.type))
      }}</span>
    </div>

    <div v-if="showHelpText" class="dropdown-footer">
      <span class="help-text">
        <kbd>↑</kbd><kbd>↓</kbd> {{ t("Navigate •") }} <kbd>{{ shortcut('Enter') }}</kbd> {{ t("Select •") }}
        <kbd>{{ shortcut('Esc') }}</kbd> {{ t("Close") }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, shortcut } = useEditorLocale();
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import type { AutocompleteType } from "../composables/useSmartAutocomplete";
import { smoothScrollIntoView } from "../utils/scroll";
import { nextInstanceToken } from "../utils/instanceToken";

/**
 * Autocomplete suggestion
 */
interface Suggestion {
  label: string;
  value: string;
  type: AutocompleteType;
}

/**
 * Props
 */
interface Props {
  visible: boolean;
  suggestions: Suggestion[];
  cursorPosition?: { x: number; y: number };
  ariaLabel?: string;
  showHelpText?: boolean;
}

/**
 * Emits
 */
interface Emits {
  (e: "select", suggestion: Suggestion): void;
  (e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
  cursorPosition: () => ({ x: 0, y: 0 }),
  ariaLabel: "Autocomplete suggestions",
  showHelpText: true,
});

const emit = defineEmits<Emits>();

// State
const dropdownRef = ref<HTMLElement | null>(null);
const selectedIndex = ref(0);

/**
 * Whether the dropdown is ACTUALLY on screen — the single source of truth for
 * the `v-if` and for the document-level key handler. They used to disagree:
 * the handler checked `visible` alone, so a consumer that flips `visible` on
 * while its suggestions are still loading had Enter/Tab/Escape/arrows
 * preventDefault-ed document-wide with nothing rendered. #R22-DROP-3
 */
const isOpen = computed(() => props.visible && props.suggestions.length > 0);

// Instance-unique ids (global `autocomplete-option-N` collided across
// instances) + the bindings a HOST needs to make its focused element a
// proper combobox over this listbox. #R23-53
const listboxId = nextInstanceToken("nle-ac");
const optionId = (index: number): string => `${listboxId}-opt-${index}`;
const activeOptionId = computed(() =>
  isOpen.value ? optionId(selectedIndex.value) : undefined
);

defineExpose({ listboxId, activeOptionId });

// Dropdown positioning
const dropdownStyle = computed(() => {
  if (!props.cursorPosition) return {};

  return {
    top: `${props.cursorPosition.y + 20}px`,
    left: `${props.cursorPosition.x}px`,
  };
});

/**
 * Get human-readable type label
 */
const getSuggestionTypeLabel = (type: AutocompleteType): string => {
  const labels: Record<AutocompleteType, string> = {
    url: "URL",
    email: "Email",
    markdown: "Markdown",
    smartQuote: "Smart Quote",
    emoji: "Emoji",
    smartPunctuation: "Punctuation",
  };
  return labels[type] || type;
};

/**
 * Select suggestion by index
 */
const selectSuggestion = (index: number) => {
  if (index >= 0 && index < props.suggestions.length) {
    emit("select", props.suggestions[index]);
    emit("close");
  }
};

/**
 * Handle keyboard navigation
 */
const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedIndex.value =
        (selectedIndex.value + 1) % props.suggestions.length;
      scrollToSelected();
      break;

    case "ArrowUp":
      e.preventDefault();
      selectedIndex.value =
        selectedIndex.value === 0
          ? props.suggestions.length - 1
          : selectedIndex.value - 1;
      scrollToSelected();
      break;

    case "Enter":
    case "Tab":
      e.preventDefault();
      selectSuggestion(selectedIndex.value);
      break;

    case "Escape":
      e.preventDefault();
      emit("close");
      break;
  }
};

/**
 * Scroll selected item into view
 */
const scrollToSelected = () => {
  nextTick(() => {
    if (!dropdownRef.value) return;

    const selectedElement = dropdownRef.value.querySelector(
      ".suggestion-item.selected"
    );
    if (selectedElement) {
      smoothScrollIntoView(selectedElement as HTMLElement, {
        block: "nearest",
        behavior: "smooth",
      });
    }
  });
};

/**
 * Handle clicks outside dropdown
 */
const handleClickOutside = (e: MouseEvent) => {
  if (!props.visible) return;
  if (!dropdownRef.value) return;

  if (!dropdownRef.value.contains(e.target as Node)) {
    emit("close");
  }
};

// Watch for visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selectedIndex.value = 0;
      nextTick(() => {
        dropdownRef.value?.focus();
      });
    }
  }
);

// Watch for suggestions changes
watch(
  () => props.suggestions,
  () => {
    selectedIndex.value = 0;
  }
);

// Lifecycle
onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
.autocomplete-dropdown {
  position: fixed;
  background: white;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 400px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 9999;
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 1px solid var(--border-color-light, #f0f0f0);
}

.suggestion-item:last-of-type {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: var(--hover-bg, #f5f7fa);
}

.suggestion-item.selected {
  background: var(--selected-bg, #e3f2fd);
  border-left: 3px solid var(--primary-color, #4a90e2);
}

.suggestion-value {
  font-size: 20px;
  min-width: 32px;
  text-align: center;
}

.suggestion-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #000);
}

.suggestion-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #666);
  background: var(--tag-bg, #f0f0f0);
  padding: 3px 8px;
  border-radius: 12px;
}

.dropdown-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  background: var(--footer-bg, #f8f9fa);
  position: sticky;
  bottom: 0;
}

.help-text {
  font-size: 12px;
  color: var(--text-secondary, #666);
  display: flex;
  align-items: center;
  gap: 6px;
}

.help-text kbd {
  padding: 2px 6px;
  background: white;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Dark mode — keyed to the editor's own theme class (.theme-dark on the
   .next-level-editor root), not the OS prefers-color-scheme setting. */
.theme-dark .autocomplete-dropdown {
  background: #1e1e1e;
  border-color: #3a3a3a;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.theme-dark .suggestion-item {
  border-color: #2a2a2a;
}

.theme-dark .suggestion-item:hover,
.theme-dark .suggestion-item.selected {
  background: #2a2a2a;
}

.theme-dark .suggestion-item.selected {
  background: #1a3a52;
  border-left-color: #60a5fa;
}

.theme-dark .suggestion-label {
  color: #e0e0e0;
}

.theme-dark .suggestion-type {
  color: #999;
  background: #2a2a2a;
}

.theme-dark .dropdown-footer {
  background: #252525;
  border-color: #3a3a3a;
}

.theme-dark .help-text {
  color: #999;
}

.theme-dark .help-text kbd {
  background: #1e1e1e;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

/* Scrollbar styling */
.autocomplete-dropdown::-webkit-scrollbar {
  width: 6px;
}

.autocomplete-dropdown::-webkit-scrollbar-track {
  background: var(--scrollbar-track, #f0f0f0);
}

.autocomplete-dropdown::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #c0c0c0);
  border-radius: 3px;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, #a0a0a0);
}

/* High contrast mode */
@media (prefers-contrast: more) {
  .autocomplete-dropdown {
    border: 2px solid;
  }

  .suggestion-item.selected {
    outline: 2px solid;
    outline-offset: -2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .autocomplete-dropdown {
    animation: none;
  }

  .suggestion-item {
    transition: none;
  }
}
</style>
