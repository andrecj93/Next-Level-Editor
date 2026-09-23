<script setup lang="ts">
import { computed, ref, shallowRef, watch, nextTick } from "vue";
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
const { t, locale } = useEditorLocale();
const id = useStableId();
const trigger = ref<HTMLButtonElement>();
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
  if (!w.open.value) {
    w.captureSelection();
    w.tab.value = "Versions";
  }
  w.open.value = !w.open.value;
}
function close() {
  w.open.value = false;
  nextTick(() => trigger.value?.focus());
}
function tabKey(event: KeyboardEvent, index: number) {
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
  else if (event.key === "ArrowLeft")
    next = (index + tabs.length - 1) % tabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else return;
  event.preventDefault();
  w.tab.value = tabs[next];
  const buttons = (
    event.currentTarget as HTMLElement
  ).parentElement?.querySelectorAll<HTMLButtonElement>("button");
  buttons?.[next]?.focus();
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
  <div class="nle-document-tools" :lang="locale">
    <div class="document-tool-bar">
      <button
        ref="trigger"
        type="button"
        :aria-expanded="w.open.value"
        :aria-controls="id + '-panel'"
        @pointerdown="w.captureSelection()"
        @click="toggle"
      >
        {{ t("Document tools") }}
        <span aria-hidden="true">{{ w.open.value ? "−" : "+" }}</span>
      </button>
      <span v-if="options?.store" role="status">
        {{ t(w.session.status.value) }}
      </span>
      <span v-if="collaborative" role="status">
        {{ t(connection || "Connecting") }}
      </span>
      <span v-if="w.readonly.value">{{ t("Read only") }}</span>
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
      :aria-label="t('Document tools')"
      @keydown.esc.stop="close"
    >
      <header>
        <strong>{{ t("Document tools") }}</strong>
        <button type="button" @click="close">{{ t("Close") }}</button>
      </header>
      <div
        role="tablist"
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
          {{ t(tab) }}
        </button>
      </div>
      <p
        v-if="w.error.value || w.session.error.value"
        role="alert"
        class="document-error"
      >
        {{ t(w.error.value || w.session.error.value) }}
      </p>
      <p v-if="w.message.value" role="status">{{ t(w.message.value) }}</p>
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
            <label>
              {{ t("Compare against") }}
              <select v-model="compareId">
                <option value="">{{ t("Current draft") }}</option>
                <option
                  v-for="version in w.session.versions.value"
                  :key="version.id"
                  :value="version.id"
                >
                  {{ version.label }} · {{ version.revision }}
                </option>
              </select>
            </label>
            <p v-if="!w.session.versions.value.length">
              {{ t("No saved versions yet.") }}
            </p>
            <ol class="document-cards">
              <li
                v-for="version in [...w.session.versions.value].reverse()"
                :key="version.id"
                class="document-card"
              >
                <strong>{{ version.label }}</strong>
                <time :datetime="version.createdAt">
                  {{ new Date(version.createdAt).toLocaleString(locale) }}
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
              {{ w.importReport.value.structures.paragraphs }}
              {{ t("Paragraphs") }} ·
              {{ w.importReport.value.structures.headings }}
              {{ t("Headings") }} ·
              {{ w.importReport.value.structures.tables }} {{ t("Tables") }} ·
              {{ w.importReport.value.structures.images }} {{ t("Images") }}
            </p>
            <button type="button" @click="w.run(w.downloadImportReport)">
              {{ t("Download conversion report") }}
            </button>
            <ul>
              <li
                v-for="warning in w.importReport.value.warnings"
                :key="warning"
              >
                {{ warning }}
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
            <button :disabled="w.busy.value" @click="w.run(w.previewPdf)">
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
                {{ warning }}
              </li>
            </ul>
            <iframe
              :src="w.pdfUrl.value"
              :title="t('PDF preview')"
              class="document-pdf"
            />
            <a :href="w.pdfUrl.value" target="_blank" rel="noopener">
              {{ t("Open PDF preview") }}
            </a>
          </template>
        </template>
        <template v-else-if="w.tab.value === 'Accessibility'">
          <button @click="w.run(w.checkContent)">
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
                {{ new Date(suggestion.createdAt).toLocaleString(locale) }}
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
            <p v-if="w.ai.error.value" role="alert">{{ w.ai.error.value }}</p>
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
                {{ index + 1 }} · {{ block.text || block.tag }}
              </button>
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
    </section>
  </div>
</template>

<style scoped>
.nle-document-tools {
  color: var(--color-text, #1e293b);
  background: var(--color-surface, #fff);
  font:
    14px/1.5 system-ui,
    sans-serif;
  border-block-end: 1px solid var(--color-border, #dbe1e9);
  text-align: start;
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
}
.document-tool-bar > span {
  font-size: 0.8rem;
}
.document-tools-panel {
  padding: 1rem;
  max-height: min(40vh, 360px);
  overflow: auto;
  overscroll-behavior: contain;
}
.document-tools-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 0.75rem;
}
.document-tool-tabs {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.6rem;
}
.document-tool-tabs button {
  white-space: nowrap;
}
.document-tool-tabs [aria-selected="true"] {
  background: #2448ad;
  color: white;
  border-color: #2448ad;
}
.document-tool-body {
  padding-block: 0.8rem;
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
  gap: 0.25rem;
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
  padding: 0.45rem;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  max-width: 100%;
  background: var(--color-surface, #fff);
  min-width: 0;
}
textarea {
  min-height: 5rem;
}
button {
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  background: var(--color-surface-overlay, #f8fafc);
  padding: 0.4rem 0.7rem;
  min-height: 36px;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: #6683ce;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid #6683ce;
  outline-offset: 2px;
}
.document-cards {
  padding: 0;
  list-style: none;
}
.document-card {
  border: 1px solid var(--color-border, #dbe1e9);
  border-radius: 8px;
  margin-block: 0.7rem;
  padding: 0.8rem;
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
}
.document-pdf {
  width: 100%;
  height: 55vh;
  border: 1px solid #cbd5e1;
}
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
@media (max-width: 640px) {
  .document-tools-panel {
    padding: 0.65rem;
  }
  .document-actions > button {
    flex: 1 1 auto;
  }
  .document-tool-tabs button {
    min-height: 44px;
  }
}
@media print {
  .nle-document-tools {
    display: none;
  }
}
</style>
