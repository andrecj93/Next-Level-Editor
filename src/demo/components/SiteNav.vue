<template>
  <header class="site-nav" :class="{ scrolled }">
    <div class="container container-wide nav-inner">
      <button class="brand" @click="$emit('navigate', 'home')">
        <span class="brand-mark" aria-hidden="true"><Icon name="pen" :size="19" :stroke-width="1.9" /></span>
        <span class="brand-name">Next&nbsp;Level<span class="brand-name-accent">Editor</span></span>
      </button>

      <nav id="site-navigation" class="nav-links" :class="{ open: menuOpen }" aria-label="Primary" @keydown.esc="closeMenu">
        <button
          v-for="item in links"
          :key="item.id"
          class="nav-link"
          :class="{ active: current === item.id }"
          :aria-current="current === item.id ? 'page' : undefined"
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
          <Icon name="github" :size="19" />
        </a>
        <button
          class="icon-btn"
          :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="$emit('toggle-theme')"
        >
          <Icon :name="dark ? 'sun' : 'moon'" :size="19" />
        </button>
        <button class="btn btn-primary btn-sm try-btn" @click="go('playground')">Try it live</button>
        <button ref="menuButton" class="icon-btn menu-toggle" aria-label="Toggle menu" :aria-expanded="menuOpen" aria-controls="site-navigation" @click="menuOpen = !menuOpen" @keydown.esc="closeMenu">
          <Icon :name="menuOpen ? 'close' : 'menu'" :size="21" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Icon from "./Icon.vue";

defineProps<{ current: string; dark: boolean }>();
const emit = defineEmits<{ navigate: [id: string]; "toggle-theme": [] }>();

const links = [
  { id: "home", label: "Home" },
  { id: "playground", label: "Playground" },
  { id: "docs", label: "Docs" },
];

const scrolled = ref(false);
const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);
const closeMenu = () => {
  menuOpen.value = false;
  menuButton.value?.focus();
};
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
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease), box-shadow 0.3s var(--ease);
}
.site-nav.scrolled { border-bottom-color: var(--border); box-shadow: 0 1px 0 var(--paper-edge), var(--shadow-sm); }
.nav-inner { height: var(--nav-h); display: flex; align-items: center; gap: 20px; }

.brand { display: flex; align-items: center; gap: 11px; background: none; border: none; cursor: pointer; padding: 0; color: var(--ink); }
.brand-mark {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px;
  background: var(--brand-gradient); color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 6px 16px -7px rgba(196, 57, 44, 0.75);
}
.brand-name { font-family: var(--font-display); font-weight: 600; letter-spacing: -0.01em; font-size: 18px; }
.brand-name-accent { color: var(--accent); font-style: italic; }

.nav-links { display: flex; align-items: center; gap: 2px; margin-left: 10px; }
.nav-link {
  position: relative;
  background: none; border: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 14.5px;
  color: var(--ink-soft); padding: 8px 14px; border-radius: 9px; transition: color 0.15s, background 0.15s;
}
.nav-link:hover { color: var(--ink); background: var(--bg-subtle); }
.nav-link.active { color: var(--ink); }
/* editorial active marker: a short vermilion pen-stroke underline */
.nav-link.active::after {
  content: ""; position: absolute; left: 14px; right: 14px; bottom: 3px; height: 2px;
  background: var(--accent); border-radius: 2px;
}

.nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.icon-btn {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px;
  background: none; border: 1px solid transparent; color: var(--ink-soft); cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.icon-btn:hover { color: var(--ink); background: var(--bg-subtle); border-color: var(--border); }
.menu-toggle { display: none; }

@media (max-width: 820px) {
  .nav-links {
    position: absolute; top: var(--nav-h); left: 0; right: 0; flex-direction: column; align-items: stretch;
    gap: 2px; padding: 12px; background: var(--bg); border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-md); transform: translateY(-8px); opacity: 0; visibility: hidden; pointer-events: none;
    transition: opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0s linear 0.2s;
  }
  .nav-links.open {
    transform: translateY(0); opacity: 1; visibility: visible; pointer-events: all;
    transition: opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0s;
  }
  .nav-link { padding: 12px 14px; }
  .nav-link.active::after { left: 14px; right: auto; width: 18px; bottom: 8px; }
  .menu-toggle { display: grid; }
  .try-btn, .hide-sm { display: none; }
}
</style>
