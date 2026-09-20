import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useAutoSave } from "../useAutoSave";

const deferred = () => {
  let resolve!: (value: { success: boolean; serverVersion?: number }) => void;
  const promise = new Promise<{ success: boolean; serverVersion?: number }>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("auto-save ordering and lifecycle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reports unsaved changes during the debounce after a successful save", async () => {
    const save = useAutoSave(async () => ({ success: true }));
    await save.forceSave("first draft");
    save.triggerAutoSave("new draft");
    expect(save.saveStatus.value).toBe("unsaved");
    await vi.runAllTimersAsync();
    expect(save.saveStatus.value).toBe("saved");
  });

  it("serializes slow saves and coalesces intermediate edits using the acknowledged version", async () => {
    const first = deferred();
    const callback = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ success: true, serverVersion: 8 });
    const save = useAutoSave(callback, { delay: 100 });
    const saving = save.forceSave("first");
    save.triggerAutoSave("intermediate");
    await vi.advanceTimersByTimeAsync(100);
    save.triggerAutoSave("latest");
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledTimes(1);
    first.resolve({ success: true, serverVersion: 7 });
    await saving;
    await vi.runAllTimersAsync();
    expect(callback.mock.calls).toEqual([["first", 0], ["latest", 7]]);
    expect(save.saveHistory.value.map((entry) => entry.content)).toEqual(["first", "latest"]);
    expect(save.currentVersion.value).toBe(8);
  });

  it("keeps the newer document unsaved when an older request finishes before its debounce", async () => {
    const first = deferred();
    const save = useAutoSave(() => first.promise);
    const saving = save.forceSave("old");
    save.triggerAutoSave("new");
    first.resolve({ success: true });
    await saving;
    expect(save.saveStatus.value).toBe("unsaved");
    save.cancelAutoSave();
  });

  it("waits for a forced save queued behind an active request", async () => {
    const first = deferred();
    const second = deferred();
    const callback = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const save = useAutoSave(callback);
    const a = save.forceSave("a");
    let completed = false;
    const b = save.forceSave("b").then(() => { completed = true; });
    first.resolve({ success: true, serverVersion: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenLastCalledWith("b", 1);
    expect(completed).toBe(false);
    second.resolve({ success: true, serverVersion: 2 });
    await Promise.all([a, b]);
    expect(completed).toBe(true);
  });

  it("cancels debounced writes when the editor scope is disposed", async () => {
    const scope = effectScope();
    const callback = vi.fn(async () => ({ success: true }));
    const save = scope.run(() => useAutoSave(callback))!;
    save.triggerAutoSave("private draft");
    scope.stop();
    await vi.runAllTimersAsync();
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores a late completion after disposal or clearing history", async () => {
    const response = deferred();
    const scope = effectScope();
    const save = scope.run(() => useAutoSave(() => response.promise))!;
    const pending = save.forceSave("draft");
    scope.stop();
    response.resolve({ success: true });
    await pending;
    expect(save.lastSaved.value).toBeNull();
    expect(save.saveHistory.value).toEqual([]);
  });

  it("recognizes an empty server document as a conflict and cancels stale queued edits on acceptance", async () => {
    const callback = vi.fn(async () => ({ success: false, serverVersion: 7, serverContent: "" }));
    const save = useAutoSave(callback);
    await save.forceSave("local");
    expect(save.saveStatus.value).toBe("conflict");
    save.triggerAutoSave("newer local");
    expect(save.resolveConflict(false)).toBe("");
    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(save.currentVersion.value).toBe(7);
    expect(save.saveStatus.value).toBe("saved");
  });

  it("retains the latest local edit when resolving against the server version", async () => {
    const callback = vi.fn().mockResolvedValueOnce({ success: false, serverVersion: 7, serverContent: "server" }).mockResolvedValue({ success: true, serverVersion: 8 });
    const save = useAutoSave(callback);
    await save.forceSave("local");
    save.triggerAutoSave("latest local");
    save.resolveConflict(true);
    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenLastCalledWith("latest local", 7);
    expect(save.saveStatus.value).toBe("saved");
  });
});
