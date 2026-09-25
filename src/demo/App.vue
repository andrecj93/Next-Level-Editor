<template>
  <div class="site" :class="{ 'site-dark': dark, 'site-workspace': view === 'playground' }">
    <SiteNav :current="view" :dark="dark" @navigate="navigate" @toggle-theme="toggleTheme" />

    <main>
      <keep-alive>
        <component :is="views[view]" :dark="dark" @navigate="navigate" />
      </keep-alive>
    </main>

    <SiteFooter v-if="view !== 'playground'" @navigate="navigate" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import SiteNav from "./components/SiteNav.vue";
import SiteFooter from "./components/SiteFooter.vue";
import HomeView from "./views/HomeView.vue";
import PlaygroundView from "./views/PlaygroundView.vue";
import DocsView from "./views/DocsView.vue";
import { useDemoNavigation } from "./composables/useDemoNavigation";

const views = {
  home: HomeView,
  playground: PlaygroundView,
  docs: DocsView,
} as const;

const dark = ref(false);

const applyTheme = () => {
  document.documentElement.classList.toggle("site-dark", dark.value);
};

/**
 * The embedded editor manages its own theme (via useTheme + its own toolbar
 * toggle) and exposes no theme prop, so keep it in lock-step with the site by
 * driving its own toggle button when the two diverge. This keeps the editor's
 * internal state authoritative instead of forcing a class it would overwrite.
 */
const syncEditorTheme = () => {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>(".next-level-editor").forEach((el) => {
      const isDark = el.classList.contains("theme-dark");
      if (isDark !== dark.value) {
        el.querySelector<HTMLButtonElement>('button[aria-label*="theme" i]')?.click();
      }
    });
  });
};

const toggleTheme = () => {
  dark.value = !dark.value;
  try {
    localStorage.setItem("next-level-editor-theme", dark.value ? "dark" : "light");
  } catch {
    /* storage unavailable */
  }
  applyTheme();
  syncEditorTheme();
};

const { view, navigate } = useDemoNavigation(syncEditorTheme);

onMounted(() => {
  try {
    const saved = localStorage.getItem("next-level-editor-theme");
    if (saved) dark.value = saved === "dark";
    else dark.value = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    /* storage unavailable */
  }
  applyTheme();
  syncEditorTheme();
});
</script>

<style>
.site { min-height: 100vh; display: flex; flex-direction: column; font-family: var(--font-sans); }
.site > main { flex: 1; }
.site-workspace { height: 100dvh; min-height: 0; overflow: hidden; }
.site-workspace > main { display: flex; min-height: 0; }
.site-workspace .site-nav { position: relative; flex: 0 0 auto; }
.site-workspace .nav-inner { height: 56px; }
.site-workspace .try-btn { display: none; }
@media (max-height: 500px) {
  .site-workspace { height: auto; min-height: 100dvh; overflow: visible; }
  .site-workspace > main { flex: 0 0 auto; }
}
</style>
