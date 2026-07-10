<template>
  <figure class="chrome-thumb card">
    <!-- A miniature wireframe of the arrangement: the page, and where the
         chrome sits around it. Pure CSS — no screenshots, no live editor. -->
    <div class="ct-frame" :class="`ct-${position}`" aria-hidden="true">
      <span class="ct-bar" />
      <span class="ct-page">
        <i class="ct-line w80" /><i class="ct-line w95" /><i class="ct-line w60" />
      </span>
      <span v-if="position === 'zen'" class="ct-band" />
    </div>
    <figcaption class="ct-caption">
      <div class="ct-title-row">
        <span class="ct-name">{{ name }}</span>
        <code class="ct-prop">{{ prop }}</code>
      </div>
      <p class="ct-desc">{{ desc }}</p>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
/**
 * ChromeThumb — a static vignette of one toolbar arrangement. A small CSS
 * wireframe (the page, and where the chrome sits around it) over a one-line
 * editorial caption. Deliberately NOT a live editor: the desktop toolbar
 * arrangements need >640px of editor width, which a three-up thumbnail can
 * never give them — a live thumb would silently fall back to the top bar and
 * demo nothing.
 */
defineProps<{
  /** Display name of the arrangement (e.g. "Margin"). */
  name: string;
  /** The prop snippet that produces it (e.g. `toolbar-position="left"`). */
  prop: string;
  /** One-line caption. */
  desc: string;
  /** Which wireframe to draw. */
  position: "left" | "bottom" | "zen";
}>();
</script>

<style scoped>
.chrome-thumb {
  margin: 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 20px;
}

/* ------------------------------ wireframe ------------------------------ */
.ct-frame {
  position: relative;
  display: flex;
  gap: 8px;
  height: 120px;
  padding: 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.ct-bar {
  flex: none;
  background: var(--accent);
  opacity: 0.55;
  border-radius: 4px;
}
.ct-page {
  flex: 1;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ct-line { display: block; height: 5px; border-radius: 3px; background: var(--border-strong); }
.ct-line.w80 { width: 80%; }
.ct-line.w95 { width: 95%; }
.ct-line.w60 { width: 60%; }

/* Margin: a slim vertical rail beside the page */
.ct-left { flex-direction: row; }
.ct-left .ct-bar { width: 10px; }

/* Baseline: the bar docks under the page */
.ct-bottom { flex-direction: column-reverse; }
.ct-bottom .ct-bar { height: 10px; }

/* Studio: no bar at all — only the ambient band holding the top edge */
.ct-zen .ct-bar { display: none; }
.ct-band {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent);
  opacity: 0.4;
}

/* ------------------------------- caption ------------------------------- */
.ct-caption { padding: 15px 2px 0; }
.ct-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
.ct-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.06rem;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.ct-prop {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--accent);
  background: var(--brand-gradient-soft);
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.ct-desc { margin: 8px 0 0; font-size: 0.92rem; line-height: 1.55; color: var(--ink-soft); }
</style>
