import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAccessibility } from "../useAccessibility";

/**
 * The live regions are aria-atomic and render getAnnouncements() directly, so
 * a screen reader only speaks when the region's TEXT CHANGES. Two identical
 * consecutive announcements (e.g. pressing Bold twice within the 5s window:
 * "Bold formatting applied" → "Bold formatting applied") produced the same
 * string, the DOM never mutated, and the second event was silently dropped.
 * The fix alternates an invisible zero-width space (U+200B — not spoken, not
 * visible) so every repeat still mutates the region.
 */
describe("useAccessibility: identical consecutive announcements still fire", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const spoken = (s: string) => s.replace(/\u200B/g, "");

  it("mutates the region text on an identical repeat announcement", () => {
    const { announce, getAnnouncements, clearAnnouncements } =
      useAccessibility();
    clearAnnouncements();

    announce("Bold formatting applied");
    const first = getAnnouncements("polite");
    expect(spoken(first)).toBe("Bold formatting applied");

    // Same message again while the first is still displayed (within 5s).
    announce("Bold formatting applied");
    const second = getAnnouncements("polite");

    // What the user hears is identical…
    expect(spoken(second)).toBe("Bold formatting applied");
    // …but the region's raw text MUST differ, or the SR never re-announces.
    expect(second).not.toBe(first);
  });

  it("keeps alternating across three identical announcements", () => {
    const { announce, getAnnouncements, clearAnnouncements } =
      useAccessibility();
    clearAnnouncements();

    announce("Saved");
    const a = getAnnouncements("polite");
    announce("Saved");
    const b = getAnnouncements("polite");
    announce("Saved");
    const c = getAnnouncements("polite");

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(spoken(c)).toBe("Saved");
  });

  it("different messages remain untouched (no stray suffix)", () => {
    const { announce, getAnnouncements, clearAnnouncements } =
      useAccessibility();
    clearAnnouncements();

    announce("Bold on");
    announce("Italic on");
    expect(getAnnouncements("polite")).toBe("Italic on");
  });
});
