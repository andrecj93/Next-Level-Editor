import * as Y from "yjs";
import type {
  CollaborationProvider,
  CollaborationTransport,
  Collaborator,
} from "../types/collaboration";
type Presence = {
  user: Collaborator;
  anchor: number | null;
  head: number | null;
};
/** Deterministic reference/test provider. Network providers must enforce room authorization server-side. */
export function createMemoryCollaborationProvider(): CollaborationProvider {
  const rooms = new Map<
    string,
    {
      doc: Y.Doc;
      clients: Map<
        symbol,
        {
          update: (u: Uint8Array) => void;
          presence: (p: Presence[]) => void;
          state: Presence | null;
          awareness: (u: Uint8Array) => void;
          awarenessState?: Uint8Array;
        }
      >;
    }
  >();
  return {
    async connect({ documentId, initialState, signal, onState }) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      let room = rooms.get(documentId);
      if (!room) {
        const doc = new Y.Doc();
        Y.applyUpdate(doc, initialState);
        room = { doc, clients: new Map() };
        rooms.set(documentId, room);
      }
      const current = room,
        key = Symbol(),
        client = {
          update: (_u: Uint8Array) => {
            void _u;
          },
          presence: (_p: Presence[]) => {
            void _p;
          },
          state: null as Presence | null,
          awareness: (_u: Uint8Array) => {
            void _u;
          },
          awarenessState: undefined as Uint8Array | undefined,
        };
      current.clients.set(key, client);
      const publishPresence = () => {
        const users = [...current.clients.values()].flatMap((c) =>
          c.state ? [c.state] : [],
        );
        current.clients.forEach((c) => c.presence(users));
      };
      let closed = false;
      const transport: CollaborationTransport = {
        initialState: Y.encodeStateAsUpdate(current.doc),
        async send(update) {
          if (closed) throw new Error("Disconnected");
          Y.applyUpdate(current.doc, update);
          current.clients.forEach((c, id) => {
            if (id !== key) c.update(update);
          });
        },
        subscribe(receive) {
          client.update = receive;
          return () => {
            client.update = () => {};
          };
        },
        presence(state) {
          client.state = state;
          publishPresence();
        },
        onPresence(receive) {
          client.presence = receive;
          publishPresence();
          return () => {
            client.presence = () => {};
          };
        },
        awareness(update) {
          client.awarenessState = update;
          current.clients.forEach((c, id) => {
            if (id !== key) c.awareness(update);
          });
        },
        onAwareness(receive) {
          client.awareness = receive;
          current.clients.forEach((c, id) => {
            if (id !== key && c.awarenessState) receive(c.awarenessState);
          });
          return () => {
            client.awareness = () => {};
          };
        },
        close() {
          closed = true;
          current.clients.delete(key);
          publishPresence();
        },
      };
      signal.addEventListener("abort", transport.close, { once: true });
      onState("synced");
      return transport;
    },
  };
}
