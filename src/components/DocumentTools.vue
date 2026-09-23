<script setup lang="ts">
import { computed, ref, shallowRef, watch, nextTick, defineAsyncComponent } from "vue";
import type { useDocumentWorkspace } from "../composables/useDocumentWorkspace";
import type {
  DocumentOptions,
  PageSettings,
  TemplateField,
  TemplateValue,
  AiRequest,
} from "../types/document";
import { useEditorLocale } from "../composables/useEditorLocale";
import { cloneDocument } from "../utils/documentDiagnostics";
import { htmlText } from "../utils/documentOperations";
import { useStableId } from "../utils/useStableId";
const props = defineProps<{
  workspace: ReturnType<typeof useDocumentWorkspace>;
  options?: DocumentOptions;
  connection?: string;
  participants?: string[];
  collaborative?: boolean;
}>();
const w = props.workspace;
const DocumentPdfPreview = defineAsyncComponent(() => import("./DocumentPdfPreview.vue"));
const { t, number, locale, date, direction: uiDirection } = useEditorLocale();
const id = useStableId();
const trigger = ref<HTMLButtonElement>();
const root = ref<HTMLElement>();
const compactTabs = ref(true);
const dockPanel = ref(false);
watch(root, (element, _previous, onCleanup) => {
  if (!element) return;
  // Measure the editor, not the space left after docking, to avoid a resize loop.
  const container = element.closest('.next-level-editor') ?? element;
  const measure = () => {
    dockPanel.value = container.clientWidth >= 1100;
    compactTabs.value = container.clientWidth < 700;
  };
  measure();
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(measure);
  observer.observe(container);
  onCleanup(() => observer.disconnect());
});
const tabs = [
  "Versions",
  "Import Word",
  "Export and pages",
  "Accessibility",
  "Review",
  "AI writing",
  "References",
  "Structure",
  "Templates",
  "Collaboration",
];
const tabIcons = [
  'M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v5l3 2',
  'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6m-3-3 3 3 3-3',
  'M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4',
  'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M4 9l8 2 8-2M12 11v5m0 0-4 5m4-5 4 5',
  'M4 4h16v13H9l-5 4zM8 9h8M8 13h5',
  'm4 20 4-1L20 7l-3-3L5 16zM14 7l3 3M4 4h5M6.5 1.5v5',
  'M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
  'M4 5h16M4 12h4M12 12h8M4 19h4M12 19h8',
  'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8M22 21v-2a7 7 0 0 0-4-6',
];
const tabDescriptions = computed<Record<string, string>>(() => ({
  Versions: t('Save a checkpoint to compare drafts or return to an earlier version.'),
  'Import Word': t('Preview a Word document before adding it to your draft.'),
  'Export and pages': t('Set up your pages, preview the result, and download your document.'),
  Accessibility: t('Find potential barriers in your document and review suggested fixes.'),
  Review: t('Suggest edits and review changes before accepting them.'),
  'AI writing': t('Preview a suggestion before applying it to your writing.'),
  References: t('Keep sources, citations, and notes together.'),
  Structure: t('Navigate and rearrange the building blocks of your document.'),
  Templates: t('Define fields and preview a document with your own data.'),
  Collaboration: t('See the connection status and people editing this document.'),
}));
watch([w.open, w.tab, compactTabs], async ([open]) => {
  if (!open) return;
  await nextTick();
  root.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
});
const label = ref(""),
  acknowledge = ref(false),
  fixValues = ref<Record<string, string>>({});
const action = ref<AiRequest["action"]>("clarify"),
  instruction = ref(""),
  shareDocument = ref(false);
const note = ref(""),
  author = ref(""),
  title = ref(""),
  year = ref(""),
  publisher = ref(""),
  url = ref("");
const sourceType = ref<"book" | "webpage">("book"),
  locator = ref(""),
  editingSource = ref(""),
  editingNote = ref("");
const chapter = ref(true);
const previewBlockId = ref("");
const chapterPreview = computed(() => {
  const blocks = w.blocks.value;
  const start = blocks.findIndex((block) => block.id === previewBlockId.value);
  if (start < 0) return [];
  const level = /^H[1-6]$/.test(blocks[start].tag) ? Number(blocks[start].tag[1]) : 0;
  let end = start + 1;
  if (chapter.value && level) {
    while (end < blocks.length && !(/^H[1-6]$/.test(blocks[end].tag) && Number(blocks[end].tag[1]) <= level)) end++;
  }
  return blocks.slice(start, end);
});
const page = ref<PageSettings>(cloneDocument(w.session.metadata.value.page));
const fields = shallowRef<TemplateField[]>([]),
  data = ref<Record<string, string>>({});
const visibleFindings = computed(() =>
  w.findings.value.filter((f) => !w.ignored.value.has(f.id)),
);
const compareId = ref(""),
  datasetName = ref(""),
  activeDataset = ref(""),
  sectionField = ref("");
const reviewSelection = ref<string[]>([]);
function valuesFromInputs() {
  const values: Record<string, TemplateValue> = Object.create(null);
  for (const field of fields.value) {
    const raw = data.value[field.name];
    if (raw === undefined || raw === "") continue;
    values[field.name] =
      field.type === "number"
        ? Number(raw)
        : field.type === "boolean"
          ? raw === "true"
          : field.type === "list"
            ? JSON.parse(raw)
            : raw;
  }
  return values;
}
function saveDataset() {
  const name = datasetName.value.trim();
  if (!name) throw new Error("Enter a dataset name.");
  const values = valuesFromInputs();
  w.session.transact((value) => {
    value.metadata.templateDatasets = [
      ...(value.metadata.templateDatasets ?? []).filter((d) => d.name !== name),
      { name, values },
    ];
  });
  activeDataset.value = name;
}
function chooseDataset() {
  const dataset = w.session.metadata.value.templateDatasets?.find(
    (d) => d.name === activeDataset.value,
  );
  data.value = {};
  if (dataset)
    for (const [key, value] of Object.entries(dataset.values))
      data.value[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
  if (dataset) previewTemplate();
  else w.templatePreview.value = null;
}
function updateDefault(field: TemplateField, event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  field.default =
    raw === ""
      ? undefined
      : field.type === "number"
        ? Number(raw)
        : field.type === "boolean"
          ? raw === "true"
          : field.type === "list"
            ? JSON.parse(raw)
            : raw;
  fields.value = [...fields.value];
}
watch(
  () => w.open.value,
  (value) => {
    if (value) {
      page.value = cloneDocument(w.session.metadata.value.page);
      fields.value = cloneDocument(w.session.metadata.value.templateFields);
    }
  },
);
function toggle() {
  if (w.open.value) {
    close();
    return;
  }
  w.captureSelection();
  if (!tabs.includes(w.tab.value)) w.tab.value = tabs[0];
  w.open.value = true;
}
function close() {
  if (w.tab.value === "Export and pages" && w.pdf.value) {
    returnToWriting();
    return;
  }
  w.open.value = false;
  nextTick(() => trigger.value?.focus());
}
function returnToWriting() {
  w.open.value = false;
  nextTick(() => w.restoreEditingSelection());
}
function tabKey(event: KeyboardEvent, index: number) {
  let next = index;
  if (!compactTabs.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    next = (index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
  }
  else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    const delta = (event.key === 'ArrowRight' ? 1 : -1) * (uiDirection.value === 'rtl' ? -1 : 1);
    next = (index + delta + tabs.length) % tabs.length;
  }
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else return;
  event.preventDefault();
  w.tab.value = tabs[next];
  const buttons = (
    event.currentTarget as HTMLElement
  ).parentElement?.querySelectorAll<HTMLButtonElement>("button");
  buttons?.[next]?.focus();
  buttons?.[next]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}
function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void w.run(() => w.readWord(file));
  input.value = "";
  acknowledge.value = false;
}
function compare(versionHtml: string) {
  const before =
    w.session.versions.value.find((v) => v.id === compareId.value)?.html ??
    w.session.snapshot().html;
  w.comparison.value = w.compareDocuments(before, versionHtml);
}
function previewTemplate() {
  w.previewTemplate(fields.value, valuesFromInputs());
}
async function saveSource() {
  const value = {
    author: author.value,
    title: title.value,
    year: year.value,
    publisher: publisher.value,
    url: url.value,
    type: sourceType.value,
    locator: locator.value,
  };
  if (editingSource.value)
    await w.updateReference("source", editingSource.value, value);
  else w.addSource(value);
  editingSource.value = "";
  title.value = "";
}
async function saveNote() {
  if (editingNote.value)
    await w.updateReference("note", editingNote.value, note.value);
  else await w.addNote(note.value);
  editingNote.value = "";
  note.value = "";
}
function editSource(source: (typeof w.session.metadata.value.sources)[number]) {
  editingSource.value = source.id;
  author.value = source.author;
  title.value = source.title;
  year.value = source.year;
  publisher.value = source.publisher ?? "";
  url.value = source.url ?? "";
  sourceType.value = source.type ?? "book";
  locator.value = source.locator ?? "";
}
</script>

<template>
  <div ref="root" class="nle-document-tools" :lang="locale" :class="{ 'compact-tabs': compactTabs, 'is-docked': dockPanel }">
    <div class="document-tool-bar">
      <button
        ref="trigger"
        class="document-tools-trigger"
        type="button"
        :aria-expanded="w.open.value"
        :aria-controls="id + '-panel'"
        @pointerdown="w.captureSelection()"
        @click="toggle"
      >
        <svg viewBox="0 0 24 24" class="document-icon" aria-hidden="true"><path d="M4 4h16v16H4zM9 4v16M13 9h3M13 13h3" /></svg>
        {{ t("Document tools") }}
        <svg viewBox="0 0 24 24" class="document-icon document-chevron" :class="{ 'is-open': w.open.value }" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <span v-if="options?.store" class="document-status" :data-state="w.session.status.value" role="status">
        <svg v-if="w.session.status.value === 'ready' || w.session.status.value === 'saved'" viewBox="0 0 24 24" class="document-icon" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>
        {{ t(w.session.status.value) }}
      </span>
      <span v-if="collaborative" role="status">
        {{ t(connection || "Connecting") }}
      </span>
      <span v-if="w.readonly.value" class="document-readonly">{{ t("Read only") }}</span>
      <button
        v-if="w.session.recovery.value"
        type="button"
        @click="
          w.open.value = true;
          w.tab.value = 'Versions';
        "
      >
        {{ t("Local recovery available") }}
      </button>
    </div>
    <section
      v-if="w.open.value"
      :id="id + '-panel'"
      class="document-tools-panel"
      :class="{ 'has-page-preview': w.tab.value === 'Export and pages' && w.pdf.value }"
      :aria-label="t('Document tools')"
      @keydown.esc.stop="close"
    >
      <header class="document-panel-heading">
        <strong>{{ t("Document tools") }}</strong>
        <button class="document-close" type="button" @click="close">
          {{ t("Close") }}
          <svg viewBox="0 0 24 24" class="document-icon" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </header>
      <div class="document-tool-workspace">
      <div
        role="tablist"
        :aria-orientation="compactTabs ? 'horizontal' : 'vertical'"
        :aria-label="t('Document tools')"
        class="document-tool-tabs"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="id + '-tab-' + index"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="w.tab.value === tab"
          :tabindex="w.tab.value === tab ? 0 : -1"
          :aria-controls="id + '-body'"
          @click="w.tab.value = tab"
          @keydown="tabKey($event, index)"
        >
          <svg viewBox="0 0 24 24" class="document-icon" aria-hidden="true"><path :d="tabIcons[index]" /></svg>
          {{ t(tab) }}
        </button>
      </div>
      <div class="document-tool-main">
      <p
        v-if="w.error.value || w.session.error.value"
        role="alert"
        class="document-error"
      >
        {{ t(w.error.value || w.session.error.value) }}
      </p>
      <p v-if="w.message.value" class="document-notice" role="status">{{ t(w.message.value) }}</p>
      <div v-if="w.busy.value" class="document-actions" role="status">
        <progress
          :value="w.progress.value || undefined"
          max="100"
          :aria-label="t('Progress')"
        />
        <button type="button" @click="w.cancel">{{ t("Cancel") }}</button>
      </div>
      <div
        :id="id + '-body'"
        role="tabpanel"
        :aria-labelledby="id + '-tab-' + tabs.indexOf(w.tab.value)"
        tabindex="0"
        class="document-tool-body"
      >
        <div class="document-section-heading">
          <h3>{{ t(w.tab.value) }}</h3>
          <p>{{ tabDescriptions[w.tab.value] }}</p>
        </div>
        <template v-if="w.tab.value === 'Versions'">
          <div v-if="w.session.recovery.value" class="document-card">
            <strong>{{ t("Local recovery available") }}</strong>
            <div
              class="document-preview"
              v-html="w.session.recovery.value.html"
            />
            <div class="document-actions">
              <button
                :disabled="w.readonly.value"
                @click="w.run(w.session.acceptRecovery)"
              >
                {{ t("Recover draft") }}
              </button>
              <button @click="w.session.discardRecovery">
                {{ t("Keep current draft") }}
              </button>
            </div>
          </div>
          <template v-if="options?.store">
            <form
              class="document-actions"
              @submit.prevent="
                w.run(() => w.session.checkpoint(label || t('Checkpoint')))
              "
            >
              <label>
                {{ t("Checkpoint name") }}
                <input v-model="label" maxlength="120">
              </label>
              <button
                class="document-primary"
                :disabled="
                  w.readonly.value ||
                  ['loading', 'saving'].includes(w.session.status.value)
                "
              >
                {{ t("Save checkpoint") }}
              </button>
              <button type="button" @click="w.run(w.session.refresh)">
                {{ t("Refresh versions") }}
              </button>
            </form>
            <label v-if="w.session.versions.value.length">
              {{ t("Compare against") }}
              <select v-model="compareId">
                <option value="">{{ t("Current draft") }}</option>
                <option
                  v-for="version in w.session.versions.value"
                  :key="version.id"
                  :value="version.id"
                >
                  {{ version.label }} · {{ number(version.revision) }}
                </option>
              </select>
            </label>
            <div v-if="!w.session.versions.value.length" class="document-empty">
              <svg viewBox="0 0 24 24" class="document-icon" aria-hidden="true"><path :d="tabIcons[0]" /></svg>
              <div><strong>{{ t("No saved versions yet.") }}</strong><p>{{ t('Give this draft a name, then save your first checkpoint.') }}</p></div>
            </div>
            <ol class="document-cards">
              <li
                v-for="version in [...w.session.versions.value].reverse()"
                :key="version.id"
                class="document-card"
              >
                <strong>{{ version.label }}</strong>
                <time :datetime="version.createdAt">
                  {{ date(version.createdAt) }}
                </time>
                <div class="document-actions">
                  <button @click="compare(version.html)">
                    {{ t("Compare") }}
                  </button>
                  <button
                    :disabled="
                      w.readonly.value || w.session.status.value === 'saving'
                    "
                    @click="w.run(() => w.session.restore(version))"
                  >
                    {{ t("Restore") }}
                  </button>
                </div>
              </li>
            </ol>
            <div
              v-if="w.comparison.value"
              class="document-diff"
              aria-live="polite"
            >
              <p v-if="w.comparison.value.formattingChanged">
                {{ t("Formatting changed.") }}
              </p>
              <span
                v-for="(change, index) in w.comparison.value.changes"
                :key="index"
                :class="{ added: change.added, removed: change.removed }"
              >
                {{ change.value }}
              </span>
            </div>
          </template>
          <p v-else>
            {{ t("Document history is unavailable for this document.") }}
          </p>
        </template>
        <template v-else-if="w.tab.value === 'Import Word'">
          <label>
            {{ t("Choose a Word document") }}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              :disabled="w.busy.value || w.readonly.value"
              @change="selectFile"
            >
          </label>
          <p>{{ t("No content changes until you import.") }}</p>
          <template v-if="w.importReport.value">
            <h3>{{ t("Conversion report") }}</h3>
            <p>{{ w.importReport.value.converter }}</p>
            <p>
              {{ t('{count} paragraphs', { count: w.importReport.value.structures.paragraphs }) }} ·
              {{ t('{count} headings', { count: w.importReport.value.structures.headings }) }} ·
              {{ t('{count} tables', { count: w.importReport.value.structures.tables }) }} ·
              {{ t('{count} images', { count: w.importReport.value.structures.images }) }}
            </p>
            <button type="button" @click="w.run(w.downloadImportReport)">
              {{ t("Download conversion report") }}
            </button>
            <ul>
              <li
                v-for="warning in w.importReport.value.warnings"
                :key="warning"
              >
                {{ t(warning) }}
              </li>
            </ul>
            <div class="document-preview" v-html="w.importReport.value.html" />
            <label v-if="w.importReport.value.trackedChanges">
              <input v-model="acknowledge" type="checkbox">
              {{ t("Import accepted text") }}
            </label>
            <div class="document-actions">
              <button
                :disabled="w.readonly.value"
                @click="w.run(() => w.applyImport(false, acknowledge))"
              >
                {{ t("Replace document") }}
              </button>
              <button
                :disabled="w.readonly.value || !w.selected.value"
                @click="w.run(() => w.applyImport(true, acknowledge))"
              >
                {{ t("Insert at selection") }}
              </button>
            </div>
          </template>
        </template>
        <template v-else-if="w.tab.value === 'Export and pages'">
          <form @submit.prevent="w.run(() => w.savePage(page))">
            <div class="document-fields">
              <label>
                {{ t("Title") }}
                <input v-model="page.title" maxlength="200">
              </label>
              <label>
                {{ t("Paper") }}
                <select v-model="page.size">
                  <option>A4</option>
                  <option>Letter</option>
                </select>
              </label>
              <label>
                {{ t("Orientation") }}
                <select v-model="page.orientation">
                  <option value="portrait">{{ t("Portrait") }}</option>
                  <option value="landscape">{{ t("Landscape") }}</option>
                </select>
              </label>
              <label>
                {{ t("Margins (points)") }}
                <input
                  v-model.number="page.margin"
                  type="number"
                  min="18"
                  max="144"
                >
              </label>
              <label>
                {{ t("Header") }}
                <input v-model="page.header" maxlength="300">
              </label>
              <label>
                {{ t("Footer") }}
                <input v-model="page.footer" maxlength="300">
              </label>
              <label>
                {{ t("Document language") }}
                <input
                  v-model="page.language"
                  pattern="[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*"
                  placeholder="pt-PT"
                >
              </label>
              <label>
                <input v-model="page.numbering" type="checkbox">
                {{ t("Page numbers") }}
              </label>
            </div>
            <button :disabled="w.readonly.value">
              {{ t("Save page settings") }}
            </button>
          </form>
          <div class="document-actions">
            <button class="document-primary" :disabled="w.busy.value" @click="w.run(w.previewPdf)">
              {{ t("Create PDF preview") }}
            </button>
            <button
              :disabled="w.busy.value"
              @click="w.run(() => w.download('pdf'))"
            >
              {{ t("Download PDF") }}
            </button>
            <button @click="w.run(() => w.download('word'))">
              {{ t("Download Word") }}
            </button>
            <button @click="w.run(() => w.download('html'))">
              {{ t("Download HTML") }}
            </button>
            <button @click="w.run(() => w.download('markdown'))">
              {{ t("Download Markdown") }}
            </button>
          </div>
          <template v-if="w.pdf.value">
            <p>{{ w.pdf.value.pages }} {{ t("pages") }}</p>
            <h3 v-if="w.pdf.value.warnings.length">
              {{ t("Export warnings") }}
            </h3>
            <ul>
              <li v-for="warning in w.pdf.value.warnings" :key="warning">
                {{ t(warning) }}
              </li>
            </ul>
            <DocumentPdfPreview
              :blob="w.pdf.value.blob"
              :document-id="options?.id"
              :language="w.session.metadata.value.page.language"
              :sink="options?.onDiagnostic"
              @return="returnToWriting"
            />
            <a :href="w.pdfUrl.value" target="_blank" rel="noopener">
              {{ t("Open PDF preview") }}
            </a>
          </template>
        </template>
        <template v-else-if="w.tab.value === 'Accessibility'">
          <button class="document-primary" @click="w.run(w.checkContent)">
            {{ t("Run document check") }}
          </button>
          <p>{{ t("These checks do not certify accessibility.") }}</p>
          <p v-if="w.audited.value && !visibleFindings.length">
            {{ t("No issues found by these checks.") }}
          </p>
          <ul class="document-cards">
            <li
              v-for="finding in visibleFindings"
              :key="finding.id"
              class="document-card"
            >
              <strong>{{ t(finding.message) }}</strong>
              <div class="document-actions">
                <button @click="w.run(() => w.locateFinding(finding))">
                  {{ t("Locate") }}
                </button>
                <label>
                  {{ t("Replacement value") }}
                  <input v-model="fixValues[finding.id]">
                </label>
                <button
                  :disabled="w.readonly.value"
                  @click="
                    w.run(() =>
                      w.fixFinding(finding, fixValues[finding.id] || ''),
                    )
                  "
                >
                  {{ t("Fix") }}
                </button>
                <button @click="w.ignored.value.add(finding.id)">
                  {{ t("Ignore") }}
                </button>
              </div>
            </li>
          </ul>
        </template>
        <template v-else-if="w.tab.value === 'Review'">
          <label>
            <input
              v-model="w.suggesting.value"
              type="checkbox"
              :disabled="
                w.readonly.value ||
                options?.role === 'reviewer' ||
                collaborative
              "
            >
            {{ t("Suggest changes") }}
          </label>
          <p v-if="collaborative">
            {{ t("Review decisions require an exclusive editing session.") }}
          </p>
          <div class="document-actions">
            <button
              :disabled="
                !reviewSelection.length ||
                w.readonly.value ||
                options?.role === 'reviewer' ||
                collaborative
              "
              @click="w.run(() => w.decideMany(reviewSelection, true))"
            >
              {{ t("Accept selected") }}
            </button>
            <button
              :disabled="
                !reviewSelection.length ||
                w.readonly.value ||
                options?.role === 'reviewer' ||
                collaborative
              "
              @click="w.run(() => w.decideMany(reviewSelection, false))"
            >
              {{ t("Reject selected") }}
            </button>
          </div>
          <p v-if="!w.pending.value.length">
            {{ t("No pending suggestions.") }}
          </p>
          <ul class="document-cards">
            <li
              v-for="suggestion in w.pending.value"
              :key="suggestion.id"
              class="document-card"
            >
              <label>
                <input
                  v-model="reviewSelection"
                  type="checkbox"
                  :value="suggestion.id"
                >
                {{ t("Select change") }}
              </label>
              <strong>{{ suggestion.author }}</strong>
              <time :datetime="suggestion.createdAt">
                {{ date(suggestion.createdAt) }}
              </time>
              <div class="document-diff">
                <del>{{ htmlText(suggestion.before) }}</del>
                <ins>{{ htmlText(suggestion.after) }}</ins>
              </div>
              <div class="document-actions">
                <button @click="w.run(() => w.locateBlock(suggestion.blockId))">
                  {{ t("Locate") }}
                </button>
                <button
                  :disabled="
                    w.readonly.value ||
                    options?.role === 'reviewer' ||
                    collaborative
                  "
                  @click="w.run(() => w.decide(suggestion.id, true))"
                >
                  {{ t("Accept") }}
                </button>
                <button
                  :disabled="
                    w.readonly.value ||
                    options?.role === 'reviewer' ||
                    collaborative
                  "
                  @click="w.run(() => w.decide(suggestion.id, false))"
                >
                  {{ t("Reject") }}
                </button>
              </div>
            </li>
          </ul>
        </template>
        <template v-else-if="w.tab.value === 'AI writing'">
          <template v-if="options?.ai">
            <p>
              {{ options.ai.name }} ·
              {{ t("Text is sent only when you request a proposal.") }}
            </p>
            <blockquote>
              {{
                w.selected.value?.text ||
                t("Select a passage in the document first.")
              }}
            </blockquote>
            <form
              @submit.prevent="
                w.run(() => w.generateAi(action, instruction, shareDocument))
              "
            >
              <label>
                {{ t("Action") }}
                <select v-model="action">
                  <option value="clarify">{{ t("Clarify") }}</option>
                  <option value="shorten">{{ t("Shorten") }}</option>
                  <option value="tone">{{ t("Tone") }}</option>
                  <option value="translate">{{ t("Translate") }}</option>
                </select>
              </label>
              <label>
                {{ t("Instructions") }}
                <textarea v-model="instruction" maxlength="4000" />
              </label>
              <label>
                <input v-model="shareDocument" type="checkbox">
                {{ t("Include the whole document as context") }}
              </label>
              <div class="document-actions">
                <button
                  :disabled="
                    w.readonly.value ||
                    w.ai.status.value === 'generating' ||
                    !w.selected.value?.text
                  "
                >
                  {{ t("Generate proposal") }}
                </button>
                <button
                  v-if="w.ai.status.value === 'generating'"
                  type="button"
                  @click="w.ai.cancel"
                >
                  {{ t("Cancel") }}
                </button>
              </div>
            </form>
            <p v-if="w.ai.error.value" role="alert">{{ t(w.ai.error.value) }}</p>
            <pre v-if="w.ai.preview.value && !w.ai.proposal.value">{{
              w.ai.preview.value
            }}</pre>
            <div v-if="w.ai.proposal.value" class="document-diff">
              <del>{{ w.ai.proposal.value.anchor.text }}</del>
              <ins>{{ htmlText(w.ai.proposal.value.result.html) }}</ins>
              <div class="document-actions">
                <button :disabled="w.readonly.value" @click="w.run(w.acceptAi)">
                  {{ t("Accept proposal") }}
                </button>
                <button @click="w.ai.cancel">{{ t("Reject") }}</button>
              </div>
            </div>
          </template>
          <p v-else>{{ t("AI rewriting is unavailable in this document.") }}</p>
        </template>
        <template v-else-if="w.tab.value === 'References'">
          <label>
            {{ t("Citation style") }}
            <select
              :value="w.session.metadata.value.citationStyle"
              :disabled="w.readonly.value"
              @change="
                w.run(() => {
                  w.session.transact((value) => {
                    value.metadata.citationStyle = (
                      $event.target as HTMLSelectElement
                    ).value as 'apa' | 'numbered';
                  });
                  return w.refreshReferences();
                })
              "
            >
              <option value="apa">APA</option>
              <option value="numbered">{{ t("Numbered") }}</option>
            </select>
          </label>
          <form @submit.prevent="w.run(saveNote)">
            <label>
              {{ t("Note text") }}
              <textarea v-model="note" required maxlength="10000" />
            </label>
            <button :disabled="w.readonly.value">
              {{ t(editingNote ? "Save note" : "Add footnote") }}
            </button>
          </form>
          <ul class="document-cards">
            <li
              v-for="entry in w.session.metadata.value.notes"
              :key="entry.id"
              class="document-card"
            >
              {{ entry.text }}
              <div class="document-actions">
                <button
                  :disabled="w.readonly.value"
                  @click="
                    editingNote = entry.id;
                    note = entry.text;
                  "
                >
                  {{ t("Edit note") }}
                </button>
                <button
                  :disabled="w.readonly.value"
                  @click="
                    w.run(() => w.updateReference('note', entry.id, null))
                  "
                >
                  {{ t("Delete note and references") }}
                </button>
              </div>
            </li>
          </ul>
          <form @submit.prevent="w.run(saveSource)">
            <div class="document-fields">
              <label>
                {{ t("Author") }}
                <input
                  v-model="author"
                  required
                  maxlength="200"
                  :placeholder="t('Family, Given; Organization')"
                >
              </label>
              <label>
                {{ t("Title") }}
                <input v-model="title" required maxlength="500">
              </label>
              <label>
                {{ t("Year") }}
                <input
                  v-model="year"
                  required
                  maxlength="20"
                  placeholder="2026 / n.d."
                >
              </label>
              <label>
                {{ t("Source type") }}
                <select v-model="sourceType">
                  <option value="book">{{ t("Book") }}</option>
                  <option value="webpage">{{ t("Web page") }}</option>
                </select>
              </label>
              <label>
                {{ t("Page or locator") }}
                <input v-model="locator" maxlength="120">
              </label>
              <label>
                {{ t("Publisher") }}
                <input v-model="publisher" maxlength="200">
              </label>
              <label>
                {{ t("URL") }}
                <input v-model="url" type="url">
              </label>
            </div>
            <button :disabled="w.readonly.value">
              {{ t(editingSource ? "Save source" : "Add source") }}
            </button>
          </form>
          <ul class="document-cards">
            <li
              v-for="source in w.session.metadata.value.sources"
              :key="source.id"
              class="document-card"
            >
              {{ source.author }} · {{ source.title }} ({{ source.year }})
              <button
                :disabled="w.readonly.value"
                @click="w.run(() => w.insertReference('citation', source.id))"
              >
                {{ t("Insert citation") }}
              </button>
              <button :disabled="w.readonly.value" @click="editSource(source)">
                {{ t("Edit source") }}
              </button>
              <button
                :disabled="w.readonly.value"
                @click="
                  w.run(() => w.updateReference('source', source.id, null))
                "
              >
                {{ t("Delete source and citations") }}
              </button>
            </li>
          </ul>
          <button
            :disabled="w.readonly.value"
            @click="w.run(w.refreshReferences)"
          >
            {{ t("Refresh references") }}
          </button>
        </template>
        <template v-else-if="w.tab.value === 'Structure'">
          <label>
            <input v-model="chapter" type="checkbox">
            {{ t("Include chapter contents") }}
          </label>
          <ol class="document-cards">
            <li
              v-for="(block, index) in w.blocks.value"
              :key="block.id"
              class="document-card"
            >
              <button
                class="document-block-title"
                @click="w.run(() => w.locateBlock(block.id))"
              >
                {{ number(index + 1) }} · {{ block.text || block.tag }}
              </button>
              <button
                v-if="chapter && /^H[1-6]$/.test(block.tag)"
                type="button"
                :aria-expanded="previewBlockId === block.id"
                :aria-controls="previewBlockId === block.id ? id + '-scope-' + block.id : undefined"
                @click="previewBlockId = previewBlockId === block.id ? '' : block.id"
              >
                {{ t("Preview chapter scope") }}
              </button>
              <div v-if="chapter && previewBlockId === block.id" :id="id + '-scope-' + block.id" class="document-preview">
                <p>{{ t("These blocks move together, up to the next heading of the same or higher level.") }}</p>
                <ol>
                  <li v-for="item in chapterPreview" :key="item.id">{{ item.text || item.tag }}</li>
                </ol>
              </div>
              <div class="document-actions">
                <button
                  :disabled="w.readonly.value || !index"
                  @click="w.run(() => w.blockAction(block.id, 'up', chapter))"
                >
                  {{ t("Move up") }}
                </button>
                <button
                  :disabled="
                    w.readonly.value || index === w.blocks.value.length - 1
                  "
                  @click="w.run(() => w.blockAction(block.id, 'down', chapter))"
                >
                  {{ t("Move down") }}
                </button>
                <button
                  :disabled="w.readonly.value"
                  @click="
                    w.run(() => w.blockAction(block.id, 'duplicate', false))
                  "
                >
                  {{ t("Duplicate") }}
                </button>
                <button
                  :disabled="w.readonly.value"
                  @click="w.run(() => w.blockAction(block.id, 'delete', false))"
                >
                  {{ t("Delete") }}
                </button>
              </div>
            </li>
          </ol>
        </template>
        <template v-else-if="w.tab.value === 'Templates'">
          <p>{{ t("Use field names in double braces in your document.") }}</p>
          <div class="document-fields">
            <label>
              {{ t("Preview dataset") }}
              <select v-model="activeDataset" @change="w.run(chooseDataset)">
                <option value="">{{ t("Field labels") }}</option>
                <option
                  v-for="dataset in w.session.metadata.value.templateDatasets"
                  :key="dataset.name"
                >
                  {{ dataset.name }}
                </option>
              </select>
            </label>
            <label>
              {{ t("Dataset name") }}
              <input v-model="datasetName" maxlength="100">
            </label>
          </div>
          <button :disabled="w.readonly.value" @click="w.run(saveDataset)">
            {{ t("Save preview dataset") }}
          </button>
          <div class="document-fields">
            <label>
              {{ t("Section field") }}
              <input
                v-model="sectionField"
                placeholder="show / !show / items"
              >
            </label>
            <button
              :disabled="w.readonly.value || !w.selected.value"
              @click="
                w.run(() => w.setTemplateBlock('condition', sectionField))
              "
            >
              {{ t("Set condition on selected block") }}
            </button>
            <button
              :disabled="w.readonly.value || !w.selected.value"
              @click="w.run(() => w.setTemplateBlock('repeat', sectionField))"
            >
              {{ t("Repeat selected block") }}
            </button>
          </div>
          <p>
            {{
              t(
                "Use !field for an else section, item for repeated values, and an empty field to remove the rule.",
              )
            }}
          </p>
          <div
            v-for="(field, index) in fields"
            :key="index"
            class="document-card document-fields"
            @input="fields = [...fields]"
          >
            <label>
              {{ t("Field name") }}
              <input v-model="field.name" placeholder="customer">
            </label>
            <label>
              {{ t("Type") }}
              <select v-model="field.type">
                <option value="string">{{ t("Text") }}</option>
                <option value="number">{{ t("Number") }}</option>
                <option value="date">{{ t("Date") }}</option>
                <option value="boolean">{{ t("Boolean") }}</option>
                <option value="list">{{ t("List") }}</option>
              </select>
            </label>
            <label>
              <input v-model="field.required" type="checkbox">
              {{ t("Required") }}
            </label>
            <label>
              {{ t("Default value") }}
              <input
                :value="
                  field.default === undefined
                    ? ''
                    : typeof field.default === 'object'
                      ? JSON.stringify(field.default)
                      : String(field.default)
                "
                @change="w.run(() => updateDefault(field, $event))"
              >
            </label>
            <label>
              {{ t("Value format") }}
              <select v-model="field.format">
                <option value="plain">{{ t("Default") }}</option>
                <option value="integer">{{ t("Integer") }}</option>
                <option value="percent">{{ t("Percent") }}</option>
                <option value="date-long">{{ t("Long date") }}</option>
              </select>
            </label>
            <label>
              {{ t("Preview value") }}
              <textarea
                v-if="field.type === 'list'"
                v-model="data[field.name]"
                placeholder="[&quot;First&quot;, &quot;Second&quot;]"
              />
              <select
                v-else-if="field.type === 'boolean'"
                v-model="data[field.name]"
              >
                <option value="">—</option>
                <option value="true">{{ t("Yes") }}</option>
                <option value="false">{{ t("No") }}</option>
              </select>
              <input
                v-else
                v-model="data[field.name]"
                :type="
                  field.type === 'date'
                    ? 'date'
                    : field.type === 'number'
                      ? 'number'
                      : 'text'
                "
              >
            </label>
            <button @click="fields = fields.filter((_f, i) => i !== index)">
              {{ t("Delete") }}
            </button>
          </div>
          <div class="document-actions">
            <button
              @click="
                fields = [
                  ...fields,
                  { name: '', type: 'string', required: false },
                ]
              "
            >
              {{ t("Add field") }}
            </button>
            <button
              :disabled="w.readonly.value"
              @click="
                w.run(() => {
                  previewTemplate();
                  w.session.transact((value) => {
                    value.metadata.templateFields = cloneDocument(fields);
                  });
                })
              "
            >
              {{ t("Save field definitions") }}
            </button>
            <button @click="w.run(previewTemplate)">
              {{ t("Preview template") }}
            </button>
          </div>
          <template v-if="w.templatePreview.value">
            <ul role="status">
              <li
                v-for="problem in w.templatePreview.value.problems"
                :key="problem.field + problem.message"
              >
                {{ problem.field }}: {{ t(problem.message) }} ({{
                  problem.occurrences
                }})
                <button @click="w.locateTemplateField(problem.field)">
                  {{ t("Locate next occurrence") }}
                </button>
              </li>
            </ul>
            <div
              class="document-preview"
              v-html="w.templatePreview.value.html"
            />
            <div class="document-actions">
              <button
                v-for="format in ['html', 'pdf', 'word', 'markdown'] as const"
                :key="format"
                :disabled="!!w.templatePreview.value.problems.length"
                @click="w.run(() => w.exportTemplate(format))"
              >
                {{ t("Export generated") }} {{ format.toUpperCase() }}
              </button>
            </div>
          </template>
        </template>
        <template v-else-if="w.tab.value === 'Collaboration'">
          <template v-if="collaborative">
            <p role="status">{{ t(connection || "Connecting") }}</p>
            <ul>
              <li v-for="participant in participants" :key="participant">
                {{ participant }}
              </li>
            </ul>
            <p v-if="!participants?.length">
              {{ t("No other participants.") }}
            </p>
          </template>
          <p v-else>
            {{ t("Live collaboration is unavailable in this document.") }}
          </p>
        </template>
      </div>
      </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.nle-document-tools {
  flex: none;
  color: var(--color-text, #1e293b);
  background: var(--color-surface, #fff);
  font: 0.875rem/1.5 system-ui, sans-serif;
  border-block-end: 1px solid var(--color-border, #dbe1e9);
  text-align: start;
}
.document-icon {
  width: 18px;
  height: 18px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.document-tool-bar,
.document-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
}
.document-tool-bar {
  padding: 0.5rem 1rem;
  gap: 1rem;
}
@media (max-height: 500px) {
  /* Preserve writing space above the phone dock without shrinking controls. */
  .document-tool-bar { padding-block: 0.25rem; }
}
.document-tool-bar > span {
  font-size: 0.8125rem;
}
.document-tool-bar .document-tools-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  border-color: transparent;
  background: transparent;
  padding-inline: 0.5rem;
  margin-inline-start: -0.5rem;
}
.document-tool-bar .document-tools-trigger[aria-expanded="true"] {
  color: var(--toolbar-accent-ink, var(--color-primary, #2457d6));
  background: var(--editor-bg, #f8fafc);
}
.document-chevron { width: 14px; height: 14px; }
.document-chevron.is-open { transform: rotate(180deg); }
.document-status { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--color-text-secondary, #596579); text-transform: capitalize; }
.document-status .document-icon { width: 14px; height: 14px; }
.document-status[data-state="error"], .document-status[data-state="conflict"] { color: var(--error-color, #b42318); }
.document-readonly { margin-inline-start: auto; color: var(--color-text-secondary, #596579); }
.document-tools-panel {
  border-block-start: 1px solid var(--color-border, #dbe1e9);
}
.document-tool-workspace {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr);
  height: clamp(180px, 38vh, 340px);
  overflow: hidden;
}
.has-page-preview .document-tool-workspace {
  height: 65vh;
  height: 65dvh;
}
.document-panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 1rem;
  border-block-end: 1px solid var(--color-border, #dbe1e9);
}
.document-panel-heading strong { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary, #596579); }
.document-panel-heading .document-close { display: flex; align-items: center; gap: 0.45rem; border-color: transparent; background: transparent; min-height: 36px; }
.document-panel-heading .document-close:hover { background: var(--toolbar-hover, #f1f4f9); }
.document-close .document-icon { width: 15px; height: 15px; }
.document-tool-main { min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 1.25rem 1.5rem; }
.document-section-heading { margin-bottom: 1rem; }
.document-section-heading h3 { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.document-section-heading p { margin: 0.25rem 0 0; color: var(--color-text-secondary, #596579); max-width: 65ch; }
.document-empty {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px dashed var(--color-border, #dbe1e9);
  border-radius: 10px;
  padding: 1.25rem;
  margin-block: 1rem 0;
  color: var(--color-text-secondary, #596579);
}
.document-empty > .document-icon { width: 28px; height: 28px; }
.document-empty strong { color: var(--color-text, #1e293b); font-weight: 500; }
.document-empty p { margin: 0.25rem 0 0; font-size: 0.8125rem; }
.document-tool-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0.65rem;
  border-inline-end: 1px solid var(--color-border, #dbe1e9);
  background: var(--editor-bg, #fafbfe);
}
.document-tool-tabs button {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: none;
  min-height: 40px;
  padding: 0.5rem 0.6rem;
  text-align: start;
  border-color: transparent;
  background: transparent;
  color: var(--color-text-secondary, #596579);
}
.document-tool-tabs button:hover:not(:disabled) {
  border-color: transparent;
  background: var(--toolbar-hover, #edf2fc);
  color: var(--color-text, #1e293b);
}
.document-tool-tabs [aria-selected="true"] {
  background: var(--toolbar-hover, #edf2fc);
  color: var(--toolbar-accent-ink, var(--color-primary, #2457d6));
  font-weight: 600;
  box-shadow: inset 3px 0 var(--toolbar-accent, var(--color-primary, #2457d6));
}
:global([dir="rtl"]) .document-tool-tabs [aria-selected="true"] {
  box-shadow: inset -3px 0 var(--toolbar-accent, var(--color-primary, #2457d6));
}
.document-tool-body {
  min-height: 8rem;
}
.document-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 0.8rem;
  margin-block: 0.7rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-block: 0.5rem;
}
label:has(input[type="checkbox"]) {
  flex-direction: row;
  align-items: center;
}
input,
textarea,
select,
button {
  font: inherit;
  color: inherit;
}
input:not([type="checkbox"]),
textarea,
select {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  max-width: 100%;
  background: var(--color-surface, #fff);
  min-width: 0;
  min-height: 40px;
}
textarea {
  min-height: 5rem;
}
button {
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  padding: 0.5rem 0.8rem;
  min-height: 40px;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: var(--toolbar-accent, #6683ce);
  background: var(--toolbar-hover, #f1f4f9);
}
button.document-primary { background: var(--color-primary, #2457d6); color: #fff; border-color: var(--color-primary, #2457d6); font-weight: 600; }
button.document-primary:hover:not(:disabled) { background: var(--color-primary-dark, #1d4ed8); color: #fff; }
.document-actions { align-items: end; }
.document-actions label { margin-block: 0; }
input[type="checkbox"] { accent-color: var(--color-primary, #2457d6); width: 16px; height: 16px; flex: none; }
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid var(--toolbar-accent, #6683ce);
  outline-offset: 2px;
}
.document-cards {
  padding: 0;
  list-style: none;
}
.document-card {
  border: 1px solid var(--color-border, #dbe1e9);
  border-radius: 10px;
  margin-block: 0.7rem;
  padding: 1rem;
  overflow-wrap: anywhere;
}
.document-card time {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #64748b);
}
.document-diff {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border: 1px solid var(--color-border, #dbe1e9);
  border-radius: 6px;
  padding: 0.8rem;
}
.document-diff del,
.removed {
  background: #ffe4e6;
  color: #881337;
  text-decoration: line-through;
}
.document-diff ins,
.added {
  background: #dcfce7;
  color: #14532d;
}
.document-preview {
  border: 1px solid var(--color-border, #cbd5e1);
  padding: 1rem;
  max-height: 24rem;
  overflow: auto;
  overflow-wrap: anywhere;
  background: white;
  color: #172033;
}
.document-preview :deep(img) {
  max-width: 100%;
}
.document-preview :deep(table) {
  max-width: 100%;
  border-collapse: collapse;
}
.document-preview :deep(td),
.document-preview :deep(th) {
  border: 1px solid #ccc;
  padding: 0.4rem;
}
.document-error {
  color: var(--error-color, #b42318);
  padding: 0.75rem;
  border-inline-start: 3px solid currentColor;
  border-radius: 4px;
  background: var(--editor-bg, #fafbfe);
}
.document-notice { border-inline-start: 3px solid var(--toolbar-accent, #2457d6); padding: 0.65rem 0.85rem; margin-top: 0; background: var(--editor-bg, #fafbfe); }
.document-block-title {
  text-align: start;
  border: none;
  background: transparent;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
blockquote {
  margin-inline: 0;
  padding: 0.6rem;
  border-inline-start: 3px solid #6683ce;
}
.compact-tabs .document-tool-workspace { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); height: clamp(200px, 34vh, 310px); }
.compact-tabs .has-page-preview .document-tool-workspace { height: 70vh; height: 70dvh; }
.compact-tabs .document-tool-tabs { flex-direction: row; padding: 0.5rem 0.65rem; border-inline-end: 0; border-block-end: 1px solid var(--color-border, #dbe1e9); }
.compact-tabs .document-tool-tabs button { white-space: nowrap; }
.compact-tabs .document-tool-tabs [aria-selected="true"] { box-shadow: inset 0 -2px var(--toolbar-accent, var(--color-primary, #2457d6)); }
.compact-tabs .document-tool-main { padding: 1rem; }
.compact-tabs .document-actions > label { flex: 1 1 100%; }
.document-tool-tabs, .document-tool-main { scrollbar-width: thin; scrollbar-color: var(--color-border, #cbd5e1) transparent; }
@supports selector(:has(*)) {
  .is-docked .document-tools-panel {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    width: min(48%, 620px);
    display: flex;
    flex-direction: column;
    background: var(--color-surface, #fff);
    border-block-start: 0;
    border-inline-start: 1px solid var(--color-border, #dbe1e9);
  }
  .is-docked .document-panel-heading { min-height: 56px; flex: none; }
  .is-docked .document-tool-workspace { flex: 1; height: auto; min-height: 0; grid-template-columns: 160px minmax(0, 1fr); }
  .is-docked .document-tool-tabs { padding-inline: 0.4rem; }
  .is-docked .document-tool-tabs button { font-size: 0.8125rem; gap: 0.4rem; }
  .is-docked .document-tool-main { padding: 1.1rem; }
  .is-docked .document-actions > label { flex: 1 1 100%; }
  .is-docked .document-actions > button { flex: 1 1 auto; }
  .is-docked .document-empty { align-items: start; padding: 1rem; gap: 0.7rem; }
}
@media (max-width: 640px), (pointer: coarse) {
  .document-tool-bar { gap: 0.5rem; padding-inline: 0.75rem; }
  .document-actions > button {
    flex: 1 1 auto;
  }
  button, input:not([type="checkbox"]), select, .document-tool-tabs button, .document-panel-heading .document-close {
    min-height: 44px;
  }
  .document-tool-tabs button { padding-inline: 0.7rem; }
}
@media print {
  .nle-document-tools {
    display: none;
  }
}
</style>
