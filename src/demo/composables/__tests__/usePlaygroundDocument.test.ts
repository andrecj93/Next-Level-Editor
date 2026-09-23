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

  const discussion = JSON.stringify([{
    id: 'thread', status: 'resolved',
    rangeData: { startContainerPath: [0, 0], startOffset: 0, endContainerPath: [0, 0], endOffset: 5, text: 'Saved' },
    createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:01:00Z',
    comments: [
      { id: 'first', author: { id: 'writer', name: 'Writer' }, content: 'An opening note.' },
      { id: 'reply', author: { id: 'writer', name: 'Writer' }, content: 'A reply worth keeping.' },
    ],
  }]);

  it('saves and restores discussion bodies, replies, status and anchors atomically', async () => {
    const draft = usePlaygroundDocument(true);
    draft.commentThreads.value = discussion;
    await draft.saveDraft('<p><span class="comment-highlight comment-highlight-resolved" data-thread-id="thread">Saved</span> text.</p>');
    const restored = usePlaygroundDocument(false);
    expect(restored.content.value).toContain('data-thread-id="thread"');
    const threads = JSON.parse(restored.commentThreads.value);
    expect(threads[0].status).toBe('resolved');
    expect(threads[0].comments.map((comment: { content: string }) => comment.content)).toEqual(['An opening note.', 'A reply worth keeping.']);
    expect(threads[0].createdAt).toBe('2026-09-23T10:00:00.000Z');
    expect(restored.restoreFailed.value).toBe(false);
  });

  it('starts a new document without carrying the old discussion into storage', async () => {
    const draft = usePlaygroundDocument(true);
    draft.commentThreads.value = discussion;
    expect(draft.hasEdits.value).toBe(true);
    await draft.saveDraft('<p>Saved text.</p>');
    draft.applyTemplate('empty');
    await draft.saveDraft(draft.content.value);
    const restored = usePlaygroundDocument(false);
    expect(restored.content.value).toBe('');
    expect(restored.commentThreads.value).toBe('[]');
    expect(restored.hasEdits.value).toBe(false);
  });

  it('recovers prose and reports invalid discussion without rendering partial threads', () => {
    localStorage.setItem(PLAYGROUND_DRAFT_KEY, JSON.stringify({ version: 2, content: '<p>Recover me.</p>', commentThreads: '[{"id":"broken"}]' }));
    const draft = usePlaygroundDocument(false);
    expect(draft.content.value).toBe('<p>Recover me.</p>');
    expect(draft.commentThreads.value).toBe('[]');
    expect(draft.notice.value).toContain('comments could not be recovered');
    expect(draft.restoreFailed.value).toBe(true);
  });

  it('retains the prior saved record when a reply-only save fails, then retries the whole snapshot', async () => {
    const draft = usePlaygroundDocument(true);
    await draft.saveDraft('<p>Saved text.</p>');
    const original = localStorage.getItem(PLAYGROUND_DRAFT_KEY);
    draft.commentThreads.value = discussion;
    const storage = localStorage;
    vi.stubGlobal('localStorage', { getItem: storage.getItem.bind(storage), setItem: () => { throw new Error('Quota'); } });
    await expect(draft.saveDraft('<p>Saved text.</p>')).rejects.toThrow('could not be saved');
    expect(localStorage.getItem(PLAYGROUND_DRAFT_KEY)).toBe(original);
    vi.unstubAllGlobals();
    await draft.saveDraft('<p>Saved text.</p>');
    expect(usePlaygroundDocument(false).commentThreads.value).toContain('A reply worth keeping.');
  });

  const kept = JSON.stringify(['0:' + JSON.stringify(['In order to remember.', 0, 'In order to', 'A little more direct'])]);
  it('restores kept writing decisions with the prose and clears them for a new document', async () => {
    const draft = usePlaygroundDocument(true);
    draft.keptWritingNotes.value = kept;
    expect(draft.hasEdits.value).toBe(true);
    await draft.saveDraft('<p>In order to remember.</p>');
    expect(usePlaygroundDocument(false).keptWritingNotes.value).toBe(kept);
    draft.applyTemplate('empty');
    await draft.saveDraft('');
    const restored = usePlaygroundDocument(false);
    expect(restored.keptWritingNotes.value).toBe('[]');
    expect(restored.content.value).toBe('');
    expect(restored.hasEdits.value).toBe(false);
  });

  it('recovers prose and valid comments when writing-decision metadata is invalid', () => {
    localStorage.setItem(PLAYGROUND_DRAFT_KEY, JSON.stringify({ version: 3, content: '<p>Recover me.</p>', keptWritingNotes: '["broken"]', commentThreads: discussion }));
    const draft = usePlaygroundDocument(false);
    expect(draft.content.value).toBe('<p>Recover me.</p>');
    expect(draft.keptWritingNotes.value).toBe('[]');
    expect(draft.commentThreads.value).toContain('A reply worth keeping.');
    expect(draft.notice.value).toContain('writing decisions could not be recovered');
    expect(draft.restoreFailed.value).toBe(true);
  });

  it('retains the last complete draft when writing decisions cannot be saved', async () => {
    const draft = usePlaygroundDocument(true);
    await draft.saveDraft('<p>In order to remember.</p>');
    const previous = localStorage.getItem(PLAYGROUND_DRAFT_KEY);
    draft.keptWritingNotes.value = '["broken"]';
    await expect(draft.saveDraft('<p>In order to remember.</p>')).rejects.toThrow('could not be saved');
    expect(localStorage.getItem(PLAYGROUND_DRAFT_KEY)).toBe(previous);
    draft.keptWritingNotes.value = kept;
    await draft.saveDraft('<p>In order to remember.</p>');
    expect(usePlaygroundDocument(false).keptWritingNotes.value).toBe(kept);
  });
});
