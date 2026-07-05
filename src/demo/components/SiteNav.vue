<template>
  <header class="site-nav" :class="{ scrolled }">
    <div class="container container-wide nav-inner">
      <button class="brand" @click="$emit('navigate', 'home')">
        <span class="brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </span>
        <span class="brand-name">Next&nbsp;Level<span class="brand-name-accent">Editor</span></span>
      </button>

      <nav class="nav-links" :class="{ open: menuOpen }">
        <button
          v-for="item in links"
          :key="item.id"
          class="nav-link"
          :class="{ active: current === item.id }"
          @click="go(item.id)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="nav-actions">
        <a
          class="icon-btn hide-sm"
          href="https://github.com/andrecj93/next-level-editor"
          target="_blank"
          rel="noopener"
          aria-label="GitHub repository"
          title="GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48v-1.7c-2.78.62-3.37-1.2-3.37-1.2-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9v2.82c0 .26.18.59.69.48A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
          </svg>
        </a>
        <button
          class="icon-btn"
          :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="dark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
        <button class="btn btn-primary btn-sm try-btn" @click="go('playground')">
          Try it live
        </button>
        <button class="icon-btn menu-toggle" aria-label="Toggle menu" @click="menuOpen = !menuOpen">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" />
            <path v-else d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineProps<{ current: string; dark: boolean }>();
const emit = defineEmits<{ navigate: [id: string]; "toggle-theme": [] }>();

const links = [
  { id: "home", label: "Home" },
  { id: "playground", label: "Playground" },
  { id: "docs", label: "Docs" },
];

const scrolled = ref(false);
const menuOpen = ref(false);
const onScroll = () => {
  scrolled.value = window.scrollY > 8;
};
onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));

const go = (id: string) => {
  menuOpen.value = false;
  emit("navigate", id);
};
</script>

<style scoped>
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease);
}
.site-nav.scrolled { border-bottom-color: var(--border); }
.nav-inner { height: var(--nav-h); display: flex; align-items: center; gap: 20px; }
.brand { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 0; color: var(--ink); }
.brand-mark {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px;
  background: var(--brand-gradient); color: #fff; box-shadow: 0 6px 16px -6px rgba(99, 102, 241, 0.7);
}
.brand-name { font-weight: 800; letter-spacing: -0.02em; font-size: 17px; }
.brand-name-accent { background: var(--brand-gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.nav-links { display: flex; align-items: center; gap: 4px; margin-left: 8px; }
.nav-link {
  background: none; border: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 14.5px;
  color: var(--ink-soft); padding: 8px 14px; border-radius: 9px; transition: color 0.15s, background 0.15s;
}
.nav-link:hover { color: var(--ink); background: var(--bg-subtle); }
.nav-link.active { color: var(--brand-500); }
.site-dark .nav-link.active { color: var(--brand-400); }
.nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.icon-btn {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px;
  background: none; border: 1px solid transparent; color: var(--ink-soft); cursor: pointer; transition: all 0.15s;
}
.icon-btn:hover { color: var(--ink); background: var(--bg-subtle); border-color: var(--border); }
.menu-toggle { display: none; }
@media (max-width: 820px) {
  .nav-links {
    position: absolute; top: var(--nav-h); left: 0; right: 0; flex-direction: column; align-items: stretch;
    gap: 2px; padding: 12px; background: var(--bg); border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-md); transform: translateY(-8px); opacity: 0; pointer-events: none; transition: all 0.2s var(--ease);
  }
  .nav-links.open { transform: translateY(0); opacity: 1; pointer-events: all; }
  .nav-link { padding: 12px 14px; }
  .menu-toggle { display: grid; }
  .try-btn, .hide-sm { display: none; }
}
</style>
