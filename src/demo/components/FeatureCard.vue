<template>
  <div class="feature card card-hover">
    <span class="feature-icon" aria-hidden="true">{{ icon }}</span>
    <h3 class="feature-title">{{ title }}</h3>
    <p class="feature-desc">{{ desc }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; desc: string }>();
</script>

<style scoped>
.feature { padding: 24px; }
.feature-icon {
  display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px;
  font-size: 22px; background: var(--brand-gradient-soft); margin-bottom: 16px;
}
.feature-title { font-size: 1.06rem; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.01em; }
.feature-desc { font-size: 0.94rem; line-height: 1.55; color: var(--ink-soft); margin: 0; }
</style>
