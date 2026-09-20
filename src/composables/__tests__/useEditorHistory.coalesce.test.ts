import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useEditorHistory } from "../useEditorHistory";

/**
 * r13 #12: every input event pushed its own history entry, so undoing a typed
 * word took one Ctrl+Z per character. Keystroke bursts (typing / deleting runs,
 * identified by the input event's inputType) now COALESCE into one undo step:
 * consecutive same-kind captures within a 1s idle window merge into the burst
 * entry, broken by a pause, a different edit kind, any keyless capture
 * (formatting, Enter, paste — they pass no key), a 5s burst cap, or not being
 * at the history tail (typing after an undo must push and prune redo).
 */
describe("typing coalescing (#12)", () => {
  it('an unchanged command boundary keeps a suggestion separate from the preceding typing', () => {
    const history = useEditorHistory();
    history.captureSnapshot('<p></p>');
    history.captureSnapshot('<p>the the house</p>', null, 'typing');
    history.captureSnapshot('<p>the the house</p>');
    history.captureSnapshot('<p>the house</p>', null, 'typing');
    const apply = vi.fn();
    history.undo(apply);
    expect(apply).toHaveBeenCalledWith('<p>the the house</p>', null);
  });
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges a rapid typing burst into ONE undo step", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>"); // baseline (keyless)
    h.captureSnapshot("<p>h</p>", null, "typing");
    vi.advanceTimersByTime(80);
    h.captureSnapshot("<p>he</p>", null, "typing");
    vi.advanceTimersByTime(80);
    h.captureSnapshot("<p>hey</p>", null, "typing");

    expect(h.history.value).toHaveLength(2);
    expect(h.history.value[1].html).toBe("<p>hey</p>");

    // One undo wipes the whole burst.
    const apply = vi.fn();
    h.undo(apply);
    expect(apply).toHaveBeenCalledWith("<p></p>", null);
  });

  it("a pause longer than the idle window starts a new undo step", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>h</p>", null, "typing");
    vi.advanceTimersByTime(1200);
    h.captureSnapshot("<p>he</p>", null, "typing");
    expect(h.history.value).toHaveLength(3);
  });

  it("switching from typing to deleting starts a new undo step", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>hey</p>", null, "typing");
    vi.advanceTimersByTime(100);
    h.captureSnapshot("<p>he</p>", null, "deleting");
    expect(h.history.value).toHaveLength(3);
  });

  it("a keyless capture (formatting/Enter/paste) breaks the burst", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>hi</p>", null, "typing");
    vi.advanceTimersByTime(50);
    h.captureSnapshot("<p><strong>hi</strong></p>"); // e.g. bold — keyless
    vi.advanceTimersByTime(50);
    h.captureSnapshot("<p><strong>hi!</strong></p>", null, "typing");
    // baseline, "hi", bold, "hi!" — nothing merged across the boundary.
    expect(h.history.value).toHaveLength(4);
  });

  it("a long continuous burst is split at the burst cap", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    let text = "";
    // 700ms apart (inside the idle window) × 9 crosses the 5s cap mid-way.
    for (let i = 0; i < 9; i++) {
      text += "x";
      h.captureSnapshot(`<p>${text}</p>`, null, "typing");
      vi.advanceTimersByTime(700);
    }
    expect(h.history.value.length).toBeGreaterThan(2);
  });

  it("typing after an undo pushes and prunes redo, never merges backwards", async () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>one</p>", null, "typing");
    h.undo(vi.fn());
    await nextTick(); // undo apply completes (isApplyingHistory released)
    vi.advanceTimersByTime(50);
    h.captureSnapshot("<p>two</p>", null, "typing");

    expect(h.history.value.map((e) => e.html)).toEqual([
      "<p></p>",
      "<p>two</p>",
    ]);
    expect(h.canRedo()).toBe(false);
  });

  it("keyless captures never coalesce with each other", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p>a</p>");
    vi.advanceTimersByTime(10);
    h.captureSnapshot("<p>b</p>");
    expect(h.history.value).toHaveLength(2);
  });

  it("undo→redo closes the burst — the next keystroke starts a NEW step (#r15-23)", async () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>hey</p>", null, "typing");
    h.undo(vi.fn());
    await nextTick();
    h.redo(vi.fn());
    await nextTick();
    vi.advanceTimersByTime(50); // still inside the old idle window

    h.captureSnapshot("<p>hey!</p>", null, "typing");

    // Pushed, NOT folded into the burst the user just navigated back to —
    // one more undo must return to "hey", not skip it.
    expect(h.history.value.map((e) => e.html)).toEqual([
      "<p></p>",
      "<p>hey</p>",
      "<p>hey!</p>",
    ]);
  });

  it("clearHistory strips burst metadata so the kept baseline is never absorbed (#r15-34)", () => {
    const h = useEditorHistory();
    h.captureSnapshot("<p></p>");
    h.captureSnapshot("<p>draft</p>", null, "typing");
    h.clearHistory();
    expect(h.history.value).toHaveLength(1);
    vi.advanceTimersByTime(50); // inside the old burst windows

    h.captureSnapshot("<p>draft x</p>", null, "typing");

    // A NEW entry — the promised kept state survives and undo works.
    expect(h.history.value.map((e) => e.html)).toEqual([
      "<p>draft</p>",
      "<p>draft x</p>",
    ]);
    expect(h.canUndo()).toBe(true);
  });
});
