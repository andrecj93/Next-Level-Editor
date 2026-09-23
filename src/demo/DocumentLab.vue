<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import NextLevelEditor from "../components/NextLevelEditor.vue";
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
</script>
<template>
  <main class="document-lab">
    <header>
      <a href="?view=playground">← Playground</a>
      <h1>Document workspace</h1>
      <p>
        Explore document tools with local storage. The AI demonstration stays in
        your browser. Two linked editors demonstrate coauthoring.
      </p>
    </header>
    <form
      v-if="networkMode && !networkConnected"
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
    <div class="lab-controls">
      <label>
        Interface
        <select v-model="locale" aria-label="Interface">
          <option value="en">English</option>
          <option value="pt-PT">Português</option>
          <option value="ar-EG-u-nu-arab">العربية · host dictionary</option>
        </select>
      </label>
      <label>
        Document language
        <input v-model="language">
      </label>
      <label>
        Direction
        <select v-model="direction" aria-label="Direction">
          <option value="auto">Auto</option>
          <option>ltr</option>
          <option>rtl</option>
        </select>
      </label>
      <label>
        Role
        <select v-model="role" aria-label="Role">
          <option>author</option>
          <option>reviewer</option>
          <option>viewer</option>
        </select>
      </label>
      <label>
        <input v-model="collaborative" type="checkbox">
        Two editors
      </label>
    </div>
    <div :class="['lab-editors', { 'lab-paired': collaborative }]">
      <div data-testid="primary">
        <h2 v-if="collaborative">Ana</h2>
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
          height="650px"
          @document-change="metadata = $event.metadata"
        />
      </div>
      <div v-if="collaborative" data-testid="peer">
        <h2>Bruno</h2>
        <NextLevelEditor
          v-model="peerContent"
          document-tools
          enable-comments
          :document-options="peerOptions"
          :collaboration="peerCollaboration"
          height="650px"
        />
      </div>
    </div>
  </main>
</template>
<style scoped>
.document-lab {
  max-width: 1440px;
  margin: auto;
  padding: 24px;
  color: #1e293b;
  font-family: system-ui, sans-serif;
}
.document-lab header {
  max-width: 800px;
  margin-bottom: 20px;
}
.document-lab h1 {
  font-size: 32px;
  letter-spacing: -0.04em;
  margin-block: 12px;
}
.document-lab p {
  color: #475569;
}
.lab-controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 0;
}
.lab-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lab-controls select,
.lab-controls input:not([type="checkbox"]) {
  max-width: 130px;
  padding: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.lab-editors {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.lab-editors > div {
  min-width: 0;
}
.lab-paired {
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 850px) {
  .lab-paired {
    grid-template-columns: 1fr;
  }
  .document-lab {
    padding: 12px;
  }
}
</style>
