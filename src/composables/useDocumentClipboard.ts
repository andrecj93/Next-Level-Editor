import { onScopeDispose, type Ref } from "vue";
import type { DocumentOptions } from "../types/document";
import type { CollaborationBinding } from "../utils/collaborationBinding";
import type { useDocumentWorkspace } from "./useDocumentWorkspace";
import { getCaretOffsets, setCaretOffsets } from "../utils/caretOffset";
import { diagnostic } from "../utils/documentDiagnostics";
import {
  createReferenceFragment,
  importReferenceFragment,
  hasReferenceFragment,
  formatReferenceCaret,
  REFERENCE_CLIPBOARD_TYPE,
} from "../utils/referenceClipboard";

export function useDocumentClipboard(ctx: {
  root: Ref<HTMLElement | null>;
  options: Ref<DocumentOptions | undefined>;
  workspace: ReturnType<typeof useDocumentWorkspace>;
  readonly: () => boolean;
  collaboration: () => CollaborationBinding | undefined;
  sanitize: (html: string) => string;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  let applying = false,
    disposed = false,
    generation = 0;
  onScopeDispose(() => {
    disposed = true;
    generation++;
  });
  const log = (
    event: string,
    detail?: Record<string, string | number | boolean>,
  ) =>
    diagnostic(
      ctx.options.value?.onDiagnostic,
      event,
      ctx.options.value?.id,
      detail,
    );
  async function contextAction(
    kind: "copy" | "cut" | "paste",
  ): Promise<boolean> {
    const root = ctx.root.value,
      options = ctx.options.value;
    if (!root || !options) return false;
    if (kind !== "copy" && ctx.readonly()) return true;
    if (kind !== "paste") {
      const selection = root.ownerDocument.getSelection();
      if (
        !selection?.rangeCount ||
        !root.contains(selection.anchorNode) ||
        !root.contains(selection.focusNode)
      )
        return false;
      const holder = document.createElement("div");
      holder.append(selection.getRangeAt(0).cloneContents());
      if (!hasReferenceFragment(holder.innerHTML)) return false;
      // The native event reaches onCopy synchronously, including browsers that
      // cannot write an HTML ClipboardItem. Cut deletes only after that copy.
      if (!document.execCommand(kind))
        ctx.notify(
          "Use the keyboard shortcut to copy or cut this passage.",
          "error",
        );
      return true;
    }
    if (!navigator.clipboard?.read) return false;
    const caret = getCaretOffsets(root),
      baseline = JSON.stringify(ctx.workspace.session.snapshot());
    try {
      for (const item of await navigator.clipboard.read()) {
        if (!item.types.includes("text/html")) continue;
        const html = await (await item.getType("text/html")).text();
        if (!hasReferenceFragment(html)) continue;
        if (
          disposed ||
          ctx.root.value !== root ||
          ctx.options.value?.id !== options.id ||
          ctx.readonly() ||
          JSON.stringify(ctx.workspace.session.snapshot()) !== baseline ||
          JSON.stringify(getCaretOffsets(root)) !== JSON.stringify(caret)
        )
          throw new Error(
            "The document or selection changed. Paste the passage again.",
          );
        await insert(html, "", false);
        return true;
      }
      return false;
    } catch {
      ctx.notify("Use the keyboard shortcut to paste this passage.", "error");
      log("reference.clipboard_read_failed");
      return true;
    }
  }
  function onCopy(event: ClipboardEvent) {
    const root = ctx.root.value,
      options = ctx.options.value,
      selection = root?.ownerDocument.getSelection();
    if (
      !root ||
      !options ||
      !event.clipboardData ||
      !selection?.rangeCount ||
      selection.isCollapsed
    )
      return;
    const range = selection.getRangeAt(0);
    if (
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    )
      return;
    if (event.type === "cut" && ctx.readonly()) {
      event.preventDefault();
      return;
    }
    const holder = document.createElement("div");
    holder.append(range.cloneContents());
    try {
      const copied = createReferenceFragment(
        ctx.sanitize(holder.innerHTML),
        ctx.workspace.session.snapshot().metadata,
        options.id,
      );
      if (!copied) return;
      event.clipboardData.setData("text/html", copied.html);
      event.clipboardData.setData("text/plain", selection.toString());
      // HTML carries the same envelope for browsers which reject custom MIME types.
      try {
        event.clipboardData.setData(REFERENCE_CLIPBOARD_TYPE, copied.data);
      } catch {
        /* HTML fallback */
      }
      event.preventDefault();
      log("reference.clipboard_copied", { cut: event.type === "cut" });
      if (event.type === "cut") void insert("", "", true);
    } catch {
      if (event.type === "cut") event.preventDefault();
      ctx.notify(
        "The reference selection is too large or contains invalid definitions. Copy a smaller passage.",
        "error",
      );
      log("reference.copy_failed");
    }
  }
  function onPaste(html: string, data: string): boolean {
    if (!ctx.options.value || !hasReferenceFragment(html, data)) return false;
    void insert(html, data, false);
    return true;
  }
  async function insert(html: string, data: string, cut: boolean) {
    if (ctx.readonly()) return;
    const root = ctx.root.value,
      options = ctx.options.value;
    const caret = root && getCaretOffsets(root);
    if (!root || !options || !caret) return;
    const selection = root.ownerDocument.getSelection()!,
      range = selection.getRangeAt(0);
    const anchor =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    if (anchor?.closest("[data-nle-generated]")) {
      ctx.notify(
        "Choose a passage outside generated notes or bibliography.",
        "error",
      );
      return;
    }
    const before = ctx.workspace.session.snapshot(),
      baseline = JSON.stringify(before);
    const token = ++generation;
    const operationLog = (
      event: string,
      detail?: Record<string, string | number | boolean>,
    ) => diagnostic(options.onDiagnostic, event, options.id, detail);
    operationLog("reference.paste_started", {
      cut,
      collaborative: Boolean(ctx.collaboration()),
    });
    try {
      const imported = cut
        ? {
            html: "",
            metadata: before.metadata,
            sourcesAdded: 0,
            notesAdded: 0,
            unresolved: 0,
            invalidPayload: false,
          }
        : importReferenceFragment({
            html,
            data,
            metadata: before.metadata,
            documentId: options.id,
            sanitize: ctx.sanitize,
          });
      if (imported.metadata.sources.length)
        await ctx.workspace.prepareReferences();
      if (disposed || generation !== token) {
        operationLog("reference.paste_cancelled", { disposed });
        return;
      }
      if (
        ctx.root.value !== root ||
        ctx.options.value?.id !== options.id ||
        ctx.readonly() ||
        JSON.stringify(ctx.workspace.session.snapshot()) !== baseline ||
        JSON.stringify(getCaretOffsets(root)) !== JSON.stringify(caret)
      )
        throw new Error(
          "The document or selection changed. Paste the passage again.",
        );
      const format = (content: string, offset: number) =>
        formatReferenceCaret(content, offset, (value) =>
          ctx.workspace.formatReferences(value, imported.metadata),
        );
      const binding = ctx.collaboration();
      if (binding) {
        binding.insertHtml(imported.html, imported.metadata, format);
      } else {
        ctx.workspace.session.captureSelection(before.html);
        applying = true;
        let committed = false;
        try {
          const inserted = document.execCommand(
            cut ? "delete" : "insertHTML",
            false,
            imported.html,
          );
          if (!inserted)
            throw new Error("The passage could not be pasted. Try again.");
          const afterCaret = getCaretOffsets(root)?.end ?? caret.start;
          const formatted = format(root.innerHTML, afterCaret);
          ctx.workspace.mutate((target, value) => {
            target.innerHTML = formatted.html;
            value.metadata = imported.metadata;
          });
          committed = true;
          setCaretOffsets(root, {
            start: formatted.caret,
            end: formatted.caret,
          });
        } finally {
          applying = false;
          if (!committed) {
            root.innerHTML = before.html;
            setCaretOffsets(root, caret);
          }
        }
      }
      operationLog("reference.pasted", {
        cut,
        sourcesAdded: imported.sourcesAdded,
        notesAdded: imported.notesAdded,
        unresolved: imported.unresolved,
        invalidPayload: imported.invalidPayload,
      });
      if (imported.unresolved || imported.invalidPayload)
        ctx.notify(
          "Some pasted references had no valid definitions. Their visible text was preserved.",
          "error",
        );
    } catch (error) {
      operationLog("reference.paste_failed", { cut });
      if (!disposed)
        ctx.notify(
          error instanceof Error
            ? error.message
            : "The passage could not be pasted. Try again.",
          "error",
        );
    }
  }
  return { onCopy, onPaste, contextAction, isApplying: () => applying };
}
