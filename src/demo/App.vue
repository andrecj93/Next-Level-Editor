<template>
  <div class="site" :class="{ 'site-dark': dark }">
    <SiteNav :current="view" :dark="dark" @navigate="navigate" @toggle-theme="toggleTheme" />

    <main>
      <keep-alive>
        <component :is="views[view]" :dark="dark" @navigate="navigate" />
      </keep-alive>
    </main>

    <SiteFooter @navigate="navigate" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import SiteNav from "./components/SiteNav.vue";
import SiteFooter from "./components/SiteFooter.vue";
import HomeView from "./views/HomeView.vue";
import PlaygroundView from "./views/PlaygroundView.vue";
import DocsView from "./views/DocsView.vue";

type ViewId = "home" | "playground" | "docs";

const views = {
  home: HomeView,
  playground: PlaygroundView,
  docs: DocsView,
} as const;

// Resolve the initial view synchronously so a deep link (?view=… or the legacy
// ?empty=true the e2e suite uses) renders the right view on the very first
// paint — no Home flash, and no second stray .editor-content for tests to race.
const initialView = ((): ViewId => {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v && v in views) return v as ViewId;
  if (params.get("empty") === "true") return "playground";
  return "home";
})();

const view = ref<ViewId>(initialView);
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

const navigate = (id: string) => {
  if (id in views) {
    view.value = id as ViewId;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    syncEditorTheme();
  }
};

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
.site { min-height: 100vh; display: flex; flex-direction: column; }
.site > main { flex: 1; }
</style>
