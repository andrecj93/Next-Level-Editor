import type {
  CollaborationProvider,
  CollaborationTransport,
} from "../types/collaboration";
import { diagnostic, operationId } from "./documentDiagnostics";
import type { DiagnosticSink } from "../types/document";
type Presence = Parameters<CollaborationTransport["presence"]>[0];
export function encodeSyncBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function decodeSyncBytes(value: string): Uint8Array {
  if (typeof value !== "string" || value.length > 8_000_000)
    throw new Error("Collaboration message is too large.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
/** Acknowledgements must mean durable storage. The server, never these UI roles, authorizes writes. */
export function createWebSocketCollaborationProvider(config: {
  url: string;
  getToken: (documentId: string, signal: AbortSignal) => Promise<string>;
  onDiagnostic?: DiagnosticSink;
  maxQueuedBytes?: number;
}): CollaborationProvider {
  const endpoint = new URL(config.url);
  if (
    endpoint.protocol !== "wss:" &&
    !(
      endpoint.protocol === "ws:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
    )
  )
    throw new Error("Collaboration requires WSS except on localhost.");
  if (endpoint.username || endpoint.password || endpoint.search)
    throw new Error("Send credentials in the join message, never in the URL.");
  return {
    connect({ documentId, initialState, signal, onState }) {
      return new Promise<CollaborationTransport>((resolve, reject) => {
        let socket: WebSocket | undefined,
          closed = false,
          ready = false,
          connectedOnce = false,
          attempts = 0;
        let retry: ReturnType<typeof setTimeout> | undefined,
          handshake: ReturnType<typeof setTimeout> | undefined;
        let queuedBytes = 0,
          receive: (u: Uint8Array) => void = () => {},
          receivePresence: (
            users: Exclude<Presence, null>[],
          ) => void = () => {};
        let localPresence: Presence = null;
        let awarenessState: Uint8Array | undefined,
          receiveAwareness: (u: Uint8Array) => void = () => {};
        const queued = new Map<
          string,
          {
            data: string;
            bytes: number;
            resolve: () => void;
            reject: (error: Error) => void;
          }
        >();
        const sendJSON = (value: unknown) => {
          if (socket?.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify(value));
        };
        const transport: CollaborationTransport = {
          initialState: new Uint8Array(),
          send(update) {
            if (closed) return Promise.reject(new Error("Disconnected."));
            if (
              update.byteLength + queuedBytes >
              (config.maxQueuedBytes ?? 5_000_000)
            ) {
              onState("error");
              return Promise.reject(
                new Error(
                  "Offline changes exceed the sync queue. Export a copy before reconnecting.",
                ),
              );
            }
            const id = operationId(),
              data = encodeSyncBytes(update);
            queuedBytes += update.byteLength;
            return new Promise<void>((done, fail) => {
              queued.set(id, {
                data,
                bytes: update.byteLength,
                resolve: done,
                reject: fail,
              });
              if (ready) sendJSON({ type: "update", id, data });
            });
          },
          subscribe(callback) {
            receive = callback;
            return () => {
              receive = () => {};
            };
          },
          presence(value) {
            localPresence = value;
            if (ready) sendJSON({ type: "presence", value });
          },
          onPresence(callback) {
            receivePresence = callback;
            return () => {
              receivePresence = () => {};
            };
          },
          awareness(update) {
            awarenessState = update;
            if (ready)
              sendJSON({ type: "awareness", data: encodeSyncBytes(update) });
          },
          onAwareness(callback) {
            receiveAwareness = callback;
            return () => {
              receiveAwareness = () => {};
            };
          },
          close() {
            if (closed) return;
            closed = true;
            ready = false;
            clearTimeout(retry);
            clearTimeout(handshake);
            signal.removeEventListener("abort", abort);
            queued.forEach((q) =>
              q.reject(new Error("Disconnected before acknowledgement.")),
            );
            queued.clear();
            socket?.close(1000);
            receivePresence([]);
            diagnostic(
              config.onDiagnostic,
              "sync.transport_closed",
              documentId,
              { unsentBytes: queuedBytes },
            );
          },
        };
        function abort() {
          transport.close();
          if (!connectedOnce)
            reject(new DOMException("Cancelled", "AbortError"));
        }
        function reconnect() {
          if (closed) return;
          ready = false;
          clearTimeout(handshake);
          receivePresence([]);
          onState("offline");
          diagnostic(config.onDiagnostic, "sync.reconnecting", documentId, {
            attempt: attempts + 1,
            queuedBytes,
          });
          retry = setTimeout(
            () => {
              void connect();
            },
            Math.min(15000, 300 * 2 ** Math.min(attempts++, 6)),
          );
        }
        async function connect() {
          if (closed) return;
          onState("connecting");
          try {
            const token = await config.getToken(documentId, signal);
            if (closed || signal.aborted) return;
            socket = new WebSocket(config.url);
            const current = socket;
            handshake = setTimeout(
              () => current.close(4000, "Handshake timeout"),
              10000,
            );
            current.onopen = () =>
              sendJSON({
                type: "join",
                documentId,
                token,
                initialState: encodeSyncBytes(initialState),
              });
            current.onmessage = (event) => {
              if (closed || socket !== current) return;
              try {
                if (
                  typeof event.data !== "string" ||
                  event.data.length > 8_000_000
                )
                  throw new Error("Invalid collaboration response.");
                const message = JSON.parse(event.data);
                if (message.type === "ready") {
                  clearTimeout(handshake);
                  ready = true;
                  attempts = 0;
                  const state = decodeSyncBytes(message.state);
                  if (!connectedOnce) {
                    transport.initialState = state;
                    connectedOnce = true;
                    resolve(transport);
                  } else receive(state);
                  queued.forEach((q, id) =>
                    sendJSON({ type: "update", id, data: q.data }),
                  );
                  sendJSON({ type: "presence", value: localPresence });
                  onState(queued.size ? "connecting" : "synced");
                  if (awarenessState)
                    sendJSON({
                      type: "awareness",
                      data: encodeSyncBytes(awarenessState),
                    });
                  diagnostic(
                    config.onDiagnostic,
                    "sync.transport_ready",
                    documentId,
                    { queuedBytes },
                  );
                } else if (message.type === "update")
                  receive(decodeSyncBytes(message.data));
                else if (message.type === "awareness")
                  receiveAwareness(decodeSyncBytes(message.data));
                else if (message.type === "ack") {
                  const item = queued.get(message.id);
                  if (item) {
                    queuedBytes -= item.bytes;
                    item.resolve();
                    queued.delete(message.id);
                  }
                  if (!queued.size) onState("synced");
                } else if (
                  message.type === "presence" &&
                  Array.isArray(message.users)
                )
                  receivePresence(message.users.slice(0, 100));
                else if (message.type === "denied") {
                  const error = new Error("Document access was denied.");
                  onState("error");
                  if (!connectedOnce) reject(error);
                  transport.close();
                } else if (message.type === "rejected") {
                  const item = queued.get(message.id);
                  if (item) {
                    queuedBytes -= item.bytes;
                    item.reject(
                      new Error(
                        "The server rejected this change. Export your local draft.",
                      ),
                    );
                    queued.delete(message.id);
                  }
                  onState("error");
                  transport.close();
                }
              } catch {
                onState("error");
                current.close(4002, "Invalid response");
              }
            };
            current.onclose = () => {
              if (socket === current) reconnect();
            };
            current.onerror = () => {
              diagnostic(
                config.onDiagnostic,
                "sync.transport_error",
                documentId,
              );
            };
          } catch {
            if (signal.aborted) abort();
            else reconnect();
          }
        }
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        else void connect();
      });
    },
  };
}
