import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { usePendingSaveGuard } from "../usePendingSaveGuard";

afterEach(() => vi.restoreAllMocks());

describe("pending save navigation guard", () => {
  it("only blocks leaving while changes are pending, and cleans up on disposal", () => {
    const scope = effectScope();
    const pending = ref(false);
    scope.run(() => usePendingSaveGuard(() => pending.value, async () => {}));
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);
    pending.value = true;
    expect(leave()).toBe(true);
    pending.value = false;
    expect(leave()).toBe(false);
    pending.value = true;
    scope.stop();
    expect(leave()).toBe(false);
  });

  it("flushes a pending save when the page becomes hidden", () => {
    const scope = effectScope();
    const pending = ref(true);
    const flush = vi.fn(async () => {});
    scope.run(() => usePendingSaveGuard(() => pending.value, flush));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(flush).toHaveBeenCalledTimes(1);
    pending.value = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(flush).toHaveBeenCalledTimes(1);
    scope.stop();
    pending.value = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
