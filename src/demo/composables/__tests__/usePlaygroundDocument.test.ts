import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { PLAYGROUND_DRAFT_KEY, usePlaygroundDocument } from "../usePlaygroundDocument";

describe("playground draft recovery", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  afterEach(() => vi.unstubAllGlobals());

  it("restores an edited document and its selected template", async () => {
    const original = usePlaygroundDocument(true);
    await original.saveDraft("<p>A draft worth keeping.</p>");
    const restored = usePlaygroundDocument(false);
    expect(restored.content.value).toBe("<p>A draft worth keeping.</p>");
    expect(restored.selectedTemplate.value).toBe("empty");
    expect(restored.notice.value).toContain("restored");
    expect(restored.hasEdits.value).toBe(true);
  });

  it("sanitizes untrusted persisted HTML before rendering it", () => {
    localStorage.setItem(PLAYGROUND_DRAFT_KEY, JSON.stringify({ version: 1, content: '<p>Safe</p><script>alert(1)</script><img src="x" onerror="alert(2)">', template: "empty" }));
    const draft = usePlaygroundDocument(false);
    expect(draft.content.value).not.toMatch(/<script|onerror/);
    expect(draft.content.value).toContain("Safe");
  });

  it("honors an explicit empty-document deep link", async () => {
    await usePlaygroundDocument(true).saveDraft("<p>Saved</p>");
    expect(usePlaygroundDocument(true).content.value).toBe("");
  });

  it("starts a truly empty document and tracks subsequent changes", () => {
    const draft = usePlaygroundDocument(false);
    draft.applyTemplate("empty");
    expect(draft.content.value).toBe("");
    expect(draft.hasEdits.value).toBe(false);
    draft.content.value = "<p>Edited</p>";
    expect(draft.hasEdits.value).toBe(true);
  });

  it("surfaces storage failures so the editor can offer a retry", async () => {
    const draft = usePlaygroundDocument(true);
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("Quota"); } });
    await expect(draft.saveDraft("<p>Keep me</p>")).rejects.toThrow("Export your document");
  });

  it("keeps a failed recovery visible while writing until a new document is chosen", async () => {
    localStorage.setItem(PLAYGROUND_DRAFT_KEY, "{invalid");
    const draft = usePlaygroundDocument(false);
    expect(draft.notice.value).toContain("could not be restored");
    expect(draft.content.value).toBe("");
    draft.content.value = "<p>Writing after a failed recovery.</p>";
    await nextTick();
    expect(draft.notice.value).toContain("could not be restored");
    expect(draft.restoreFailed.value).toBe(true);
    draft.applyTemplate("empty");
    expect(draft.notice.value).toBe("");
    expect(draft.restoreFailed.value).toBe(false);
  });
});
