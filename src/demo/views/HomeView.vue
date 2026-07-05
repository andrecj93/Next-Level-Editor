<template>
  <div class="home">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-glow" aria-hidden="true" />
      <div class="container hero-inner">
        <span class="hero-badge">
          <span class="dot" /> Open source · MIT · Vue 3 · Zero config
        </span>
        <h1 class="h-display hero-title">
          The rich text editor<br>
          that feels <span class="grad-text">truly native.</span>
        </h1>
        <p class="lede hero-lede">
          A professional-grade WYSIWYG editor for Vue&nbsp;3 — slash commands, tables,
          comments, variables, export and full theming. Drop it in with a single
          <code>v-model</code> and ship.
        </p>
        <div class="hero-ctas">
          <button class="btn btn-primary btn-lg" @click="$emit('navigate', 'playground')">
            Try it live
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <button class="btn btn-ghost btn-lg" @click="$emit('navigate', 'docs')">Read the docs</button>
        </div>

        <div class="hero-install">
          <CodeBlock code="npm install next-level-editor" label="terminal" />
        </div>

        <ul class="hero-trust">
          <li v-for="t in trust" :key="t"><span class="check">✓</span>{{ t }}</li>
        </ul>
      </div>
    </section>

    <!-- LIVE DEMO -->
    <section class="container demo-wrap">
      <div class="demo-frame card">
        <div class="demo-chrome">
          <span class="dots"><i /><i /><i /></span>
          <span class="demo-url">MyDocument.vue — Next Level Editor</span>
        </div>
        <!-- Live editor on desktop; a static rendered preview on phones, where
             the editor's persistent bottom toolbar would otherwise take over
             the landing page. The full editor is one tap away in the playground. -->
        <NextLevelEditor v-if="!compact" v-model="demoContent" width="100%" height="360px" />
        <div v-else class="demo-static" v-html="demoContent" />
      </div>
      <p class="demo-hint">↑ That's the real editor. Select text, press <kbd>/</kbd>, or open the <button class="linklike" @click="$emit('navigate', 'playground')">full playground</button>.</p>
    </section>

    <!-- FEATURES -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Everything included</span>
          <h2 class="h-section">Batteries included, not bolted on</h2>
          <p class="lede">Forty-plus composables power a complete editing experience — no plugin scavenger hunt required.</p>
        </div>
        <div class="grid-auto features">
          <FeatureCard v-for="f in features" :key="f.title" v-bind="f" />
        </div>
      </div>
    </section>

    <!-- CODE + OUTPUT -->
    <section class="section alt">
      <div class="container">
        <div class="split">
          <div class="split-copy">
            <span class="eyebrow">Developer experience</span>
            <h2 class="h-section">One component.<br>One <code>v-model</code>.</h2>
            <p class="lede">No document schema to learn, no render props, no boilerplate. It's a Vue component that binds to a string of HTML — exactly what you'd expect.</p>
            <ul class="split-list">
              <li v-for="p in points" :key="p"><span class="check">✓</span>{{ p }}</li>
            </ul>
            <button class="btn btn-primary" @click="$emit('navigate', 'docs')">Get started</button>
          </div>
          <div class="split-code">
            <CodeBlock :code="usageSnippet" lang="vue" />
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section">
      <div class="container">
        <div class="cta-band">
          <div class="cta-glow" aria-hidden="true" />
          <h2 class="cta-title">Ready to level up your editor?</h2>
          <p class="cta-sub">Free, open source, and production-ready. Add it to your Vue app in under a minute.</p>
          <div class="hero-ctas">
            <button class="btn btn-primary btn-lg" @click="$emit('navigate', 'playground')">Open the playground</button>
            <a class="btn btn-ghost btn-lg" href="https://github.com/andrecj93/next-level-editor" target="_blank" rel="noopener">⭐ Star on GitHub</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import NextLevelEditor from "../../components/NextLevelEditor.vue";
import CodeBlock from "../components/CodeBlock.vue";
import FeatureCard from "../components/FeatureCard.vue";

defineEmits<{ navigate: [id: string] }>();

// Phones get a static preview instead of the live editor (its fixed bottom
// toolbar shouldn't dominate the landing page). Resolved synchronously so there
// is no editor→preview flash on load.
const mql =
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 768px)")
    : null;
const compact = ref(mql?.matches ?? false);
const onMqChange = (e: MediaQueryListEvent) => {
  compact.value = e.matches;
};
onMounted(() => mql?.addEventListener("change", onMqChange));
onUnmounted(() => mql?.removeEventListener("change", onMqChange));

const demoContent = ref(
  `<h2>✍️ Edit me — I'm a real editor</h2>` +
    `<p>Try <strong>bold</strong>, <em>italic</em>, or a <a href="#">link</a>. ` +
    `Type <code>/</code> for slash commands, or select text for the floating toolbar.</p>` +
    `<ul><li>Tables, images &amp; code blocks</li><li>Undo / redo, find &amp; replace</li><li>Light &amp; dark themes</li></ul>` +
    `<blockquote>“Finally, an editor that just works.”</blockquote>`
);

const trust = ["No dependencies to wrangle", "TypeScript-first", "Fully themeable", "SSR-friendly"];

const features = [
  { icon: "⌨️", title: "Slash commands", desc: "Type / for a keyboard-driven menu of blocks — headings, lists, tables, code and more." },
  { icon: "💬", title: "Comments & mentions", desc: "Inline comment threads with @mentions, resolve/reopen, and a dedicated sidebar." },
  { icon: "🔤", title: "Template variables", desc: "Insert {{ mustache }} tokens that render as styled pills — perfect for merge fields." },
  { icon: "📊", title: "Writing stats", desc: "Live word count, reading time, readability scoring and lightweight SEO hints." },
  { icon: "📤", title: "Export anywhere", desc: "One-click export to HTML, Markdown, PDF and DOCX with faithful formatting." },
  { icon: "🎨", title: "Beautiful theming", desc: "A token-based design system with first-class light and dark modes out of the box." },
  { icon: "📱", title: "Mobile ready", desc: "A dedicated touch toolbar, responsive layout and 44px touch targets." },
  { icon: "🧩", title: "Plugin system", desc: "Register toolbar buttons, commands and slash commands through a clean plugin API." },
];

const points = [
  "Two-way binding with a plain HTML string",
  "Feature flags to enable only what you need",
  "Sanitised paste & import for safe HTML round-trips",
  "Accessible: keyboard-navigable & screen-reader friendly",
];

const usageSnippet = `<script setup>
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/style.css'
import { ref } from 'vue'

const content = ref('<h1>Hello world</h1>')
</scr${""}ipt>

<template>
  <NextLevelEditor
    v-model="content"
    :enable-comments="true"
    :show-writing-stats="true"
  />
</template>`;
</script>

<style scoped>
/* HERO */
.hero { position: relative; padding: clamp(56px, 10vw, 120px) 0 40px; text-align: center; overflow: hidden; }
.hero-glow {
  position: absolute; top: -30%; left: 50%; transform: translateX(-50%);
  width: min(1100px, 120vw); height: 640px; pointer-events: none;
  background: radial-gradient(circle at 50% 26%, rgba(196, 57, 44, 0.15), transparent 58%),
    radial-gradient(circle at 30% 42%, rgba(221, 106, 58, 0.14), transparent 54%),
    radial-gradient(circle at 72% 46%, rgba(230, 150, 90, 0.1), transparent 55%);
  filter: blur(14px);
}
.hero-inner { position: relative; display: flex; flex-direction: column; align-items: center; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
  color: var(--ink-soft); background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px; padding: 7px 16px; box-shadow: var(--shadow-sm);
}
.hero-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }
.hero-title { margin: 26px 0 0; }
.hero-lede { max-width: 640px; margin: 22px auto 0; }
.hero-lede code { font-family: var(--font-mono); font-size: 0.9em; background: var(--brand-gradient-soft); padding: 2px 7px; border-radius: 6px; }
.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 32px; }
.hero-install { width: min(420px, 100%); margin: 28px auto 0; text-align: left; }
.hero-trust { display: flex; flex-wrap: wrap; gap: 8px 22px; justify-content: center; list-style: none; padding: 0; margin: 26px 0 0; font-size: 14px; color: var(--ink-soft); }
.hero-trust li { display: flex; align-items: center; gap: 7px; }
.check { color: #22c55e; font-weight: 800; }

/* LIVE DEMO */
.demo-wrap { margin-top: 8px; }
.demo-frame { overflow: hidden; box-shadow: var(--shadow-lg); }
.demo-static { padding: 22px 22px 26px; line-height: 1.7; color: var(--ink); }
.demo-static :deep(h2) { font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5em; letter-spacing: -0.01em; }
.demo-static :deep(p) { margin: 0 0 0.8em; color: var(--ink-soft); }
.demo-static :deep(ul) { margin: 0 0 0.8em; padding-left: 20px; color: var(--ink-soft); }
.demo-static :deep(li) { margin: 3px 0; }
.demo-static :deep(a) { color: var(--accent); text-decoration: underline; }
.demo-static :deep(code) { font-family: var(--font-mono); font-size: 0.86em; background: var(--brand-gradient-soft); padding: 2px 6px; border-radius: 5px; }
.demo-static :deep(blockquote) { margin: 12px 0 0; padding: 4px 0 4px 16px; border-left: 3px solid var(--accent); font-style: italic; color: var(--ink-soft); }
.demo-chrome { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--border); background: var(--bg-subtle); }
.dots { display: flex; gap: 6px; }
.dots i { width: 11px; height: 11px; border-radius: 50%; background: var(--border-strong); }
.dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
.demo-url { font-size: 12.5px; color: var(--ink-muted); font-family: var(--font-mono); }
.demo-hint { text-align: center; margin: 16px 0 0; font-size: 14px; color: var(--ink-muted); }
.demo-hint kbd { font-family: var(--font-mono); background: var(--bg-subtle); border: 1px solid var(--border-strong); border-radius: 5px; padding: 1px 6px; }
.linklike { background: none; border: none; padding: 0; font: inherit; color: var(--brand-500); font-weight: 600; cursor: pointer; }

/* SECTIONS */
.section.alt { background: var(--bg-subtle); }
.section-head { max-width: 620px; margin: 0 auto 42px; text-align: center; }
.section-head .h-section { margin: 12px 0; }
.features { margin-top: 8px; }

/* SPLIT */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
/* let grid items shrink below the code block's intrinsic width so a long line
   scrolls inside the block instead of forcing the whole page wider on mobile */
.split-copy, .split-code { min-width: 0; }
.split-copy .h-section { margin: 12px 0 16px; }
.split-copy code { font-family: var(--font-mono); font-size: 0.82em; background: var(--brand-gradient-soft); padding: 2px 8px; border-radius: 7px; }
.split-list { list-style: none; padding: 0; margin: 22px 0 28px; display: flex; flex-direction: column; gap: 12px; }
.split-list li { display: flex; align-items: flex-start; gap: 10px; color: var(--ink-soft); line-height: 1.5; }

/* CTA */
.cta-band { position: relative; overflow: hidden; text-align: center; border-radius: var(--radius-xl); padding: clamp(40px, 6vw, 72px); background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-md); }
.cta-glow { position: absolute; inset: 0; background: var(--brand-gradient-soft); pointer-events: none; }
.cta-title { position: relative; font-size: clamp(1.7rem, 3.4vw, 2.6rem); font-weight: 800; letter-spacing: -0.02em; margin: 0; }
.cta-sub { position: relative; max-width: 480px; margin: 14px auto 6px; color: var(--ink-soft); line-height: 1.6; }
.cta-band .hero-ctas { position: relative; margin-top: 26px; }

@media (max-width: 820px) {
  .split { grid-template-columns: 1fr; gap: 28px; }
}
</style>
