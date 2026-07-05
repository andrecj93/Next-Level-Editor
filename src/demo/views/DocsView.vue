<template>
  <div class="docs container container-wide">
    <!-- Sidebar TOC -->
    <aside class="docs-toc">
      <div class="toc-sticky">
        <p class="toc-title">On this page</p>
        <nav>
          <a
            v-for="s in sections"
            :key="s.id"
            :href="`#${s.id}`"
            class="toc-link"
            :class="{ active: active === s.id }"
            @click="active = s.id"
          >{{ s.label }}</a>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <article class="docs-body">
      <header class="docs-hero">
        <span class="eyebrow">Documentation</span>
        <h1 class="h-section">Get started in a minute</h1>
        <p class="lede">Everything you need to add a full-featured rich-text editor to your Vue&nbsp;3 app.</p>
      </header>

      <section id="install" class="doc-section">
        <h2>Installation</h2>
        <p>Install the package from npm. Vue&nbsp;3 is a peer dependency.</p>
        <CodeBlock code="npm install next-level-editor" label="terminal" />
        <p class="muted">Also available with <code>pnpm add</code>, <code>yarn add</code>, or <code>bun add</code>.</p>
      </section>

      <section id="quick-start" class="doc-section">
        <h2>Quick start</h2>
        <p>Import the component and its stylesheet, then bind an HTML string with <code>v-model</code>.</p>
        <CodeBlock :code="quickStart" lang="vue" />
        <p>That's the whole integration. The editor manages its own toolbar, menus and state — you just hold the HTML.</p>
      </section>

      <section id="v-model" class="doc-section">
        <h2>Working with <code>v-model</code></h2>
        <p>The model value is a string of sanitised HTML. Read it, persist it, or render it read-only anywhere.</p>
        <CodeBlock :code="vmodelSnippet" lang="vue" />
        <div class="callout">
          <strong>Safe by design.</strong> All content that enters the editor — paste, import, and external <code>v-model</code> updates — passes through an allow-list sanitiser, so you can round-trip untrusted HTML without XSS surprises.
        </div>
      </section>

      <section id="props" class="doc-section">
        <h2>Props</h2>
        <p>The component is configured entirely through props. The essentials:</p>
        <div class="table-wrap">
          <table class="props-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr v-for="p in props" :key="p.name">
                <td><code>{{ p.name }}</code></td>
                <td class="ty">{{ p.type }}</td>
                <td class="ty">{{ p.def }}</td>
                <td>{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="features" class="doc-section">
        <h2>Feature flags</h2>
        <p>Heavier subsystems are opt-in, so you only pay for what you use.</p>
        <CodeBlock :code="flagsSnippet" lang="vue" />
        <ul class="feat-list">
          <li><strong>showWritingStats</strong> — live word count, reading time, readability &amp; SEO panel.</li>
          <li><strong>enableComments</strong> — inline comment threads, a sidebar, and <code>@mention</code> support.</li>
          <li><strong>enableVariables</strong> — <code v-pre>{{ mustache }}</code> template tokens rendered as pills.</li>
        </ul>
      </section>

      <section id="mentions" class="doc-section">
        <h2>@mentions</h2>
        <p>Provide a <code>mention-search</code> function to power @mentions from your own user directory. It can return a promise.</p>
        <CodeBlock :code="mentionSnippet" lang="ts" />
      </section>

      <section id="theming" class="doc-section">
        <h2>Theming</h2>
        <p>The editor ships light and dark themes driven by a <code>.theme-dark</code> class on its root, backed by a token layer. Override any token to match your brand:</p>
        <CodeBlock :code="themeSnippet" lang="css" />
      </section>

      <section id="plugins" class="doc-section">
        <h2>Plugins</h2>
        <p>Extend the editor with custom toolbar buttons, editor commands and slash commands through the plugin contract. Each plugin receives a <code>PluginContext</code> with content access, <code>execCommand</code>, selection and an event bus.</p>
        <CodeBlock :code="pluginSnippet" lang="ts" />
        <p class="muted">See <code>src/demo/examples/example-plugin.ts</code> for a complete, worked example.</p>
      </section>

      <div class="docs-next card">
        <div>
          <h3>Ready to build?</h3>
          <p>Jump into the playground and try every feature with live output.</p>
        </div>
        <button class="btn btn-primary" @click="$emit('navigate', 'playground')">Open playground →</button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import CodeBlock from "../components/CodeBlock.vue";

defineEmits<{ navigate: [id: string] }>();

const sections = [
  { id: "install", label: "Installation" },
  { id: "quick-start", label: "Quick start" },
  { id: "v-model", label: "v-model" },
  { id: "props", label: "Props" },
  { id: "features", label: "Feature flags" },
  { id: "mentions", label: "@mentions" },
  { id: "theming", label: "Theming" },
  { id: "plugins", label: "Plugins" },
];
const active = ref("install");

const props = [
  { name: "modelValue", type: "string", def: "''", desc: "The editor's HTML content (v-model)." },
  { name: "placeholder", type: "string", def: "'…'", desc: "Placeholder shown when empty." },
  { name: "width", type: "string", def: "'100%'", desc: "Editor width (any CSS length)." },
  { name: "height", type: "string", def: "'600px'", desc: "Editor height (any CSS length)." },
  { name: "showWritingStats", type: "boolean", def: "false", desc: "Enable the writing-stats panel." },
  { name: "enableComments", type: "boolean", def: "false", desc: "Enable inline comments & mentions." },
  { name: "enableVariables", type: "boolean", def: "false", desc: "Enable {{ variable }} tokens." },
  { name: "mentionSearch", type: "fn", def: "—", desc: "Async provider for @mention suggestions." },
];

const quickStart = `<script setup>
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/style.css'

const content = ref('<h1>Hello, world</h1>')
<\/script>

<template>
  <NextLevelEditor v-model="content" />
</template>`;

const vmodelSnippet = `const content = ref('')

// Persist on change
watch(content, (html) => {
  localStorage.setItem('doc', html)
})

// Render read-only elsewhere
<div v-html="content" />`;

const flagsSnippet = `<NextLevelEditor
  v-model="content"
  :show-writing-stats="true"
  :enable-comments="true"
  :enable-variables="true"
/>`;

const mentionSnippet = `async function mentionSearch(query) {
  const res = await fetch('/api/users?q=' + query)
  return res.json() // -> [{ id, name, email }]
}

<NextLevelEditor :mention-search="mentionSearch" />`;

const themeSnippet = `.next-level-editor {
  --editor-bg: #ffffff;
  --toolbar-accent: #6366f1;
  --content-color: #0f172a;
}
.next-level-editor.theme-dark {
  --editor-bg: #0f172a;
  --content-color: #e2e8f0;
}`;

const pluginSnippet = `import type { EditorPlugin } from 'next-level-editor'

export const highlightPlugin: EditorPlugin = {
  name: 'highlight',
  toolbarButtons: [{
    id: 'highlight',
    icon: '🖍️',
    title: 'Highlight',
    action: (ctx) => ctx.execCommand('hiliteColor', '#fef08a'),
  }],
  slashCommands: [{
    id: 'hr',
    label: 'Divider',
    action: (ctx) => ctx.execCommand('insertHorizontalRule'),
  }],
}`;

let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) active.value = e.target.id;
      }
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  document.querySelectorAll(".doc-section").forEach((el) => observer?.observe(el));
});
onUnmounted(() => observer?.disconnect());
</script>

<style scoped>
.docs { display: grid; grid-template-columns: 220px 1fr; gap: 56px; padding-top: 40px; padding-bottom: 40px; align-items: start; }
.docs-toc { position: relative; }
.toc-sticky { position: sticky; top: calc(var(--nav-h) + 24px); }
.toc-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); margin: 0 0 12px; font-weight: 700; }
.docs-toc nav { display: flex; flex-direction: column; gap: 2px; border-left: 1px solid var(--border); }
.toc-link { padding: 6px 0 6px 16px; margin-left: -1px; font-size: 14px; color: var(--ink-soft); border-left: 2px solid transparent; transition: all 0.15s; }
.toc-link:hover { color: var(--ink); }
.toc-link.active { color: var(--brand-500); border-left-color: var(--brand-500); font-weight: 600; }
.site-dark .toc-link.active { color: var(--brand-400); border-left-color: var(--brand-400); }

.docs-body { max-width: 760px; min-width: 0; }
.docs-hero { margin-bottom: 40px; }
.docs-hero .h-section { margin: 12px 0; }
.doc-section { padding: 26px 0; border-top: 1px solid var(--border); scroll-margin-top: calc(var(--nav-h) + 20px); }
.doc-section:first-of-type { border-top: none; padding-top: 0; }
.doc-section h2 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 14px; }
.doc-section h2 code, .doc-section p code, .feat-list code, .callout code, .muted code { font-family: var(--font-mono); font-size: 0.85em; background: var(--brand-gradient-soft); padding: 2px 7px; border-radius: 6px; }
.doc-section p { line-height: 1.7; color: var(--ink-soft); margin: 0 0 16px; }
.doc-section .muted { color: var(--ink-muted); font-size: 0.9rem; }
.doc-section :deep(.codeblock) { margin: 8px 0 16px; }

.callout { background: var(--brand-gradient-soft); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; line-height: 1.6; color: var(--ink-soft); margin: 8px 0; }
.callout strong { color: var(--ink); }

.feat-list, .split-list { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 10px; }
.feat-list li { line-height: 1.6; color: var(--ink-soft); padding-left: 18px; position: relative; }
.feat-list li::before { content: "→"; position: absolute; left: 0; color: var(--brand-500); }
.feat-list strong { color: var(--ink); }

.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); }
.props-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 560px; }
.props-table th { text-align: left; padding: 12px 16px; background: var(--bg-subtle); color: var(--ink-soft); font-weight: 700; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid var(--border); }
.props-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--ink-soft); vertical-align: top; }
.props-table tr:last-child td { border-bottom: none; }
.props-table td code { font-family: var(--font-mono); font-size: 12.5px; color: var(--brand-500); font-weight: 600; }
.props-table .ty { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-muted); white-space: nowrap; }

.docs-next { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 26px; margin-top: 40px; flex-wrap: wrap; }
.docs-next h3 { margin: 0 0 4px; font-size: 1.15rem; }
.docs-next p { margin: 0; color: var(--ink-soft); font-size: 0.94rem; }

@media (max-width: 900px) {
  .docs { grid-template-columns: 1fr; gap: 20px; }
  .docs-toc { display: none; }
}
</style>
