<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click="close"
  >
    <div
      ref="modalContent"
      class="modal-content"
      role="dialog"
      aria-labelledby="link-modal-title"
      aria-modal="true"
      @click.stop
    >
      <div class="modal-header">
        <h3 id="link-modal-title">Insert link</h3>
        <button
          class="close-button"
          aria-label="Close"
          @click="close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="input-group">
          <label for="link-url">URL</label>
          <input
            id="link-url"
            ref="urlInput"
            v-model="url"
            type="url"
            placeholder="https://example.com"
            @keyup.enter="submit"
          >
        </div>

        <div class="input-group">
          <label for="link-text">Text to display <span class="optional">(optional)</span></label>
          <input
            id="link-text"
            v-model="text"
            type="text"
            placeholder="Shown when no text is selected"
            @keyup.enter="submit"
          >
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="cancel-button"
          @click="close"
        >
          Cancel
        </button>
        <button
          class="insert-button"
          :disabled="!isValid"
          @click="submit"
        >
          Insert link
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useModalDialog } from "../composables/useModalDialog";

const props = defineProps<{ isOpen: boolean }>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "insert", url: string, text: string): void;
}>();

const url = ref("");
const text = ref("");
const urlInput = ref<HTMLInputElement | null>(null);
const modalContent = ref<HTMLElement | null>(null);

const isValid = computed(() => url.value.trim().length > 0);

const submit = () => {
  const raw = url.value.trim();
  if (!raw) return;
  // Be forgiving: prepend https:// when a bare domain is entered.
  const normalized = /^(https?:|mailto:|tel:|\/|#)/i.test(raw)
    ? raw
    : `https://${raw}`;
  emit("insert", normalized, text.value.trim());
  // Self-close after a successful insert, like the other insert modals.
  close();
};

const reset = () => {
  url.value = "";
  text.value = "";
};

const close = () => {
  emit("close");
  reset();
};

// Escape-to-close, Tab trap, initial focus, and focus restore
// (WAI-ARIA dialog pattern) — shared with every other modal.
useModalDialog({
  isOpen: () => props.isOpen,
  container: modalContent,
  onClose: close,
  initialFocus: () => urlInput.value,
});

// Start from a clean form each time the dialog opens.
watch(
  () => props.isOpen,
  (open) => {
    if (open) reset();
  }
);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10050; /* above floating panels/FABs (9998-9999) */
  animation: link-modal-fade 0.18s ease-out;
}

.modal-content {
  background: var(--color-surface, var(--editor-bg, #fff));
  color: var(--color-text, #1f2937);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 14px;
  width: 90%;
  max-width: 460px;
  box-shadow: 0 24px 60px -20px rgba(15, 23, 42, 0.4),
    0 4px 12px rgba(15, 23, 42, 0.12);
  animation: link-modal-rise 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.close-button:hover {
  background: var(--color-surface-overlay, #f3f4f6);
  color: var(--color-text, #111827);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #374151);
}

.input-group .optional {
  font-weight: 400;
  color: var(--color-text-secondary, #9ca3af);
}

.input-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface-raised, #fff);
  color: var(--color-text, #111827);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-group input::placeholder {
  color: var(--color-text-secondary, #9ca3af);
}

.input-group input:focus {
  outline: none;
  border-color: var(--toolbar-accent, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.cancel-button,
.insert-button {
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
}

.cancel-button {
  background: transparent;
  color: var(--color-text, #374151);
  border: 1px solid var(--color-border, #d1d5db);
}

.cancel-button:hover {
  background: var(--color-surface-overlay, #f3f4f6);
}

.insert-button {
  background: var(--toolbar-accent, #3b82f6);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.insert-button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.insert-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes link-modal-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes link-modal-rise {
  from {
    transform: translateY(10px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .modal-content {
    animation: none;
  }
}
</style>
