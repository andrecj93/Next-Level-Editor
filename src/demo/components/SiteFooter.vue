<template>
  <footer class="site-footer">
    <div class="container container-wide footer-inner">
      <div class="footer-brand">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </span>
          <span class="brand-name">Next Level Editor</span>
        </div>
        <p class="footer-tag">
          A modern, framework-native rich-text editor for Vue&nbsp;3. Free &amp; open source, MIT licensed.
        </p>
      </div>

      <div class="footer-cols">
        <div v-for="col in columns" :key="col.title" class="footer-col">
          <h4>{{ col.title }}</h4>
          <button
            v-for="link in col.links"
            :key="link.label"
            class="footer-link"
            @click="link.view ? $emit('navigate', link.view) : open(link.href)"
          >
            {{ link.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="container container-wide footer-bottom">
      <span>© {{ year }} Next Level Editor</span>
      <span>Built with Vue 3 + Vite</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineEmits<{ navigate: [id: string] }>();

interface FooterLink {
  label: string;
  view?: string;
  href?: string;
}
const year = 2026;
const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Playground", view: "playground" },
      { label: "Documentation", view: "docs" },
      { label: "Features", view: "home" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "GitHub", href: "https://github.com/andrecj93/next-level-editor" },
      { label: "npm", href: "https://www.npmjs.com/package/next-level-editor" },
      { label: "Report an issue", href: "https://github.com/andrecj93/next-level-editor/issues" },
    ],
  },
];

const open = (href?: string) => {
  if (href) window.open(href, "_blank", "noopener");
};
</script>

<style scoped>
.site-footer { border-top: 1px solid var(--border); background: var(--bg-subtle); padding: 56px 0 28px; margin-top: 40px; }
.footer-inner { display: flex; flex-wrap: wrap; gap: 48px; justify-content: space-between; }
.footer-brand { max-width: 340px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); }
.brand-mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--brand-gradient); color: #fff; }
.brand-name { font-weight: 800; letter-spacing: -0.02em; }
.footer-tag { margin: 14px 0 0; font-size: 0.92rem; line-height: 1.6; color: var(--ink-soft); }
.footer-cols { display: flex; gap: 64px; flex-wrap: wrap; }
.footer-col { display: flex; flex-direction: column; gap: 10px; }
.footer-col h4 { margin: 0 0 6px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); }
.footer-link { background: none; border: none; padding: 0; text-align: left; cursor: pointer; font: inherit; font-size: 0.92rem; color: var(--ink-soft); transition: color 0.15s; }
.footer-link:hover { color: var(--brand-500); }
.footer-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--ink-muted); }
</style>
