<template>
  <Teleport to="body">
    <section
      v-if="hasToasts"
      :class="['toast-container', `toast-container--${position}`]"
      aria-label="Notifications"
      aria-live="polite"
    >
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
          @mouseenter="handleMouseEnter(toast.id)"
          @mouseleave="handleMouseLeave(toast.id)"
        >
          <!-- Icon -->
          <div v-if="toast.icon" class="toast__icon" aria-hidden="true">
            {{ toast.icon }}
          </div>

          <!-- Message -->
          <div class="toast__content">
            <p class="toast__message">
              {{ toast.message }}
            </p>
          </div>

          <!-- Action Button -->
          <button
            v-if="toast.action"
            type="button"
            class="toast__action"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>

          <!-- Dismiss Button -->
          <button
            v-if="toast.dismissible"
            type="button"
            class="toast__close"
            :aria-label="`Dismiss ${toast.type} notification`"
            @click="handleDismiss(toast.id)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <!-- Progress Bar -->
          <progress
            v-if="toast.duration > 0 && !toast.paused"
            class="toast__progress"
            :value="100 - toast.progress"
            max="100"
            :aria-label="`${Math.round(toast.progress)}% elapsed`"
          >
            {{ Math.round(100 - toast.progress) }}%
          </progress>
        </div>
      </TransitionGroup>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastNotification } from "../composables/useToastNotification";
import type { Toast } from "../composables/useToastNotification";

const { toasts, position, hasToasts, removeToast, pauseToast, resumeToast } =
  useToastNotification();

/**
 * Handle mouse enter to pause auto-dismiss
 */
const handleMouseEnter = (id: string) => {
  pauseToast(id);
};

/**
 * Handle mouse leave to resume auto-dismiss
 */
const handleMouseLeave = (id: string) => {
  resumeToast(id);
};

/**
 * Handle dismiss button click
 */
const handleDismiss = (id: string) => {
  removeToast(id);
};

/**
 * Handle action button click
 */
const handleAction = (toast: Toast) => {
  if (toast.action) {
    toast.action.onClick();
    // Optionally remove toast after action
    // removeToast(toast.id);
  }
};
</script>

<style scoped>
/* ==========================================
   TOAST CONTAINER
   ========================================== */
.toast-container {
  position: fixed;
  z-index: var(--z-index-notification);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--toast-offset);
  pointer-events: none;
  max-width: 100vw;
}

/* Position Variants */
.toast-container--top-left {
  top: 0;
  left: 0;
}

.toast-container--top-center {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.toast-container--top-right {
  top: 0;
  right: 0;
}

.toast-container--bottom-left {
  bottom: 0;
  left: 0;
}

.toast-container--bottom-center {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.toast-container--bottom-right {
  bottom: 0;
  right: 0;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ==========================================
   TOAST ITEM
   ========================================== */
.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 300px;
  max-width: var(--toast-width);
  padding: var(--toast-padding);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--toast-border-radius);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  overflow: hidden;
  transition: var(--transition-base);
}

.toast:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

.toast:focus-within {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .toast {
    min-width: auto;
    max-width: calc(100vw - var(--space-8));
  }
}

/* ==========================================
   TOAST TYPE VARIANTS
   ========================================== */
.toast--success {
  border-left: 4px solid var(--color-success);
  background: var(--color-background);
}

.toast--error {
  border-left: 4px solid var(--color-error);
  background: var(--color-background);
}

.toast--warning {
  border-left: 4px solid var(--color-warning);
  background: var(--color-background);
}

.toast--info {
  border-left: 4px solid var(--color-info);
  background: var(--color-background);
}

/* ==========================================
   TOAST ELEMENTS
   ========================================== */
.toast__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: var(--font-lg);
  line-height: 1;
}

.toast--success .toast__icon {
  color: var(--color-success);
}

.toast--error .toast__icon {
  color: var(--color-error);
}

.toast--warning .toast__icon {
  color: var(--color-warning);
}

.toast--info .toast__icon {
  color: var(--color-info);
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__message {
  margin: 0;
  font-size: var(--font-sm);
  line-height: var(--leading-normal);
  color: var(--color-text);
  word-wrap: break-word;
}

.toast__action {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-colors);
}

.toast__action:hover {
  background: var(--color-primary);
  color: white;
}

.toast__action:focus {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 2px;
}

.toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: var(--transition-colors);
}

.toast__close:hover {
  color: var(--color-text);
  background: var(--color-gray-100);
}

.theme-dark .toast__close:hover {
  background: var(--color-gray-700);
}

.toast__close:focus {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 2px;
}

/* ==========================================
   PROGRESS BAR
   ========================================== */
.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: none;
  background: transparent;
}

/* Progress bar track */
.toast__progress::-webkit-progress-bar {
  background: rgba(0, 0, 0, 0.1);
}

.theme-dark .toast__progress::-webkit-progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.toast__progress::-moz-progress-bar {
  transition: width var(--duration-base) linear;
}

/* Progress bar value */
.toast--success .toast__progress::-webkit-progress-value {
  background: var(--color-success);
}

.toast--success .toast__progress::-moz-progress-bar {
  background: var(--color-success);
}

.toast--error .toast__progress::-webkit-progress-value {
  background: var(--color-error);
}

.toast--error .toast__progress::-moz-progress-bar {
  background: var(--color-error);
}

.toast--warning .toast__progress::-webkit-progress-value {
  background: var(--color-warning);
}

.toast--warning .toast__progress::-moz-progress-bar {
  background: var(--color-warning);
}

.toast--info .toast__progress::-webkit-progress-value {
  background: var(--color-info);
}

.toast--info .toast__progress::-moz-progress-bar {
  background: var(--color-info);
}

/* ==========================================
   ANIMATIONS
   ========================================== */

/* Enter/Leave from right (bottom-right, top-right) */
.toast-container--bottom-right .toast-enter-from,
.toast-container--top-right .toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-container--bottom-right .toast-leave-to,
.toast-container--top-right .toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Enter/Leave from left (bottom-left, top-left) */
.toast-container--bottom-left .toast-enter-from,
.toast-container--top-left .toast-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.toast-container--bottom-left .toast-leave-to,
.toast-container--top-left .toast-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

/* Enter/Leave from top (top-center) */
.toast-container--top-center .toast-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}

.toast-container--top-center .toast-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* Enter/Leave from bottom (bottom-center) */
.toast-container--bottom-center .toast-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.toast-container--bottom-center .toast-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* Active state */
.toast-enter-active {
  transition: all var(--duration-normal) var(--ease-smooth);
}

.toast-leave-active {
  transition: all var(--duration-fast) var(--ease-smooth);
}

/* Move transition for stacking */
.toast-move {
  transition: transform var(--duration-normal) var(--ease-smooth);
}

/* ==========================================
   REDUCED MOTION
   ========================================== */
@media (prefers-reduced-motion: reduce) {
  .toast,
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none !important;
  }

  .toast__progress-bar {
    transition: none !important;
  }

  .toast:hover {
    transform: none !important;
  }
}

/* ==========================================
   HIGH CONTRAST MODE
   ========================================== */
@media (prefers-contrast: high) {
  .toast {
    border-width: 2px;
  }

  .toast--success {
    border-left-width: 6px;
  }

  .toast--error {
    border-left-width: 6px;
  }

  .toast--warning {
    border-left-width: 6px;
  }

  .toast--info {
    border-left-width: 6px;
  }
}

/* ==========================================
   PRINT STYLES
   ========================================== */
@media print {
  .toast-container {
    display: none !important;
  }
}
</style>
