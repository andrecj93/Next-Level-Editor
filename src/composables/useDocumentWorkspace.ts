import {
  computed,
  ref,
  shallowRef,
  watch,
  onScopeDispose,
  type Ref,
} from "vue";
import type {
  DocumentOptions,
  DocumentSnapshot,
  AiRequest,
  CitationSource,
  TemplateField,
  TemplateValue,
  PageSettings,
} from "../types/document";
import { useDocumentSession } from "./useDocumentSession";
import { useDocumentAi } from "./useDocumentAi";
import {
  documentRoot,
  assignBlockIds,
  selectedAnchor,
  anchorRange,
  findBlock,
  moveDocumentBlock,
  duplicateDocumentBlock,
  compareDocuments,
  type BlockAnchor,
} from "../utils/documentOperations";
import {
  auditDocument,
  findingTarget,
  repairFinding,
  type ContentFinding,
} from "../utils/documentAccessibility";
import {
  renderDocumentTemplate,
  type TemplateResult,
} from "../utils/documentTemplates";
import { renderReferences } from "../utils/documentReferences";
import {
  proposeDocumentChanges,
  decideSuggestion,
  acceptedDocument,
} from "../utils/documentReview";
import {
  operationId,
  cloneDocument,
  diagnostic,
} from "../utils/documentDiagnostics";
import type { DocxReport } from "../utils/docxImport";
import type { SemanticPdfResult } from "../utils/semanticPdf";
import { validatePageSettings } from "../utils/semanticPdf";
import type { CitationFormatter } from "../types/document";
import { loadCitationFormatter } from "../utils/citationFormatter";
import type { CaretOffsets } from "../utils/caretOffset";
export function useDocumentWorkspace(ctx: {
  options: Ref<DocumentOptions | undefined>;
  html: Ref<string>;
  root: Ref<HTMLElement | null>;
  apply: (html: string) => void;
  sanitize: (html: string) => string;
  comments?: { read: () => string; write: (json: string) => void };
  selection?: {
    read: () => CaretOffsets | null;
    write: (value: CaretOffsets) => void;
  };
  locale: () => string;
}) {
  const session = useDocumentSession(ctx);
  const open = ref(false),
    tab = ref("versions"),
    message = ref(""),
    error = ref("");
  const busy = ref(false),
    progress = ref(0);
  const findings = ref<ContentFinding[]>([]),
    ignored = ref(new Set<string>()),
    audited = ref(false);
  const suggesting = ref(false),
    selected = shallowRef<BlockAnchor | null>(null);
  const importReport = shallowRef<DocxReport | null>(null);
  const pdf = shallowRef<SemanticPdfResult | null>(null),
    pdfUrl = ref("");
  const templatePreview = shallowRef<TemplateResult | null>(null);
  const comparison = shallowRef<ReturnType<typeof compareDocuments> | null>(
    null,
  );
  const ai = useDocumentAi({
    provider: () => ctx.options.value?.ai,
    documentId: () => ctx.options.value?.id ?? "",
    sink: () => ctx.options.value?.onDiagnostic,
  });
  const readonly = computed(() => ctx.options.value?.role === "viewer");
  const pending = computed(() =>
    session.metadata.value.suggestions.filter(
      (s) => s.status === "pending" || s.status === "orphaned",
    ),
  );
  const blocks = computed(() => {
    if (typeof document === "undefined") return [];
    return Array.from(documentRoot(ctx.html.value).children).map((el) => ({
      id: el.getAttribute("data-nle-id") ?? "",
      tag: el.tagName,
      text: (el.textContent ?? "").slice(0, 90),
      pending: el.hasAttribute("data-nle-suggestion"),
    }));
  });
  let controller: AbortController | undefined,
    generation = 0;
  let citationFormatter: CitationFormatter | undefined;
  async function prepareReferences() {
    const id = ctx.options.value?.id;
    citationFormatter =
      ctx.options.value?.citationFormatter ?? (await loadCitationFormatter());
    if (id !== ctx.options.value?.id)
      throw new Error("The document changed while preparing references.");
  }
  const formatReferences = (html: string, metadata = session.metadata.value) =>
    renderReferences(html, metadata, citationFormatter);
  async function run(action: () => void | Promise<void>) {
    error.value = "";
    message.value = "";
    try {
      await action();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "The operation failed.";
      diagnostic(
        ctx.options.value?.onDiagnostic,
        "document.operation_failed",
        ctx.options.value?.id,
      );
    }
  }
  function mutate(
    change: (root: HTMLElement, value: DocumentSnapshot) => void,
  ) {
    session.transact((value) => {
      const before = value.html;
      const root = documentRoot(value.html);
      assignBlockIds(root);
      change(root, value);
      assignBlockIds(root);
      value.html = ctx.sanitize(root.innerHTML);
      if (suggesting.value || ctx.options.value?.role === "reviewer")
        value.html = proposeDocumentChanges(
          before,
          value.html,
          value.metadata,
          ctx.options.value?.author ?? "Reviewer",
        );
    });
    audited.value = false;
    templatePreview.value = null;
    clearPdf();
  }
  function captureSelection() {
    if (ctx.root.value) selected.value = selectedAnchor(ctx.root.value);
    return selected.value;
  }
  function locateBlock(id: string) {
    const block = ctx.root.value && findBlock(ctx.root.value, id);
    if (!block) throw new Error("The passage has changed.");
    ctx.root.value!.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    block.scrollIntoView({ block: "center" });
  }
  function checkContent() {
    findings.value = auditDocument(documentRoot(ctx.html.value));
    audited.value = true;
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "content_audit.completed",
      ctx.options.value?.id,
      { findings: findings.value.length },
    );
  }
  function locateFinding(finding: ContentFinding) {
    const target = ctx.root.value && findingTarget(ctx.root.value, finding);
    if (!target) throw new Error("The document changed. Run the check again.");
    target.scrollIntoView({ block: "center" });
    const range = document.createRange();
    range.selectNodeContents(target);
    ctx.root.value!.focus({ preventScroll: true });
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  function fixFinding(finding: ContentFinding, value: string) {
    mutate((root) => repairFinding(root, finding, value));
    checkContent();
  }
  function captureSuggestedEdit(before: string, after: string): string {
    if (
      (!suggesting.value && ctx.options.value?.role !== "reviewer") ||
      readonly.value ||
      before === after
    )
      return after;
    const metadata = cloneDocument(session.metadata.value);
    const html = proposeDocumentChanges(
      before,
      after,
      metadata,
      ctx.options.value?.author ?? "Author",
    );
    session.metadata.value = metadata;
    return html;
  }
  function decide(id: string, accept: boolean) {
    decideMany([id], accept);
  }
  function decideMany(ids: string[], accept: boolean) {
    if (ctx.options.value?.role === "reviewer")
      throw new Error(
        "Only the document author can accept or reject suggestions.",
      );
    session.transact((value) => {
      for (const id of new Set(ids)) {
        const suggestion = value.metadata.suggestions.find((s) => s.id === id);
        if (!suggestion) throw new Error("This suggestion no longer exists.");
        value.html = decideSuggestion(value.html, suggestion, accept);
      }
    });
  }
  async function readWord(file: File) {
    cancel();
    controller = new AbortController();
    const g = generation;
    busy.value = true;
    importReport.value = null;
    try {
      const { importDocx } = await import("../utils/docxImport");
      const report = await importDocx(file, {
        signal: controller.signal,
        sink: ctx.options.value?.onDiagnostic,
      });
      if (g !== generation) return;
      const imported = documentRoot(report.html),
        ids = new Map<string, string>();
      imported.querySelectorAll("[id]").forEach((el) => {
        const previous = el.id;
        const id = "nle-note-" + operationId();
        ids.set(previous, id);
        el.id = id;
      });
      imported.querySelectorAll('a[href^="#"]').forEach((el) => {
        const id = ids.get(el.getAttribute("href")!.slice(1));
        if (id) el.setAttribute("href", "#" + id);
      });
      // Imported endnote containers use paragraphs so their anchor survives sanitization.
      imported.querySelectorAll("[id]").forEach((el) => {
        if (!/^(A|P|H[1-6])$/.test(el.tagName)) {
          const anchor = document.createElement("a");
          anchor.id = el.id;
          el.removeAttribute("id");
          el.prepend(anchor);
        }
      });
      report.html = ctx.sanitize(imported.innerHTML);
      importReport.value = report;
    } finally {
      if (g === generation) busy.value = false;
    }
  }
  function applyImport(insert: boolean, acceptedTrackedChanges: boolean) {
    const report = importReport.value;
    if (!report) return;
    if (report.trackedChanges && !acceptedTrackedChanges)
      throw new Error("Acknowledge importing accepted text before continuing.");
    mutate((root) => {
      if (insert) {
        if (!selected.value)
          throw new Error(
            "Select the insertion point before opening the import panel.",
          );
        const range = anchorRange(root, selected.value);
        if (!range)
          throw new Error("The insertion point changed. Select it again.");
        const block = findBlock(root, selected.value.id)!;
        if (!/^(P|H[1-6])$/.test(block.tagName))
          throw new Error("Choose a paragraph or heading for block insertion.");
        range.deleteContents();
        const tailRange = document.createRange();
        tailRange.selectNodeContents(block);
        tailRange.setStart(range.startContainer, range.startOffset);
        const tail = block.cloneNode(false) as HTMLElement;
        tail.removeAttribute("id");
        tail.removeAttribute("data-nle-id");
        tail.appendChild(tailRange.extractContents());
        const fragment = document.createDocumentFragment();
        fragment.append(...Array.from(documentRoot(report.html).childNodes));
        if (tail.textContent || tail.querySelector("img,br"))
          fragment.append(tail);
        root.insertBefore(fragment, block.nextSibling);
        if (!block.textContent && !block.querySelector("img,br"))
          block.remove();
      } else root.innerHTML = report.html;
      assignBlockIds(root);
    });
    importReport.value = null;
    message.value = "Word content imported. Undo is available.";
  }
  async function exportSnapshot() {
    const value = session.snapshot();
    if (value.metadata.sources.length) await prepareReferences();
    return ctx.sanitize(
      formatReferences(
        acceptedDocument(value.html, value.metadata),
        value.metadata,
      ),
    );
  }
  function clearPdf() {
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
    pdfUrl.value = "";
    pdf.value = null;
  }
  async function previewPdf() {
    cancel();
    clearPdf();
    controller = new AbortController();
    const g = generation;
    const settings = cloneDocument(session.metadata.value.page),
      source = JSON.stringify(session.snapshot());
    busy.value = true;
    progress.value = 0;
    try {
      const html = await exportSnapshot();
      if (g !== generation) return;
      const { createSemanticPdf } = await import("../utils/semanticPdf");
      const result = await createSemanticPdf(html, {
        settings,
        signal: controller.signal,
        sink: ctx.options.value?.onDiagnostic,
        onProgress: (done, total) => {
          if (g === generation)
            progress.value = Math.round((done / Math.max(1, total)) * 100);
        },
      });
      if (g !== generation) return;
      if (source !== JSON.stringify(session.snapshot()))
        throw new Error(
          "The document changed during PDF rendering. Create a new preview.",
        );
      pdf.value = result;
      pdfUrl.value = URL.createObjectURL(result.blob);
    } finally {
      if (g === generation) busy.value = false;
    }
  }
  async function download(format: "pdf" | "word" | "html" | "markdown") {
    const exports = await import("../utils/export");
    if (format === "pdf") {
      if (!pdf.value) await previewPdf();
      if (pdf.value)
        exports.downloadFile(pdf.value.blob, "document.pdf", "application/pdf");
      return;
    }
    const html = await exportSnapshot();
    if (format === "word") await exports.exportAsWord(html);
    if (format === "html") exports.exportAsHtml(html);
    if (format === "markdown") exports.exportAsMarkdown(html);
  }
  async function downloadImportReport() {
    const report = importReport.value;
    if (!report) return;
    const { downloadFile } = await import("../utils/export");
    const { converter, warnings, trackedChanges, structures } = report;
    downloadFile(
      new Blob(
        [
          JSON.stringify(
            {
              converter,
              warnings,
              trackedChanges,
              structures,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "document-import-report.json",
      "application/json",
    );
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "import.report_exported",
      ctx.options.value?.id,
    );
  }
  function savePage(settings: PageSettings) {
    validatePageSettings(settings);
    session.transact((value) => {
      value.metadata.page = cloneDocument(settings);
    });
    clearPdf();
  }
  function addReference(
    root: HTMLElement,
    kind: "note" | "citation",
    id: string,
  ) {
    const anchor = selected.value,
      range = anchor && anchorRange(root, anchor);
    const el = document.createElement(kind === "note" ? "a" : "span");
    el.setAttribute(kind === "note" ? "data-nle-note" : "data-nle-cite", id);
    if (kind === "citation") {
      const locator = session.metadata.value.sources.find(
        (s) => s.id === id,
      )?.locator;
      if (locator) el.setAttribute("data-nle-locator", locator);
    }
    el.textContent = kind === "note" ? "[Note]" : "[Citation]";
    if (anchor && !range)
      throw new Error("The insertion point changed. Select it again.");
    if (range) {
      range.collapse(false);
      range.insertNode(el);
    } else {
      // Generated notes/bibliography are rebuilt below; inserting inside them would lose the marker.
      const body = Array.from(root.children).filter(
        (node) => !node.hasAttribute("data-nle-generated"),
      );
      const last = body[body.length - 1];
      const p =
        last && /^(P|H[1-6])$/.test(last.tagName)
          ? last
          : document.createElement("p");
      if (!p.parentElement)
        root.insertBefore(p, root.querySelector("[data-nle-generated]"));
      p.appendChild(el);
    }
  }
  async function insertReference(kind: "note" | "citation", id: string) {
    await prepareReferences();
    mutate((root, value) => {
      addReference(root, kind, id);
      root.innerHTML = formatReferences(root.innerHTML, value.metadata);
    });
  }
  async function addNote(text: string) {
    if (readonly.value) throw new Error("This document is read-only.");
    if (!text.trim()) throw new Error("Enter the note text.");
    if (session.metadata.value.sources.length) await prepareReferences();
    const id = operationId();
    mutate((root, value) => {
      value.metadata.notes.push({ id, text: text.slice(0, 10000) });
      addReference(root, "note", id);
      root.innerHTML = formatReferences(root.innerHTML, value.metadata);
    });
  }
  function addSource(source: Omit<CitationSource, "id">) {
    validateSource(source);
    session.transact((value) => {
      value.metadata.sources.push({ ...source, id: operationId() });
    });
  }
  function validateSource(source: Omit<CitationSource, "id">) {
    if (!source.title.trim()) throw new Error("Enter the source title.");
    if (!source.author.trim() || !source.year.trim())
      throw new Error(
        "Enter the author and year; use n.d. when the date is unknown.",
      );
    if (source.url && !/^https?:\/\//i.test(source.url))
      throw new Error("Use an HTTP or HTTPS source URL.");
  }
  async function refreshReferences() {
    if (session.metadata.value.sources.length) await prepareReferences();
    session.transact((value) => {
      value.html = ctx.sanitize(formatReferences(value.html, value.metadata));
    });
  }
  async function updateReference(
    kind: "note" | "source",
    id: string,
    update: string | Omit<CitationSource, "id"> | null,
  ) {
    if (kind === "source" && update !== null)
      validateSource(update as Omit<CitationSource, "id">);
    if (kind === "note" && update !== null && !String(update).trim())
      throw new Error("Enter the note text.");
    if (session.metadata.value.sources.length) await prepareReferences();
    mutate((root, value) => {
      if (kind === "note")
        value.metadata.notes = value.metadata.notes.flatMap((n) =>
          n.id !== id
            ? [n]
            : update === null
              ? []
              : [{ ...n, text: String(update).slice(0, 10000) }],
        );
      else
        value.metadata.sources = value.metadata.sources.flatMap((s) =>
          s.id !== id
            ? [s]
            : update === null
              ? []
              : [{ ...s, ...(update as Omit<CitationSource, "id">) }],
        );
      if (update === null)
        root
          .querySelectorAll(
            kind === "note" ? "[data-nle-note]" : "[data-nle-cite]",
          )
          .forEach((el) => {
            if (
              el.getAttribute(
                kind === "note" ? "data-nle-note" : "data-nle-cite",
              ) === id
            )
              el.remove();
          });
      root.innerHTML = formatReferences(root.innerHTML, value.metadata);
    });
  }
  async function blockAction(
    id: string,
    action: "up" | "down" | "duplicate" | "delete",
    chapter: boolean,
  ) {
    if (
      (suggesting.value || ctx.options.value?.role === "reviewer") &&
      (action === "up" || action === "down")
    )
      throw new Error("Finish review before moving document sections.");
    if (session.metadata.value.sources.length) await prepareReferences();
    mutate((root, value) => {
      const block = findBlock(root, id);
      if (!block) throw new Error("This block no longer exists.");
      if (block.hasAttribute("data-nle-suggestion"))
        throw new Error("Review this pending change before reorganizing it.");
      if (action === "duplicate") duplicateDocumentBlock(root, id);
      else if (action === "delete") block.remove();
      else moveDocumentBlock(root, id, action, chapter);
      root.innerHTML = formatReferences(root.innerHTML, value.metadata);
    });
  }
  function previewTemplate(
    fields: TemplateField[],
    data: Record<string, TemplateValue>,
  ) {
    templatePreview.value = renderDocumentTemplate(
      ctx.html.value,
      fields,
      data,
      ctx.locale(),
    );
    templatePreview.value.html = ctx.sanitize(templatePreview.value.html);
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "template.validated",
      ctx.options.value?.id,
      {
        schemaVersion: 1,
        fields: fields.length,
        errors: templatePreview.value.problems.length,
      },
    );
  }
  const locatedFields = new Map<string, number>();
  function locateTemplateField(name: string) {
    const root = ctx.root.value;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll("*")).filter(
      (el) =>
        el.getAttribute("data-variable") === name ||
        Array.from(el.childNodes).some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "")
              .replace(/\s+/g, "")
              .includes("{{" + name + "}}"),
        ),
    );
    const index = (locatedFields.get(name) ?? -1) + 1,
      target = targets[index % targets.length];
    locatedFields.set(name, index);
    if (target) {
      root.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      target.scrollIntoView({ block: "center" });
    }
  }
  function setTemplateBlock(kind: "condition" | "repeat", field: string) {
    if (!selected.value)
      throw new Error("Select a passage in the document first.");
    if (field && !/^!?[a-zA-Z_][\w.-]{0,100}$/.test(field))
      throw new Error("Invalid template field name.");
    mutate((root) => {
      const block = findBlock(root, selected.value!.id);
      if (!block) throw new Error("The passage has changed.");
      const attr = kind === "condition" ? "data-nle-if" : "data-nle-repeat";
      if (field) block.setAttribute(attr, field);
      else block.removeAttribute(attr);
    });
  }
  function generateTemplate() {
    if (!templatePreview.value || templatePreview.value.problems.length)
      throw new Error("Resolve the template validation errors first.");
    mutate((root) => {
      root.innerHTML = templatePreview.value!.html;
      assignBlockIds(root);
    });
  }
  async function exportTemplate(format: "pdf" | "word" | "html" | "markdown") {
    const result = templatePreview.value;
    if (!result || result.problems.length)
      throw new Error("Resolve the template validation errors first.");
    const html = ctx.sanitize(result.html),
      settings = cloneDocument(session.metadata.value.page);
    const exports = await import("../utils/export");
    if (format === "pdf") {
      const { createSemanticPdf } = await import("../utils/semanticPdf");
      const result = await createSemanticPdf(html, {
        settings,
        sink: ctx.options.value?.onDiagnostic,
      });
      exports.downloadFile(
        result.blob,
        "generated-document.pdf",
        "application/pdf",
      );
    } else if (format === "word") await exports.exportAsWord(html);
    else if (format === "html") exports.exportAsHtml(html);
    else exports.exportAsMarkdown(html);
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "template.exported",
      ctx.options.value?.id,
      { format },
    );
  }
  async function generateAi(
    action: AiRequest["action"],
    instruction: string,
    wholeDocument: boolean,
  ) {
    if (!selected.value)
      throw new Error("Select a passage in the document first.");
    await ai.generate(
      selected.value,
      action,
      session.metadata.value.page.language,
      instruction,
      wholeDocument ? ctx.html.value : undefined,
    );
  }
  function acceptAi() {
    const proposal = ai.proposal.value;
    if (!proposal || proposal.documentId !== ctx.options.value?.id)
      throw new Error("This proposal belongs to an earlier document.");
    mutate((root) => {
      const range = anchorRange(root, proposal.anchor);
      if (!range)
        throw new Error(
          "The selected passage changed. Generate a new proposal.",
        );
      const replacement = documentRoot(ctx.sanitize(proposal.result.html));
      // Selection rewriting stays inside its existing block; providers may return a paragraph wrapper.
      const content =
        replacement.childElementCount === 1 &&
        replacement.firstElementChild?.tagName === "P"
          ? replacement.firstElementChild.innerHTML
          : replacement.innerHTML;
      if (/<(?:p|h[1-6]|table|ul|ol|div)\b/i.test(content))
        throw new Error(
          "The proposal contains block content. Request a passage-only rewrite.",
        );
      range.deleteContents();
      range.insertNode(range.createContextualFragment(content));
    });
    ai.cancel();
  }
  function cancel() {
    generation++;
    controller?.abort();
    controller = undefined;
    busy.value = false;
    ai.cancel();
  }
  watch(
    () => ctx.options.value?.id,
    () => {
      cancel();
      clearPdf();
      selected.value = null;
      importReport.value = null;
      comparison.value = null;
      findings.value = [];
    },
    { flush: "sync" },
  );
  watch(
    [ctx.html, session.metadata],
    () => {
      clearPdf();
      audited.value = false;
      templatePreview.value = null;
    },
    { flush: "sync" },
  );
  onScopeDispose(() => {
    cancel();
    clearPdf();
  });
  return {
    session,
    open,
    tab,
    message,
    error,
    busy,
    progress,
    findings,
    ignored,
    audited,
    suggesting,
    selected,
    importReport,
    pdf,
    pdfUrl,
    templatePreview,
    comparison,
    ai,
    readonly,
    pending,
    blocks,
    run,
    mutate,
    captureSelection,
    locateBlock,
    checkContent,
    locateFinding,
    fixFinding,
    captureSuggestedEdit,
    decide,
    decideMany,
    readWord,
    applyImport,
    exportSnapshot,
    previewPdf,
    download,
    downloadImportReport,
    savePage,
    addNote,
    addSource,
    insertReference,
    refreshReferences,
    updateReference,
    blockAction,
    previewTemplate,
    locateTemplateField,
    setTemplateBlock,
    generateTemplate,
    exportTemplate,
    generateAi,
    acceptAi,
    cancel,
    compareDocuments,
  };
}
