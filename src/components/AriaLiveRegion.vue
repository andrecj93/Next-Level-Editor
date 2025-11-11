<template>
  <div class="aria-live-regions">
    <!-- Polite announcements (non-urgent) -->
    <div
      id="aria-live-polite"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ politeAnnouncements }}
    </div>

    <!-- Assertive announcements (urgent) -->
    <div
      id="aria-live-assertive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
    >
      {{ assertiveAnnouncements }}
    </div>

    <!-- Status region (for non-disruptive updates) -->
    <div
      id="aria-live-status"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      class="sr-only"
    >
      {{ statusAnnouncements }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAccessibility } from "../composables/useAccessibility";

const { getAnnouncements } = useAccessibility();

const politeAnnouncements = computed(() => getAnnouncements("polite"));
const assertiveAnnouncements = computed(() => getAnnouncements("assertive"));
const statusAnnouncements = computed(() => getAnnouncements("off"));
</script>

<style scoped>
/**
 * Screen reader only content
 * Keeps content accessible to screen readers while hiding it visually
 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/**
 * Container is positioned off-screen
 */
.aria-live-regions {
  position: fixed;
  top: -10000px;
  left: -10000px;
  pointer-events: none;
}
</style>
