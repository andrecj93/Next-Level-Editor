import type { DiagnosticSink } from "./document";
export interface Collaborator {
  id: string;
  name: string;
  color: string;
}
export type ConnectionState = "connecting" | "synced" | "offline" | "error";
/** The host authenticates and authorizes the room before returning its initial state. */
export interface CollaborationTransport {
  initialState: Uint8Array;
  send(update: Uint8Array): Promise<void>;
  subscribe(receive: (update: Uint8Array) => void): () => void;
  presence(
    state: {
      user: Collaborator;
      anchor: number | null;
      head: number | null;
    } | null,
  ): void;
  onPresence(
    receive: (
      users: {
        user: Collaborator;
        anchor: number | null;
        head: number | null;
      }[],
    ) => void,
  ): () => void;
  /** Optional Yjs awareness messages keep remote cursors anchored through concurrent edits. */
  awareness?(update: Uint8Array): void;
  onAwareness?(receive: (update: Uint8Array) => void): () => void;
  close(): void;
}
export interface CollaborationProvider {
  connect(options: {
    documentId: string;
    initialState: Uint8Array;
    signal: AbortSignal;
    onState: (state: ConnectionState) => void;
  }): Promise<CollaborationTransport>;
}
export interface CollaborationOptions {
  provider: CollaborationProvider;
  user: Collaborator;
  onDiagnostic?: DiagnosticSink;
}
