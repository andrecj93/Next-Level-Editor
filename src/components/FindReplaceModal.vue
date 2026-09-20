<!-- eslint-disable vue/html-self-closing -->
<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay nle-chrome"
        :class="theme"
        @click="handleOverlayClick"
      >
        <div
          ref="modalContent"
          class="modal-content find-replace-modal"
          role="dialog"
          aria-labelledby="find-replace-modal-title"
          aria-modal="true"
          @click.stop
        >
          <div class="modal-header">
            <h3 id="find-replace-modal-title">Find & Replace</h3>
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
                :aria-describedby="searchInfoId"
                @keydown.enter="handleSearchEnter"
              />
              <div :id="searchInfoId" class="search-info" role="status" aria-live="polite" aria-atomic="true">
                <span v-if="matches > 0"
                  >{{ currentMatch }} of {{ matches }}</span
                >
                <span v-else-if="findText && matches === 0" class="no-matches"
                  >No matches</span
                >
                <span v-else>Enter a word or phrase to search your document.</span>
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
                :disabled="!findText || matches === 0"
                @click="findPrevious"
              >
                ← Previous
              </button>
              <button
                class="btn btn-secondary"
                :disabled="!findText || matches === 0"
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
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useModalDialog } from "../composables/useModalDialog";
import { countMatchesInHtml } from "../composables/useFindReplace";
import { useStableId } from "../utils/useStableId";

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
  (
    e: "find",
    data: {
      findText: string;
      direction: "next" | "previous";
      options: { caseSensitive: boolean; wholeWord: boolean };
    }
  ): void;
}

const props = withDefaults(defineProps<Props>(), {
  theme: "theme-light",
});
const emit = defineEmits<Emits>();
const searchInfoId = `${useStableId()}-search-info`;

const findInput = ref<HTMLInputElement | null>(null);
const modalContent = ref<HTMLElement | null>(null);
const findText = ref("");
const replaceText = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const matches = ref(0);
const currentMatch = ref(0);
// True until the first Next/Previous of a fresh query, so the first Next lands
// on match 1 (and the first Previous on the last match) — matching the editor's
// find navigation instead of skipping ahead to match 2.
let firstNav = true;

const close = () => {
  emit("close");
};

const handleOverlayClick = () => {
  close();
};

const findOptions = () => ({
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
});

const handleSearchEnter = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (matches.value === 0) return;
  if (event.shiftKey) findPrevious();
  else findNext();
};

const findNext = () => {
  if (!findText.value) return;
  emit("find", {
    findText: findText.value,
    direction: "next",
    options: findOptions(),
  });
  if (matches.value > 0) {
    currentMatch.value = firstNav ? 1 : (currentMatch.value % matches.value) + 1;
    firstNav = false;
  }
};

const findPrevious = () => {
  if (!findText.value) return;
  emit("find", {
    findText: findText.value,
    direction: "previous",
    options: findOptions(),
  });
  if (matches.value > 0) {
    currentMatch.value = firstNav
      ? matches.value
      : ((currentMatch.value - 2 + matches.value) % matches.value) + 1;
    firstNav = false;
  }
};

const replaceOne = () => {
  if (!findText.value || matches.value === 0) return;
  const ordinal = Math.max(1, currentMatch.value);
  emit("replace", {
    findText: findText.value,
    replaceText: replaceText.value,
    options: {
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
    },
  });
  // The replaced match is gone: one fewer total, and the editor's highlight
  // moves to the FOLLOWING occurrence, which now occupies the SAME ordinal
  // (wrapping to 1 when the last match was replaced). The old code advanced
  // via findNext() against the stale total, showing e.g. "3 of 5" when only
  // 4 matches remained.
  const remaining = matches.value - 1;
  matches.value = remaining;
  currentMatch.value = remaining === 0 ? 0 : ordinal <= remaining ? ordinal : 1;
  firstNav = false;
  if (remaining > 0) {
    emit("find", {
      findText: findText.value,
      direction: "next",
      options: findOptions(),
    });
  }
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
  // Every occurrence was just replaced. Recounting here would read the STALE
  // `content` prop (the replaced document hasn't round-tripped through
  // v-model yet) and re-show the old total; show 0 now and let the content
  // watcher recount authoritatively when the new document arrives.
  matches.value = 0;
  currentMatch.value = 0;
  firstNav = true;
};

const updateMatches = (opts: { preservePosition?: boolean } = {}) => {
  const previousOrdinal = currentMatch.value;
  if (!opts.preservePosition) {
    // A fresh query — the next Next/Previous starts navigation from match 1/N.
    firstNav = true;
  }
  if (!findText.value || !props.content) {
    matches.value = 0;
    currentMatch.value = 0;
    return;
  }

  // Count with the SAME engine the editor's Find/Replace uses (cross-node
  // text map, Unicode whole-word, skipped pills) — a private per-text-node
  // counter here used to report "No matches" for boundary-spanning terms and
  // disabled the Replace buttons. #r15-7
  const count = countMatchesInHtml(props.content, findText.value, {
    caseSensitive: caseSensitive.value,
    wholeWord: wholeWord.value,
  });
  matches.value = count;
  if (opts.preservePosition) {
    // The DOCUMENT changed (typing, a replace round-tripping through
    // v-model) — keep the user's place, clamped into the new total,
    // instead of yanking navigation back to match 1.
    currentMatch.value =
      count === 0 ? 0 : Math.min(Math.max(previousOrdinal, 1), count);
  } else {
    // Show "1 of N" up front; firstNav keeps the first Next on match 1
    // rather than jumping to 2.
    currentMatch.value = count > 0 ? 1 : 0;
  }
};

// Document changes (typing, replace round-trips) recount but PRESERVE the
// user's place; only query/option changes reset navigation to match 1.
watch(
  () => props.content,
  () => updateMatches({ preservePosition: true })
);

watch([findText, caseSensitive, wholeWord], () => {
  updateMatches();
});

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.show,
  container: modalContent,
  onClose: close,
  initialFocus: () => findInput.value,
});

// Handle Ctrl+F while the dialog is open: refocus and select the search box.
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f" && props.show) {
    e.preventDefault();
    findInput.value?.focus();
    findInput.value?.select();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown);
});

// (The previous version returned a cleanup function from onMounted, which
// Vue ignores — the listener leaked across unmounts. Both lines fixed this
// independently; Escape/focus-trap live in the shared useModalDialog.)
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
});
</script>

<style scoped>
.find-replace-modal {
  /* Cap the floor to the viewport (overlay has 20px padding per side) so the
     dialog stays fully reachable on narrow/mobile screens. */
  min-width: min(500px, calc(100vw - 40px));
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
  z-index: 10050; /* above floating panels/FABs (9998-9999) */
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
  min-height: 18px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.no-matches {
  /* The old bright red was ~3.76:1 on the light surface — below the 4.5:1 AA
     minimum for this 12px text. #b91c1c clears it comfortably. */
  color: var(--color-error-strong, #b91c1c);
}

:global(.theme-dark) .no-matches {
  /* Dark surface (#1e293b) needs a lighter red to clear 4.5:1. */
  color: #f87171;
}

.options-group {
  display: flex;
  flex-wrap: wrap;
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
  /* Let the button groups stack instead of forcing the dialog wider than
     narrow/mobile viewports (the buttons are white-space: nowrap). */
  flex-wrap: wrap;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  gap: 12px;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
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
