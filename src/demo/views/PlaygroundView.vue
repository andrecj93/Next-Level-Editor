<template>
  <div class="playground">
    <div class="container container-wide">
      <header class="pg-head ruled">
        <div>
          <span class="eyebrow"><Icon name="bolt" :size="15" /> Playground</span>
          <h1 class="h-display pg-title">Try every feature, <span class="ink is-in">live.</span></h1>
          <p class="lede">
            A fully-configured editor — formatting, tables, slash commands, comments,
            variables, export and more. Load a template or start from scratch.
          </p>
        </div>
      </header>

      <!-- Controls -->
      <div class="pg-controls card">
        <div class="ctrl-group">
          <label class="ctrl-label" for="tpl">Template</label>
          <div class="select-wrap">
            <select id="tpl" v-model="selectedTemplate" class="select" @change="loadTemplate">
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.icon ? t.icon + " " : "" }}{{ t.name }}
              </option>
            </select>
            <svg class="select-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        <div class="ctrl-spacer" />

        <button class="btn btn-ghost btn-sm" @click="showConfig = !showConfig">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
          Configure
        </button>
        <a class="btn btn-ghost btn-sm" href="https://github.com/andrecj93/next-level-editor" target="_blank" rel="noopener"><Icon name="star" :size="15" /> Star</a>
      </div>

      <!-- Config panel -->
      <transition name="fade-down">
        <div v-if="showConfig" class="pg-config card">
          <div class="cfg-grid">
            <label class="toggle">
              <input v-model="editorConfig.showWritingStats" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Writing stats</strong><small>Word count, readability, SEO</small></span>
            </label>
            <label class="toggle">
              <input v-model="editorConfig.enableComments" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Comments</strong><small>Inline threads &amp; @mentions</small></span>
            </label>
            <label class="toggle">
              <input v-model="editorConfig.enableVariables" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Variables</strong><small><span v-pre>{{ mustache }}</span> template tokens</small></span>
            </label>
            <label class="toggle">
              <input v-model="editorConfig.readonly" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Read-only</strong><small>Viewer mode — no editing or toolbars</small></span>
            </label>
            <label class="toggle">
              <input v-model="editorConfig.showToolbar" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Main toolbar</strong><small>Hide for a headless editor</small></span>
            </label>
            <label class="toggle">
              <input v-model="editorConfig.autofocus" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Autofocus</strong><small>Focus the editor on load</small></span>
            </label>
          </div>
          <div class="cfg-row">
            <div class="cfg-field">
              <label>While writing</label>
              <select v-model="editorConfig.adaptiveChrome" class="select">
                <option value="letterbox">Letterbox band</option>
                <option value="recede">Recede</option>
                <option value="off">Keep toolbar</option>
              </select>
            </div>
            <div class="cfg-field">
              <label>Toolbar position</label>
              <select v-model="editorConfig.toolbarPosition" class="select">
                <option value="top">Top (masthead)</option>
                <option value="left">Left rail</option>
                <option value="bottom">Bottom dock</option>
                <option value="zen">Zen (band only)</option>
              </select>
            </div>
            <div class="cfg-field">
              <label>Height</label>
              <input v-model="editorConfig.height" type="number" min="300" max="1200" class="num"> px
            </div>
            <div class="cfg-field cfg-grow">
              <label>Placeholder</label>
              <input v-model="editorConfig.placeholder" type="text" class="text">
            </div>
            <button class="btn btn-ghost btn-sm" @click="resetConfig">Reset</button>
          </div>
        </div>
      </transition>

      <!-- Theme + layout switchers -->
      <div class="pg-themes">
        <span class="pg-themes-label">Theme</span>
        <div class="pg-theme-chips">
          <button
            v-for="t in editorThemes"
            :key="t.id"
            type="button"
            class="pg-theme-chip"
            :class="{ active: editorConfig.themePreset === t.id }"
            :title="t.description"
            @click="editorConfig.themePreset = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <span class="pg-themes-label pg-density-label">Toolbar</span>
        <div class="pg-theme-chips">
          <button
            v-for="l in toolbarLayouts"
            :key="l.id"
            type="button"
            class="pg-theme-chip"
            :class="{ active: editorConfig.toolbarLayout === l.id }"
            :title="l.description"
            @click="editorConfig.toolbarLayout = l.id"
          >
            {{ l.label }}
          </button>
        </div>
      </div>

      <!-- Editor -->
      <EditorSheet filename="playground.vue" badge="live" class="pg-editor">
        <NextLevelEditor
          v-model="content"
          width="100%"
          :height="editorHeight"
          :placeholder="editorConfig.placeholder"
          :theme-preset="editorConfig.themePreset"
          :toolbar-layout="editorConfig.toolbarLayout"
          :readonly="editorConfig.readonly"
          :show-toolbar="editorConfig.showToolbar"
          :default-view-mode="editorConfig.defaultViewMode"
          :autofocus="editorConfig.autofocus"
          :adaptive-chrome="editorConfig.adaptiveChrome"
          :toolbar-position="editorConfig.toolbarPosition"
          :show-writing-stats="editorConfig.showWritingStats"
          :enable-comments="editorConfig.enableComments"
          :enable-variables="editorConfig.enableVariables"
          :mention-search="demoMentionSearch"
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </EditorSheet>

      <!-- Output -->
      <div class="pg-output card">
        <div class="out-tabs">
          <button class="out-tab" :class="{ active: outTab === 'preview' }" @click="outTab = 'preview'">Rendered</button>
          <button class="out-tab" :class="{ active: outTab === 'html' }" @click="outTab = 'html'">Source</button>
          <span class="out-meta">{{ charCount.toLocaleString() }} chars</span>
        </div>
        <div v-show="outTab === 'preview'" class="out-preview" v-html="content || placeholderHtml" />
        <div v-show="outTab === 'html'" class="out-html">
          <pre><code>{{ content || '<!-- start typing to see the HTML output -->' }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import NextLevelEditor from "../../components/NextLevelEditor.vue";
import { AVAILABLE_THEMES } from "../../composables/useEditorThemes";
import Icon from "../components/Icon.vue";
import EditorSheet from "../components/EditorSheet.vue";
import {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
} from "../examples/exampleTemplates";
import { demoMentionSearch } from "../examples/demoTeam";

const templates = getAllTemplates();
const editorThemes = AVAILABLE_THEMES;
const toolbarLayouts = [
  { id: "comfortable" as const, label: "Comfortable", description: "Labelled, two-row toolbar." },
  { id: "compact" as const, label: "Compact", description: "One dense, icon-first row." },
];
const selectedTemplate = ref("showcase");
const showConfig = ref(false);
const outTab = ref<"preview" | "html">("preview");

const urlParams = new URLSearchParams(window.location.search);
const startEmpty = urlParams.get("empty") === "true";
const content = ref(startEmpty ? "" : getDefaultTemplate().content);

type ViewMode = "editor" | "code" | "split" | "preview";
const DEFAULT_CONFIG = {
  height: "620",
  themePreset: "warm",
  toolbarLayout: "comfortable" as "comfortable" | "compact",
  adaptiveChrome: "letterbox" as "letterbox" | "recede" | "off",
  toolbarPosition: "top" as "top" | "left" | "bottom" | "zen",
  showWritingStats: true,
  enableComments: true,
  enableVariables: true,
  readonly: false,
  showToolbar: true,
  defaultViewMode: "editor" as ViewMode,
  autofocus: false,
  placeholder: "Start typing your content here… Try typing / for quick commands!",
};

// Deep-link overrides so the docs/e2e can showcase each option directly.
const editorConfig = ref({
  ...DEFAULT_CONFIG,
  readonly: urlParams.get("readonly") === "1",
  showToolbar: urlParams.get("hideToolbar") !== "1",
  autofocus: urlParams.get("autofocus") === "1",
  defaultViewMode: (["editor", "code", "split", "preview"].includes(
    urlParams.get("editorView") ?? ""
  )
    ? (urlParams.get("editorView") as ViewMode)
    : "editor") as ViewMode,
});

const editorHeight = computed(() => `${editorConfig.value.height}px`);
const charCount = computed(() => content.value.length);
const placeholderHtml =
  '<p style="color:var(--ink-muted)">Your rendered content will appear here…</p>';

const loadTemplate = () => {
  const template = getTemplateById(selectedTemplate.value);
  if (template) content.value = template.content;
};

const resetConfig = () => {
  editorConfig.value = { ...DEFAULT_CONFIG };
};

const handleFocus = () => {};
const handleBlur = () => {};
</script>

<style scoped>
.playground { padding: 48px 0 40px; }
.pg-head { max-width: 680px; margin-bottom: 30px; }
.pg-head .eyebrow { display: inline-flex; }
.pg-title { font-size: clamp(2rem, 4.2vw, 3rem); margin: 12px 0 14px; }
.pg-editor { margin-bottom: 20px; }

.pg-controls { display: flex; align-items: center; gap: 12px; padding: 14px 16px; flex-wrap: wrap; margin-bottom: 16px; }
.ctrl-group { display: flex; align-items: center; gap: 10px; }
.ctrl-label { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
.ctrl-spacer { flex: 1; }
.select-wrap { position: relative; }
.select {
  appearance: none; font: inherit; font-size: 14px; font-weight: 600; color: var(--ink);
  background: var(--bg-subtle); border: 1px solid var(--border-strong); border-radius: 10px;
  padding: 9px 38px 9px 14px; cursor: pointer; min-width: 220px;
}
.select-caret { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-muted); pointer-events: none; }

.pg-config { padding: 20px; margin-bottom: 16px; }
.cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 18px; }
.toggle { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.toggle input { display: none; }
.toggle-track { position: relative; width: 40px; height: 23px; border-radius: 999px; background: var(--border-strong); flex-shrink: 0; transition: background 0.2s; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: transform 0.2s var(--ease); }
.toggle input:checked + .toggle-track { background: var(--brand-500); }
.toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(17px); }
.toggle-text { display: flex; flex-direction: column; line-height: 1.3; }
.toggle-text strong { font-size: 13.5px; }
.toggle-text small { font-size: 12px; color: var(--ink-muted); }
.cfg-row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid var(--border); }
.cfg-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-soft); }
.cfg-field.cfg-grow { flex: 1; min-width: 200px; }
.cfg-field label { font-weight: 600; }
.num, .text { font: inherit; font-size: 14px; color: var(--ink); background: var(--bg-subtle); border: 1px solid var(--border-strong); border-radius: 9px; padding: 8px 12px; }
.num { width: 90px; }

.pg-themes { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.pg-themes-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
.pg-density-label { margin-left: 6px; }
.pg-theme-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pg-theme-chip { background: var(--bg-subtle); border: 1px solid var(--border); color: var(--ink-soft); font: inherit; font-weight: 600; font-size: 13.5px; padding: 7px 15px; border-radius: 999px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
.pg-theme-chip:hover { color: var(--ink); border-color: var(--ink-soft); transform: translateY(-1px); }
.pg-theme-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.pg-editor { margin-bottom: 20px; }

.pg-output { overflow: hidden; }
.out-tabs { display: flex; align-items: center; gap: 4px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
.out-tab { background: none; border: none; font: inherit; font-weight: 600; font-size: 13.5px; color: var(--ink-soft); padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.out-tab:hover { background: var(--bg-subtle); color: var(--ink); }
.out-tab.active { background: var(--brand-gradient-soft); color: var(--brand-500); }
.site-dark .out-tab.active { color: var(--brand-400); }
.out-meta { margin-left: auto; font-size: 12px; color: var(--ink-muted); padding-right: 8px; }
.out-preview { padding: 24px 28px; max-height: 420px; overflow: auto; line-height: 1.7; }
.out-preview :deep(h1) { font-size: 1.8em; margin: 0.4em 0; }
.out-preview :deep(h2) { font-size: 1.4em; margin: 0.5em 0; }
.out-preview :deep(pre) { background: var(--code-bg); color: var(--code-ink); padding: 14px; border-radius: 10px; overflow-x: auto; }
.out-html { padding: 0; max-height: 420px; overflow: auto; background: var(--code-bg); }
.out-html pre { margin: 0; padding: 20px; }
.out-html code { font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6; color: var(--code-ink); white-space: pre-wrap; word-break: break-word; }

.fade-down-enter-active, .fade-down-leave-active { transition: all 0.22s var(--ease); }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 640px) {
  /* Give the template picker its own full-width row so its label isn't clipped;
     the config/star buttons wrap onto the next line. */
  .ctrl-group { flex: 1 1 100%; }
  .select-wrap { flex: 1; }
  .select { min-width: 0; width: 100%; }
  .ctrl-spacer { display: none; }
}
</style>
