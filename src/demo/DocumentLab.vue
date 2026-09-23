<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from "vue";
import NextLevelEditor from "../components/NextLevelEditor.vue";
import Icon from "./components/Icon.vue";
import { createIndexedDbVersionStore } from "../utils/versionStore";
import { createMemoryCollaborationProvider } from "../utils/memoryCollaboration";
import { createWebSocketCollaborationProvider } from "../utils/webSocketCollaboration";
import { arabicMessages } from './examples/arabicMessages';
import {
  defaultDocumentMetadata,
  type AiAdapter,
  type DocumentMetadata,
  type DocumentRole,
} from "../types/document";
const params = new URLSearchParams(location.search);
const initial =
  '<h1 data-nle-id="nle-heading">A better document</h1><p data-nle-id="nle-intro">Write, review, and share a clear story.</p><h2 data-nle-id="nle-plan">A practical plan</h2><ul data-nle-id="nle-list"><li>Keep your versions.</li><li>Make every word count.</li></ul><table data-nle-id="nle-table"><tbody><tr><th>Chapter</th><th>Status</th></tr><tr><td>Introduction</td><td>Ready</td></tr></tbody></table>';
const content = ref(initial),
  peerContent = ref(initial),
  locale = ref(params.get('locale') || 'en'),
  language = ref("en"),
  direction = ref<"auto" | "ltr" | "rtl">("auto");
const collaborative = ref(params.get("collaboration") === "true"),
  role = ref<DocumentRole>("author");
const messages = computed(() => locale.value.startsWith('ar') ? arabicMessages : undefined);
const id = ref(params.get("document") || "document-lab");
const metadata = shallowRef<DocumentMetadata>(defaultDocumentMetadata());
const store = createIndexedDbVersionStore({ database: "nle-document-lab" }),
  provider = createMemoryCollaborationProvider();
const networkMode = params.get("transport") === "websocket",
  networkConnected = ref(false),
  token = ref("");
const networkEndpoint = params.get("endpoint") || "ws://127.0.0.1:5281";
const networkProvider = networkMode
  ? createWebSocketCollaborationProvider({
      url: networkEndpoint,
      getToken: async () => token.value,
    })
  : undefined;
const ai: AiAdapter = {
  name: "Local demonstration (no network)",
  async generate(request, onPreview) {
    const text = "Clear: " + request.selection;
    onPreview(text);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 80);
      request.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Cancelled", "AbortError"));
        },
        { once: true },
      );
    });
    const p = document.createElement("p");
    p.textContent = text;
    return { html: p.outerHTML };
  },
};
const options = computed(() => ({
  id: id.value,
  store,
  metadata: metadata.value,
  role: role.value,
  author: "Ana",
  ai,
  localRecovery: false,
}));
const peerOptions = computed(() => ({ id: id.value, author: "Bruno" }));
const collaboration = computed(() =>
  networkConnected.value
    ? {
        provider: networkProvider!,
        user: { id: "ana", name: "Ana", color: "#2563eb" },
      }
    : collaborative.value
      ? { provider, user: { id: "ana", name: "Ana", color: "#2563eb" } }
      : undefined,
);
const peerCollaboration = {
  provider,
  user: { id: "bruno", name: "Bruno", color: "#9333ea" },
};
const showSettings = ref(false);
const settingsTrigger = ref<HTMLButtonElement>();
function closeSettings() {
  showSettings.value = false;
  nextTick(() => settingsTrigger.value?.focus());
}
</script>
<template>
  <main class="document-lab">
    <header class="lab-header">
      <a class="lab-back" href="?view=playground" aria-label="Back to playground">
        <Icon name="arrow" :size="18" />
        <span>Playground</span>
      </a>
      <div class="lab-heading">
        <span class="lab-mark" aria-hidden="true"><Icon name="pen" :size="22" /></span>
        <div>
          <h1>Document workspace</h1>
          <p>Write, review, and prepare your next draft.</p>
        </div>
      </div>
      <span class="lab-local"><Icon name="shield" :size="15" /> Local demo</span>
    </header>
    <form
      v-if="networkMode && !networkConnected"
      class="lab-network"
      @submit.prevent="networkConnected = true"
    >
      <p>
        Connect to your configured collaboration server: {{ networkEndpoint }}
      </p>
      <label>
        Access token
        <input v-model="token" type="password" required autocomplete="off">
      </label>
      <button>Connect to server</button>
    </form>
    <div class="lab-controls" role="group" aria-label="Workspace controls">
      <label class="lab-collaboration">
        <input v-model="collaborative" type="checkbox">
        <span class="lab-switch" aria-hidden="true" />
        <span>Two editors</span>
      </label>
      <span class="lab-control-divider" aria-hidden="true" />
      <label>
        Interface
        <select v-model="locale" aria-label="Interface">
          <option value="en">English</option>
          <option value="pt-PT">Português</option>
          <option value="ar-EG-u-nu-arab">العربية · host dictionary</option>
        </select>
      </label>
      <label>
        Role
        <select v-model="role" aria-label="Role">
          <option value="author">Author</option>
          <option value="reviewer">Reviewer</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>
      <button ref="settingsTrigger" class="lab-settings-trigger" type="button" :aria-expanded="showSettings" aria-controls="lab-settings" @click="showSettings = !showSettings">
        <Icon name="menu" :size="16" /> Settings
      </button>
    </div>
    <section v-show="showSettings" id="lab-settings" class="lab-settings" aria-label="Workspace settings" @keydown.esc.stop="closeSettings">
      <label>
        Document language
        <input v-model="language" spellcheck="false" placeholder="en / pt-PT">
      </label>
      <label>
        Direction
        <select v-model="direction" aria-label="Direction">
          <option value="auto">Automatic</option>
          <option value="ltr">Left to right</option>
          <option value="rtl">Right to left</option>
        </select>
      </label>
      <p>Language and direction apply to your document. Interface language only changes the controls.</p>
      <button type="button" @click="closeSettings">Done</button>
    </section>
    <div v-if="collaborative" class="lab-pair-note">
      <Icon name="layers" :size="16" /> Two views of the same document. Changes appear in both editors.
    </div>
    <div :class="['lab-editors', { 'lab-paired': collaborative }]">
      <div data-testid="primary">
        <h2 v-if="collaborative" class="lab-author"><span class="lab-avatar">A</span> Ana <span>Your editor</span></h2>
        <NextLevelEditor
          :key="id + String(collaborative) + String(networkConnected)"
          v-model="content"
          document-tools
          enable-comments
          :document-options="options"
          :collaboration="collaboration"
          :locale="locale"
          :messages="messages"
          :content-language="language"
          :content-direction="direction"
          height="100%"
          @document-change="metadata = $event.metadata"
        />
      </div>
      <div v-if="collaborative" data-testid="peer">
        <h2 class="lab-author"><span class="lab-avatar lab-avatar-peer">B</span> Bruno <span>Linked editor</span></h2>
        <NextLevelEditor
          v-model="peerContent"
          document-tools
          enable-comments
          :document-options="peerOptions"
          :collaboration="peerCollaboration"
          height="100%"
        />
      </div>
    </div>
    <footer class="lab-footer">
      <span>Checkpoints stay in this browser.</span>
      <span>AI demonstration runs locally.</span>
    </footer>
  </main>
</template>
<style scoped>
.document-lab {
  --lab-bg: #f3f5f9;
  --lab-surface: #fff;
  --lab-ink: #202939;
  --lab-muted: #596579;
  --lab-border: #dce2eb;
  --lab-accent: #2457d6;
  --lab-tint: #e7edfc;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 420px;
  padding: 0 clamp(12px, 2.2vw, 36px);
  background: var(--lab-bg);
  color: var(--lab-ink);
  font: 14px/1.5 system-ui, sans-serif;
  color-scheme: light;
}
.document-lab:has([data-testid="primary"] > .theme-dark) {
  --lab-bg: #111827;
  --lab-surface: #1e293b;
  --lab-ink: #edf2f9;
  --lab-muted: #aab8cc;
  --lab-border: #354155;
  --lab-accent: #99b9ff;
  --lab-tint: #243759;
  color-scheme: dark;
}
.lab-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-block: 22px 18px;
  flex: none;
}
.lab-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--lab-muted);
}
.lab-back .ic { transform: rotate(180deg); }
.lab-back:hover { color: var(--lab-accent); }
.lab-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.lab-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid var(--lab-border);
  border-radius: 12px;
  background: var(--lab-surface);
  color: var(--lab-accent);
}
.lab-heading h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.035em; line-height: 1.3; }
.lab-heading p { margin: 3px 0 0; color: var(--lab-muted); }
.lab-local { display: inline-flex; align-items: center; gap: 6px; margin-inline-start: auto; color: var(--lab-muted); white-space: nowrap; font-size: 12px; }
.lab-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 10px 0 14px;
  flex: none;
}
.lab-controls label { display: flex; align-items: center; gap: 8px; color: var(--lab-muted); }
.lab-control-divider { height: 24px; width: 1px; background: var(--lab-border); }
.lab-controls select { max-width: 165px; }
.document-lab input,
.document-lab select,
.document-lab button { font: inherit; }
.lab-controls select,
.lab-settings select,
.lab-settings input,
.lab-network input,
.lab-settings button,
.lab-controls button,
.lab-network button {
  min-height: 38px;
  min-width: 0;
  padding: 7px 11px;
  border: 1px solid var(--lab-border);
  border-radius: 8px;
  background: var(--lab-surface);
  color: var(--lab-ink);
}
.lab-controls button,
.lab-settings button,
.lab-network button { cursor: pointer; }
.lab-settings-trigger { display: inline-flex; align-items: center; justify-content: center; gap: 7px; margin-inline-start: auto; }
.lab-controls button:hover,
.lab-settings button:hover { border-color: var(--lab-accent); }
.lab-settings-trigger[aria-expanded="true"] { background: var(--lab-tint); color: var(--lab-accent); border-color: var(--lab-accent); }
.lab-collaboration { position: relative; min-height: 44px; cursor: pointer; }
.lab-collaboration input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.lab-switch { width: 30px; height: 18px; padding: 2px; border-radius: 12px; background: var(--lab-muted); flex: none; }
.lab-switch::after { content: ''; display: block; width: 14px; height: 14px; border-radius: 50%; background: #fff; }
.lab-collaboration input:checked + .lab-switch { background: #2457d6; }
.lab-collaboration input:checked + .lab-switch::after { transform: translateX(12px); }
.lab-collaboration input:focus-visible + .lab-switch { outline: 3px solid var(--lab-accent); outline-offset: 3px; }
.lab-settings {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid var(--lab-border);
  border-radius: 10px;
  background: var(--lab-surface);
}
.lab-settings label { display: flex; flex-direction: column; gap: 6px; }
.lab-settings input { max-width: 160px; }
.lab-settings p { flex: 1 1 220px; max-width: 440px; margin: 0; color: var(--lab-muted); }
.lab-settings button { margin-inline-start: auto; }
.lab-network { padding: 16px; margin-bottom: 12px; border: 1px solid var(--lab-border); border-radius: 10px; }
.lab-network p { margin-top: 0; overflow-wrap: anywhere; }
.lab-network label { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-inline-end: 10px; }
.lab-pair-note { display: flex; gap: 8px; align-items: center; padding-bottom: 12px; color: var(--lab-muted); }
.lab-author { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 14px; font-weight: 600; }
.lab-author > span:last-child { color: var(--lab-muted); font-size: 12px; font-weight: 400; margin-inline-start: auto; }
.lab-avatar { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; background: #2457d6; font-size: 12px; }
.lab-avatar-peer { background: #7952ac; }
.lab-editors { display: grid; gap: 20px; min-width: 0; min-height: 0; flex: 1; }
.lab-editors > div { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.lab-editors :deep(.next-level-editor:not(.fullscreen):not(.is-focus)) {
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  box-shadow: 0 3px 18px rgb(16 24 40 / 5%);
}
.lab-editors :deep(.nle-toolbar-shell) { --font-sans: system-ui, sans-serif; }
.lab-paired { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.document-lab:has(.nle-document-tools:not(.is-docked) .document-tools-panel) { height: auto; min-height: 100dvh; }
.lab-editors > div:has(.nle-document-tools:not(.is-docked) .document-tools-panel) { min-height: max(650px, calc(100dvh - 170px)); }
.lab-footer { display: flex; justify-content: space-between; gap: 10px; padding-block: 10px; color: var(--lab-muted); font-size: 12px; }
.lab-back:focus-visible,
.lab-controls select:focus-visible,
.lab-controls button:focus-visible,
.lab-settings :focus-visible,
.lab-network :focus-visible { outline: 3px solid var(--lab-accent); outline-offset: 3px; }
@media (max-width: 850px) {
  .lab-header { gap: 14px; padding-block: 14px; }
  .lab-back span, .lab-local { display: none; }
  .lab-paired { grid-template-columns: minmax(0, 1fr); }
  .document-lab:has(.lab-paired) { height: auto; min-height: 100dvh; }
  .lab-paired > div { height: max(520px, 75dvh); }
}
@media (max-width: 600px) {
  .document-lab { padding-inline: 10px; }
  .lab-heading h1 { font-size: 18px; }
  .lab-heading p { display: none; }
  .lab-mark { width: 36px; height: 36px; border-radius: 10px; }
  .lab-header { padding-block: 8px; gap: 8px; }
  .lab-back { width: 30px; justify-content: center; }
  .lab-controls { gap: 6px 12px; padding-block: 0 10px; }
  .lab-controls label { gap: 6px; font-size: 12px; }
  .lab-collaboration { order: 2; flex: 1; }
  .lab-control-divider { display: none; }
  .lab-settings-trigger { order: 3; }
  .lab-controls select { max-width: 135px; }
  .lab-controls select, .lab-controls button, .lab-settings button,
  .lab-settings input, .lab-settings select { min-height: 44px; }
  .lab-controls label:not(.lab-collaboration) { flex: 1; justify-content: space-between; }
  .lab-controls label:nth-of-type(3) { justify-content: flex-end; }
  .lab-controls .lab-collaboration { font-size: 14px; }
  .lab-footer { font-size: 12px; flex-wrap: wrap; padding-block: 8px; }
  .lab-footer span:last-child { display: none; }
  .lab-settings { max-height: 45dvh; overflow-y: auto; padding: 12px; }
}
@media (max-height: 500px) {
  .document-lab { height: auto; min-height: 100dvh; }
  .lab-header { padding-block: 6px; }
  .lab-editors > div { min-height: 420px; }
}
@media print {
  .document-lab { display: block; height: auto; padding: 0; background: white; }
  .lab-header, .lab-controls, .lab-settings, .lab-footer, .lab-pair-note, .lab-author, .lab-network { display: none; }
}
</style>
