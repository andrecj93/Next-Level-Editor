import { ref } from "vue";

/**
 * Which AriaLiveRegion instance currently renders the page's aria-live regions.
 *
 * Lives in its own MODULE, not in `<script setup>`: setup runs per component
 * instance, so a ref declared there is per-instance and every editor would
 * claim ownership of its own copy — exactly the duplicate-region bug this is
 * meant to prevent. A module is shared by every importer, which is the scope a
 * page-level singleton needs. Same reasoning as `instanceToken.ts`. #R23-25
 */
export const liveRegionOwner = ref<string | null>(null);
