import type {
  DocumentSnapshot,
  DocumentVersion,
  VersionStore,
} from "../types/document";
import { cloneDocument, operationId } from "./documentDiagnostics";
export class RevisionConflictError extends Error {
  constructor(
    public expected: number,
    public actual: number,
  ) {
    super(
      "The document changed in another session. Both drafts have been preserved.",
    );
    this.name = "RevisionConflictError";
  }
}
export function createMemoryVersionStore(retention = 100): VersionStore {
  const documents = new Map<string, DocumentVersion[]>();
  return {
    async list(id) {
      return cloneDocument(documents.get(id) ?? []);
    },
    async create(id, value, label, expected) {
      const versions = documents.get(id) ?? [];
      const head = versions[versions.length - 1]?.revision ?? 0;
      if (head !== expected) throw new RevisionConflictError(expected, head);
      const version = makeVersion(id, value, label, head + 1);
      documents.set(id, [...versions, version].slice(-Math.max(2, retention)));
      return cloneDocument(version);
    },
    async deleteDocument(id) {
      documents.delete(id);
    },
  };
}
function makeVersion(
  documentId: string,
  snapshot: DocumentSnapshot,
  label: string,
  revision: number,
): DocumentVersion {
  return {
    ...cloneDocument(snapshot),
    documentId,
    label: label.slice(0, 160),
    revision,
    id: operationId(),
    createdAt: new Date().toISOString(),
  };
}
/** IndexedDB compare-and-swap executes atomically across tabs in one read/write transaction. */
export function createIndexedDbVersionStore(
  options: { database?: string; retention?: number } = {},
): VersionStore {
  const database = options.database ?? "next-level-editor-documents";
  const retention = Math.max(2, Math.min(500, options.retention ?? 100));
  let opened: Promise<IDBDatabase> | undefined;
  function open() {
    if (typeof indexedDB === "undefined")
      return Promise.reject(
        new Error("Document storage is unavailable in this browser."),
      );
    if (!opened)
      opened = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("documents");
        request.onerror = () => {
          opened = undefined;
          reject(new Error("Unable to open document storage."));
        };
        request.onblocked = () => {
          opened = undefined;
          reject(new Error("Close older document tabs to update storage."));
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            opened = undefined;
          };
          resolve(request.result);
        };
      });
    return opened;
  }
  async function transaction<T>(
    id: string,
    write: boolean,
    action: (versions: DocumentVersion[], store: IDBObjectStore) => T,
  ): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("documents", write ? "readwrite" : "readonly");
      const store = tx.objectStore("documents");
      const request = store.get(id);
      let result: T, failure: unknown;
      request.onsuccess = () => {
        try {
          result = action(request.result ?? [], store);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(cloneDocument(result));
      tx.onabort = tx.onerror = () =>
        reject(
          failure ??
            new Error(
              "Document storage failed; your current draft is still open.",
            ),
        );
    });
  }
  return {
    list: (id) => transaction(id, false, (versions) => versions),
    create: (id, snapshot, label, expected) =>
      transaction(id, true, (versions, store) => {
        const actual = versions[versions.length - 1]?.revision ?? 0;
        if (actual !== expected)
          throw new RevisionConflictError(expected, actual);
        const version = makeVersion(id, snapshot, label, actual + 1);
        store.put([...versions, version].slice(-retention), id);
        return version;
      }),
    deleteDocument: async (id) => {
      await transaction(id, true, (_versions, store) => {
        store.delete(id);
        return true;
      });
    },
  };
}
