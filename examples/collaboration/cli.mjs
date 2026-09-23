import process from "node:process";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { createCollaborationServer, fileStorage } from "./server.mjs";
const token = process.env.NLE_COLLAB_TOKEN;
if (!token)
  throw new Error("Set NLE_COLLAB_TOKEN for this local reference server.");
const equal = (candidate) =>
  typeof candidate === "string" &&
  Buffer.byteLength(candidate) === Buffer.byteLength(token) &&
  timingSafeEqual(Buffer.from(candidate), Buffer.from(token));
const instance = createCollaborationServer({
  port: Number(process.env.PORT || 5281),
  storage: fileStorage(process.env.NLE_COLLAB_DATA || ".local/collaboration"),
  authorize: async ({ token: provided }) =>
    equal(provided)
      ? {
          role: "author",
          user: { id: "local-author", name: "Local author", color: "#2563eb" },
        }
      : null,
  onDiagnostic: (event) => console.info(JSON.stringify(event)),
});
instance.server.on("listening", () =>
  console.info(
    JSON.stringify({
      event: "sync.server_started",
      host: "127.0.0.1",
      port: Number(process.env.PORT || 5281),
    }),
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void instance.close().then(() => process.exit(0));
  });
