# Host-controlled collaboration

`server.mjs` exports `createCollaborationServer` and `fileStorage`. Install dependencies with `npm ci` in the repository. Run a local demonstration in PowerShell:

```powershell
$env:NLE_COLLAB_TOKEN = '<choose-a-local-test-token>'
$env:NLE_COLLAB_DATA = 'C:\path\outside-the-repository\collaboration-data'
node examples/collaboration/cli.mjs
```

The server binds only `127.0.0.1:5281` by default. Open the demo with `?lab=documents&transport=websocket`, enter the same token, and connect. For another local port, append an encoded `endpoint=ws://127.0.0.1:PORT`. Tokens are sent inside the join message and never placed in URLs or diagnostics. Stop the CLI to stop the service; no background service is installed.

For an application, pass an `authorize({documentId, token})` function returning `{role, user}` or `null`, plus a storage adapter with `load` and `save`. The static-token CLI gives one local author access and is only a development example. A production authorization function must bind user, tenant, document and role, including token expiry. Reads/updates and cursor delivery recheck access. The server derives presence identity from authorization rather than trusting a client label. Never expose the static-token example on a public interface.

```ts
import { createWebSocketCollaborationProvider } from 'next-level-editor';
const collaboration = {
  user: { id: 'application-user-id', name: 'Ana', color: '#2563eb' },
  provider: createWebSocketCollaborationProvider({
    url: 'wss://your-application.example/editor-sync',
    getToken: async (documentId, signal) => {
      const response = await fetch('/api/editor-token/' + encodeURIComponent(documentId), { signal });
      if (!response.ok) throw new Error('Unable to authorize this document.');
      return (await response.json()).token;
    },
  }),
};
```

Pass it as `:collaboration="collaboration"` alongside a stable `document-options.id`. The server's role is authoritative; `document-options.role` controls the UI only. Only authors can write CRDT updates. Reviewers and viewers can read; use an exclusive review session for suggestions and decisions. Persist Yjs state with `storage.save` before returning successfully. `fileStorage` writes a temporary file, flushes it and renames it; it is a single-process local reference, not a distributed storage implementation. Use transactional storage and exclusive room ownership for multiple workers. Add TLS termination, origin/rate limits, identity/session policy, backups, idle-room eviction and monitoring before deploying a host service.

The example caps rooms and participants at 100, WebSocket messages at 8 MB and a document at 20 MB. The client offline queue defaults to 5 MB. A full queue, rejected write or authorization failure is visible as an error; retain/export the local draft and reconcile deliberately. Reconnection uses a fresh token and merges the server state before flushing queued operations. Presence is ephemeral. Local-author undo must not undo another participant's edits.

JSON stdout events include `sync.server_started`, `sync.joined`, `sync.persisted`, `sync.write_failed`, `sync.invalid_message`, and `sync.left`. They exclude credentials and document text. Route stdout through the host's bounded logger. The editor's `onDiagnostic` is a separate client hook. Unit tests exercise rejection, storage failures and offline merge; browser tests use separate contexts and an actual WebSocket server with file storage.
