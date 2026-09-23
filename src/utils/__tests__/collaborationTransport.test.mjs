// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import * as Y from "yjs";
import { createCollaborationServer } from "../../../examples/collaboration/server.mjs";
import { createWebSocketCollaborationProvider } from "../webSocketCollaboration";
globalThis.WebSocket = WebSocket;
const cleanup = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});
const until = async (predicate) => {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Condition timed out");
};
async function server() {
  const data = new Map();
  const state = { fail: false, revoked: new Set() };
  const instance = createCollaborationServer({
    port: 0,
    storage: {
      load: async (id) => data.get(id),
      save: async (id, bytes) => {
        if (state.fail) throw new Error("storage unavailable");
        data.set(id, bytes);
      },
    },
    authorize: async ({ token }) =>
      ["author", "viewer", "reviewer"].includes(token) &&
      !state.revoked.has(token)
        ? { role: token, user: { id: token, name: token, color: "#2563eb" } }
        : null,
  });
  await new Promise((resolve) => instance.server.on("listening", resolve));
  cleanup.push(() => instance.close());
  return {
    ...instance,
    state,
    data,
    url: "ws://127.0.0.1:" + instance.server.address().port,
  };
}
async function peer(url, token = "author") {
  const doc = new Y.Doc(),
    controller = new AbortController();
  const states = [];
  const transport = await createWebSocketCollaborationProvider({
    url,
    getToken: async () => token,
  }).connect({
    documentId: "test",
    initialState: Y.encodeStateAsUpdate(doc),
    signal: controller.signal,
    onState: (s) => states.push(s),
  });
  Y.applyUpdate(doc, transport.initialState);
  transport.subscribe((u) => Y.applyUpdate(doc, u));
  cleanup.push(() => {
    controller.abort();
    doc.destroy();
  });
  return { doc, transport, states };
}
describe("durable authenticated collaboration transport", () => {
  it.each(["viewer", "reviewer"])(
    "acknowledges durable updates and rejects %s writes",
    async (role) => {
      const host = await server(),
        author = await peer(host.url),
        viewer = await peer(host.url, role);
      author.doc.getText("text").insert(0, "Persisted");
      await author.transport.send(Y.encodeStateAsUpdate(author.doc));
      await until(() => viewer.doc.getText("text").toString() === "Persisted");
      expect(host.data.has("test")).toBe(true);
      viewer.doc.getText("text").insert(0, "Forbidden");
      await expect(
        viewer.transport.send(Y.encodeStateAsUpdate(viewer.doc)),
      ).rejects.toThrow(/rejected/);
      expect(author.doc.getText("text").toString()).toBe("Persisted");
    },
  );
  it("queues offline changes and merges after reconnecting", async () => {
    const host = await server(),
      a = await peer(host.url),
      b = await peer(host.url);
    host.server.clients.forEach((client) => client.terminate());
    await until(
      () => a.states.includes("offline") && b.states.includes("offline"),
    );
    a.doc.getText("text").insert(0, "A");
    b.doc.getText("text").insert(0, "B");
    await Promise.all([
      a.transport.send(Y.encodeStateAsUpdate(a.doc)),
      b.transport.send(Y.encodeStateAsUpdate(b.doc)),
    ]);
    await until(
      () =>
        a.doc.getText("text").length === 2 &&
        b.doc.getText("text").length === 2,
    );
    expect(a.doc.getText("text").toString()).toBe(
      b.doc.getText("text").toString(),
    );
  });
  it("does not broadcast or acknowledge a failed storage write", async () => {
    const host = await server(),
      a = await peer(host.url),
      b = await peer(host.url);
    host.state.fail = true;
    a.doc.getText("text").insert(0, "Unsaved");
    await expect(
      a.transport.send(Y.encodeStateAsUpdate(a.doc)),
    ).rejects.toThrow(/rejected/);
    expect(b.doc.getText("text").toString()).toBe("");
  });
  it("revokes existing readers before delivering presence or document updates", async () => {
    const host = await server(),
      author = await peer(host.url),
      viewer = await peer(host.url, "viewer");
    const received = [];
    viewer.transport.onPresence((users) => received.push(users));
    host.state.revoked.add("viewer");
    author.transport.presence({
      user: { id: "forged", name: "New private presence", color: "#2563eb" },
      anchor: 0,
      head: 0,
    });
    await until(() => viewer.states.includes("error"));
    expect(received.flat()).toHaveLength(0);
    author.doc.getText("text").insert(0, "Still private");
    await author.transport.send(Y.encodeStateAsUpdate(author.doc));
    expect(viewer.doc.getText("text").toString()).toBe("");
  });
});
