<template>
  <div ref="root" class="live-demo" :class="{ 'ld-alt': alt }">
    <!-- Caption -->
    <div class="ld-head">
      <span class="icon-tile"><Icon :name="icon" :size="24" /></span>
      <div class="ld-headtext">
        <span class="ld-index">{{ index }}</span>
        <h3 class="ld-title">{{ title }}</h3>
        <p class="ld-desc">{{ desc }}</p>
        <p class="ld-hint"><Icon name="sparkle" :size="15" /><span v-html="hint" /></p>
      </div>
    </div>

    <!-- Live surface -->
    <EditorSheet :filename="filename" :badge="badge" class="ld-sheet">
      <slot v-if="active" />
      <div v-else class="ld-skel" aria-hidden="true">
        <span class="ld-skel-line w70" />
        <span class="ld-skel-line w90" />
        <span class="ld-skel-line w50" />
        <span class="ld-skel-caret">Loading live editor<i class="caret" /></span>
      </div>
    </EditorSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
import type { IconName } from "./icons";
import EditorSheet from "./EditorSheet.vue";

/**
 * LiveDemo — one feature proof. Renders a caption (crafted glyph, title,
 * description, "what to try" hint) beside a real editor framed in an
 * EditorSheet. The heavy editor in the default slot is LAZY-MOUNTED: it only
 * renders once the demo scrolls near the viewport, so the home page never boots
 * five editors at first paint. Until then a lightweight skeleton stands in.
 */
withDefaults(
  defineProps<{
    index: string;
    title: string;
    desc: string;
    hint: string;
    icon: IconName;
    filename?: string;
    badge?: string;
    alt?: boolean;
  }>(),
  { filename: undefined, badge: undefined, alt: false }
);

const root = ref<HTMLElement | null>(null);
const active = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    active.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        active.value = true;
        observer?.disconnect();
        observer = null;
      }
    },
    // Mount a little before it enters view so it's ready by the time it lands.
    { rootMargin: "300px 0px" }
  );
  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.live-demo {
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) 1.18fr;
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
}
.ld-alt { grid-template-columns: 1.18fr minmax(280px, 0.82fr); }
.ld-alt .ld-head { order: 2; }
.ld-alt .ld-sheet { order: 1; }

.ld-head { min-width: 0; display: flex; gap: 18px; align-items: flex-start; }
.ld-headtext { min-width: 0; }
.ld-index {
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em;
  color: var(--ink-muted);
}
.ld-title {
  font-family: var(--font-display); font-optical-sizing: auto;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.1; letter-spacing: -0.015em;
  font-weight: 600; margin: 6px 0 0; color: var(--ink);
}
.ld-desc { margin: 12px 0 0; color: var(--ink-soft); line-height: 1.6; font-size: 1.02rem; }
.ld-hint {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 18px 0 0; padding: 8px 14px 8px 12px;
  font-size: 13.5px; color: var(--ink-soft);
  background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 999px;
}
.ld-hint :deep(kbd) {
  font-family: var(--font-mono); font-size: 12px;
  background: var(--bg-subtle); border: 1px solid var(--border-strong);
  border-radius: 5px; padding: 1px 6px; color: var(--ink);
}
.ld-hint :deep(.ic) { color: var(--accent); }

/* Skeleton shown before the editor lazy-mounts */
.ld-skel { padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; min-height: 220px; }
.ld-skel-line { height: 12px; border-radius: 6px; background: var(--bg-subtle); }
.ld-skel-line.w70 { width: 70%; } .ld-skel-line.w90 { width: 90%; } .ld-skel-line.w50 { width: 50%; }
.ld-skel-caret {
  margin-top: auto; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-muted);
  display: inline-flex; align-items: center;
}

@media (max-width: 860px) {
  .live-demo, .ld-alt { grid-template-columns: 1fr; gap: 22px; }
  .ld-alt .ld-head { order: 0; }
  .ld-alt .ld-sheet { order: 0; }
}
</style>
