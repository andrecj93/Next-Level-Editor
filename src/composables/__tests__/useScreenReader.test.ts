import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useScreenReader } from "../useScreenReader";

describe("useScreenReader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("surfaces the announced message (after the reset tick)", async () => {
    const { announce, announcement, ariaLive } = useScreenReader();
    announce("Bold applied", "polite");
    await nextTick();
    expect(announcement.value).toBe("Bold applied");
    expect(ariaLive.value).toBe("polite");
  });

  it("carries the priority through to ariaLive", async () => {
    const { announce, ariaLive } = useScreenReader();
    announce("Save failed", "assertive");
    await nextTick();
    expect(ariaLive.value).toBe("assertive");
  });

  it("does not let an earlier clear timer wipe a newer message", async () => {
    const { announce, announcement } = useScreenReader();

    announce("First message");
    await nextTick();
    expect(announcement.value).toBe("First message");

    // A second announcement shortly after must survive — previously the first
    // call's pending clear fired and blanked this one almost immediately.
    announce("Second message");
    await nextTick();
    expect(announcement.value).toBe("Second message");

    // Advance past when the FIRST timer would have fired; message must remain.
    vi.advanceTimersByTime(200);
    expect(announcement.value).toBe("Second message");
  });

  it("clears the message after the hold window so identical repeats re-fire", async () => {
    const { announce, announcement } = useScreenReader();
    announce("Heading level 1 applied");
    await nextTick();
    expect(announcement.value).toBe("Heading level 1 applied");

    vi.advanceTimersByTime(1000);
    expect(announcement.value).toBe("");
  });

  it("re-blanks the live region before re-announcing an identical string", async () => {
    const { announce, announcement } = useScreenReader();
    announce("undo performed");
    await nextTick();
    expect(announcement.value).toBe("undo performed");

    // Announcing the SAME string blanks first so the text node actually changes.
    announce("undo performed");
    expect(announcement.value).toBe("");
    await nextTick();
    expect(announcement.value).toBe("undo performed");
  });
});
