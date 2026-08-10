<template>
  <svg
    class="ic"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="path"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ICONS, type IconName } from "./icons";

/**
 * Icon — renders one glyph from the crafted stroke-icon set in `./icons`.
 */
const props = withDefaults(
  defineProps<{ name: IconName; size?: number | string; strokeWidth?: number | string }>(),
  { size: 22, strokeWidth: 1.7 }
);

const path = computed(() => ICONS[props.name]);
</script>

<style scoped>
.ic {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
