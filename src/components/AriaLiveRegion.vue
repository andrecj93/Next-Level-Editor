<template>
  <div
    v-if="isOwner"
    class="aria-live-regions"
  >
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useAccessibility } from "../composables/useAccessibility";
import { nextInstanceToken } from "../utils/instanceToken";
import { liveRegionOwner as regionOwner } from "../utils/liveRegionOwner";

/**
 * The announcement queue in useAccessibility is deliberately MODULE-scoped, so
 * an announce() from anywhere reaches the regions. Shared state wants a single
 * rendered consumer: when every editor rendered its own pair of regions, two
 * editors on a page showed the same text at the same moment and a screen reader
 * spoke every message TWICE — and the duplicate element ids were invalid HTML
 * besides. Exactly one instance renders; ownership passes on when it unmounts.
 * #R23-25 #R23-32
 */

// NOTE: there used to be a third region wired to getAnnouncements("off"), but
// priority "off" means "do not announce" and nothing ever announces with it —
// the region was permanently empty dead markup.
const { getAnnouncements } = useAccessibility();

const politeAnnouncements = computed(() => getAnnouncements("polite"));
const assertiveAnnouncements = computed(() => getAnnouncements("assertive"));

const instanceToken = nextInstanceToken("nle-live");
const isOwner = computed(() => regionOwner.value === instanceToken);

const claimIfFree = () => {
  if (regionOwner.value === null) regionOwner.value = instanceToken;
};

// A non-owner takes over the moment the owner releases, so removing the first
// editor from the page never leaves announcements with nowhere to go.
watch(regionOwner, claimIfFree);

onMounted(claimIfFree);

onBeforeUnmount(() => {
  if (regionOwner.value === instanceToken) regionOwner.value = null;
});
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
