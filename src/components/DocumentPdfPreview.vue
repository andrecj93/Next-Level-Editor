<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from "vue";
import { useEditorLocale } from "../composables/useEditorLocale";
import { diagnostic } from "../utils/documentDiagnostics";
import { openPdfPreview, type PdfPreviewDocument } from "../utils/pdfPreview";
import type { DiagnosticSink } from "../types/document";

const props = defineProps<{
  blob: Blob;
  documentId?: string;
  language?: string;
  sink?: DiagnosticSink;
}>();
const emit = defineEmits<{ return: [] }>();
const { t, number } = useEditorLocale();
const container = ref<HTMLElement>();
const paper = ref<HTMLElement>();
const pdf = shallowRef<PdfPreviewDocument>();
const page = ref(1),
  pages = ref(0),
  pageInput = ref("1");
const text = ref(""),
  error = ref(""),
  busy = ref(true);
let mounted = false,
  generation = 0,
  width = 0;
let opening: AbortController | undefined,
  rendering: AbortController | undefined;
let resize: ResizeObserver | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

async function paint() {
  const source = pdf.value,
    target = paper.value;
  if (!mounted || !source || !target || !container.value) return;
  rendering?.abort();
  const controller = new AbortController();
  rendering = controller;
  busy.value = true;
  error.value = "";
  text.value = "";
  target.replaceChildren();
  try {
    width = container.value.clientWidth;
    const rendered = await source.render(page.value, width, controller.signal);
    if (controller.signal.aborted || source !== pdf.value || !mounted) return;
    target.replaceChildren(rendered.canvas);
    text.value = rendered.text;
    diagnostic(props.sink, "layout.page_rendered", props.documentId, {
      page: page.value,
      pages: pages.value,
    });
  } catch {
    if (controller.signal.aborted || source !== pdf.value || !mounted) return;
    error.value =
      "PDF preview could not be loaded. Download the PDF to view it.";
    diagnostic(props.sink, "layout.page_failed", props.documentId, {
      page: page.value,
    });
  } finally {
    if (rendering === controller && mounted) busy.value = false;
  }
}
async function load() {
  const current = ++generation;
  opening?.abort();
  rendering?.abort();
  const old = pdf.value;
  pdf.value = undefined;
  if (old) void old.destroy().catch(() => {});
  pages.value = 0;
  page.value = 1;
  pageInput.value = "1";
  error.value = "";
  text.value = "";
  busy.value = true;
  paper.value?.replaceChildren();
  const controller = new AbortController();
  opening = controller;
  try {
    const result = await openPdfPreview(props.blob, {
      signal: controller.signal,
      sink: props.sink,
      documentId: props.documentId,
    });
    if (controller.signal.aborted || current !== generation || !mounted) {
      await result.destroy();
      return;
    }
    pdf.value = result;
    pages.value = result.pages;
    await paint();
  } catch (problem) {
    if (controller.signal.aborted || current !== generation || !mounted) return;
    error.value =
      problem instanceof Error &&
      problem.message ===
        "This preview is too large. Download the PDF to view it."
        ? problem.message
        : "PDF preview could not be loaded. Download the PDF to view it.";
    busy.value = false;
  }
}
function goTo(value: number) {
  const next = Math.max(
    1,
    Math.min(
      pages.value || 1,
      Math.trunc(Number.isFinite(value) ? value : page.value),
    ),
  );
  pageInput.value = String(next);
  if (next === page.value) return;
  page.value = next;
  void paint();
}
function navigate(event: KeyboardEvent) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target instanceof HTMLInputElement
  )
    return;
  const next =
    event.key === "PageDown"
      ? page.value + 1
      : event.key === "PageUp"
        ? page.value - 1
        : event.key === "Home"
          ? 1
          : event.key === "End"
            ? pages.value
            : undefined;
  if (next === undefined || !pages.value) return;
  event.preventDefault();
  event.stopPropagation();
  goTo(next);
}
watch(
  () => props.blob,
  () => {
    if (mounted) void load();
  },
);
onMounted(() => {
  mounted = true;
  if (typeof ResizeObserver !== "undefined") {
    resize = new ResizeObserver(resized);
    if (container.value) resize.observe(container.value);
  } else window.addEventListener("resize", resized);
  void load();
});
function resized() {
  const next = container.value?.clientWidth ?? 0;
  if (!next || Math.abs(next - width) < 2) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    void paint();
  }, 100);
}
onBeforeUnmount(() => {
  mounted = false;
  generation++;
  clearTimeout(resizeTimer);
  resize?.disconnect();
  window.removeEventListener("resize", resized);
  rendering?.abort();
  opening?.abort();
  void pdf.value?.destroy().catch(() => {});
});
</script>

<template>
  <section
    class="document-pdf"
    :aria-label="t('PDF preview')"
    @keydown="navigate"
  >
    <div class="pdf-navigation" role="group" :aria-label="t('Page navigation')">
      <button
        type="button"
        :disabled="!pages || page <= 1"
        @click="goTo(page - 1)"
      >
        {{ t("Previous page") }}
      </button>
      <label>
        {{ t("Page") }}
        <input
          v-model="pageInput"
          :aria-label="t('Go to page')"
          type="number"
          min="1"
          :max="pages || 1"
          :disabled="!pages"
          inputmode="numeric"
          @change="goTo(Number(pageInput))"
          @keydown.enter.prevent="goTo(Number(pageInput))"
        >
      </label>
      <span>{{ t("of {pages}", { pages: number(pages) }) }}</span>
      <button
        type="button"
        :disabled="!pages || page >= pages"
        @click="goTo(page + 1)"
      >
        {{ t("Next page") }}
      </button>
      <button type="button" @click="emit('return')">
        {{ t("Return to writing") }}
      </button>
      <button v-if="error" type="button" @click="load">
        {{ t("Retry preview") }}
      </button>
    </div>
    <p class="pdf-help">
      {{ t("Use Page Up, Page Down, Home or End to navigate pages.") }}
    </p>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-else role="status" aria-live="polite" aria-atomic="true">
      {{
        busy
          ? t("Rendering page…")
          : t("Page {page} of {pages}", {
              page: number(page),
              pages: number(pages),
            })
      }}
    </p>
    <div
      ref="container"
      class="pdf-canvas-container"
      role="region"
      tabindex="0"
      :aria-label="t('PDF pages')"
      :aria-busy="busy"
    >
      <div
        ref="paper"
        role="img"
        :aria-label="
          t('Page {page} of {pages}', {
            page: number(page),
            pages: number(pages),
          })
        "
      />
    </div>
    <details v-if="text" class="pdf-page-text">
      <summary>{{ t("Page text") }}</summary>
      <pre :lang="language" dir="auto">{{ text }}</pre>
    </details>
  </section>
</template>

<style scoped>
.document-pdf {
  min-width: 0;
  max-width: 100%;
}
.pdf-navigation {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-block: 0.35rem;
  background: var(--color-surface, #fff);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.pdf-navigation label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.pdf-navigation input {
  width: 5rem;
  min-width: 0;
}
.pdf-navigation input,
.pdf-navigation button {
  font: inherit;
  color: var(--color-text, #1e293b);
  background: var(--color-surface, #fff);
  min-height: 44px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
}
.pdf-navigation button {
  cursor: pointer;
}
.pdf-navigation button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
:is(button, input, summary, [tabindex]):focus-visible {
  outline: 3px solid #6683ce;
  outline-offset: 2px;
}
.pdf-help {
  font-size: 0.85rem;
}
.pdf-canvas-container {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: scroll;
  min-height: 9rem;
  max-height: 60vh;
  background: #e2e8f0;
}
.pdf-canvas-container :deep(canvas) {
  display: block;
  max-width: 100%;
  height: auto;
  background: white;
}
.pdf-page-text {
  margin-block: 0.75rem;
}
.pdf-page-text pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  max-height: 30vh;
  overflow: auto;
}
@media (max-width: 640px) {
  .pdf-navigation > button {
    flex: 1 1 auto;
  }
}
</style>
