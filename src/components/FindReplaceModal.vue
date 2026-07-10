<!-- eslint-disable vue/html-self-closing -->
<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay"
        :class="theme"
        @click="handleOverlayClick"
      >
        <div class="modal-content find-replace-modal" @click.stop>
          <div class="modal-header">
            <h3>Find & Replace</h3>
            <button class="close-btn" aria-label="Close modal" @click="close">
              ✕
            </button>
          </div>

          <div class="modal-body">
            <div class="input-group">
              <label for="find-input">Find</label>
              <input
                id="find-input"
                ref="findInput"
                v-model="findText"
                type="text"
                class="text-input"
                placeholder="Search text..."
                @keydown.enter="findNext"
                @keydown.esc="close"
              />
              <div class="search-info">
                <span v-if="matches > 0"
                  >{{ currentMatch }} of {{ matches }}</span
                >
                <span v-else-if="findText && matches === 0" class="no-matches"
                  >No matches</span
                >
              </div>
            </div>

            <div class="input-group">
              <label for="replace-input">Replace with</label>
              <input
                id="replace-input"
                v-model="replaceText"
                type="text"
                class="text-input"
                placeholder="Replacement text..."
                @keydown.enter="replaceOne"
                @keydown.esc="close"
              />
            </div>

            <div class="options-group">
              <label class="checkbox-label">
                <input v-model="caseSensitive" type="checkbox" />
                <span>Case sensitive</span>
              </label>

              <label class="checkbox-label">
                <input v-model="wholeWord" type="checkbox" />
                <span>Whole word</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <div class="btn-group">
              <button
                class="btn btn-secondary"
                :disabled="!findText"
                @click="findPrevious"
              >
                ← Previous
              </button>
              <button
                class="btn btn-secondary"
                :disabled="!findText"
                @click="findNext"
              >
                Next →
              </button>
            </div>
            <div class="btn-group">
              <button
                class="btn btn-secondary"
                :disabled="!findText || matches === 0"
                @click="replaceOne"
              >
                Replace
              </button>
              <button
                class="btn btn-primary"
                :disabled="!findText || matches === 0"
                @click="replaceAll"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";

interface Props {
  show: boolean;
  content: string;
  theme?: string;
}

interface ReplaceData {
  findText: string;
  replaceText: string;
  options: { caseSensitive: boolean; wholeWord: boolean };
}

interface Emits {
  (e: "close"): void;
  (e: "replace", data: ReplaceData): void;
  (e: "replace-all", data: ReplaceData): void;
  (e: "find", data: { findText: string; direction: "next" | "previous" }): void;
}

const props = withDefaults(defineProps<Props>(), {
  theme: "theme-light",
});
const emit = defineEmits<Emits>();

const findInput = ref<HTMLInputElement | null>(null);
const findText = ref("");
const replaceText = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const matches = ref(0);
const currentMatch = ref(0);

const close = () => {
  emit("close");
};

const handleOverlayClick = () => {
  close();
};

const findNext = () => {
  if (!findText.value) return;
  emit("find", { findText: findText.value, direction: "next" });
};

const findPrevious = () => {
  if (!findText.value) return;
  emit("find", { findText: findText.value, direction: "previous" });
};

const replaceOne = () => {
  if (!findText.value || matches.value === 0) return;
  emit("replace", {
    findText: findText.value,
    replaceText: replaceText.value,
    options: {
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
    },
  });
  // After replacing, move to next match
  findNext();
};

const replaceAll = () => {
  if (!findText.value || matches.value === 0) return;
  // A single replace-all pass handles every occurrence. (The previous code
  // looped `matches` times over an already-global replace, which corrupted
  // text whenever the replacement contained the search term and fired N
  // redundant DOM rewrites / snapshots.)
  emit("replace-all", {
    findText: findText.value,
    replaceText: replaceText.value,
    options: {
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
    },
  });
  updateMatches();
};

const updateMatches = () => {
  if (!findText.value || !props.content) {
    matches.value = 0;
    currentMatch.value = 0;
    return;
  }

  let flags = "g";
  if (!caseSensitive.value) flags += "i";

  let pattern = findText.value.replace(
    /[.*+?^${}()|[\]\\]/g,
    String.raw`\$&`
  );
  if (wholeWord.value) {
    pattern = `\\b${pattern}\\b`;
  }

  try {
    const regex = new RegExp(pattern, flags);
    const temp = document.createElement("div");
    temp.innerHTML = props.content;
    const text = temp.textContent || "";
    const allMatches = text.match(regex);
    matches.value = allMatches ? allMatches.length : 0;
    currentMatch.value = matches.value > 0 ? 1 : 0;
  } catch (e) {
    // Invalid regex pattern - reset match counts
    console.warn("Invalid search pattern:", e);
    matches.value = 0;
    currentMatch.value = 0;
  }
};

watch([findText, caseSensitive, wholeWord, () => props.content], () => {
  updateMatches();
});

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      nextTick(() => {
        findInput.value?.focus();
      });
    }
  }
);

// Handle Ctrl+F shortcut globally. Declared at setup scope so onUnmounted can
// remove it — a cleanup function returned from onMounted is ignored by Vue, so
// the listener previously leaked one handler per unmount.
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f" && props.show) {
    e.preventDefault();
    findInput.value?.focus();
    findInput.value?.select();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.find-replace-modal {
  min-width: 500px;
  max-width: 600px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay-backdrop);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast, 150ms) ease;
}

.close-btn:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 20px;
  position: relative;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-info {
  position: absolute;
  right: 12px;
  top: 38px;
  font-size: 12px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.no-matches {
  color: #ef4444;
}

.options-group {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--color-text);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  gap: 12px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 150ms) ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
