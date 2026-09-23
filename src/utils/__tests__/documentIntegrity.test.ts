import { describe, it, expect, afterEach, vi } from "vitest";
import { effectScope, ref, shallowRef } from "vue";
import { zipSync, strToU8 } from "fflate";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import { useDocumentWorkspace } from "../../composables/useDocumentWorkspace";
import { useDocumentAi } from "../../composables/useDocumentAi";
import {
  defaultDocumentMetadata,
  type AiAdapter,
  type DocumentOptions,
} from "../../types/document";
import { expandDocxArchive, defaultDocxLimits } from "../docxArchive";
import {
  proposeDocumentChanges,
  decideSuggestion,
  acceptedDocument,
} from "../documentReview";
import { renderDocumentTemplate } from "../documentTemplates";
import { loadCitationFormatter } from "../citationFormatter";
import { renderReferences } from "../documentReferences";
const { sanitizeHtml } = useHtmlSanitizer();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.useRealTimers();
});
function workspace(html = '<p data-nle-id="nle-a">Original</p>') {
  const scope = effectScope(),
    content = ref(html),
    options = shallowRef<DocumentOptions>({
      id: "integrity",
      onDiagnostic: () => {},
    });
  const w = scope.run(() =>
    useDocumentWorkspace({
      html: content,
      options,
      root: ref(null),
      apply: (html) => {
        content.value = html;
      },
      sanitize: sanitizeHtml,
      locale: () => "pt-PT",
    }),
  )!;
  cleanups.push(() => scope.stop());
  return { w, content, options };
}
describe("document integrity regressions", () => {
  it("never ingests collaborator cursor labels into saved or synchronized prose", () => {
    const html =
      '<p data-nle-id="nle-a">Text<span class="nle-remote-cursor ProseMirror-widget"><span>Ana</span></span></p>';
    expect(sanitizeHtml(html)).toBe('<p data-nle-id="nle-a">Text</p>');
  });
  it("rejects an edited-then-deleted passage back to its original formatting", () => {
    const metadata = defaultDocumentMetadata(),
      before = '<p data-nle-id="nle-a" lang="en">Original</p>';
    const edited = proposeDocumentChanges(
      before,
      before
        .replace("Original", "Changed")
        .replace('lang="en"', 'lang="pt-PT"'),
      metadata,
      "Ana",
    );
    const deleted = proposeDocumentChanges(edited, "", metadata, "Ana");
    expect(metadata.suggestions).toHaveLength(1);
    expect(decideSuggestion(deleted, metadata.suggestions[0], false)).toBe(
      before,
    );
  });
  it("cancels insertion followed by deletion without an orphan suggestion", () => {
    const metadata = defaultDocumentMetadata(),
      added = proposeDocumentChanges(
        "",
        '<p data-nle-id="nle-a">New</p>',
        metadata,
        "Ana",
      );
    const deleted = proposeDocumentChanges(added, "", metadata, "Ana");
    expect(deleted).toBe("");
    expect(acceptedDocument(deleted, metadata)).toBe("");
  });
  it("accepts a review group atomically and restores metadata in one undo", () => {
    const { w, content } = workspace(
      '<p data-nle-id="nle-a">A</p><p data-nle-id="nle-b">B</p>',
    );
    w.suggesting.value = true;
    w.mutate((root) => {
      root.children[0].textContent = "AA";
      root.children[1].textContent = "BB";
    });
    const ids = w.pending.value.map((s) => s.id);
    expect(ids).toHaveLength(2);
    expect(() => w.decideMany([...ids, "missing"], true)).toThrow();
    expect(w.pending.value).toHaveLength(2);
    w.decideMany(ids, true);
    expect(w.pending.value).toHaveLength(0);
    expect(content.value).not.toContain("data-nle-suggestion");
    w.session.undo();
    expect(w.pending.value).toHaveLength(2);
  });
  it("counts actual ZIP expansion even with forged declared sizes", () => {
    const bytes = zipSync({ "word/document.xml": strToU8("x".repeat(100000)) });
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < bytes.length - 4; i++) {
      if (view.getUint32(i, true) === 0x04034b50)
        view.setUint32(i + 22, 1, true);
      if (view.getUint32(i, true) === 0x02014b50)
        view.setUint32(i + 24, 1, true);
    }
    expect(() =>
      expandDocxArchive(bytes.buffer as ArrayBuffer, {
        ...defaultDocxLimits,
        expandedBytes: 1000,
      }),
    ).toThrow(/limit/i);
  });
  it("validates real calendar dates, finite numbers and unique template fields", () => {
    expect(
      renderDocumentTemplate(
        "<p>{{when}}</p>",
        [{ name: "when", type: "date" }],
        { when: "2026-02-30" },
      ).problems,
    ).toHaveLength(1);
    expect(
      renderDocumentTemplate(
        "<p>{{amount}}</p>",
        [{ name: "amount", type: "number" }],
        { amount: Infinity },
      ).problems,
    ).toHaveLength(1);
    expect(() =>
      renderDocumentTemplate(
        "",
        [
          { name: "a", type: "string" },
          { name: "a", type: "number" },
        ],
        {},
      ),
    ).toThrow(/unique/);
  });
  it("preserves false and zero defaults and reports every affected block", () => {
    const result = renderDocumentTemplate(
      '<p>{{ n }}</p><p>{{n}}</p><p data-nle-if="flag">yes</p><p data-nle-if="!flag">no</p>',
      [
        { name: "n", type: "number", default: 0, required: true },
        { name: "flag", type: "boolean", default: false },
      ],
      {},
    );
    expect(result.problems).toEqual([]);
    expect(result.html).toBe("<p>0</p><p>0</p><p>no</p>");
    expect(
      renderDocumentTemplate(
        "<p>{{ a }}</p><p>{{a}}</p>",
        [{ name: "a", type: "string", required: true }],
        {},
      ).problems[0].occurrences,
    ).toBe(2);
  });
  it("formats supported APA sources locally with page locators and multiple authors", async () => {
    const formatter = await loadCitationFormatter();
    const metadata = defaultDocumentMetadata();
    metadata.sources = [
      {
        id: "nle-source",
        author: "Silva, Ana; Costa, Rui",
        title: "Writing clearly",
        year: "2026",
        publisher: "Example Press",
        type: "book",
        locator: "12",
      },
    ];
    const output = renderReferences(
      '<p><span data-nle-cite="nle-source"></span></p>',
      metadata,
      formatter,
    );
    expect(output).toContain("Silva");
    expect(output).toContain("Costa");
    expect(output).toContain("2026");
    expect(output).toContain("12");
    expect(output).toContain("<i>Writing clearly</i>");
  });
  it("disambiguates repeated author years and escapes bibliography values", async () => {
    const formatter = await loadCitationFormatter();
    const common = {
      author: "Silva, Ana",
      year: "2026",
      type: "book" as const,
    };
    const formatted = formatter.format(
      [
        { ...common, id: "nle-b", title: "Beta" },
        { ...common, id: "nle-a", title: "Alpha <script>unsafe</script>" },
      ],
      "en",
    );
    expect(formatted.citation("nle-a", "12–14")).toBe(
      "(Silva, 2026a, pp. 12–14)",
    );
    expect(formatted.citation("nle-b")).toBe("(Silva, 2026b)");
    expect(formatted.bibliography[0].html).toContain("Silva, A. (2026a).");
    expect(formatted.bibliography[0].html).not.toContain("<script>");
  });
  it("keeps repeated note IDs unique and supports edit/delete/undo", async () => {
    const { w, content } = workspace();
    await w.addNote("First note");
    const id = w.session.metadata.value.notes[0].id;
    await w.insertReference("note", id);
    const root = document.createElement("div");
    root.innerHTML = content.value;
    const ids = Array.from(root.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    await w.updateReference("note", id, "Edited note");
    expect(content.value).toContain("Edited note");
    await w.updateReference("note", id, null);
    expect(content.value).not.toContain("Edited note");
    expect(w.session.metadata.value.notes).toHaveLength(0);
    w.session.undo();
    expect(content.value).toContain("Edited note");
  });
  it("inserts a citation after generated notes without dropping its marker", async () => {
    const { w, content } = workspace(
      '<table data-nle-id="nle-a"><tr><td>Body</td></tr></table>',
    );
    await w.addNote("Detail");
    w.addSource({ author: "Silva, Ana", title: "Writing", year: "2026" });
    await w.insertReference("citation", w.session.metadata.value.sources[0].id);
    expect(content.value).toContain("Silva");
    expect(content.value).toContain("data-nle-cite");
    expect(content.value).toContain("Bibliography");
  });
  it("sanitizes AI replacement and refuses stale equal-length content", async () => {
    const { w, content, options } = workspace();
    options.value = {
      ...options.value,
      ai: {
        name: "fixture",
        generate: async () => ({
          html: "<b>Improved</b><script>alert(1)</script>",
        }),
      },
    };
    w.selected.value = {
      id: "nle-a",
      html: "Original",
      text: "Original",
      start: 0,
      end: 8,
    };
    await w.generateAi("clarify", "", false);
    w.acceptAi();
    expect(content.value).toContain("<b>Improved</b>");
    expect(content.value).not.toContain("script");
    w.session.undo();
    w.selected.value = {
      id: "nle-a",
      html: "Original",
      text: "Original",
      start: 0,
      end: 8,
    };
    await w.generateAi("clarify", "", false);
    content.value = '<p data-nle-id="nle-a">Modified</p>';
    expect(() => w.acceptAi()).toThrow(/changed/);
    expect(content.value).toContain("Modified");
  });
  it("cancels providers that ignore abort and clears partial results", async () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    let finish!: (value: { html: string }) => void;
    const provider: AiAdapter = {
      name: "fixture",
      generate: async (_request, preview) => {
        preview("Partial");
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    };
    const ai = scope.run(() =>
      useDocumentAi({
        provider: () => provider,
        documentId: () => "a",
        sink: () => () => {},
      }),
    )!;
    const promise = ai.generate(
      { id: "nle-a", html: "Text", text: "Text", start: 0, end: 4 },
      "clarify",
      "en",
    );
    expect(ai.preview.value).toBe("Partial");
    ai.cancel();
    await promise;
    finish({ html: "Late" });
    await Promise.resolve();
    expect(ai.proposal.value).toBeNull();
    expect(ai.preview.value).toBe("");
  });
});
