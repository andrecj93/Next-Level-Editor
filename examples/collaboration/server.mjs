import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, readFile, open, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

/** Host reference server. Supply real authorization and storage in your application. */
export function createCollaborationServer({
  port = 5281,
  host = "127.0.0.1",
  authorize,
  storage,
  onDiagnostic = () => {},
  maxRooms = 100,
  maxClientsPerRoom = 100,
}) {
  if (!authorize || !storage)
    throw new Error("Authorization and durable storage are required.");
  const server = new WebSocketServer({ host, port, maxPayload: 8_000_000 });
  const rooms = new Map();
  const log = (event, detail = {}) =>
    onDiagnostic({ event, timestamp: new Date().toISOString(), ...detail });
  function room(id, seed, canCreate) {
    if (!rooms.has(id) && rooms.size >= maxRooms)
      throw new Error("Room capacity reached.");
    if (!rooms.has(id))
      rooms.set(
        id,
        (async () => {
          const doc = new Y.Doc(),
            stored = await storage.load(id);
          if (!stored && !canCreate)
            throw new Error("Only an author can create a document.");
          Y.applyUpdate(doc, stored ?? seed);
          if (!stored) await storage.save(id, Y.encodeStateAsUpdate(doc));
          return { doc, clients: new Set(), queue: Promise.resolve() };
        })().catch((e) => {
          rooms.delete(id);
          throw e;
        }),
      );
    return rooms.get(id);
  }
  const send = (socket, data) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
  };
  async function authorized(client) {
    try {
      const access = await authorize({
        documentId: client.documentId,
        token: client.token,
      });
      if (access && ["author", "reviewer", "viewer"].includes(access.role)) {
        client.access = access;
        return true;
      }
    } catch {
      /* An unavailable authorization service never grants access. */
    }
    send(client.socket, { type: "denied" });
    client.socket.close(4003);
    client.current.clients.delete(client);
    return false;
  }
  async function broadcast(current, data, except) {
    for (const client of [...current.clients])
      if (client.socket !== except && (await authorized(client)))
        send(client.socket, data);
  }
  const presence = async (current) => {
    for (const client of [...current.clients]) await authorized(client);
    const users = [...current.clients].flatMap((c) =>
      c.presence ? [c.presence] : [],
    );
    await broadcast(current, { type: "presence", users });
  };
  server.on("connection", (socket) => {
    let client,
      joining = false,
      handled = Promise.resolve();
    const timer = setTimeout(() => {
      if (!client) socket.close(4001, "Join required");
    }, 10000);
    socket.on("message", (raw) => {
      // Serialize join and following writes; there is never a half-authorized client.
      handled = handled
        .then(async () => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "join" && !client && !joining) {
            joining = true;
            if (
              typeof msg.documentId !== "string" ||
              !/^[\w.-]{1,120}$/.test(msg.documentId)
            )
              throw new Error("Invalid document id");
            const access = await authorize({
              documentId: msg.documentId,
              token: msg.token,
            });
            if (
              !access ||
              !["author", "reviewer", "viewer"].includes(access.role)
            ) {
              send(socket, { type: "denied" });
              socket.close(4003);
              return;
            }
            const seed = Buffer.from(msg.initialState || "", "base64");
            const current = await room(
              msg.documentId,
              seed,
              access.role === "author",
            );
            if (current.clients.size >= maxClientsPerRoom)
              throw new Error("Participant capacity reached.");
            if (socket.readyState !== WebSocket.OPEN) return;
            client = {
              socket,
              current,
              documentId: msg.documentId,
              access,
              token: msg.token,
              presence: null,
            };
            current.clients.add(client);
            clearTimeout(timer);
            if (!(await authorized(client))) return;
            send(socket, {
              type: "ready",
              state: Buffer.from(Y.encodeStateAsUpdate(current.doc)).toString(
                "base64",
              ),
            });
            for (const c of [...current.clients]) {
              if (c !== client && c.awareness && (await authorized(c)))
                send(socket, { type: "awareness", data: c.awareness });
            }
            log("sync.joined", {
              documentId: msg.documentId,
              role: access.role,
            });
          } else if (client && msg.type === "update") {
            const { current, documentId } = client;
            // Revalidate each write: revocation must not depend on a new connection.
            if (
              !(await authorized(client)) ||
              client.access.role !== "author"
            ) {
              send(socket, { type: "rejected", id: msg.id });
              return;
            }
            const update = Buffer.from(msg.data || "", "base64");
            current.queue = current.queue
              .catch(() => {})
              .then(async () => {
                if (
                  !(await authorized(client)) ||
                  client.access.role !== "author"
                ) {
                  send(socket, { type: "rejected", id: msg.id });
                  return;
                }
                const candidate = new Y.Doc();
                try {
                  Y.applyUpdate(candidate, Y.encodeStateAsUpdate(current.doc));
                  Y.applyUpdate(candidate, update);
                  const state = Y.encodeStateAsUpdate(candidate);
                  if (state.byteLength > 20_000_000)
                    throw new Error("Document size limit");
                  await storage.save(documentId, state); // ACK only after durable commit.
                  Y.applyUpdate(current.doc, update);
                  await broadcast(
                    current,
                    { type: "update", data: msg.data },
                    socket,
                  );
                  send(socket, { type: "ack", id: msg.id });
                  log("sync.persisted", {
                    documentId,
                    bytes: update.byteLength,
                  });
                } catch {
                  send(socket, { type: "rejected", id: msg.id });
                  log("sync.write_failed", { documentId });
                } finally {
                  candidate.destroy();
                }
              });
            await current.queue;
          } else if (client && msg.type === "awareness") {
            if (!(await authorized(client))) return;
            if (typeof msg.data !== "string" || msg.data.length > 32768)
              throw new Error("Invalid awareness");
            const decoder = decoding.createDecoder(
              Buffer.from(msg.data, "base64"),
            );
            if (decoding.readVarUint(decoder) !== 1)
              throw new Error("One cursor per session");
            const id = decoding.readVarUint(decoder),
              clock = decoding.readVarUint(decoder),
              state = JSON.parse(decoding.readVarString(decoder));
            if (client.awarenessId !== undefined && client.awarenessId !== id)
              throw new Error("Cursor identity changed");
            if (
              [...client.current.clients].some(
                (c) => c !== client && c.awarenessId === id,
              )
            )
              throw new Error("Cursor identity is already in use");
            client.awarenessId = id;
            client.awarenessClock = clock;
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 1);
            encoding.writeVarUint(encoder, id);
            encoding.writeVarUint(encoder, clock);
            encoding.writeVarString(
              encoder,
              JSON.stringify(
                state
                  ? { cursor: state.cursor, user: client.access.user }
                  : null,
              ),
            );
            const data = Buffer.from(encoding.toUint8Array(encoder)).toString(
              "base64",
            );
            client.awareness = data;
            await broadcast(
              client.current,
              { type: "awareness", data },
              socket,
            );
          } else if (client && msg.type === "presence") {
            if (!(await authorized(client))) return;
            const value = msg.value;
            client.presence = value
              ? {
                  user: client.access.user,
                  anchor: Number.isInteger(value.anchor) ? value.anchor : null,
                  head: Number.isInteger(value.head) ? value.head : null,
                }
              : null;
            await presence(client.current);
          }
        })
        .catch(() => {
          log("sync.invalid_message");
          socket.close(4002, "Invalid message");
        });
    });
    socket.on("close", () => {
      clearTimeout(timer);
      if (client) {
        client.current.clients.delete(client);
        void presence(client.current).catch(() => log("sync.presence_failed"));
        if (client.awarenessId !== undefined) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 1);
          encoding.writeVarUint(encoder, client.awarenessId);
          encoding.writeVarUint(encoder, (client.awarenessClock || 0) + 1);
          encoding.writeVarString(encoder, "null");
          const data = Buffer.from(encoding.toUint8Array(encoder)).toString(
            "base64",
          );
          void broadcast(client.current, { type: "awareness", data }).catch(
            () => log("sync.presence_failed"),
          );
        }
        log("sync.left", { documentId: client.documentId });
      }
    });
  });
  return {
    server,
    close: async () => {
      server.clients.forEach((s) => s.terminate());
      await new Promise((resolveClose) => server.close(resolveClose));
      for (const item of rooms.values()) (await item).doc.destroy();
    },
  };
}

export function fileStorage(directory) {
  const root = resolve(directory);
  const filename = (id) =>
    join(root, createHash("sha256").update(id).digest("hex") + ".yjs");
  return {
    async load(id) {
      try {
        return new Uint8Array(await readFile(filename(id)));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async save(id, bytes) {
      await mkdir(root, { recursive: true });
      const target = filename(id),
        file = await open(target + ".tmp", "w", 0o600);
      try {
        await file.writeFile(bytes);
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(target + ".tmp", target);
    },
  };
}
