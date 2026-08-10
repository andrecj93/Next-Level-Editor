<template>
  <div class="codeblock">
    <div v-if="lang || label" class="codeblock-bar">
      <span class="cb-label">{{ label || lang }}</span>
      <button class="copy-btn" @click="copy">
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>
    <!-- tabindex + a role/name: the block scrolls horizontally on narrow
         viewports, and a scrollable region that cannot be focused is
         unreachable by keyboard (WCAG 2.1.1 / 2.1.3 — axe
         `scrollable-region-focusable`). -->
    <pre
      tabindex="0"
      role="region"
      :aria-label="lang ? `${lang} code sample` : 'Code sample'"
    ><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ code: string; lang?: string; label?: string }>();
const copied = ref(false);

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard unavailable */
  }
};
</script>

<style scoped>
.cb-label { text-transform: lowercase; font-family: var(--font-mono); }
code { font-family: inherit; white-space: pre; }
</style>
