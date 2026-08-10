<template>
  <transition name="nle-confirm-fade">
    <div
      v-if="isOpen"
      class="nle-confirm-overlay"
      @click.self="emit('cancel')"
    >
      <div
        ref="dialogRef"
        class="nle-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <h3 :id="titleId" class="nle-confirm-title">{{ title }}</h3>
        <p :id="messageId" class="nle-confirm-message">{{ message }}</p>
        <div class="nle-confirm-actions">
          <button
            ref="cancelButtonRef"
            type="button"
            class="nle-confirm-cancel"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="nle-confirm-accept"
            :class="{ 'is-danger': danger }"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useModalDialog } from "../composables/useModalDialog";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  danger: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const uid = Math.random().toString(36).slice(2, 8);
const titleId = `nle-confirm-title-${uid}`;
const messageId = `nle-confirm-message-${uid}`;

const dialogRef = ref<HTMLElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);

// Shared WAI-ARIA dialog contract: Escape cancels, Tab is trapped, focus moves
// in on open and restores on close. Initial focus lands on Cancel — the safe
// default for a destructive question.
useModalDialog({
  isOpen: () => props.isOpen,
  container: dialogRef,
  onClose: () => emit("cancel"),
  initialFocus: () => cancelButtonRef.value,
});
</script>

<style scoped>
.nle-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Modal band: above floating panels (10000) and FABs (9998). */
  z-index: 10050;
  padding: 20px;
}

.nle-confirm-dialog {
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 420px;
  padding: 20px;
}

.nle-confirm-title {
  margin: 0 0 8px;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--content-color, #1f2937);
}

.nle-confirm-message {
  margin: 0 0 20px;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--toolbar-text, #6b7280);
}

.nle-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.nle-confirm-actions button {
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.nle-confirm-cancel {
  background: transparent;
  border: 1px solid var(--editor-border, #d8dde6);
  color: var(--content-color, #1f2937);
}

.nle-confirm-cancel:hover {
  background: var(--toolbar-hover, rgba(59, 130, 246, 0.08));
}

.nle-confirm-accept {
  background: var(--toolbar-accent, #3b82f6);
  border: 1px solid transparent;
  color: var(--toolbar-accent-contrast, #ffffff);
}

.nle-confirm-accept:hover {
  filter: brightness(0.92);
}

.nle-confirm-accept.is-danger {
  background: var(--color-error, #dc2626);
  color: #ffffff;
}

.nle-confirm-fade-enter-active,
.nle-confirm-fade-leave-active {
  transition: opacity 0.15s ease;
}

.nle-confirm-fade-enter-from,
.nle-confirm-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nle-confirm-fade-enter-active,
  .nle-confirm-fade-leave-active {
    transition: none;
  }
}
</style>
