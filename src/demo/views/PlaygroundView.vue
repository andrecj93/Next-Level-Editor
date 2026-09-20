<template>
  <div class="playground" :class="{ 'is-writing': editorConfig.writingMode }">
    <div class="container container-wide pg-workspace">
      <header class="pg-head">
        <div class="pg-document-heading"><span class="pg-document-icon" aria-hidden="true"><Icon name="pen" :size="19" /></span><div><h1 class="pg-document-name">{{ documentName }}</h1><span class="draft-hint">Your private writing space · auto-save to this browser</span></div></div>
        <div class="pg-document-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="chooseTemplate('empty')"><Icon name="pen" :size="15" /> New document</button>
          <button ref="configTrigger" class="btn btn-ghost btn-sm" type="button" :aria-expanded="showConfig" aria-controls="playground-settings" @click="showConfig = !showConfig">Configure</button>
        </div>
      </header>

      <div v-show="showConfig || !editorConfig.writingMode" id="playground-settings" class="pg-settings" @keydown.esc.stop="closeConfig">
      <!-- Controls -->
      <div class="pg-controls card">
        <div class="ctrl-group">
          <label class="ctrl-label" for="tpl">Template</label>
          <div class="select-wrap">
            <select id="tpl" :value="selectedTemplate" class="select" @change="loadTemplate">
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
            <svg class="select-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        <div class="ctrl-spacer" />

        <span class="draft-hint">Auto-save to this browser</span>
        <button class="btn btn-ghost btn-sm" aria-label="Close configuration" @click="closeConfig">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
          Done
        </button>
      </div>

      <!-- Config panel -->
      <transition name="fade-down">
        <div v-if="showConfig" id="playground-config" class="pg-config card" role="region" aria-label="Editor configuration">
          <div class="cfg-grid">
            <label class="toggle">
              <input v-model="editorConfig.writingMode" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>Writing workspace</strong><small>Manuscript, chapter outline, and writing notes</small></span>
            </label>
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
            <label
              v-if="editorConfig.enableVariables"
              class="toggle"
            >
              <input v-model="editorConfig.customVariables" type="checkbox">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span class="toggle-text"><strong>My own variables</strong><small>Replace the demo set via the <code>variables</code> prop</small></span>
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
            <div v-if="!editorConfig.writingMode" class="cfg-field">
              <label for="pg-adaptive">While writing</label>
              <select id="pg-adaptive" v-model="editorConfig.adaptiveChrome" class="select">
                <option value="letterbox">Letterbox band</option>
                <option value="recede">Recede</option>
                <option value="off">Keep toolbar</option>
              </select>
            </div>
            <div v-if="!editorConfig.writingMode" class="cfg-field">
              <label for="pg-position">Toolbar position</label>
              <select id="pg-position" v-model="editorConfig.toolbarPosition" class="select">
                <option value="top">Top (masthead)</option>
                <option value="left">Left rail</option>
                <option value="bottom">Bottom dock</option>
                <option value="zen">Zen (band only)</option>
              </select>
            </div>
            <div v-if="!editorConfig.writingMode" class="cfg-field">
              <label for="pg-mode">Toolbar form</label>
              <select id="pg-mode" v-model="editorConfig.toolbarMode" class="select">
                <option value="bar">Bar (docked)</option>
                <option value="pill">Pill (Playhead)</option>
              </select>
            </div>
            <div v-if="!editorConfig.writingMode" class="cfg-field">
              <label for="pg-height">Height (px)</label>
              <input id="pg-height" v-model="editorConfig.height" type="number" min="300" max="1200" class="num">
            </div>
            <div class="cfg-field cfg-grow">
              <label for="pg-placeholder">Placeholder</label>
              <input id="pg-placeholder" v-model="editorConfig.placeholder" type="text" class="text">
            </div>
            <button class="btn btn-ghost btn-sm" @click="resetConfig">Reset</button>
          </div>
        </div>
      </transition>

      <!-- Theme + layout switchers -->
      <div class="pg-themes" :class="{ 'is-expanded': showConfig }">
        <span class="pg-themes-label">Theme</span>
        <div class="pg-theme-chips" role="group" aria-label="Editor theme">
          <button
            v-for="t in editorThemes"
            :key="t.id"
            type="button"
            class="pg-theme-chip"
            :class="{ active: editorConfig.themePreset === t.id }"
            :aria-pressed="editorConfig.themePreset === t.id"
            :title="t.description"
            @click="editorConfig.themePreset = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <span v-if="!editorConfig.writingMode" class="pg-themes-label pg-density-label">Toolbar</span>
        <div v-if="!editorConfig.writingMode" class="pg-theme-chips" role="group" aria-label="Toolbar density">
          <button
            v-for="l in toolbarLayouts"
            :key="l.id"
            type="button"
            class="pg-theme-chip"
            :class="{ active: editorConfig.toolbarLayout === l.id }"
            :aria-pressed="editorConfig.toolbarLayout === l.id"
            :title="l.description"
            @click="editorConfig.toolbarLayout = l.id"
          >
            {{ l.label }}
          </button>
        </div>
      </div>
      </div>

      <!-- Editor -->
      <p v-if="notice" class="draft-notice" role="status">{{ notice }}</p>
      <EditorSheet class="pg-editor">
        <NextLevelEditor
          :key="documentRevision"
          v-model="content"
          width="100%"
          :height="editorConfig.writingMode ? '100%' : editorHeight"
          :writing-mode="editorConfig.writingMode"
          :placeholder="editorConfig.placeholder"
          :theme-preset="editorConfig.themePreset"
          :toolbar-layout="editorConfig.toolbarLayout"
          :readonly="editorConfig.readonly"
          :show-toolbar="editorConfig.showToolbar"
          :default-view-mode="editorConfig.defaultViewMode"
          :autofocus="editorConfig.autofocus"
          :adaptive-chrome="editorConfig.adaptiveChrome"
          :toolbar-position="editorConfig.toolbarPosition"
          :toolbar-mode="editorConfig.toolbarMode"
          :show-writing-stats="editorConfig.showWritingStats"
          :enable-comments="editorConfig.enableComments"
          :enable-variables="editorConfig.enableVariables"
          :variables="activeVariables"
          :mention-search="demoMentionSearch"
          :save-handler="saveDraft"
        />
      </EditorSheet>

      <div v-if="!editorConfig.writingMode" class="pg-writing-hints" aria-label="Writing tips">
        <span><kbd>/</kbd> for quick commands</span>
        <span>Select text to format or comment</span>
        <span>Use Export to keep a separate copy</span>
      </div>

      <!-- Output -->
      <div v-if="!editorConfig.writingMode" class="pg-output card">
        <div class="out-tabs" role="group" aria-label="Document output">
          <button class="out-tab" :class="{ active: outTab === 'preview' }" :aria-pressed="outTab === 'preview'" @click="outTab = 'preview'">Rendered</button>
          <button class="out-tab" :class="{ active: outTab === 'html' }" :aria-pressed="outTab === 'html'" @click="outTab = 'html'">Source</button>
          <span class="out-meta">{{ charCount.toLocaleString() }} HTML characters</span>
        </div>
        <div v-show="outTab === 'preview'" class="out-preview" v-html="content || placeholderHtml" />
        <div v-show="outTab === 'html'" class="out-html">
          <pre><code>{{ content || '<!-- start typing to see the HTML output -->' }}</code></pre>
        </div>
      </div>
      <ConfirmDialog :is-open="confirmOpen" v-bind="confirmOptions" @confirm="handleConfirm" @cancel="handleCancel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import NextLevelEditor from "../../components/NextLevelEditor.vue";
import { AVAILABLE_THEMES } from "../../composables/useEditorThemes";
import Icon from "../components/Icon.vue";
import EditorSheet from "../components/EditorSheet.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import { useConfirmDialog } from "../../composables/useConfirmDialog";
import { usePlaygroundDocument } from "../composables/usePlaygroundDocument";
import {
  getAllTemplates,
  getTemplateById,
} from "../examples/exampleTemplates";
import { demoMentionSearch } from "../examples/demoTeam";

/**
 * A host-supplied variable set, to show the `variables` prop doing the thing
 * the README promises: these REPLACE the built-in demo fixtures, so the picker
 * never shows "John Doe" when an app supplies its own data.
 */
const HOST_VARIABLES = [
  { id: "user.name", name: "userName", label: "User Name", value: "Ada Lovelace", category: "user" },
  { id: "user.email", name: "userEmail", label: "User Email", value: "ada@example.com", category: "user" },
  { id: "custom.project", name: "project", label: "Project", value: "Analytical Engine", category: "custom" },
  { id: "custom.tier", name: "tier", label: "Plan Tier", value: "Enterprise", category: "custom" },
];

const templates = getAllTemplates();
const editorThemes = AVAILABLE_THEMES;
const toolbarLayouts = [
  { id: "comfortable" as const, label: "Comfortable", description: "Labelled, two-row toolbar." },
  { id: "compact" as const, label: "Compact", description: "One dense, icon-first row." },
];
// `undefined` (not []) when off, so the editor keeps its built-in demo set —
// an empty array would mean "this host wants NO variables".
const activeVariables = computed(() =>
  editorConfig.value.customVariables ? HOST_VARIABLES : undefined
);
const showConfig = ref(false);
const configTrigger = ref<HTMLButtonElement | null>(null);
const closeConfig = () => {
  showConfig.value = false;
  nextTick(() => configTrigger.value?.focus());
};
const outTab = ref<"preview" | "html">("preview");
const documentRevision = ref(0);

const urlParams = new URLSearchParams(window.location.search);
const startEmpty = urlParams.get("empty") === "true";
const { content, selectedTemplate, hasEdits, notice, applyTemplate, saveDraft } = usePlaygroundDocument(startEmpty);
const { isOpen: confirmOpen, options: confirmOptions, requestConfirm, handleConfirm, handleCancel } = useConfirmDialog();
const documentName = computed(() => {
  const doc = new DOMParser().parseFromString(content.value, 'text/html');
  return doc.querySelector('h1')?.textContent?.trim().slice(0, 100) || (selectedTemplate.value === 'empty' ? 'Untitled document' : getTemplateById(selectedTemplate.value)?.name ?? 'Your document');
});

type ViewMode = "editor" | "code" | "split" | "preview";
const DEFAULT_CONFIG = {
  writingMode: true,
  height: "620",
  themePreset: "warm",
  toolbarLayout: "comfortable" as "comfortable" | "compact",
  adaptiveChrome: "off" as "letterbox" | "recede" | "off",
  toolbarPosition: "top" as "top" | "left" | "bottom" | "zen",
  toolbarMode: "bar" as "bar" | "pill",
  showWritingStats: true,
  enableComments: true,
  enableVariables: true,
  // Off by default so the playground opens on the built-in demo set; flipping it
  // shows the `variables` prop replacing that set with the host's own. #R23-46
  customVariables: false,
  readonly: false,
  showToolbar: true,
  defaultViewMode: "editor" as ViewMode,
  autofocus: false,
  placeholder: "Begin anywhere. A thought, a sentence, a story…",
};

// Deep-link overrides so the docs/e2e can showcase each option directly.
const adaptiveChromeParam = urlParams.get("adaptiveChrome");
const editorConfig = ref({
  ...DEFAULT_CONFIG,
  writingMode: urlParams.get('writingMode') !== 'false',
  readonly: urlParams.get("readonly") === "1",
  showToolbar: urlParams.get("hideToolbar") !== "1",
  autofocus: urlParams.get("autofocus") === "1",
  adaptiveChrome: (["letterbox", "recede", "off"].includes(
    adaptiveChromeParam ?? ""
  )
    ? (adaptiveChromeParam as "letterbox" | "recede" | "off")
    : DEFAULT_CONFIG.adaptiveChrome),
  defaultViewMode: (["editor", "code", "split", "preview"].includes(
    urlParams.get("editorView") ?? ""
  )
    ? (urlParams.get("editorView") as ViewMode)
    : "editor") as ViewMode,
});

const editorHeight = computed(() => {
  const height = Number(editorConfig.value.height);
  return `${Number.isFinite(height) && height > 0 ? Math.min(1200, Math.max(300, height)) : 620}px`;
});
const charCount = computed(() => content.value.length);
const placeholderHtml =
  '<p style="color:var(--ink-muted)">Your rendered content will appear here…</p>';

const chooseTemplate = async (id: string) => {
  if (hasEdits.value && content.value) {
    const confirmed = await requestConfirm({
      title: "Replace your document?",
      message: "This will replace your current draft. Export it first if you want to keep a separate copy.",
      confirmLabel: "Replace document",
      cancelLabel: "Keep writing",
      danger: true,
    });
    if (!confirmed) return;
  }
  applyTemplate(id);
  // A new document gets fresh undo/comment/save state. Dispose the old
  // editor's debounce before persisting the replacement, including blanks.
  documentRevision.value++;
  await nextTick();
  try {
    await saveDraft(content.value);
    notice.value = "Your document is saved in this browser.";
  } catch {
    notice.value = "Your document could not be saved locally. Export it to keep a copy.";
  }
};

const loadTemplate = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const requested = select.value;
  select.value = selectedTemplate.value;
  void chooseTemplate(requested);
};

const resetConfig = () => {
  editorConfig.value = { ...DEFAULT_CONFIG };
};

</script>

<style scoped>
.playground { padding: 0; width: 100%; min-height: 0; display: flex; overflow: auto; }
.pg-workspace { position: relative; display: flex; flex-direction: column; width: 100%; max-width: none; padding: 0 24px; min-height: 0; }
.pg-document-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pg-document-heading > div { min-width: 0; }
.pg-document-icon { display: flex; color: var(--ink-soft); }
.pg-document-name { margin: 0 0 2px; font: 600 14px/1.5 var(--font-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-document-actions { display: flex; gap: 6px; flex-shrink: 0; }
.pg-settings { position: absolute; top: 64px; right: 24px; width: min(800px, calc(100% - 48px)); max-height: 75vh; overflow: auto; background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow-lg); padding: 16px; border-radius: 12px; z-index: 10020; }
.playground:not(.is-writing) .pg-settings { position: static; width: 100%; max-height: none; overflow: visible; box-shadow: none; padding: 0; border: 0; }
.playground:not(.is-writing) .pg-workspace { display: block; padding-top: 18px; }
.is-writing .pg-editor { flex: 1; min-height: 0; margin: 0 0 16px; overflow: visible; border-radius: 10px; box-shadow: 0 2px 12px #00000006; }
.is-writing .pg-head { margin: 0; padding: 14px 2px; gap: 16px; min-height: 72px; flex-shrink: 0; }
.is-writing .draft-notice { margin: -4px 0 8px 2px; padding: 0; border: 0; background: none; font-size: 11px; }
.is-writing .pg-editor :deep(.editor-footer) { min-height: 43px; }
.pg-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.pg-head .eyebrow { display: inline-flex; }
.pg-title { font-size: clamp(1.75rem, 3vw, 2.5rem); margin: 7px 0 8px; }
.pg-head .lede { font-size: 15px; margin: 0; max-width: 680px; }
.pg-head > .btn { flex-shrink: 0; }
.draft-hint { font-size: 12px; color: var(--ink-soft); }
.draft-notice { padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-subtle); color: var(--ink-soft); font-size: 13px; }
.pg-writing-hints { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px 24px; margin: -4px 0 24px; color: var(--ink-soft); font-size: 12px; }
.pg-writing-hints kbd { border: 1px solid var(--border-strong); border-radius: 4px; padding: 2px 6px; font: inherit; background: var(--bg-subtle); }
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
.toggle { position: relative; display: flex; align-items: center; gap: 12px; min-height: 44px; cursor: pointer; }
.toggle input { position: absolute; width: 1px; height: 1px; padding: 0; border: 0; clip: rect(0, 0, 0, 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
.toggle input:focus-visible + .toggle-track { outline: 2px solid var(--accent); outline-offset: 4px; }
.toggle-track { position: relative; width: 40px; height: 23px; border-radius: 999px; background: var(--border-strong); flex-shrink: 0; transition: background 0.2s; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: transform 0.2s var(--ease); }
.toggle input:checked + .toggle-track { background: var(--brand-500); }
.toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(17px); }
.toggle-text { display: flex; flex-direction: column; line-height: 1.3; }
.toggle-text strong { font-size: 13.5px; }
.toggle-text small { font-size: 12px; color: var(--ink-soft); }
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
.pg-theme-chip.active { background: var(--accent-fill); border-color: var(--accent-fill); color: #fff; }

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
  .playground { padding-top: 20px; }
  .pg-head { align-items: flex-start; flex-direction: column; gap: 14px; }
  .pg-title { font-size: 1.8rem; }
  .pg-head { margin-bottom: 16px; }
  .pg-head .eyebrow, .pg-head .lede { display: none; }
  .pg-controls { padding: 12px; }
  .draft-hint { flex: 1; }
  .pg-themes { gap: 10px; }
  .pg-themes:not(.is-expanded) { display: none; }
  .pg-themes-label { flex-basis: 100%; }
  .pg-density-label { margin-left: 0; }
  .pg-theme-chip { min-height: 40px; padding: 7px 12px; }
  .pg-writing-hints { font-size: 11px; }
  /* Give the template picker its own full-width row so its label isn't clipped;
     the config/star buttons wrap onto the next line. */
  .ctrl-group { flex: 1 1 100%; }
  .select-wrap { flex: 1; }
  .select { min-width: 0; width: 100%; }
  .ctrl-spacer { display: none; }
  .playground { padding-top: 0; }
  .pg-workspace { padding: 0; }
  .is-writing .pg-head { flex-direction: row; padding: 10px 14px; min-height: 60px; gap: 10px; align-items: center; }
  .pg-document-icon, .pg-document-heading .draft-hint, .pg-document-actions .btn svg { display: none; }
  .pg-document-actions { gap: 0; }
  .pg-document-actions .btn { padding: 7px; font-size: 11px; }
  .pg-document-name { font-size: 12px; }
  .is-writing .pg-editor { margin: 0; border-radius: 0; border-inline: 0; border-bottom: 0; }
  .pg-settings { right: 8px; width: calc(100% - 16px); padding: 12px; top: 56px; }
}

@media (prefers-reduced-motion: reduce) {
  .fade-down-enter-active, .fade-down-leave-active, .toggle-track, .toggle-thumb, .pg-theme-chip { transition: none; }
}

@media (max-height: 500px) {
  .playground.is-writing { overflow: visible; }
  .is-writing .pg-workspace { display: block; padding: 0; }
  .is-writing .pg-head { min-height: 48px; padding: 6px 14px; }
  .is-writing .pg-editor { flex: none; height: calc(100dvh - 8px); min-height: calc(260px + var(--nle-mobile-toolbar-clearance, 0px)); margin: 0; border-radius: 0; }
  .is-writing .pg-settings { position: fixed; top: 8px; right: 8px; width: calc(100% - 16px); max-height: calc(100dvh - 16px); }
}
</style>
