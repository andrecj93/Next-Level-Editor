import * as Y from "yjs";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, chainCommands } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { tableEditing, goToNextCell } from "prosemirror-tables";
import {
  splitListItem,
  sinkListItem,
  liftListItem,
} from "prosemirror-schema-list";
import {
  ySyncPlugin,
  ySyncPluginKey,
  yUndoPlugin,
  yCursorPlugin,
  undo,
  redo,
  prosemirrorToYDoc,
} from "y-prosemirror";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import type { DocumentMetadata, DocumentSnapshot } from "../types/document";
import { defaultDocumentMetadata } from "../types/document";
import {
  updateSharedMetadata,
  readSharedMetadata,
} from "./collaborationMetadata";
import { operationId } from "./documentDiagnostics";
import { documentRoot, assignBlockIds } from "./documentOperations";
import {
  collaborationSchema,
  parseCollaborativeHtml,
  serializeCollaborativeDocument,
} from "./collaborationSchema";
import type {
  CollaborationOptions,
  ConnectionState,
} from "../types/collaboration";
import { diagnostic } from "./documentDiagnostics";
export interface CollaborationBinding {
  applyHtml(html: string): void;
  applySnapshot(value: DocumentSnapshot): void;
  applyMetadata(before: DocumentMetadata, after: DocumentMetadata): void;
  readHtml(): string;
  undo(): void;
  redo(): void;
  history(): { undo: number; redo: number };
  destroy(): void;
}
export async function bindCollaborativeEditor(options: {
  root: HTMLElement;
  documentId: string;
  html: string;
  configuration: CollaborationOptions;
  readonly: () => boolean;
  sanitize: (html: string) => string;
  signal: AbortSignal;
  onUpdate: (html: string) => void;
  onState: (state: ConnectionState) => void;
  onPresence: (users: string[]) => void;
  metadata?: DocumentMetadata;
  onMetadata?: (metadata: DocumentMetadata) => void;
}): Promise<CollaborationBinding> {
  const config = options.configuration;
  const seedRoot = documentRoot(options.sanitize(options.html));
  assignBlockIds(seedRoot);
  const seed = prosemirrorToYDoc(
    parseCollaborativeHtml(seedRoot.innerHTML),
    "content",
  );
  if (options.metadata)
    updateSharedMetadata(
      seed.getMap("metadata"),
      defaultDocumentMetadata(),
      options.metadata,
    );
  let failed = false;
  const transport = await config.provider
    .connect({
      documentId: options.documentId,
      initialState: Y.encodeStateAsUpdate(seed),
      signal: options.signal,
      onState: (state) => options.onState(failed ? "error" : state),
    })
    .finally(() => seed.destroy());
  if (options.signal.aborted) {
    transport.close();
    throw new DOMException("Cancelled", "AbortError");
  }
  const doc = new Y.Doc();
  Y.applyUpdate(doc, transport.initialState, "remote");
  const fragment = doc.getXmlFragment("content");
  const sharedMetadata = doc.getMap<string>("metadata");
  const localOperation = Symbol("document-operation");
  const undoManager = new Y.UndoManager([fragment, sharedMetadata], {
    trackedOrigins: new Set([ySyncPluginKey, localOperation]),
  });
  const awareness = new Awareness(doc);
  const onAwareness = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin !== "remote")
      transport.awareness?.(
        encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]),
      );
  };
  awareness.on("update", onAwareness);
  const offAwareness = transport.onAwareness?.((update) =>
    applyAwarenessUpdate(awareness, update, "remote"),
  );
  const publishMetadata = () => {
    try {
      options.onMetadata?.(
        readSharedMetadata(sharedMetadata, options.sanitize),
      );
    } catch {
      options.onState("error");
      diagnostic(
        config.onDiagnostic,
        "sync.invalid_metadata",
        options.documentId,
      );
    }
  };
  sharedMetadata.observe(publishMetadata);
  let closed = false,
    pending = 0;
  const send = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || closed) return;
    pending++;
    options.onState("connecting");
    transport
      .send(update)
      .then(() => {
        if (!closed && --pending === 0)
          options.onState(failed ? "error" : "synced");
      })
      .catch(() => {
        if (!closed) {
          pending--;
          failed = true;
          options.onState("error");
          diagnostic(
            config.onDiagnostic,
            "sync.send_failed",
            options.documentId,
          );
        }
      });
  };
  doc.on("update", send);
  const offUpdates = transport.subscribe((update) => {
    if (!closed) Y.applyUpdate(doc, update, "remote");
  });
  const offPresence = transport.onPresence((users) =>
    options.onPresence(
      users.filter((p) => p.user.id !== config.user.id).map((p) => p.user.name),
    ),
  );
  const view = new EditorView(
    { mount: options.root },
    {
      state: EditorState.create({
        schema: collaborationSchema,
        plugins: [
          ySyncPlugin(fragment),
          yUndoPlugin({ undoManager }),
          yCursorPlugin(awareness, {
            cursorBuilder(user) {
              const cursor = document.createElement("span");
              cursor.className = "nle-remote-cursor";
              cursor.style.borderColor = /^#[a-f0-9]{6}$/i.test(user.color)
                ? user.color
                : "#2563eb";
              const name = document.createElement("span");
              name.textContent = String(user.name ?? "Participant").slice(
                0,
                100,
              );
              name.style.backgroundColor = cursor.style.borderColor;
              cursor.append(name);
              return cursor;
            },
          }),
          new Plugin({
            appendTransaction(transactions, _old, state) {
              if (
                !transactions.some(
                  (tr) => tr.docChanged && !tr.getMeta(ySyncPluginKey),
                )
              )
                return null;
              const tr = state.tr,
                seen = new Set<string>();
              state.doc.forEach((node, position) => {
                const id = node.attrs["data-nle-id"];
                if ("data-nle-id" in node.attrs && (!id || seen.has(id)))
                  tr.setNodeMarkup(position, undefined, {
                    ...node.attrs,
                    "data-nle-id": operationId(),
                  });
                else if (id) seen.add(id);
              });
              return tr.docChanged ? tr : null;
            },
          }),
          keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
          keymap({
            Enter: splitListItem(collaborationSchema.nodes.list_item),
            Tab: chainCommands(
              goToNextCell(1),
              sinkListItem(collaborationSchema.nodes.list_item),
            ),
            "Shift-Tab": chainCommands(
              goToNextCell(-1),
              liftListItem(collaborationSchema.nodes.list_item),
            ),
          }),
          keymap(baseKeymap),
          tableEditing(),
        ],
      }),
      editable: () => !options.readonly(),
      attributes: {
        role: "textbox",
        "aria-label": "Collaborative rich text editor",
        "aria-multiline": "true",
      },
      dispatchTransaction(this: EditorView, transaction) {
        if (closed || this.isDestroyed) return;
        if (
          options.readonly() &&
          transaction.docChanged &&
          !transaction.getMeta(ySyncPluginKey)
        )
          return;
        // Yjs can dispatch during EditorView construction, before the outer binding is assigned.
        this.updateState(this.state.apply(transaction));
        if (transaction.docChanged)
          options.onUpdate(
            options.sanitize(serializeCollaborativeDocument(this.state.doc)),
          );
        if (transaction.selectionSet)
          transport.presence({
            user: config.user,
            anchor: this.state.selection.anchor,
            head: this.state.selection.head,
          });
      },
    },
  );
  transport.presence({ user: config.user, anchor: null, head: null });
  awareness.setLocalStateField("user", config.user);
  publishMetadata();
  options.onUpdate(
    options.sanitize(serializeCollaborativeDocument(view.state.doc)),
  );
  options.onState("synced");
  diagnostic(config.onDiagnostic, "sync.connected", options.documentId);
  function applyHtml(html: string) {
    if (closed || options.readonly()) return;
    const next = parseCollaborativeHtml(options.sanitize(html));
    const old = view.state.doc;
    const start = old.content.findDiffStart(next.content);
    if (start == null) return;
    const end = old.content.findDiffEnd(next.content)!;
    let oldEnd = end.a,
      nextEnd = end.b;
    const overlap = start - Math.min(oldEnd, nextEnd);
    if (overlap > 0) {
      oldEnd += overlap;
      nextEnd += overlap;
    }
    view.dispatch(
      view.state.tr.replace(start, oldEnd, next.slice(start, nextEnd)),
    );
  }
  return {
    applyHtml,
    readHtml: () => serializeCollaborativeDocument(view.state.doc),
    applyMetadata: (before, after) => {
      if (!options.readonly())
        doc.transact(
          () => updateSharedMetadata(sharedMetadata, before, after),
          localOperation,
        );
    },
    applySnapshot: (value) => {
      if (options.readonly()) return;
      undoManager.stopCapturing();
      doc.transact(
        () =>
          updateSharedMetadata(
            sharedMetadata,
            readSharedMetadata(sharedMetadata, options.sanitize),
            value.metadata,
          ),
        localOperation,
      );
      applyHtml(value.html);
      undoManager.stopCapturing();
    },
    undo: () => {
      if (!options.readonly()) undo(view.state);
    },
    redo: () => {
      if (!options.readonly()) redo(view.state);
    },
    history: () => ({
      undo: undoManager.undoStack.length,
      redo: undoManager.redoStack.length,
    }),
    destroy: () => {
      if (closed) return;
      closed = true;
      awareness.setLocalState(null);
      transport.presence(null);
      offUpdates();
      offPresence();
      offAwareness?.();
      doc.off("update", send);
      sharedMetadata.unobserve(publishMetadata);
      awareness.destroy();
      undoManager.destroy();
      view.destroy();
      transport.close();
      doc.destroy();
      diagnostic(config.onDiagnostic, "sync.disconnected", options.documentId);
    },
  };
}
