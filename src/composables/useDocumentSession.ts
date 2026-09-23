import { ref, shallowRef, watch, onScopeDispose, type Ref } from "vue";
import type {
  DocumentMetadata,
  DocumentOptions,
  DocumentSnapshot,
  DocumentVersion,
} from "../types/document";
import { defaultDocumentMetadata } from "../types/document";
import { cloneDocument, diagnostic } from "../utils/documentDiagnostics";
import { RevisionConflictError } from "../utils/versionStore";
import { validateDocumentSnapshot } from "../utils/documentValidation";
import type { CaretOffsets } from "../utils/caretOffset";
interface SessionContext {
  options: Ref<DocumentOptions | undefined>;
  html: Ref<string>;
  apply: (html: string) => void;
  sanitize: (html: string) => string;
  comments?: { read: () => string; write: (json: string) => void };
  selection?: {
    read: () => CaretOffsets | null;
    write: (value: CaretOffsets) => void;
  };
}
export function useDocumentSession(ctx: SessionContext) {
  const metadata = shallowRef<DocumentMetadata>(defaultDocumentMetadata());
  const versions = shallowRef<DocumentVersion[]>([]);
  const status = ref<
    "ready" | "loading" | "saving" | "saved" | "error" | "conflict"
  >("ready");
  const error = ref("");
  const revision = ref(0);
  const recovery = shallowRef<DocumentSnapshot | null>(null);
  const undoStack = shallowRef<DocumentSnapshot[]>([]);
  const redoStack = shallowRef<DocumentSnapshot[]>([]);
  const selections = new WeakMap<DocumentSnapshot, CaretOffsets>();
  let inputKind: string | undefined;
  let current = snapshot();
  let generation = 0,
    disposed = false,
    applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastTyping = 0;
  let inFlight: Promise<void> | undefined;
  function snapshot(): DocumentSnapshot {
    const meta = cloneDocument(metadata.value);
    if (ctx.comments) meta.comments = ctx.comments.read();
    const result = { html: ctx.sanitize(ctx.html.value), metadata: meta };
    const selection = ctx.selection?.read();
    if (selection) selections.set(result, selection);
    return result;
  }
  const canEdit = () => ctx.options.value?.role !== "viewer";
  function scheduleCheckpoint() {
    const opts = ctx.options.value;
    if (!canEdit() || !opts?.autoCheckpointMs || !opts.store || timer) return;
    timer = setTimeout(
      () => {
        timer = undefined;
        void checkpoint("Automatic checkpoint").catch(() => {});
      },
      Math.max(5000, opts.autoCheckpointMs),
    );
  }
  function remember(before: DocumentSnapshot, typing = false) {
    const now = Date.now();
    if (!typing || now - lastTyping > 800 || !undoStack.value.length)
      undoStack.value = [...undoStack.value.slice(-99), before];
    lastTyping = typing ? now : 0;
    redoStack.value = [];
  }
  function apply(value: DocumentSnapshot) {
    value = validateDocumentSnapshot(value, ctx.sanitize);
    applying = true;
    try {
      metadata.value = cloneDocument(value.metadata);
      ctx.comments?.write(metadata.value.comments);
      ctx.apply(value.html);
      current = snapshot();
    } finally {
      applying = false;
    }
    persistRecovery();
    scheduleCheckpoint();
  }
  function commit(value: DocumentSnapshot) {
    if (!canEdit()) throw new Error("This document is read-only.");
    value = validateDocumentSnapshot(value, ctx.sanitize);
    if (JSON.stringify(current) !== JSON.stringify(value)) remember(current);
    apply(value);
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "document.operation",
      ctx.options.value?.id,
    );
  }
  function transact(change: (value: DocumentSnapshot) => void) {
    const value = snapshot();
    change(value);
    commit(value);
  }
  function undo() {
    if (!canEdit()) return;
    const previous = undoStack.value[undoStack.value.length - 1];
    if (!previous) return;
    redoStack.value = [...redoStack.value, snapshot()];
    undoStack.value = undoStack.value.slice(0, -1);
    apply(previous);
    const selection = selections.get(previous);
    if (selection) ctx.selection?.write(selection);
    lastTyping = 0;
  }
  function redo() {
    if (!canEdit()) return;
    const next = redoStack.value[redoStack.value.length - 1];
    if (!next) return;
    undoStack.value = [...undoStack.value, snapshot()];
    redoStack.value = redoStack.value.slice(0, -1);
    apply(next);
    const selection = selections.get(next);
    if (selection) ctx.selection?.write(selection);
    lastTyping = 0;
  }
  function recoveryKey(id: string) {
    return "nle-recovery-v1:" + encodeURIComponent(id);
  }
  function persistRecovery() {
    const opts = ctx.options.value;
    if (
      !opts?.localRecovery ||
      recovery.value ||
      typeof localStorage === "undefined"
    )
      return;
    try {
      const data = JSON.stringify({
        snapshot: snapshot(),
        revision: revision.value,
        savedAt: new Date().toISOString(),
      });
      if (data.length > 2_000_000)
        throw new Error("Recovery storage limit exceeded.");
      localStorage.setItem(recoveryKey(opts.id), data);
    } catch {
      error.value =
        "Local recovery could not be saved. Keep this tab open or export a copy.";
      diagnostic(opts.onDiagnostic, "document.recovery_failed", opts.id);
    }
  }
  async function refresh() {
    const opts = ctx.options.value,
      g = generation;
    if (!opts?.store) return;
    status.value = "loading";
    try {
      const result = await opts.store.list(opts.id);
      if (disposed || g !== generation) return;
      versions.value = result.map((v) => ({
        ...v,
        ...validateDocumentSnapshot(v, ctx.sanitize),
      }));
      revision.value = result[result.length - 1]?.revision ?? 0;
      status.value = "ready";
    } catch {
      if (g !== generation) return;
      status.value = "error";
      error.value = "Unable to load document versions.";
      diagnostic(opts.onDiagnostic, "version.load_failed", opts.id);
    }
  }
  async function checkpoint(label = "Checkpoint") {
    const opts = ctx.options.value,
      g = generation;
    if (!opts?.store)
      throw new Error("Configure a document version store first.");
    if (!canEdit()) throw new Error("This document is read-only.");
    if (inFlight) {
      await inFlight;
      if (g !== generation) return;
    }
    const value = snapshot(),
      expected = revision.value;
    status.value = "saving";
    error.value = "";
    diagnostic(opts.onDiagnostic, "version.create_started", opts.id);
    const task = (async () => {
      try {
        const saved = await opts.store!.create(opts.id, value, label, expected);
        if (disposed || g !== generation) return;
        revision.value = saved.revision;
        const listed = await opts.store!.list(opts.id);
        if (disposed || g !== generation) return;
        versions.value = listed.map((v) => ({
          ...v,
          ...validateDocumentSnapshot(v, ctx.sanitize),
        }));
        status.value = "saved";
        diagnostic(opts.onDiagnostic, "version.created", opts.id, {
          revision: saved.revision,
        });
      } catch (e) {
        if (g !== generation) return;
        status.value =
          e instanceof RevisionConflictError ? "conflict" : "error";
        error.value =
          e instanceof RevisionConflictError
            ? e.message
            : "The checkpoint was not saved. Your draft is unchanged; retry or export a copy.";
        diagnostic(opts.onDiagnostic, "version.create_failed", opts.id, {
          conflict: e instanceof RevisionConflictError,
        });
        throw e;
      }
    })();
    inFlight = task;
    try {
      await task;
    } finally {
      if (inFlight === task) inFlight = undefined;
    }
  }
  async function restore(version: DocumentVersion) {
    if (version.documentId !== ctx.options.value?.id)
      throw new Error("This version belongs to another document.");
    const g = generation,
      started = JSON.stringify(snapshot());
    await checkpoint("Before restore");
    if (disposed || g !== generation) return;
    if (started !== JSON.stringify(snapshot()))
      throw new Error(
        "Your draft changed while saving. Start the restore again.",
      );
    const before = snapshot();
    commit({ html: version.html, metadata: version.metadata });
    const restored = JSON.stringify(snapshot());
    try {
      await checkpoint("Restored: " + version.label);
    } catch {
      if (disposed || g !== generation) return;
      if (restored === JSON.stringify(snapshot())) apply(before);
      throw new Error(
        "Restore could not be saved. Your unsaved draft is retained.",
      );
    }
  }
  function acceptRecovery() {
    if (!recovery.value) return;
    commit(recovery.value);
    recovery.value = null;
    diagnostic(
      ctx.options.value?.onDiagnostic,
      "document.recovered",
      ctx.options.value?.id,
    );
  }
  function discardRecovery() {
    recovery.value = null;
    persistRecovery();
  }
  watch(
    [() => ctx.options.value?.id, () => ctx.options.value?.store],
    async () => {
      generation++;
      clearTimeout(timer);
      timer = undefined;
      versions.value = [];
      revision.value = 0;
      error.value = "";
      recovery.value = null;
      metadata.value = cloneDocument(
        ctx.options.value?.metadata ?? defaultDocumentMetadata(),
      );
      ctx.comments?.write(metadata.value.comments);
      undoStack.value = [];
      redoStack.value = [];
      current = snapshot();
      const opts = ctx.options.value;
      if (!opts) return;
      if (opts.localRecovery && typeof localStorage !== "undefined") {
        try {
          const raw = localStorage.getItem(recoveryKey(opts.id));
          if (raw && raw.length < 2_000_000) {
            const value = JSON.parse(raw);
            if (
              value.snapshot?.metadata?.schemaVersion === 1 &&
              typeof value.snapshot.html === "string" &&
              JSON.stringify(value.snapshot) !== JSON.stringify(snapshot())
            )
              recovery.value = validateDocumentSnapshot(
                value.snapshot,
                ctx.sanitize,
              );
          }
        } catch {
          error.value = "The local recovery record could not be read.";
        }
      }
      await refresh();
    },
    { immediate: true, flush: "sync" },
  );
  watch(
    ctx.html,
    () => {
      if (applying || !ctx.options.value) return;
      const next = snapshot();
      if (next.html === current.html) return;
      remember(current, Boolean(inputKind));
      current = next;
      persistRecovery();
      scheduleCheckpoint();
    },
    { flush: "sync" },
  );
  onScopeDispose(() => {
    disposed = true;
    generation++;
    clearTimeout(timer);
    persistRecovery();
  });
  function applyRemoteMetadata(value: DocumentMetadata) {
    metadata.value = cloneDocument(value);
    ctx.comments?.write(value.comments);
    current = snapshot();
  }
  function setInputKind(kind?: string) {
    if (!kind || kind !== inputKind) lastTyping = 0;
    inputKind = kind;
  }
  function resetBaseline() {
    current = snapshot();
    undoStack.value = [];
    redoStack.value = [];
    lastTyping = 0;
  }
  return {
    metadata,
    versions,
    status,
    error,
    revision,
    recovery,
    undoStack,
    redoStack,
    snapshot,
    commit,
    transact,
    undo,
    redo,
    refresh,
    checkpoint,
    restore,
    acceptRecovery,
    discardRecovery,
    applyRemoteMetadata,
    setInputKind,
    resetBaseline,
  };
}
