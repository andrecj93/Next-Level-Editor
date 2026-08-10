<template>
  <component :is="as" ref="el" class="reveal" :class="{ 'reveal-in': shown }">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * RevealOnScroll — fades + rises its content the first time it scrolls into
 * view, and triggers any `.ink` underline inside it (via the `.reveal-in`
 * class the site stylesheet keys off). Honours prefers-reduced-motion by
 * showing immediately. One-shot: it disconnects after the first reveal.
 */
const props = withDefaults(defineProps<{ as?: string; threshold?: number; delay?: number }>(), {
  as: "div",
  threshold: 0.18,
  delay: 0,
});

const el = ref<HTMLElement | null>(null);
const shown = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof IntersectionObserver === "undefined") {
    shown.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (props.delay) window.setTimeout(() => (shown.value = true), props.delay);
        else shown.value = true;
        observer?.disconnect();
        observer = null;
      }
    },
    { threshold: props.threshold, rootMargin: "0px 0px -8% 0px" }
  );
  if (el.value) observer.observe(el.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>
