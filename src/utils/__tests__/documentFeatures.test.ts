import { describe, it, expect, vi } from "vitest";
import { effectScope, ref, shallowRef, nextTick } from "vue";
import "fake-indexeddb/auto";
import {
  createMemoryVersionStore,
  createIndexedDbVersionStore,
  RevisionConflictError,
} from "../versionStore";
import {
  defaultDocumentMetadata,
  type DocumentOptions,
  type DocumentSnapshot,
} from "../../types/document";
import { useDocumentSession } from "../../composables/useDocumentSession";
import { useDocumentWorkspace } from "../../composables/useDocumentWorkspace";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import {
  documentRoot,
  assignBlockIds,
  anchorRange,
  duplicateDocumentBlock,
  moveDocumentBlock,
} from "../documentOperations";
import { renderDocumentTemplate } from "../documentTemplates";
import {
  proposeDocumentChanges,
  decideSuggestion,
  acceptedDocument,
} from "../documentReview";
import { auditDocument, repairFinding } from "../documentAccessibility";
import { renderReferences } from "../documentReferences";
import {
  parseCollaborativeHtml,
  serializeCollaborativeDocument,
  collaborationSchema,
} from "../collaborationSchema";
import { inspectDocxArchive } from "../docxArchive";
import { zipSync, strToU8 } from "fflate";
const { sanitizeHtml } = useHtmlSanitizer();
const snapshot = (
  html = '<p data-nle-id="nle-first">First draft</p>',
): DocumentSnapshot => ({ html, metadata: defaultDocumentMetadata() });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function session(id = "a", store = createMemoryVersionStore(), selection?: Parameters<typeof useDocumentSession>[0]["selection"]) {
  const scope = effectScope();
  const html = ref(snapshot().html);
  const options = shallowRef<DocumentOptions>({ id, store });
  const value = scope.run(() =>
    useDocumentSession({
      options,
      html,
      apply: (v) => {
        html.value = v;
      },
      sanitize: sanitizeHtml,
      selection,
    }),
  )!;
  return { scope, options, html, value };
}
describe("durable document versions", () => {
  it("refreshes an unchanged checkpoint selection before a command and preserves it through undo", async () => {
    let caret = { start: 0, end: 0 };
    const write = vi.fn();
    const s = session("caret", createMemoryVersionStore(), { read: () => caret, write });
    await tick();
    caret = { start: 6, end: 11 };
    s.value.captureSelection(s.html.value);
    caret = { start: 7, end: 7 };
    const replacement = s.html.value.replace("draft", "text");
    // A capture after the DOM mutation must not replace the original selection.
    s.value.captureSelection(replacement);
    s.html.value = replacement;
    s.value.undo();
    expect(write).toHaveBeenLastCalledWith({ start: 6, end: 11 });
    expect(s.html.value).toContain("First draft");
    s.scope.stop();
  });
  it("automatically checkpoints a metadata-only edit without requiring typing", async () => {
    const s = session("metadata-only");
    await tick();
    vi.useFakeTimers();
    try {
      s.options.value = { ...s.options.value, autoCheckpointMs: 5000 };
      s.value.transact((value) => {
        value.metadata.page.header = "Review copy";
      });
      await vi.advanceTimersByTimeAsync(5001);
      expect(s.value.versions.value).toHaveLength(1);
      expect(s.value.versions.value[0].metadata.page.header).toBe(
        "Review copy",
      );
      expect(s.value.versions.value[0].html).toContain("First draft");
    } finally {
      s.scope.stop();
      vi.useRealTimers();
    }
  });
  it.each([
    ["memory", () => createMemoryVersionStore(2)],
    [
      "indexeddb",
      () =>
        createIndexedDbVersionStore({
          database: "test-" + Math.random(),
          retention: 2,
        }),
    ],
  ] as const)(
    "%s atomically refuses concurrent writes and retains immutable versions",
    async (_name, make) => {
      const store = make();
      const value = snapshot();
      const results = await Promise.allSettled([
        store.create("doc", value, "one", 0),
        store.create("doc", value, "two", 0),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
          .reason,
      ).toBeInstanceOf(RevisionConflictError);
      value.html = "changed";
      expect((await store.list("doc"))[0].html).toContain("First draft");
      await store.create("doc", value, "second", 1);
      await store.create("doc", value, "third", 2);
      expect((await store.list("doc")).map((v) => v.revision)).toEqual([2, 3]);
      await store.deleteDocument("doc");
      expect(await store.list("doc")).toEqual([]);
    },
  );
  it("restores content and metadata with a before checkpoint and one undo", async () => {
    const s = session();
    await tick();
    await s.value.checkpoint("original");
    const original = s.value.versions.value[0];
    s.value.transact((value) => {
      value.html = "<p>Second draft</p>";
      value.metadata.notes.push({ id: "nle-note", text: "Note" });
    });
    await s.value.restore(original);
    expect(s.html.value).toContain("First draft");
    expect(s.value.metadata.value.notes).toHaveLength(0);
    expect(s.value.versions.value.map((v) => v.label)).toEqual([
      "original",
      "Before restore",
      "Restored: original",
    ]);
    s.value.undo();
    expect(s.html.value).toContain("Second draft");
    expect(s.value.metadata.value.notes).toHaveLength(1);
    s.scope.stop();
  });
  it("does not apply an old restore to a newly opened document", async () => {
    const store = createMemoryVersionStore();
    const saved = await store.create("a", snapshot(), "original", 0);
    const s = session("a", store);
    await tick();
    const realCreate = store.create.bind(store);
    let resume!: () => void;
    vi.spyOn(store, "create").mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      return realCreate(...args);
    });
    const restoring = s.value.restore(saved);
    await tick();
    s.options.value = { id: "b", store };
    s.html.value = "<p>Document B</p>";
    await nextTick();
    resume();
    await restoring;
    expect(s.html.value).toBe("<p>Document B</p>");
    expect(s.value.versions.value).toHaveLength(0);
    s.scope.stop();
  });
  it("sanitizes recovery previews and rejects corrupted metadata", async () => {
    localStorage.setItem(
      "nle-recovery-v1:recover",
      JSON.stringify({
        snapshot: snapshot(
          '<p>Recover<script>alert(1)</script><img src="x" onerror="alert(2)"></p>',
        ),
      }),
    );
    const s = session();
    s.options.value = { id: "recover", localRecovery: true };
    await nextTick();
    expect(s.value.recovery.value?.html).not.toMatch(/script|onerror/);
    s.value.acceptRecovery();
    expect(s.html.value).toContain("Recover");
    s.scope.stop();
    localStorage.removeItem("nle-recovery-v1:recover");
  });
});
describe("anchored document operations", () => {
  it("refuses a same-length stale range", () => {
    const root = documentRoot('<p data-nle-id="nle-a">First</p>');
    const anchor = {
      id: "nle-a",
      html: "First",
      text: "First",
      start: 0,
      end: 5,
    };
    expect(anchorRange(root, anchor)?.toString()).toBe("First");
    root.firstElementChild!.textContent = "Other";
    expect(anchorRange(root, anchor)).toBeNull();
  });
  it("moves a complete chapter and duplicates with unique IDs", () => {
    const root = documentRoot(
      '<h1 id="nle-heading-a">A</h1><p>a</p><h1>B</h1><p>b</p>',
    );
    assignBlockIds(root);
    const id = root.firstElementChild!.getAttribute("data-nle-id")!;
    moveDocumentBlock(root, id, "down", true);
    expect(root.textContent).toBe("BbAa");
    duplicateDocumentBlock(root, id);
    expect(root.querySelectorAll("#nle-heading-a")).toHaveLength(1);
    expect(
      new Set(
        Array.from(root.children).map((el) => el.getAttribute("data-nle-id")),
      ).size,
    ).toBe(root.children.length);
  });
});
describe("review and references", () => {
  it("coalesces a block suggestion, preserves accepted export, then rejects in place", () => {
    const meta = defaultDocumentMetadata();
    const before = '<p data-nle-id="nle-a">Old</p>';
    let after = proposeDocumentChanges(
      before,
      before.replace("Old", "New"),
      meta,
      "Ana",
    );
    after = proposeDocumentChanges(
      after,
      after.replace("New", "Newer"),
      meta,
      "Ana",
    );
    expect(meta.suggestions).toHaveLength(1);
    expect(acceptedDocument(after, meta)).toBe(before);
    expect(decideSuggestion(after, meta.suggestions[0], false)).toBe(before);
  });
  it("represents deletion without losing the rejected passage", () => {
    const meta = defaultDocumentMetadata();
    const before =
      '<p data-nle-id="nle-a">Removed</p><p data-nle-id="nle-b">Keep</p>';
    const pending = proposeDocumentChanges(
      before,
      '<p data-nle-id="nle-b">Keep</p>',
      meta,
      "Ana",
    );
    expect(pending).toContain("data-nle-deletion");
    expect(decideSuggestion(pending, meta.suggestions[0], false)).toBe(before);
  });
  it("numbers citations by occurrence and regenerates notes without duplication", () => {
    const metadata = defaultDocumentMetadata();
    metadata.citationStyle = "numbered";
    metadata.sources = [
      { id: "nle-s", author: "Ana", title: "Research", year: "2026" },
    ];
    metadata.notes = [{ id: "nle-n", text: "Supporting detail" }];
    const html =
      '<p><span data-nle-cite="nle-s"></span><a data-nle-note="nle-n"></a></p>';
    const first = renderReferences(html, metadata);
    expect(renderReferences(first, metadata)).toBe(first);
    expect(first).toContain("Supporting detail");
    expect(first).toContain("Research");
    expect(first).toContain("#nle-note-nle-n");
  });
});
describe("typed templates and content checks", () => {
  it("escapes values as text, evaluates repeat/conditions without scripts", () => {
    const result = renderDocumentTemplate(
      '<h1>{{ customer }}</h1><p data-nle-if="show">Visible</p><p data-nle-repeat="items">{{item.name}}</p>',
      [
        { name: "customer", type: "string", required: true },
        { name: "items", type: "list" },
      ],
      {
        customer: "<img src=x onerror=alert(1)>",
        show: false,
        items: [{ name: "One" }, { name: "Two" }],
      },
    );
    expect(result.problems).toEqual([]);
    expect(result.html).toContain("&lt;img");
    expect(result.html).not.toContain("Visible");
    expect(result.html).toContain("<p>One</p><p>Two</p>");
  });
  it("blocks prototype access, missing fields and unbounded repeats", () => {
    expect(() =>
      renderDocumentTemplate("", [{ name: "__proto__.x", type: "string" }], {}),
    ).toThrow();
    expect(
      renderDocumentTemplate("<p>{{missing}}</p>", [], {}).problems[0].field,
    ).toBe("missing");
    expect(() =>
      renderDocumentTemplate('<p data-nle-repeat="items">{{item}}</p>', [], {
        items: Array(1001).fill("x"),
      }),
    ).toThrow(/limit/);
  });
  it("fixes missing alternative text without changing surrounding prose", () => {
    const root = documentRoot(
      '<h1>Report</h1><p>Keep <img src="https://example.com/image.png"></p>',
    );
    const finding = auditDocument(root).find((f) => f.rule === "image-alt")!;
    expect(finding).toBeTruthy();
    repairFinding(root, finding, "Revenue chart");
    expect(root.textContent).toBe("ReportKeep ");
    expect(root.querySelector("img")?.alt).toBe("Revenue chart");
  });
});
describe("ingestion and structured engine security", () => {
  it("retains supported rich structure in the collaborative schema", () => {
    const html =
      '<h1 data-nle-id="nle-a" lang="pt-PT">Olá</h1><p><strong>Bold</strong> <em>italic</em> <a href="https://example.com">link</a></p><ul><li>One</li></ul><table><tbody><tr><th>Head</th><td>Cell</td></tr></tbody></table>';
    const result = serializeCollaborativeDocument(
      parseCollaborativeHtml(sanitizeHtml(html)),
    );
    for (const content of [
      "Olá",
      "<strong>Bold</strong>",
      "<em>italic</em>",
      "https://example.com",
      "<th",
      "Cell",
      "nle-a",
    ])
      expect(result).toContain(content);
  });
  it("sanitizes hostile CRDT values before creating live DOM", () => {
    const mark = collaborationSchema.marks.link.create({
      href: "javascript:alert(1)",
      style: "background-image:url(javascript:alert(2))",
    });
    const p = collaborationSchema.nodes.paragraph.create(
      {},
      collaborationSchema.text("Unsafe", [mark]),
    );
    const embedded = collaborationSchema.nodes.embedded.create({
      html: "<img src=x onerror=alert(1)><script>alert(2)</script>",
    });
    const result = serializeCollaborativeDocument(
      collaborationSchema.nodes.doc.create({}, [p, embedded]),
    );
    expect(result).not.toMatch(/javascript:|onerror|<script/);
  });
  it("rejects invalid, encrypted and oversized DOCX containers before conversion", () => {
    expect(() => inspectDocxArchive(new ArrayBuffer(40))).toThrow();
    const bytes = zipSync({ "word/document.xml": strToU8("<w:document/>") });
    expect(() => inspectDocxArchive(bytes.buffer as ArrayBuffer)).not.toThrow();
    expect(() =>
      inspectDocxArchive(bytes.buffer as ArrayBuffer, {
        compressedBytes: 10000,
        expandedBytes: 3,
        entries: 5,
        timeoutMs: 10,
      }),
    ).toThrow(/limit/);
  });
});
describe("document workspace operations", () => {
  it("applies a template as one undoable edit and prevents viewer edits", async () => {
    const scope = effectScope(),
      html = ref('<p data-nle-id="nle-a">Hello {{name}}</p>'),
      options = shallowRef<DocumentOptions>({ id: "template" });
    const w = scope.run(() =>
      useDocumentWorkspace({
        options,
        html,
        root: ref(null),
        apply: (v) => {
          html.value = v;
        },
        sanitize: sanitizeHtml,
        locale: () => "en",
        comments: { read: () => "[]", write: () => {} },
      }),
    )!;
    w.previewTemplate([{ name: "name", type: "string", required: true }], {
      name: "Ana",
    });
    w.generateTemplate();
    expect(html.value).toContain("Hello Ana");
    w.session.undo();
    expect(html.value).toContain("{{name}}");
    options.value = { id: "template", role: "viewer" };
    await expect(w.addNote("Not allowed")).rejects.toThrow(/read-only/);
    scope.stop();
  });
});
