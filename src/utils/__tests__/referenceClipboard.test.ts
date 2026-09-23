import { describe, expect, it } from "vitest";
import { effectScope, ref, shallowRef } from "vue";
import {
  createReferenceFragment,
  importReferenceFragment,
  formatReferenceCaret,
  remapFragmentAnchors,
} from "../referenceClipboard";
import {
  defaultDocumentMetadata,
  type DocumentOptions,
} from "../../types/document";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import { useDocumentSession } from "../../composables/useDocumentSession";
import { createMemoryVersionStore } from "../versionStore";
import { renderReferences } from "../documentReferences";
import { documentRoot } from "../documentOperations";

const { sanitizeHtml } = useHtmlSanitizer();
function fixture() {
  const metadata = defaultDocumentMetadata();
  metadata.citationStyle = "numbered";
  metadata.sources = [
    {
      id: "nle-source",
      title: "Clareza e ação",
      author: "Silva, Ana",
      year: "2026",
      locator: "42",
    },
    {
      id: "nle-private",
      title: "Uncopied source",
      author: "Other",
      year: "2025",
    },
  ];
  metadata.notes = [
    { id: "nle-note", text: "Supporting detail: שלום مرحبا" },
    { id: "nle-unused", text: "Uncopied note" },
  ];
  const html =
    '<p data-nle-id="nle-block">Passage <span data-nle-cite="nle-source">[1]</span><a data-nle-note="nle-note" id="nle-ref-nle-note" href="#nle-note-nle-note">[1]</a> repeated <a data-nle-note="nle-note">[1]</a></p>';
  return {
    metadata,
    html,
    copied: createReferenceFragment(html, metadata, "origin")!,
  };
}
const paste = (
  html: string,
  data?: string,
  metadata = defaultDocumentMetadata(),
  documentId = "destination",
) =>
  importReferenceFragment({
    html,
    data,
    metadata,
    documentId,
    sanitize: sanitizeHtml,
  });

describe("portable reference fragments", () => {
  it("preserves each repeated source locator when an equivalent destination source has another default", () => {
    const f = fixture(),
      target = defaultDocumentMetadata();
    target.sources = [
      { ...f.metadata.sources[0], id: "nle-existing", locator: "2" },
    ];
    const html =
      '<p><span data-nle-cite="nle-source">[1]</span> then <span data-nle-cite="nle-source">[1]</span> then <span data-nle-cite="nle-source" data-nle-locator="84">[1]</span></p>';
    const result = paste(html, f.copied.data, target);
    expect(result.sourcesAdded).toBe(0);
    expect(
      Array.from(
        documentRoot(result.html).querySelectorAll("[data-nle-cite]"),
      ).map((el) => el.getAttribute("data-nle-locator")),
    ).toEqual(["42", "42", "84"]);
  });
  it("does not bind a malformed marker carrying both source and note IDs", () => {
    const f = fixture();
    const result = paste(
      '<a data-nle-cite="nle-source" data-nle-note="nle-note" href="#nle-note-nle-note">Readable reference</a>',
      f.copied.data,
      f.metadata,
    );
    expect(result.html).not.toMatch(/data-nle-(cite|note)|href=/);
    expect(result.html).toContain("Readable reference");
    expect(result.sourcesAdded).toBe(0);
    expect(result.notesAdded).toBe(0);
    expect(result.unresolved).toBe(1);
  });
  it("copies only selected definitions and no review, comment, dataset or unrecognized source fields", () => {
    const f = fixture();
    Object.assign(f.metadata.sources[0], {
      privateHostField: "not for clipboard",
    });
    f.metadata.comments = '[{"id":"sensitive"}]';
    const copied = createReferenceFragment(f.html, f.metadata, "origin")!;
    const payload = JSON.parse(copied.data);
    expect(payload.sources).toHaveLength(1);
    expect(payload.notes).toHaveLength(1);
    expect(copied.data).not.toMatch(
      /Uncopied|privateHostField|not for clipboard|sensitive|suggestions|template/,
    );
    expect(copied.html).toContain("data-nle-reference-fragment");
    expect(
      createReferenceFragment(
        "<p>Ordinary selection</p>",
        f.metadata,
        "origin",
      ),
    ).toBeNull();
  });
  it("remaps colliding definitions and repeated references without changing the destination", () => {
    const f = fixture(),
      target = defaultDocumentMetadata();
    target.sources = [
      { ...f.metadata.sources[0], title: "Different destination source" },
    ];
    target.notes = [{ id: "nle-note", text: "Different destination note" }];
    const result = paste(f.copied.html, f.copied.data, target);
    const root = documentRoot(result.html),
      noteIds = Array.from(root.querySelectorAll("[data-nle-note]")).map((el) =>
        el.getAttribute("data-nle-note"),
      );
    expect(result.sourcesAdded).toBe(1);
    expect(result.notesAdded).toBe(1);
    expect(noteIds[0]).toBe(noteIds[1]);
    expect(noteIds[0]).not.toBe("nle-note");
    expect(
      root.querySelector("[data-nle-cite]")?.getAttribute("data-nle-cite"),
    ).not.toBe("nle-source");
    expect(
      root.querySelector("[data-nle-cite]")?.getAttribute("data-nle-locator"),
    ).toBe("42");
    expect(root.querySelector("[data-nle-id]")).toBeNull();
    expect(target.notes).toHaveLength(1);
    expect(result.metadata.notes[0].text).toBe("Different destination note");
    expect(result.html).not.toContain("data-nle-reference-fragment");
  });
  it("deduplicates equivalent sources while keeping each citation locator", () => {
    const f = fixture(),
      target = defaultDocumentMetadata();
    target.sources = [
      { ...f.metadata.sources[0], id: "nle-existing", locator: "2" },
    ];
    const result = paste(f.copied.html, undefined, target);
    expect(result.sourcesAdded).toBe(0);
    expect(result.metadata.sources).toHaveLength(1);
    expect(result.html).toContain('data-nle-cite="nle-existing"');
    expect(result.html).toContain('data-nle-locator="42"');
    expect(result.metadata.sources[0].locator).toBe("2");
  });
  it("reuses the same note in its original document but separates an equal cross-document ID", () => {
    const f = fixture();
    const same = paste(f.copied.html, undefined, f.metadata, "origin");
    expect(same.notesAdded).toBe(0);
    expect(same.html).toContain('data-nle-note="nle-note"');
    const other = paste(f.copied.html, undefined, f.metadata, "another");
    expect(other.notesAdded).toBe(1);
    expect(other.html).not.toContain('data-nle-note="nle-note"');
  });
  it.each([
    "",
    "{broken",
    JSON.stringify({ version: 99 }),
    "x".repeat(1_000_001),
  ])(
    "preserves visible markers without binding missing or invalid metadata (%#)",
    (data) => {
      const f = fixture();
      const result = paste(f.html, data, f.metadata);
      expect(result.html).toContain("[1]");
      expect(result.html).not.toMatch(/data-nle-(cite|note)|href=/);
      expect(result.unresolved).toBe(3);
      expect(result.metadata).toEqual(f.metadata);
    },
  );
  it("rejects ambiguous or hostile definitions, strips executable HTML and review identities", () => {
    const f = fixture(),
      payload = JSON.parse(f.copied.data);
    payload.sources.push(payload.sources[0]);
    const result = paste(
      f.html +
        '<p onclick="alert(1)" data-nle-suggestion="nle-existing"><script>alert(1)</script><span class="comment-highlight" data-thread-id="host-thread">Text</span></p>',
      JSON.stringify(payload),
    );
    expect(result.invalidPayload).toBe(true);
    expect(result.metadata.sources).toHaveLength(0);
    expect(result.html).not.toMatch(
      /onclick|script|data-thread-id|comment-highlight|data-nle-suggestion/,
    );
    payload.sources.pop();
    payload.sources[0].url = "javascript:alert(1)";
    expect(paste(f.html, JSON.stringify(payload)).invalidPayload).toBe(true);
  });
  it("plain HTML consumers keep readable end matter without unsaved live reference IDs", () => {
    const f = fixture();
    const copied = createReferenceFragment(
      renderReferences(f.html, f.metadata),
      f.metadata,
      "origin",
    )!;
    const result = importReferenceFragment({
      html: copied.html,
      metadata: defaultDocumentMetadata(),
      documentId: "",
      sanitize: sanitizeHtml,
      preserveDefinitions: false,
    });
    expect(result.html).toContain("Supporting detail");
    expect(result.html).toContain("Clareza");
    expect(result.html).not.toMatch(/data-nle-(cite|note|generated)/);
    expect(result.metadata.notes).toEqual([]);
  });
  it("regenerates one set of end matter and preserves the caret after renumbering", () => {
    const f = fixture(),
      html = renderReferences(f.html, f.metadata);
    const copied = createReferenceFragment(html, f.metadata, "origin")!;
    const result = paste(copied.html, copied.data);
    result.metadata.citationStyle = "numbered";
    expect(result.html).not.toContain("Supporting detail");
    const changed = formatReferenceCaret(
      result.html,
      documentRoot(result.html).textContent!.length,
      (value) => renderReferences(value, result.metadata),
    );
    const root = documentRoot(changed.html);
    expect(root.querySelectorAll('[data-nle-generated="notes"]')).toHaveLength(
      2,
    );
    expect(
      root.querySelectorAll('[data-nle-generated="bibliography"]'),
    ).toHaveLength(2);
    expect(
      root.querySelectorAll('[data-nle-generated="notes"] a'),
    ).toHaveLength(2);
    expect(root.textContent!.slice(changed.caret)).toMatch(/^Notes/);
    expect(changed.html).not.toContain("data-nle-caret");
  });
  it("remaps repeated imported footnote anchors without capturing destination targets", () => {
    const html =
      '<p><a id="ref-1" href="#note-1">1</a></p><ol><li id="note-1">Imported note <a href="#ref-1">back</a></li></ol>';
    const first = documentRoot(html),
      second = documentRoot(html);
    remapFragmentAnchors(first);
    remapFragmentAnchors(second);
    const ids = [
      ...first.querySelectorAll("[id]"),
      ...second.querySelectorAll("[id]"),
    ].map((el) => el.id);
    expect(new Set(ids).size).toBe(4);
    for (const root of [first, second])
      for (const link of root.querySelectorAll("a"))
        expect(
          root.querySelector(`[id="${link.getAttribute("href")!.slice(1)}"]`),
        ).not.toBeNull();
  });
  it("saves, reloads, undoes and redoes one reference insertion as an HTML/metadata operation", async () => {
    const f = fixture(),
      imported = paste(f.copied.html),
      store = createMemoryVersionStore();
    const scope = effectScope(),
      html = ref("<p>Destination</p>"),
      options = shallowRef<DocumentOptions>({
        id: "destination",
        store,
        onDiagnostic: () => {},
      });
    const session = scope.run(() =>
      useDocumentSession({
        options,
        html,
        sanitize: sanitizeHtml,
        apply: (value) => {
          html.value = value;
        },
      }),
    )!;
    try {
      await session.refresh();
      session.transact((value) => {
        value.html += imported.html;
        value.metadata = imported.metadata;
      });
      await session.checkpoint("Pasted references");
      const saved = (await store.list("destination"))[0];
      expect(saved.metadata.notes).toHaveLength(1);
      expect(saved.html).toContain(saved.metadata.notes[0].id);
      session.undo();
      expect(html.value).toBe("<p>Destination</p>");
      expect(session.metadata.value.notes).toEqual([]);
      session.redo();
      expect(session.snapshot()).toEqual({
        html: saved.html,
        metadata: saved.metadata,
      });
      const restored = paste(
        createReferenceFragment(saved.html, saved.metadata, "destination")!
          .html,
      );
      expect(restored.notesAdded).toBe(1);
      expect(restored.metadata.notes[0].text).toContain("שלום مرحبا");
    } finally {
      scope.stop();
    }
  });
});
