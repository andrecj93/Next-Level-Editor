# Document workspace

The optional document workspace adds durable versions, Word import, semantic PDF export, content checks, localization, tracked review, collaboration, AI proposals, references, page setup, structure operations, and typed templates. It implements the feature backlog in [roadmap #145](https://github.com/andrecj93/Next-Level-Editor/issues/145). These are opt-in library capabilities; a host supplies identity, server authorization, storage, and any AI service.

## Enable and persist a document

```vue
<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue';
import {
  NextLevelEditor, createIndexedDbVersionStore, defaultDocumentMetadata,
  type DocumentSnapshot,
} from 'next-level-editor';
import 'next-level-editor/style.css';

// Load both values from your application before mounting the editor.
const html = ref('<h1>Project notes</h1><p>Start here.</p>');
const metadata = shallowRef(defaultDocumentMetadata());
const store = createIndexedDbVersionStore({ database: 'my-editor-versions' });
const options = computed(() => ({
  id: 'project-notes-42', // Stable, unique across documents. Change it when opening another document.
  metadata: metadata.value, store, author: 'Ana', role: 'author' as const,
  localRecovery: true, autoCheckpointMs: 60_000,
}));
function changed(snapshot: DocumentSnapshot) {
  metadata.value = snapshot.metadata;
  // Persist snapshot.html AND snapshot.metadata through your normal application save flow.
  // Include the host's revision/ETag when writing a shared server record.
}
</script>

<template>
  <NextLevelEditor v-model="html" document-tools enable-comments
    :document-options="options" locale="pt-PT"
    content-language="pt-PT" content-direction="auto"
    @document-change="changed" />
</template>
```

Without `document-options`, `document-tools` creates an ephemeral editing session; persistent checkpoints need a store and a stable document ID. Plain HTML `v-model` remains supported. Metadata is a separate, versioned JSON contract. A document change emits a sanitized full snapshot. Remount with a new key/ID when the host opens another document; do not treat a different record as a revision of the current one.

The playground persists its document ID and metadata with its local draft. `?lab=documents` opens the capability demonstration. Its AI adapter only rearranges local fixture text and is explicitly labelled as a demonstration.

## Capabilities and boundaries

| Roadmap | Delivered behavior | Boundary |
| --- | --- | --- |
| F01 / #132 | Named and automatic checkpoints, browser IndexedDB or host store, text/format comparison, restore with before/after checkpoints, metadata-aware undo, local recovery | Browser storage can be unavailable or cleared. Hosts must authorize and compare revisions on server writes. |
| F02 / #133 | `.docx` worker conversion, bounded ZIP expansion, conversion report, preview, insert/replace, one undo operation | Does not reproduce Word page geometry, headers/footers, comments or revision history. Tracked changes require accepted-text acknowledgement. |
| F03 / #134 | Selectable/searchable text, heading outline, document language/title, PDF structure tree, lists/tables/images, progress/cancel | Tagged output is **not PDF/UA certification**. Assistive-technology and validator qualification remain required. |
| F04 / #135 | Alternative text, heading order, link labels, table headers, known-color contrast, locate/fix/ignore | Heuristics never certify a document. Unknown color/background combinations require manual checks. |
| F05 / #136 | English and Portuguese UI catalog, host overrides, separate persisted content language and direction, English prose-analysis gating | English-specific prose heuristics are disabled for other content languages. Third-party conversion/provider messages can retain their original language. |
| F06 / #138 | Block-anchored insert/delete/format suggestions, author/date, grouped accept/reject, roles, versions and undo | Review decisions use an exclusive editing session; simultaneous tracked-review decisions are deliberately disabled during coauthoring. |
| F07 / #139 | Structured CRDT text editing, presence/cursors, local-author undo, reconnect queue, metadata merge, authenticated durable reference server | Host deployment, real identities, backup, distributed locking, document access policy and load qualification belong to the application. |
| F08 / #140 | Host adapter for clarify/shorten/tone/translate, explicit scope, cancellable preview, usage result, stale-anchor rejection, one undo | No vendor key, paid provider, network AI request, or provider fallback is enabled by the library. |
| F09 / #141 | Editable sources and notes, repeated-note backlinks, APA author-date or numbered citations, regenerated bibliography, host formatter, portable clipboard references and import ID remapping | Explicit book/web-page data only; no automatic bibliographic lookup. Unsupported rich media in reference text is plain text. |
| F10 / #142 | A4/Letter, orientation, margins, header/footer/page numbers, keyboard page navigation and return to the saved caret; preview uses the download bytes | PDF uses its own flow renderer. It does not promise pixel-identical Word/HTML pagination. |
| F11 / #143 | Chapter-scope preview, stable block/chapter move, duplicate/delete, reference renumbering, one undo | Duplicating blocks with attached notes/citations/comments is refused until references are resolved; pending review blocks cannot be rearranged. |
| F12 / #144 | Typed/required/default fields, formatting, named datasets, conditions/repeats, validation locations, separate resolved exports | Generated exports preserve the template source. No executable expressions, networking, or arbitrary property access. |

## Locale packs and host integration

`locale` selects interface language and locale-aware plural forms, numbers and dates. `messages` overrides individual source-string keys, scoped to one editor. `contentLanguage` and `contentDirection` describe the author's document independently. `uiDirection` accepts `auto`, `ltr` or `rtl`; automatic direction follows the UI locale's language/script, including teleported controls. The Arabic host-dictionary example at `src/demo/examples/arabicMessages.ts` demonstrates plural forms and mixed-script editing, with English fallback for unspecified labels.

```ts
import portuguese from 'next-level-editor/locales/pt-PT'
import english from 'next-level-editor/locales/en'
import { createEditorLocaleFormatter } from 'next-level-editor/locale'
import type { EditorMessages } from 'next-level-editor'

const messages: EditorMessages = {
  ...portuguese,
  'Save': 'Guardar rascunho',
  '{count} words': { one: '{count} palavra', other: '{count} palavras' },
}
const ui = createEditorLocaleFormatter(() => 'pt-PT', () => messages)
ui.t('{count} words', { count: 2 }) // '2 palavras'
ui.number(1234.5)
ui.date(new Date(), { dateStyle: 'short' })
ui.shortcut('Mod+Enter', 'mac')
// English source strings are the final fallback; English plural forms are explicit.
createEditorLocaleFormatter(() => 'en', () => english)
```

These three subpaths have independent ESM/CommonJS runtime exports and declarations; they do not import Vue or the editor. The main entry retains its Portuguese catalog export for compatibility and includes the built-in English/Portuguese defaults. Host locale packs can be dynamically imported before updating `messages` and `locale`. Text interpolation is rendered as text, never evaluated as HTML. Plural catalogs require `other`; optional categories are `zero`, `one`, `two`, `few` and `many`. Full locale plural rules require `Intl.PluralRules`; older environments without it fall back to the existing English/Portuguese one/other behavior. Invalid language tags fall back to English.

`locale.loaded` and `locale.failed` diagnostics contain locale, direction and counts, never translation keys or document text. Private-use language subtags are removed from logs. Missing-message counts are deduplicated, batched and capped at 256; `missingKeysCapped` indicates truncation. Unknown host/provider strings retain their original text. Source-string interpolation in older dynamic messages still needs contextual review; the static audit alone does not establish complete localization.

Run `npm run audit:locales` for a persisted source report. It gates missing literal translation keys and internal Error literals in pt-PT, including bundled toolbar, command, shortcut, emoji, template and writing-note definitions. Literal prose in accessible names and tooltips is checked separately; dynamic call sites and unwrapped template text remain in the contextual review inventory. Technical language names and file formats intentionally retain their names.

File-upload validation retains structured reasons, so an open dialog changes language without uploading again. Insertion toasts use an optional `EditorMessageDescriptor`: UI labels and shortcut parameters are explicitly marked for translation, while filenames and manuscript excerpts stay unchanged. Existing notification callbacks continue to receive their English fallback string and optional success/error status; a third descriptor argument allows hosts to localize deferred feedback. Writing notes similarly retain their existing English `detail` and optionally provide `detailMessage` for localized UI. Locale changes never translate inserted templates or document text.

The page's shared live region follows the originating editor's language, including its `lang` attribute, while built-in feedback is visible. Delayed skip-link feedback uses the language at delivery. Removing an editor cancels its pending announcements and preference listeners without clearing another editor's feedback. Open slash-command searches retain the query and refresh results when locale, host messages or plugin commands change.

Run `npm run build` followed by `npx playwright install chromium` and `npm run verify:package` to pack and install the library into an isolated Vue 3.3.0 consumer. This verifies ESM/CommonJS, SSR, plugin registration, strict NodeNext declarations, catalogs without Vue, production bundling under a nested app URL, browser editing/version/read-only behavior, and deferred PDF preview assets, page navigation and caret return in both the ES and directly served UMD builds. Evidence remains under `node_modules/.cache/package-verification/` or the supplied `--evidence-dir`; failed temporary consumers are retained for diagnosis.

Declaration generation targets the advertised minimum Vue peer through the build-only `vue-minimum` alias. `.d.mts` and `.d.cts` exports preserve default imports under NodeNext; legacy `.d.ts` files remain available. The verifier installs a tarball and never publishes it to npm.

## Durable versions and diagnostics

`VersionStore` has `list`, `create(documentId, snapshot, label, expectedRevision)` and `deleteDocument`. A successful create must perform an atomic compare-and-swap. Throw `RevisionConflictError` for a stale revision. `createMemoryVersionStore` is useful in tests; `createIndexedDbVersionStore` uses a single read-write transaction and bounded retention (100 versions by default). Export the draft or refresh the version list after a conflict; never silently replace another writer's version.

Restore saves a checkpoint before changing the document, then saves the restored state as a new version. Document switches and intervening edits cancel stale restores. If persistence fails, the local draft remains available. Local recovery is opt-in, scoped by document ID and bounded to 2 MB; it is offered for review rather than automatically applied. Automatic checkpoints have a five-second minimum interval.

`onDiagnostic(event)` receives an event name, UTC timestamp, operation ID, document ID where available, and small numeric/status details. It never receives prose, selection text, prompts, credentials or imported file contents. Events include `document.operation`, `version.created`, `document.recovery_failed`, `import.completed`, `pdf.completed`, `ai.completed`, `template.validated`, `sync.connected` and failure equivalents. The default sink uses console diagnostics; supply a bounded application logger for persistent retention. The reference server emits JSON diagnostics to stdout. Logs are not a document backup.

## Word and PDF fidelity

Word conversion uses [Mammoth](https://github.com/mwilliamson/mammoth.js/), followed by the editor sanitizer. Central-directory checks are backed by actual streaming decompression counts; a forged declared size cannot bypass the expanded limit. The default limits are 15 MB compressed, 60 MB expanded, 2,000 entries, and 20 seconds. Encryption, macros, external resource fetching, entity declarations, duplicate entries and unsafe paths are rejected. A worker is terminated on cancellation or timeout. Imported endnotes get scoped anchors before sanitization.

The reproducible Word corpus in `e2e/helpers/word-corpus.ts` contains ten benign cases. Five read the original list, table, strict-OOXML and relative/root image relationship fixtures from the lockfile-pinned Mammoth 1.12.3 package (BSD-2-Clause); the other five construct explicit OOXML packages from synthetic content. No private Word documents or binary corpus files ship with the library.

| Corpus area | Verified content |
| --- | --- |
| Text and formatting | Heading levels 1–6, Unicode text order, bold/italic, hyperlinks and three-level mixed ordered/unordered lists |
| Tables | Merged header columns and body rows, nested tables, nested lists in cells and images in cells/lists |
| Embedded images | PNG, JPEG, GIF and WebP data images, decoded dimensions and explicit Unicode alternative text |
| Editing and storage | Preview without mutation, downloaded structure counts, replace and paragraph/heading insertion, exact one-step undo/redo, post-import editing, named checkpoint restoration after reload |

Run `npx playwright test e2e/document-word-corpus.spec.ts --workers=2 --retries=0` for 24 Chromium/mobile-WebKit cases. Each conversion attaches its fixture hash, byte count and content-free conversion report; the test also checks that conversion makes no remote requests. Generated image encodings can vary by browser. This is semantic preservation evidence for the supported corpus, not a claim of pixel-identical Word layout or support for every Office extension.

Semantic PDF uses [PDFKit's tagged-document facilities](https://pdfkit.org/docs/accessibility.html) and embedded Noto Sans Latin fonts. Headings, paragraphs, bold/italic/underline text, external links, lists, tables, local PNG/JPEG figures and explicit page breaks have dedicated rendering paths. Nested tables and cell images become text; inline images use alternative text; remote media is not fetched. Non-Latin scripts/symbols produce a font-coverage warning and need visual review or a different export format. Internal HTML note links remain intact in HTML/Word; the PDF text preserves reference labels without claiming working internal link annotations.

Headers/footers are pagination artifacts. The preview and its download share the same Blob. Changing content or settings invalidates the preview; an export finishing against a changed snapshot is rejected. The original export menu retains the image-based page renderer, now with a Unicode text layer, chapter bookmarks and links from the writing-quality branch. Its text can be searched and selected; it does not produce the semantic tags of the document-workspace renderer and is not PDF/UA certification.

| Output | References | Pagination and accessibility |
| --- | --- | --- |
| HTML | Citation text, endnotes and internal backlinks | Browser layout; semantic HTML remains available to the host. |
| Markdown | Readable citation/note text and converted links | Appearance and internal-link behavior depend on the Markdown renderer. |
| Word | Citation text and endnotes through the HTML-based Word converter | Not native Word footnote fields; PDF page settings and pagination are not reproduced. |
| Semantic PDF | Citation/note text, external clickable links; no internal note-link annotation contract | A4/Letter flow, page settings, embedded Latin fonts, document tags and bookmarks. Manual assistive-technology qualification remains required. |

A seven-page Portuguese fixture was independently checked with pypdf: 64 numbered passages retain reading order, accents and the euro sign extract correctly, three bookmarks and an external link are present, fonts are embedded, and list/table/image-alternative tags are present. A4 geometry, explicit page breaks, repeated headers/footers and page totals match the renderer result. Pages 1, 4 and 7 were also rendered with Poppler and inspected. This is fixture evidence, not PDF/UA certification. Paragraphs may split between pages; per-page footnote placement and general widow/orphan control are outside this renderer's contract.

## PDF page navigation

The built-in preview provides Previous/Next, a clamped page-number field, Page Up/Page Down/Home/End navigation, and Return to writing (also Escape). Controls wrap on narrow screens and remain available while scrolling the preview. Each canvas is rendered from the exported bytes, and Page text exposes the same page's extracted text for reading and selection. Closing or replacing a preview cancels pending work and disposes its worker; a late render cannot replace a newer page. The saved caret is restored only for the same unchanged document.

PDF.js is deferred until preview is requested. The installed ES and UMD packages include its browser module, module-worker asset and `PDFJS-LICENSE.txt` (Apache-2.0). Bundlers resolve these assets relative to the package, including nested host app paths. For direct UMD hosting, serve the two `.mjs` assets alongside the UMD file with JavaScript MIME types; allow those asset URLs under the host's script/worker CSP. The optional viewer needs a modern browser with module workers and the PDF.js runtime APIs. If the browser, CSP or asset loading prevents rendering, the error leaves Download PDF and Return to writing available. Core editing and CommonJS/SSR imports do not execute PDF.js. No document bytes are sent to an external conversion service.

The viewer limits input to 64 MB, per-stage loading/render waits to 30 seconds, display width to 1,200 CSS pixels, backing canvases to 8 megapixels/4,096 pixels per edge and device-pixel ratio to two. Page text is a plain-text reading aid, not a replacement for manual assistive-technology qualification of the tagged PDF. Diagnostics `layout.preview_started/completed/failed/disposed` and `layout.page_rendered/failed` contain counts, timing and cancellation state, never document/page text.

## AI adapter

```ts
const ai = {
  name: 'Our writing service',
  async generate(request, onPreview) {
    // Call an authenticated application endpoint; provider credentials stay on its server.
    const response = await fetch('/api/writing-proposal', {
      method: 'POST', signal: request.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: request.action, selection: request.selection,
        context: request.context, instruction: request.instruction, language: request.language,
      }),
    });
    if (!response.ok) throw new Error('Writing service unavailable.');
    const result = await response.json();
    onPreview(result.previewText ?? '');
    return { html: result.html, usage: result.usage };
  },
};
```

Requests include only the selected passage by default. Whole-document context requires an explicit checkbox. Selection/context/response bounds are 20k/100k/100k characters with a 60-second timeout. Responses never apply themselves. Accept verifies exact original block content as well as document identity, sanitizes the response, and retains a single undo boundary. Replacing a selection with unrelated block structures is rejected.

## Review, references and templates

Review suggestions retain the exact original block and proposed block under a stable ID. Repeated typing coalesces into a pending suggestion; deletion retains a visible ghost until a decision. Reviewers propose, authors decide, and viewers cannot mutate through document tools. UI roles are not server authorization. Accepted-content exports omit unaccepted proposals and refuse stale/orphaned decisions.

Viewers can read comment threads and expand replies. Add/reply/resolve/reopen/delete controls are unavailable, and their mutation handlers recheck the current role. Changing to viewer mode closes pending comment forms. The same behavior applies to the editor's `readonly` prop. In shared sessions, reviewer mode remains read-only because concurrent tracked review is not supported.

Loading a document or restoring host-supplied comments does not itself queue `saveHandler`. Checkpoints serialize against the latest completed revision and recheck permission after waiting for another checkpoint. Autosave also rechecks permission immediately before invoking `saveHandler`; a denied pending save retains its unsaved draft and can be retried after access returns. `version.create_denied` and `document.operation_denied` diagnostics contain an opaque document ID and reason, without content.

These browser checks cannot revoke a request already handed to the host. A remote `VersionStore` and `saveHandler` must authenticate the caller, enforce document access and the allowed review operation, and compare the revision inside their storage transaction. Never trust a role or author identity supplied by the browser. The included memory/IndexedDB stores provide local revision safety, not server authorization; persisted host review authorization remains a qualification gate.

Sources accept semicolon-separated people/organizations. Use `Family, Given` for a person and a plain literal for an organization. The built-in APA author-date formatter supports authored books and webpages with the entered year, publisher and page locator; it formats initials, multiple authors and repeated author-year labels locally. Enter titles in sentence case. It does not implement edited works, full dates, editions, retrieval dates or every APA disambiguation rule. A custom `CitationFormatter` supplies a full CSL engine when needed. No network metadata lookup or third-party citation processor is bundled. Notes and sources are independent metadata records; every generated note reference gets a unique backlink.

Copy/cut in the document workspace carries only the selected notes and source definitions in a versioned clipboard envelope, including a standard HTML fallback. Pasting into another document allocates new note IDs, reuses identical source definitions, preserves per-citation locators, and rebuilds endnotes/backlinks/bibliography in the destination style. Repeated occurrences in one fragment still share a definition; same-document note copies retain their identity. Text and metadata are committed as one undo operation, including one Yjs update during coauthoring. Cut and the later paste remain separate undo operations. A pending paste is refused if the document, selection, role or mounted editor changes while the formatter loads.

Context-menu Copy/Cut uses that same native clipboard path. Where the browser exposes programmatic HTML reads, context-menu Paste also retains references; otherwise use the browser's paste shortcut. Clipboard permission denial leaves the document intact and gives shortcut guidance. Automated verification covers an actual Chromium clipboard round trip and clipboard-event/HTML fallback in Chromium and mobile WebKit; it does not certify every operating system's clipboard manager.

Portable HTML import adapters can use the public `createReferenceFragment(html, metadata, documentId)` and `importReferenceFragment({ html, data?, metadata, documentId, sanitize })` helpers. The import helper returns sanitized HTML, copied destination metadata, and added/unresolved counts; the host must commit both returned values together. Supply the editor's HTML sanitizer (or an equivalent restrictive sanitizer). Payloads are bounded to one million characters and 1,000 selected sources/notes, with a 10,000-record destination limit. Only defined bibliographic fields are transferred; comments, suggestions and template data are excluded. `preserveDefinitions: false` provides readable HTML for hosts that cannot persist metadata. Plain HTML/Word/Markdown exports are readable publication formats, not substitutes for saving `DocumentSnapshot` metadata.

Missing, malformed or stripped clipboard definitions never resolve against an unrelated destination ID. Their visible text is retained as ordinary content, with a warning in the document workspace. Imported Word footnote anchors and backlinks are remapped as a group on every import; they remain readable imported endnotes, not native Word fields or automatically editable source records. `reference.clipboard_copied`, `reference.paste_started`, `reference.pasted`, cancellation/failure and clipboard-read diagnostics contain operation status and counts, never note text or source titles/URLs.

Template fields support `string`, `number`, `date`, `boolean`, and `list`, with `required`, `default`, and `format` (`plain`, `integer`, `percent`, `date-long`). Sample datasets are persisted in metadata. Templates use `{{field}}` text or legacy variable tokens. A block with `data-nle-if="enabled"` is included when truthy; `data-nle-if="!enabled"` provides its alternative. `data-nle-repeat="items"` repeats a block or table row and exposes `{{item}}` / `{{item.name}}`. Empty lists produce no rows. Nesting is limited to four levels, output to 1,000 repeated elements and 2 MB. Property access excludes prototype keys. Required values and types are checked before every generated export; `false` and `0` remain valid values.

## R00 architecture decision

The default editor retains its existing HTML/native editing engine. Stable top-level `data-nle-id` attributes and metadata snapshots support local history, review, selected AI edits and structure operations. Exact block-content anchors reject stale asynchronous edits, including equal-length replacements.

For collaboration only, an adapter mounts ProseMirror and binds its transactions to [Yjs](https://github.com/yjs/yjs) through [y-prosemirror](https://github.com/yjs/y-prosemirror). Plain text, paragraphs/headings, inline marks/links, lists/checklists, tables, variables and sanitized embedded blocks have schema representations. Presence widgets are explicitly removed at both ingestion boundaries so collaborator labels can never become saved prose. Shared metadata uses separate keys per note/source/field/thread/reply; independent replies do not replace whole thread arrays. Undo tracks local origins only.

The adapter owns both input and rendered document DOM while connected; native model watchers must not rewrite its empty paragraphs or selection decorations. Plain text transactions retain their actual insertion/deletion positions in Yjs, including whole UTF-16 surrogate pairs. This preserves spaces and character identities when another writer splits a paragraph at the same boundary. Formatting remains in the same Yjs transaction. Tab in the final table cell appends a row and enters its first cell as one undoable operation.

Comment reconciliation binds existing markers in place, preserving live selections. New threads persist `rangeData.anchorMode: "highlight"` with their metadata: if that marker disappears, the thread becomes orphaned instead of attaching to identical words at a stale node path. The discussion remains readable with a localized notice, and undo can restore its original marker without losing concurrent replies. Persist the marked HTML and discussion JSON together. Legacy range-only imports keep their guarded text-match fallback until a marker is established. Derived `anchorStatus` is not serialized; `comment.anchor_orphaned` and `comment.anchor_attached` diagnostics contain IDs and state, never discussion text. Sanitized snapshot echoes do not convert empty-paragraph placeholders into extra undo operations.

**Decision:** proceed with the opt-in structured adapter; do not migrate all existing HTML editors automatically. Arbitrary plugin DOM and unsupported custom HTML require schema extensions and a host-specific round-trip corpus before adoption. Live review-decision concurrency is outside this first supported combination. Coauthoring disables source/split views and native smart replacements/variable-token autowrapping to avoid competing input ownership; toolbar-created variables remain supported. The default engine remains the compatibility path.

| Consideration | Native editor plus stable blocks | Structured collaboration adapter |
| --- | --- | --- |
| Correctness | Exact anchors reject stale asynchronous changes; HTML snapshots support local undo. Concurrent text merging is unsupported. | Yjs operations merge concurrent text and formatting. Local-origin undo preserves remote edits; metadata records merge independently. |
| Migration and API | Existing HTML `v-model`, toolbar, source view and plugin DOM remain the default. | Opt-in `collaboration` binding owns text input. External HTML updates replace the structured document through a transaction; hosts must not echo stale server HTML into an active shared document. |
| Accessibility | Existing native selection, keyboard and writing flows remain. | Uses the same editor landmark and toolbar with ProseMirror input handling. Keyboard/browser tests pass; assistive-technology qualification remains a manual gate. |
| Licensing | Existing dependencies remain. | Yjs, ProseMirror and their binding use MIT licenses. Mammoth uses BSD-2-Clause, PDFKit/fflate MIT, PDF.js Apache-2.0, and embedded Noto fonts OFL-1.1. No third-party CSL processor is bundled. |
| Cost | No collaboration transport or service is required. | Adds CRDT state, document conversion, presence and transport work. Payload/queue bounds prevent unbounded client buffering; they are not a production capacity claim. |

The complete feature build measured on 2026-09-23 with Node 24.14.1 on Windows has a 346.59 KiB gzip ES core and 44.30 KiB gzip CSS (390.89 KiB combined). The base writing branch reports 262.7 KiB combined. These totals include all document features, so they do not isolate the collaboration adapter's cost. The unsplit UMD bundle is 1,110.34 KiB gzip. Prefer the ES build for deferred heavy features.

The manuscript browser gate types a short sentence into 1,000 paragraphs with 20 chapters under 4× CPU throttling, then verifies exact undo. With document history/recovery enabled, the local Chromium sample took 3,512 ms against a 5,000 ms gate. Repeated sanitization dominated the earlier 5,579 ms sample. A per-editor, one-result sanitizer cache now reuses identical validated HTML, capped at one million combined input/output characters; changed HTML and a changed DOM environment are revalidated. This is a reproducible synthetic interaction sample, not a physical-device or concurrent-editor capacity benchmark.

Reproduce the deterministic operation, sanitization, duplicate/reordered update, undo and metadata checks with `npx vitest run src/utils/__tests__/documentIntegrity.test.ts src/utils/__tests__/collaboration.test.ts src/utils/__tests__/collaborationRichContent.test.ts src/utils/__tests__/collaborationTransport.test.mjs`. The rich-content corpus covers overlapping formatting, Unicode replacement, nested-list siblings, merged-table edits, image attributes, variables and a marked comment passage split concurrently with a text extension. It verifies convergence, local undo and a new peer reloading shared state. Resolved comment styling survives conversion while transient pulse styling is removed.

Run `npx playwright test e2e/document-collaboration.spec.ts e2e/collaboration-rich-content.spec.ts --workers=1 --retries=0` for independent browser peers using the authenticated reference WebSocket server and durable file storage. Ten cases in Chromium and mobile WebKit cover insert/delete, formatted-boundary paragraph splits, nested-list Enter, last-cell Tab, deletion of a commented passage during a concurrent reply, and rich paste during a remote edit. Reconnect, local undo/redo and durable reload preserve both authors' work. Paste includes nested lists, merged tables, an image and a variable, plus hostile markup that is sanitized. Chromium uses its system clipboard; WebKit uses a clipboard event with HTML and plain-text flavors. These are operation samples, not load, latency, physical IME or exhaustive structural-move qualification. Browser offline emulation did not reliably suspend existing WebKit WebSockets; these experiments partition connections at the server instead.

Follow-on qualification is bounded to the host's custom schema/IME corpus, assistive technology, distributed storage ownership and load testing. Concurrent tracked-review decisions need their own operation model and remain disabled in shared sessions. No vendor account or paid infrastructure is required for the reproducible reference implementation.

The reference transport uses bounded messages, a bounded offline queue, abortable connection setup, exponential retry backoff capped at 15 seconds, duplicate-safe Yjs updates, and acknowledgements only after the host storage call succeeds. A rejected update stops that transport and leaves an error state for export/reconciliation. It must never announce the rejected draft as synchronized.

See [the server integration example](../examples/collaboration/README.md). This is an implementation and test surface, not a hosted collaboration service or production certification.
